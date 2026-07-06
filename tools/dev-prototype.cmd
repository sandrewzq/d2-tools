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

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $port=%DEV_PORT%; $listeners=Get-NetTCPConnection -LocalPort %DEV_PORT% -State Listen -ErrorAction SilentlyContinue; if (-not $listeners) { exit 0 }; $processIds=$listeners | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($processId in $processIds) { $process=Get-Process -Id $processId -ErrorAction SilentlyContinue; if ($process) { Write-Host ('Stopping stale process on port {0}: PID {1} {2}' -f $port, $processId, $process.ProcessName); Stop-Process -Id $processId -Force } }; Start-Sleep -Milliseconds 500; if (Get-NetTCPConnection -LocalPort %DEV_PORT% -State Listen -ErrorAction SilentlyContinue) { Write-Error ('Port {0} is still in use after cleanup.' -f $port); exit 1 }; exit 0"
if errorlevel 1 (
  echo Stale process cleanup failed for %DEV_URL%.
  pause
  exit /b 1
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
echo   - Stops any stale process listening on http://127.0.0.1:53170 before starting.
echo   - Calls npx pnpm@9.15.0 dev:prototype.
echo   - Starts the React prototype dev server.
echo   - Opens the browser automatically when the dev server becomes ready.
echo   - Keep this command window open while using the prototype.
exit /b 0
