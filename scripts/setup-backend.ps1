$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$venvPython = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create .venv. Install Python 3.10+ and try again."
    }
}

Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
& $venvPython -m pip install -q -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "pip install failed." }

Set-Location (Join-Path $root "backend")
& $venvPython manage.py migrate --noinput
if ($LASTEXITCODE -ne 0) { throw "Database migration failed." }

Write-Host "Backend ready (venv + database)." -ForegroundColor Green
