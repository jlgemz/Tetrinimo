# Tetrinimo

A browser Tetris game built with React, TypeScript, Vite, and Tailwind. Scores and accounts are stored in a Django REST API backend.

## Prerequisites

- Node.js 18+
- Python 3.10+

## Frontend

```bash
npm install
npm run dev
```

**Play the game at http://localhost:5173** — not port 8000 and not the Network IP URL. Django on port 8000 is the API only (started separately).

## Backend

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

API base: [http://127.0.0.1:8000/api/](http://127.0.0.1:8000/api/)

Optional admin user:

```bash
python manage.py createsuperuser
```

Then visit [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/).

## Run both

1. Start Django: `cd backend && python manage.py runserver`
2. Start Vite: `npm run dev` (from repo root)

Register or log in from the game modal. Guest play works without an account; scores are saved only when logged in.

Wait until the terminal shows `Local: http://localhost:5173/` before opening the game in your browser. Keep that terminal open while you play.

### Windows shortcut

```powershell
npm run dev:win
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|--------|-----|
| `ERR_CONNECTION_REFUSED` on port 5173 | Vite is not running | From repo root: `npm run dev`. Wait for `ready`, then open http://localhost:5173/. Do not close the terminal. |
| Port 5173 already in use | Another app or old Vite process | Run `npm run dev:free`, then `npm run dev`. Or close the terminal that was running Vite. |
| Page loads but login fails | Django API not running | In `backend/`: `python manage.py runserver` (with `.venv` activated). |
| "Backend unavailable" or login 403 | CSRF/session cookie issue | Restart Vite and Django. Open only the URL Vite shows. Hard-refresh the page (Ctrl+F5). |
| `GET /api/auth/me/` 401 in Django log | Normal when not logged in | Log in or use Play as Guest. |
| Opened port 8000 in the browser | That URL is API-only, not the game | Use the Vite dev URL for the game UI. |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server on http://127.0.0.1:5173 |
| `npm run dev:win` | Same as `dev`, with startup reminders (Windows) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
