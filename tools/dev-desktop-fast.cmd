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
echo Starting d2-tools desktop development app with safe fast-start detection...
echo.

set "DEV_PORT=53172"
set "DEV_URL=http://127.0.0.1:%DEV_PORT%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $port=%DEV_PORT%; $listeners=Get-NetTCPConnection -LocalPort %DEV_PORT% -State Listen -ErrorAction SilentlyContinue; if (-not $listeners) { exit 0 }; $processIds=$listeners | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($processId in $processIds) { $process=Get-Process -Id $processId -ErrorAction SilentlyContinue; if ($process) { Write-Host ('Stopping stale process on port {0}: PID {1} {2}' -f $port, $processId, $process.ProcessName); Stop-Process -Id $processId -Force } }; Start-Sleep -Milliseconds 500; if (Get-NetTCPConnection -LocalPort %DEV_PORT% -State Listen -ErrorAction SilentlyContinue) { Write-Error ('Port {0} is still in use after cleanup.' -f $port); exit 1 }; exit 0"
if errorlevel 1 (
  echo Stale process cleanup failed for %DEV_URL%.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\scripts\dev-desktop.ps1" -Fast
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
echo   - Reuses current workspace, Electron main, and preload outputs when safe.
echo   - Rebuilds only changed core, http, services, main, or preload layers.
echo   - Falls back to a full build when outputs are missing or dependency/build configuration changed.
echo   - Renderer, UI, and CSS-only changes start without a prebuild.
echo   - Keeps the dev server alive until the desktop window is closed.
exit /b 0
