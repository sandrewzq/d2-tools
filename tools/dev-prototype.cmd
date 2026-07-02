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
echo Starting d2-tools prototype development app...
echo.

set "DEV_PORT=53170"
set "DEV_URL=http://127.0.0.1:%DEV_PORT%"

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %DEV_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo Prototype dev server is already listening at %DEV_URL%.
  echo Opening existing server without starting another process.
  start "" "%DEV_URL%"
  exit /b 0
)

echo Browser will open automatically when %DEV_URL% is ready.
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "$port=%DEV_PORT%; $url='%DEV_URL%'; for ($i=0; $i -lt 120; $i++) { if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { Start-Process $url; exit 0 }; Start-Sleep -Milliseconds 500 }; exit 1"

call npx pnpm@9.15.0 dev:prototype
if errorlevel 1 (
  echo.
  echo Failed to start prototype development app.
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
echo   - Opens http://127.0.0.1:53170 if it is already listening.
echo   - Calls npx pnpm@9.15.0 dev:prototype.
echo   - Starts the React prototype dev server.
echo   - Opens the browser automatically when the dev server becomes ready.
echo   - Keep this command window open while using the prototype.
exit /b 0
