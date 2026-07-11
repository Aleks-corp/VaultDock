# VaultDock

A virtual data room for M&A due diligence — create data rooms, organize documents in nested folders, and share them for review. Sign in with email/password or Google, then upload, browse, and manage PDFs across isolated data rooms.

The repo is a small monorepo:

- **`frontend/`** — the React SPA (Vite + TypeScript + Tailwind + shadcn/ui). Document/folder/data-room state is mocked entirely in the browser via IndexedDB — no server round-trips for CRUD.
- **`backend/`** — a small Node/Express API whose *only* job is authentication: register/login with email+password, Google Sign-In, and issuing JWTs. MongoDB (Atlas) stores user accounts.

**Live demo:** _not deployed yet_

## Getting started

You need both servers running for auth to work (the SPA itself still stores documents locally, but it won't let you past the login screen without a reachable backend).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, etc. — see below
npm run dev
```

Starts on `http://localhost:4000` by default (`PORT` in `.env`).

Required env vars (`backend/.env`, see `backend/.env.example`):

| Variable | Description |
|---|---|
| `PORT` | Port for the Express server (default `4000`). |
| `MONGODB_URI` | MongoDB connection string (Atlas or local). |
| `JWT_SECRET` | Random secret used to sign session JWTs. Generate one with `openssl rand -hex 48`. |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d`. |
| `CORS_ORIGIN` | Origin allowed to call the API — `http://localhost:5173` in dev. |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud (see below). Leave empty to disable Google Sign-In — email/password still works. |

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # defaults already point at the local backend
npm run dev
```

Open the printed localhost URL (`http://localhost:5173`).

Env vars (`frontend/.env`, see `frontend/.env.example`):

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API, e.g. `http://localhost:4000/api`. |
| `VITE_GOOGLE_CLIENT_ID` | Same OAuth Client ID as the backend's `GOOGLE_CLIENT_ID`. Leave empty to hide the "Sign in with Google" button. |

Other frontend scripts:

```bash
npm run build    # type-check + production build
npm run lint     # oxlint
npm run preview  # preview the production build locally
```

## Setting up Google Sign-In (optional)

Email/password auth works out of the box with no extra setup. Google Sign-In is optional — follow these steps if you want it enabled:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or pick an existing one).
2. In the left nav, go to **APIs & Services → OAuth consent screen**.
   - User type: **External** (unless you have a Google Workspace org).
   - Fill in the required fields (app name "VaultDock", your email as support/developer contact). You can leave it in **Testing** mode and add your own Google account under **Test users** — no need to submit for verification for local/dev use.
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: anything, e.g. "VaultDock Web".
   - **Authorized JavaScript origins:** add `http://localhost:5173` (the frontend dev origin — Google Identity Services checks this, not a redirect URI, since we use the token-flow, not a redirect flow).
   - **Authorized redirect URIs:** not required for this flow — you can leave it empty.
   - Click **Create**. Copy the generated **Client ID** (looks like `1234567890-abc...apps.googleusercontent.com`). You won't need the client secret — the frontend only ever handles the ID token, and the backend verifies it via Google's public keys.
4. Paste the Client ID into **both**:
   - `backend/.env` → `GOOGLE_CLIENT_ID=...`
   - `frontend/.env` → `VITE_GOOGLE_CLIENT_ID=...`
5. Restart both dev servers. The "Continue with Google" button will now appear on the Login/Signup pages.

If you later deploy the app, add the deployed frontend origin (e.g. `https://your-app.vercel.app`) to **Authorized JavaScript origins** as well.

## What it does

- **Auth** — register/sign in with email + password, or "Continue with Google." Sessions are JWTs stored in `localStorage`; all routes except `/login` and `/signup` require a valid session.
- **Data rooms** — create, rename, and delete top-level rooms; each is an isolated document tree.
- **Folders** — create (with an optional cosmetic color tag), nest arbitrarily deep, rename, and delete (cascading to contents).
- **Files** — upload PDFs (drag-and-drop or file picker), preview inline, download, rename, and delete.
- **Trash** — deletes are soft; items are recoverable until restored or purged, individually or via "Empty Trash."
- **Recent** — a cross-room feed of recently created/modified items.
- **Search** — a global, debounced search across all rooms/folders/files from the top bar.
- **Details panel** — a persistent right-side panel showing info for the current folder, a single selected item, or an aggregate summary when multiple items are selected; backed by a per-node activity log (upload, rename, move to trash, restore, delete).
- **Settings** — per-room and total storage usage, plus a "Clear all data" reset.

## Design decisions

**Auth backend, mock document backend.** Only auth needed real persistence shared across devices/browsers (you can't fake "is this the right password" client-side). Documents didn't — the brief calls for CRUD over folders/files, not multi-user sharing, so IndexedDB gives that for free with zero server/storage cost. Splitting it this way kept the document data layer exactly as simple as before while still deliverying real auth.

**Google Identity Services token flow, not server-side OAuth redirect.** The frontend obtains a Google ID token client-side (via GIS's `renderButton`/`initialize`), then POSTs it to `POST /api/auth/google`, which verifies it server-side with `google-auth-library` and upserts a `User`. This avoids implementing an OAuth redirect+session dance on the server — the SPA already owns routing/state, so bolting on a server-side redirect flow would fight the architecture instead of fitting it.

**JWT in localStorage, not cookies.** The API and SPA are on different origins/ports in dev (and would likely stay split in most deployments), so a `Bearer` token read from `localStorage` and attached per-request sidesteps cross-site cookie configuration entirely. The tradeoff (XSS token theft risk) is accepted here since this is a demo-scale app with no sensitive production data.

**Mock document backend via IndexedDB, not localStorage.** File contents (PDF blobs) don't fit comfortably in localStorage's ~5MB string-based limit. IndexedDB (via the `idb` wrapper) stores structured records for data rooms/nodes/activity plus raw blobs, and behaves like a real async persistence layer — closer to what a real API integration would look like than a synchronous localStorage shim.

**Root folder per data room.** Rather than special-casing "room-level" file/folder operations, each data room gets an implicit root folder node. Every other node (file or folder) hangs off a `parentId`, so the same tree/CRUD logic works uniformly at every depth — no separate code path for "items directly in a room."

**Soft delete everywhere.** `softDeleteNodes` marks a node (and, for folders, its entire subtree) with a `deletedAt` timestamp instead of removing it. This powers Trash, undo-via-toast on delete, and keeps the activity log meaningful (you can see *when* something was deleted, not just that it's gone). Trash only lists top-level deleted items — if a folder and its child are both trashed together, only the folder shows as a row, since restoring/purging it already covers its contents.

**Drive-style de-duplication on upload, hard block on rename.** Uploading a file whose name collides with an existing sibling auto-suffixes it (`Report (1).pdf`) rather than failing — matches the behavior people expect from Drive/Dropbox uploads. Renaming to a name that's already taken is rejected with an inline error instead, since a rename is a deliberate, single-target action where silent renaming would be surprising.

**Folders always sort first**, independent of the active sort field (name, date, size) — matches every mainstream file browser and avoids folders and files interleaving in a way that makes scanning harder.

**Activity logging is structural, not bolted on.** Every store mutation (`createFolder`, `uploadFiles`, `renameNode`, `softDeleteNodes`, `restoreNodes`, `deleteNodesForever`, ...) writes an `ActivityEntry` in the same transaction. The details panel is a read view over this log — there's no separate "audit trail" system to keep in sync.

**PDF-only uploads**, enforced both via the file input's `accept` attribute and a runtime MIME/extension check — restricting scope to the one file type explicitly named in the brief, and giving predictable inline preview behavior.

## Architecture

**Frontend** (`frontend/src/`)
- **Vite + React 19 + TypeScript** for the app shell.
- **Zustand** for global state: `lib/store.ts` (documents, thin action layer over the IndexedDB repository in `lib/db.ts`) and `lib/authStore.ts` (session, backed by `lib/api.ts`'s fetch wrapper around the backend).
- **react-router-dom** for routing — `/login`, `/signup` are public; everything else (`/`, `/recent`, `/trash`, `/settings`, `/room/:roomId`, `/room/:roomId/folder/:folderId`) is behind `components/auth/ProtectedRoute.tsx`.
- **Tailwind v4 + shadcn/ui** (Radix primitives) for styling and accessible dialog/menu/table components.
- **`lib/tree.ts`** centralizes tree traversal (children, ancestors, subtree, path, storage totals) so pages don't reimplement it.
- **`lib/validation.ts`** centralizes name/file validation and the dedupe-naming algorithm.
- **`lib/folderColors.ts`** defines the fixed set of folder color tags (static Tailwind class strings, required for Tailwind's JIT scanner to pick them up).

**Backend** (`backend/src/`)
- **Express** app (`app.js`) with `cors`, JSON body parsing, and a single `/api/auth` router.
- **Mongoose** `User` model (`models/User.js`): email (unique), name, `passwordHash` (nullable — absent for Google-only accounts), `googleId` (nullable, sparse unique), `avatarUrl`.
- **`routes/auth.js`**: `POST /register`, `POST /login`, `POST /google`, `GET /me` (JWT-protected via `middleware/auth.js`).
- **`utils/jwt.js`** / **`utils/validation.js`**: token signing/verification and request-body validation, kept out of the route handlers.

## Known limitations

- Documents (data rooms, folders, files) are still per-browser/local via IndexedDB — only accounts are shared server-side. Signing in on a second device gets you the same account, but not the same documents.
- Desktop-first layout — the two-column shell (fixed sidebar + content) isn't optimized for small/mobile viewports, which fits the target workflow (due-diligence review is a desktop task) but is worth flagging.
- Files are capped at 50MB to keep IndexedDB usage reasonable for a demo.
- No password reset / email verification flow — out of scope for the assignment.

## Deployment

Not deployed yet. The frontend is a static Vite build deployable to Vercel as before; the backend would need a Node host (Render/Fly/Railway/etc.) with `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN` (set to the deployed frontend origin), and `GOOGLE_CLIENT_ID` configured, plus the deployed frontend origin added to the Google Cloud OAuth client's Authorized JavaScript origins.
