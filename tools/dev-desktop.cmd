@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "REPO_ROOT=%~dp0.."

cd /d "%REPO_ROOT%" || (
  echo Failed to enter repository root.
  pause
  exit /b 1
)

echo Repository: %CD%
echo Starting d2-tools desktop development app...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_ROOT%\scripts\dev-desktop.ps1" -Fast
if errorlevel 1 (
  echo.
  echo Failed to start desktop development app.
  pause
  exit /b 1
)

exit /b 0
