@echo off
setlocal

set "PROJECT_DIR=D:\codex\amazon photo\amazon-image-studio-main"
set "APP_URL=http://127.0.0.1:5173/"
set "LAN_URL=http://192.168.110.91:5173/"
set "PROXY_URL=http://127.0.0.1:3100/"
set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"

title Duncan Image Center Local Server

if not exist "%NPM_CMD%" set "NPM_CMD=npm.cmd"

set "VITE_API_PROXY_AVAILABLE=true"
set "VITE_API_PROXY_LOCKED=true"

if not exist "%PROJECT_DIR%\package.json" (
  echo Project folder was not found:
  echo %PROJECT_DIR%
  echo.
  pause
  exit /b 1
)

set "RUNNING_PID="
set "LAN_BIND="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do set "RUNNING_PID=%%P"
for /f "tokens=1" %%P in ('netstat -ano ^| findstr /R /C:"0\.0\.0\.0:5173 .*LISTENING" /C:"\[::\]:5173 .*LISTENING"') do set "LAN_BIND=1"

if defined RUNNING_PID (
  if defined LAN_BIND (
    echo Duncan Image Center is already running in LAN mode.
    echo Local: %APP_URL%
    echo LAN:   %LAN_URL%
    start "" "%LAN_URL%"
  ) else (
    echo Port 5173 is already used by another local-only service.
    echo Please close the old Duncan Image Center server window first, then run this BAT again.
  )
  echo.
  pause
  exit /b 0
)

set "PROXY_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:"127\.0\.0\.1:3100 .*LISTENING"') do set "PROXY_PID=%%P"

if not defined PROXY_PID (
  echo Starting Duncan API proxy...
  start "Duncan API Proxy" /D "%PROJECT_DIR%" cmd.exe /k node scripts\local-api-proxy.mjs
  timeout /t 2 >nul
) else (
  echo Duncan API proxy is already running at %PROXY_URL%
)

cd /d "%PROJECT_DIR%"
echo Starting Duncan Image Center...
echo.
echo Keep this window open. Closing it will stop the local service.
echo Keep the "Duncan API Proxy" window open too. It stores API keys on this host.
echo Local: %APP_URL%
echo LAN:   %LAN_URL%
echo Proxy: %PROXY_URL%
echo.
echo Browser will open now. If the page loads before the service is ready, refresh it after a few seconds.
echo.

start "" "%LAN_URL%"
"%NPM_CMD%" run dev -- --host 0.0.0.0 --port 5173 --strictPort

echo.
echo Duncan Image Center service stopped.
pause
