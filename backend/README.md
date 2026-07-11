# VaultDock — backend

A small Express + MongoDB API whose only job is authentication (email/password + Google Sign-In, JWT issuance). See the [root README](../README.md) for the full picture, including step-by-step Google Cloud OAuth setup — this file only covers backend-specific dev commands.

## Getting started

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, etc. — see root README
npm run dev
```

Starts on `http://localhost:4000` by default.

## Scripts

```bash
npm run dev     # start with --watch (auto-restart on changes)
npm run start   # start without watch mode
```

## Endpoints

All under `/api/auth`:

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | — | Create an account with email/password/name. |
| `POST` | `/login` | — | Sign in with email/password. |
| `POST` | `/google` | — | Sign in/up with a Google ID token (`credential`). 501 if `GOOGLE_CLIENT_ID` isn't configured. |
| `GET` | `/me` | Bearer JWT | Returns the current user. |

`GET /api/health` is an unauthenticated liveness check.
