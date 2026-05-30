# Tetrinimo API

Django REST API for auth and leaderboard.

## Setup

From the repository root (with `.venv` activated):

```bash
pip install -r requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/csrf/` | Set CSRF cookie |
| POST | `/api/auth/register/` | Register `{ username, password }` |
| POST | `/api/auth/login/` | Login |
| POST | `/api/auth/logout/` | Logout (session) |
| GET | `/api/auth/me/` | Current user |
| GET | `/api/scores/?limit=10` | Top scores |
| POST | `/api/scores/` | Submit score `{ score, lines }` (auth) |
| GET | `/api/scores/rank/?username=` | User rank by best score |
