@echo off
setlocal

for %%I in ("%~dp0.") do set "PROJECT_DIR=%%~fI"
set "PID_FILE=%PROJECT_DIR%\.stardust-memory-dev.pid"
set "PROXY_PID_FILE=%PROJECT_DIR%\.stardust-memory-proxy.pid"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$project = (Resolve-Path -LiteralPath '%PROJECT_DIR%').Path;" ^
  "$appName = 'AEPI03-Stardust Memory';" ^
  "$pidFile = '%PID_FILE%';" ^
  "$proxyPidFile = '%PROXY_PID_FILE%';" ^
  "$stopped = $false;" ^
  "if (Test-Path -LiteralPath $pidFile) {" ^
  "  $rawPid = (Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1);" ^
  "  $pidValue = 0;" ^
  "  if ([int]::TryParse($rawPid, [ref]$pidValue)) {" ^
  "    $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue;" ^
  "    if ($proc) {" ^
  "      Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue;" ^
  "      $stopped = $true;" ^
  "    }" ^
  "  }" ^
  "  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue;" ^
  "}" ^
  "if (Test-Path -LiteralPath $proxyPidFile) {" ^
  "  $rawProxyPid = (Get-Content -LiteralPath $proxyPidFile -ErrorAction SilentlyContinue | Select-Object -First 1);" ^
  "  $proxyPidValue = 0;" ^
  "  if ([int]::TryParse($rawProxyPid, [ref]$proxyPidValue)) {" ^
  "    $proxyProc = Get-Process -Id $proxyPidValue -ErrorAction SilentlyContinue;" ^
  "    if ($proxyProc) {" ^
  "      Stop-Process -Id $proxyPidValue -Force -ErrorAction SilentlyContinue;" ^
  "      $stopped = $true;" ^
  "    }" ^
  "  }" ^
  "  Remove-Item -LiteralPath $proxyPidFile -Force -ErrorAction SilentlyContinue;" ^
  "}" ^
  "$listeners = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue;" ^
  "foreach ($listener in $listeners) {" ^
  "  $owner = $listener.OwningProcess;" ^
  "  if (-not $owner) { continue }" ^
  "  $procInfo = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $owner) -ErrorAction SilentlyContinue;" ^
  "  $commandLine = [string]$procInfo.CommandLine;" ^
  "  if ($commandLine -like ('*' + $project + '*')) {" ^
  "    Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue;" ^
  "    $stopped = $true;" ^
  "  } else {" ^
  "    Write-Host ('Port 5173 is used by another process, skipped PID ' + $owner);" ^
  "  }" ^
  "}" ^
  "$proxyListeners = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue;" ^
  "foreach ($listener in $proxyListeners) {" ^
  "  $owner = $listener.OwningProcess;" ^
  "  if (-not $owner) { continue }" ^
  "  $procInfo = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $owner) -ErrorAction SilentlyContinue;" ^
  "  $commandLine = [string]$procInfo.CommandLine;" ^
  "  if ($commandLine -like ('*' + $project + '*') -and $commandLine -like '*local-api-proxy.mjs*') {" ^
  "    Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue;" ^
  "    $stopped = $true;" ^
  "  }" ^
  "}" ^
  "if ($stopped) { Write-Host ($appName + ' dev server stopped.') } else { Write-Host ('No ' + $appName + ' dev server was found.') }"

endlocal

