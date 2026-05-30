$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

& (Join-Path $root "scripts\setup-backend.ps1")

$apiScript = Join-Path $root "scripts\dev-api.ps1"
$apiRunning = $false
try {
    $conn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    if ($conn) { $apiRunning = $true }
} catch {
    # Get-NetTCPConnection may be unavailable; fall through and start API
}

if (-not $apiRunning) {
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-File", $apiScript,
        "-SkipSetup"
    )
    Write-Host "Started Django API in a new window." -ForegroundColor Yellow
} else {
    Write-Host "Django already listening on port 8000." -ForegroundColor DarkGray
}

$healthUrl = "http://127.0.0.1:8000/api/health/"
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        if ($health.status -eq "ok") {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $ready) {
    Write-Host "Warning: API not responding yet. Start it manually: npm run dev:api" -ForegroundColor Red
} else {
    Write-Host "API is online." -ForegroundColor Green
}

Write-Host ""
Write-Host "Tetrinimo" -ForegroundColor Cyan
Write-Host "  Game (open in browser): http://localhost:5173/" -ForegroundColor Green
Write-Host "  API: http://127.0.0.1:8000/api/" -ForegroundColor Green
Write-Host "  Keep this window open while playing." -ForegroundColor DarkGray
Write-Host ""

npm run dev
