# VaultDock — frontend

The React SPA for VaultDock. See the [root README](../README.md) for the full picture (what VaultDock does, design decisions, architecture, and Google OAuth setup) — this file only covers frontend-specific dev commands.

## Getting started

Requires the backend running too (see `../backend/README.md` or the root README) — the login screen won't let you through without it.

```bash
npm install
cp .env.example .env   # defaults point at http://localhost:4000/api
npm run dev
```

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # type-check + production build
npm run lint     # oxlint
npm run preview  # preview the production build locally
```
