# Tetrinimo API

Django REST API for auth and leaderboard.

## Setup

From the repository root:

```powershell
npm run setup:backend
npm run dev:api
```

Or manually (with `.venv` activated):

```bash
pip install -r requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

Run **game + API together**: `npm run dev:all` (Windows).

## SQLite database

Tetrinimo uses **SQLite only** for local development. No MongoDB, PostgreSQL, or MySQL install is required.

| Item | Detail |
|------|--------|
| **File** | `backend/db.sqlite3` (gitignored) |
| **Engine** | `django.db.backends.sqlite3` in `config/settings.py` |

### App tables

| Table | Stores |
|-------|--------|
| `auth_user` | User accounts (Django built-in) |
| `api_profile` | Avatar, total score, games played (one per user) |
| `api_score` | Leaderboard entries: score, lines, timestamp |

Live Tetris gameplay stays in the browser; only accounts and scores are saved to SQLite.

### First-time setup

From the repository root:

```powershell
npm run setup:backend
```

Or manually:

```powershell
cd backend
..\.venv\Scripts\python manage.py migrate
```

### Reset database (deletes all users and scores)

```powershell
Remove-Item backend\db.sqlite3 -ErrorAction SilentlyContinue
cd backend
..\.venv\Scripts\python manage.py migrate
```

### Inspect data

**Django admin** (recommended):

```powershell
cd backend
..\.venv\Scripts\python manage.py createsuperuser
..\.venv\Scripts\python manage.py runserver
```

Open [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/) — Profile and Score are registered.

**SQLite shell:**

```powershell
cd backend
..\.venv\Scripts\python manage.py dbshell
```

Example queries: `.tables`, `SELECT * FROM api_score LIMIT 5;`, `.quit`

**Django shell:**

```powershell
..\.venv\Scripts\python manage.py shell -c "from django.contrib.auth.models import User; from api.models import Score; print(User.objects.count(), Score.objects.count())"
```

### Verify API + database

With Django running on port 8000:

```powershell
npm run test:api
```

Runs register, login session, score submit, and leaderboard read against SQLite.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health/` | Health check (used by frontend ping) |
| GET | `/api/auth/csrf/` | Set CSRF cookie |
| POST | `/api/auth/register/` | Register `{ username, password }` |
| POST | `/api/auth/login/` | Login |
| POST | `/api/auth/logout/` | Logout (session) |
| GET | `/api/auth/me/` | Current user |
| GET | `/api/scores/?limit=10` | Top scores |
| POST | `/api/scores/` | Submit score `{ score, lines }` (auth) |
| GET | `/api/scores/rank/?username=` | User rank by best score |
