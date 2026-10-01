# Double-click to (re)start backend detached. Kills stale :8001 first.
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
$backend = Join-Path $root "backend"
$log = Join-Path $root "server.log"
$conn = Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force; Start-Sleep -Seconds 2 }
Start-Process -FilePath "python" -ArgumentList "-m","uvicorn","app.main:app","--port","8001" `
  -WorkingDirectory $backend -WindowStyle Hidden `
  -RedirectStandardOutput $log -RedirectStandardError "$log.err"
Start-Sleep -Seconds 12
try { Invoke-RestMethod -Uri http://localhost:8001/health -TimeoutSec 15; Write-Host "SERVER UP" }
catch { Write-Host "START FAILED - see $log"; Get-Content $log -Tail 20 }
