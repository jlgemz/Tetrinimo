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

**Recommended (Windows):**

```powershell
npm run dev:all
```

This creates `.venv`, runs migrations, opens Django in a second window, and starts Vite. Open **http://localhost:5173/** when the terminal shows `ready`.

**Manual (two terminals):**

1. `npm run dev:api` — Django on port 8000
2. `npm run dev` — Vite on port 5173

Register or log in from the game modal. Guest play works without an account; scores are saved only when logged in.

### Windows shortcut

`npm run dev:win` is the same as `npm run dev:all`.

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
| `npm run dev:all` | Backend + frontend (Windows; recommended) |
| `npm run dev:api` | Django API only (auto setup venv + migrate) |
| `npm run setup:backend` | Create `.venv`, install deps, migrate DB |
| `npm run dev` | Vite dev server on http://127.0.0.1:5173 |
| `npm run dev:win` | Same as `dev:all` |
| `npm run dev:free:api` | Free port 8000 if Django is stuck |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
