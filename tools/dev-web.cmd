@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "SCRIPT_NAME=%~nx0"
set "REPO_ROOT=%~dp0.."

if /I "%~1"=="--help" goto :help
if /I "%~1"=="/?" goto :help

cd /d "%REPO_ROOT%" || (
  echo Failed to enter repository root.
  pause
  exit /b 1
)

echo Repository: %CD%
echo Starting d2-tools web development app...
echo.

set "DEV_PORT=53171"
set "DEV_URL=http://127.0.0.1:%DEV_PORT%"

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %DEV_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo Web dev server is already listening at %DEV_URL%.
  echo Opening existing server without starting another process.
  start "" "%DEV_URL%"
  exit /b 0
)

call npx pnpm@9.15.0 dev:web
if errorlevel 1 (
  echo.
  echo Failed to start web development app.
  pause
  exit /b 1
)

exit /b 0

:help
echo Usage:
echo   tools\%SCRIPT_NAME%
echo.
echo Behavior:
echo   - Runs from the repository root.
echo   - Opens http://127.0.0.1:53171 if it is already listening.
echo   - Calls npx pnpm@9.15.0 dev:web.
echo   - Starts the web platform dev server.
echo   - Keep this command window open while using the web app.
exit /b 0
