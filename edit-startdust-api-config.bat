@echo off
setlocal

set "PROJECT_DIR=D:\codex\amazon photo\amazon-image-studio-main"
set "ENV_FILE=%PROJECT_DIR%\.env.local"

if not exist "%ENV_FILE%" (
  copy "%PROJECT_DIR%\.env.local.example" "%ENV_FILE%" >nul
)

notepad.exe "%ENV_FILE%"
