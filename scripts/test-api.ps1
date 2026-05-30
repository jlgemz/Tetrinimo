$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8000/api"

$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "Health..." -ForegroundColor Cyan
$h = Invoke-RestMethod -Uri "$base/health/" -WebSession $s
if ($h.status -ne "ok") { throw "Health check failed" }

Write-Host "CSRF + register..." -ForegroundColor Cyan
$csrf = (Invoke-RestMethod -Uri "$base/auth/csrf/" -WebSession $s).csrfToken
$headers = @{ "X-CSRFToken" = $csrf }
$user = "apitest$((Get-Random))"
Invoke-RestMethod -Uri "$base/auth/register/" -Method POST -WebSession $s `
    -ContentType "application/json" -Headers $headers `
    -Body (@{ username = $user; password = "testpass123" } | ConvertTo-Json) | Out-Null

Write-Host "Me..." -ForegroundColor Cyan
$me = Invoke-RestMethod -Uri "$base/auth/me/" -WebSession $s
if ($me.username -ne $user) { throw "/auth/me/ failed" }

Write-Host "Submit score..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "$base/scores/" -Method POST -WebSession $s `
    -ContentType "application/json" -Headers $headers `
    -Body '{"score":1234,"lines":3}' | Out-Null

Write-Host "Leaderboard..." -ForegroundColor Cyan
$top = Invoke-RestMethod -Uri "$base/scores/?limit=5" -WebSession $s
if ($top.Count -lt 1) { throw "Leaderboard empty" }

Write-Host "All API checks passed." -ForegroundColor Green
