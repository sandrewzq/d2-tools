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
echo Starting d2-tools desktop development app...
echo.

set "DEV_PORT=53172"
set "DEV_URL=http://127.0.0.1:%DEV_PORT%"

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %DEV_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo Desktop renderer dev server is already listening at %DEV_URL%.
  echo Opening existing renderer page without starting another process.
  start "" "%DEV_URL%"
  exit /b 0
)

call npx pnpm@9.15.0 dev:desktop
if errorlevel 1 (
  echo.
  echo Failed to start desktop development app.
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
echo   - Opens http://127.0.0.1:53172 if it is already listening.
echo   - Calls npx pnpm@9.15.0 dev:desktop.
echo   - Builds required workspace packages, starts the renderer dev server, and opens Electron.
echo   - Keeps the dev server alive until the desktop window is closed.
exit /b 0
