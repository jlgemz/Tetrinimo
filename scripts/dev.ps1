$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host ""
Write-Host "Tetrinimo dev server" -ForegroundColor Cyan
Write-Host "  Game (open in browser): http://localhost:5173/" -ForegroundColor Green
Write-Host "  API (separate terminal): cd backend; python manage.py runserver" -ForegroundColor Yellow
Write-Host "  Keep this window open while playing." -ForegroundColor DarkGray
Write-Host ""

npm run dev
