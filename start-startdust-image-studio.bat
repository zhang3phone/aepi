@echo off
setlocal

for %%I in ("%~dp0.") do set "PROJECT_DIR=%%~fI"
set "APP_URL=http://127.0.0.1:5173/"
set "PID_FILE=%PROJECT_DIR%\.amazon-image-studio-dev.pid"
set "PROXY_PID_FILE=%PROJECT_DIR%\.amazon-image-studio-proxy.pid"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$project = (Resolve-Path -LiteralPath '%PROJECT_DIR%').Path;" ^
  "$appName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('5Lqa6ams6YCK5Zu+54mH5bel5L2c5Y+w'));" ^
  "$serverTitle = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('5Lqa6ams6YCK5Zu+54mH5bel5L2c5Y+w5byA5Y+R5pyN5Yqh5Zmo'));" ^
  "$projectMatch = $project;" ^
  "$pidFile = '%PID_FILE%';" ^
  "$proxyPidFile = '%PROXY_PID_FILE%';" ^
  "$ensureProxy = {" ^
  "  $proxy = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
  "  if (-not $proxy) {" ^
  "    $proxyCmd = 'title Stardust Memory API Proxy && node scripts\local-api-proxy.mjs';" ^
  "    $proxyProcess = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $proxyCmd) -WorkingDirectory $project -PassThru;" ^
  "    Set-Content -LiteralPath $proxyPidFile -Value $proxyProcess.Id -Encoding ASCII;" ^
  "    Start-Sleep -Seconds 5;" ^
  "    $proxy = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
  "    if (-not $proxy) { Write-Host 'Warning: API proxy did not start on http://127.0.0.1:3100. Check the Stardust Memory API Proxy window.'; }" ^
  "  } else {" ^
  "    Write-Host ('API proxy is already listening at http://127.0.0.1:3100. PID: ' + $proxy.OwningProcess);" ^
  "  }" ^
  "};" ^
  "$existing = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
  "if ($existing) {" ^
  "  $procInfo = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $existing.OwningProcess) -ErrorAction SilentlyContinue;" ^
  "  $commandLine = [string]$procInfo.CommandLine;" ^
  "  if ($commandLine -like ('*' + $projectMatch + '*')) {" ^
  "    & $ensureProxy;" ^
  "    Start-Process '%APP_URL%';" ^
  "    Write-Host ($appName + ' is already running at %APP_URL%');" ^
  "    exit 0;" ^
  "  }" ^
  "  Write-Host ('Port 5173 is already used by another process. Please close it first. PID: ' + $existing.OwningProcess);" ^
  "  exit 1;" ^
  "}" ^
  "$ensureScript = Join-Path $project 'scripts\ensure-dev-dependencies.ps1';" ^
  "& powershell -NoProfile -ExecutionPolicy Bypass -File $ensureScript -ProjectDir $project;" ^
  "if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE; }" ^
  "& $ensureProxy;" ^
  "$cmd = 'title ' + $serverTitle + ' && set VITE_API_PROXY_AVAILABLE=true && set VITE_API_PROXY_LOCKED=true && npm run dev:lan';" ^
  "$process = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', $cmd) -WorkingDirectory $project -PassThru;" ^
  "Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ASCII;" ^
  "Start-Sleep -Seconds 3;" ^
  "Start-Process '%APP_URL%';" ^
  "Write-Host ('Started ' + $appName + ' at %APP_URL%');"

if errorlevel 1 (
  echo.
  echo Failed to start Amazon Image Studio.
  pause
  exit /b 1
)

endlocal
