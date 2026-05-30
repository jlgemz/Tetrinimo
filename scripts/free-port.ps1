param([int]$Port = 5173)

$lines = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
if (-not $lines) {
  Write-Host "Port $Port is free."
  exit 0
}

$pids = $lines | ForEach-Object {
  ($_ -split '\s+')[-1]
} | Select-Object -Unique

foreach ($procId in $pids) {
  Write-Host "Stopping PID $procId (port $Port)..."
  taskkill /PID $procId /F 2>$null
}

Write-Host "Port $Port is now free."
