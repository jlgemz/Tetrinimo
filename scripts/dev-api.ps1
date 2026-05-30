param([switch]$SkipSetup)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not $SkipSetup) {
    & (Join-Path $root "scripts\setup-backend.ps1")
}

Set-Location (Join-Path $root "backend")
$venvPython = Join-Path $root ".venv\Scripts\python.exe"

Write-Host ""
Write-Host "Tetrinimo API" -ForegroundColor Cyan
Write-Host "  http://127.0.0.1:8000/api/" -ForegroundColor Green
Write-Host "  Keep this window open while playing." -ForegroundColor DarkGray
Write-Host ""

& $venvPython manage.py runserver 127.0.0.1:8000
