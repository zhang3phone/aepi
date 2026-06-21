@echo off
setlocal

for %%I in ("%~dp0.") do set "PROJECT_DIR=%%~fI"
set "ENV_FILE=%PROJECT_DIR%\.env.local"

if not exist "%ENV_FILE%" (
  copy "%PROJECT_DIR%\.env.local.example" "%ENV_FILE%" >nul
)

notepad.exe "%ENV_FILE%"
