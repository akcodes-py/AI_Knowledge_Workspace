# Fast smoke (<60s): health + documents + DB tables. Red = stop, fix, replan.
$fail = 0
try { $h = Invoke-RestMethod -Uri http://localhost:8001/health -TimeoutSec 15; Write-Host "health: $($h.ok) llm=$($h.llm)" }
catch { Write-Host "FAIL health"; $fail = 1 }
try { $d = Invoke-RestMethod -Uri http://localhost:8001/documents/ -TimeoutSec 15; Write-Host "documents: $($d.Count) rows" }
catch { Write-Host "FAIL documents"; $fail = 1 }
try { & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -d ai_workspace -t -c "SELECT count(*) FROM chunks;" }
catch { Write-Host "FAIL db"; $fail = 1 }
if ($fail) { Write-Host "SMOKE RED - stop and fix"; exit 1 } else { Write-Host "SMOKE GREEN" }
