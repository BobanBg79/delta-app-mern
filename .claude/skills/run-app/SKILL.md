---
name: run-app
description: Use when you need to start, run, or launch the Delta Apartmani MERN app locally (backend server + React client) — for example before verifying a feature in the browser. Covers env setup, the MongoDB Atlas paused-cluster gotcha, the Windows-style server script issue on macOS, and the ports used.
---

# Running the Delta Apartmani app locally

This project is a MERN app: an Express/Mongoose backend and a Create React App frontend.

| Part | Port | Start command |
|------|------|---------------|
| Backend (Express) | 5000 | see below |
| Frontend (React) | 3000 | `npm run client` (from project root) |

## Prerequisites (check these first)

1. **`.env` must exist** in the project root. It is gitignored, so it is NOT in the repo. Required keys:
   - `MONGO_URI` (MongoDB Atlas connection string)
   - `JSON_WT_SECRET`
   - `OPENAI_API_KEY` (required — the voice-reservation service instantiates the OpenAI client at startup, so the server CRASHES on boot if this is missing)
   - `MONGO_DATA_API_SECRET`
2. **Dependencies installed**: root `npm install` and `cd client && npm install`. The voice feature needs `multer` and `openai` — if you see `Cannot find module 'multer'`, run `npm install` in the root.
3. **Node 20** (see `engines` in package.json).

## Starting the backend

The `npm run server` script uses Windows syntax (`set NODE_ENV=dev& nodemon ...`) which does NOT work correctly on macOS. On macOS, start it directly instead:

```bash
NODE_ENV=dev npx nodemon server
```

Wait for `Server started on port 5000`. The server reads config from `.env`.

## Starting the frontend

```bash
npm run client
```

This runs Create React App on port 3000 and proxies API calls to the backend.

(You can also run both together with `npm run dev`, but on macOS prefer starting them separately because of the `set NODE_ENV` issue above.)

## Common failure: MongoDB Atlas cluster paused

Free-tier Atlas clusters auto-pause after inactivity. When paused, the DNS SRV record disappears and the server logs:

```
querySrv ENOTFOUND _mongodb._tcp.<cluster>.mongodb.net
```

Fix: open https://cloud.mongodb.com, find the cluster, and click **Resume**. It takes a few minutes for the cluster to become active and DNS to return. You can poll readiness without touching the DB (DNS only):

```bash
nslookup -type=SRV _mongodb._tcp.<cluster-host> | grep "service ="
```

When it resolves, restart the backend.

## Health check

- Backend up: `Server started on port 5000` in the log, and `curl -s localhost:5000/...` responds.
- Frontend up: http://localhost:3000 loads the login page.

## Notes

- `.env` is gitignored — never commit it.
- On Heroku the same env vars live in Config Vars (Settings → Config Vars), not in `.env`.
