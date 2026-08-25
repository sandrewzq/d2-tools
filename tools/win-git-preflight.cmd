@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "SCRIPT_NAME=%~nx0"
set "REPO_ROOT=%~dp0.."

cd /d "%REPO_ROOT%" || (
  echo Failed to enter repository root.
  exit /b 1
)

node scripts\git-preflight.mjs %*
exit /b %ERRORLEVEL%
