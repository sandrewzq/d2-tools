@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "SCRIPT_NAME=%~nx0"
set "REPO_ROOT=%~dp0.."

if /I "%~1"=="--help" goto :help
if /I "%~1"=="/?" goto :help

set "DRY_RUN=0"
if /I "%~1"=="--dry-run" (
  set "DRY_RUN=1"
  shift
)

cd /d "%REPO_ROOT%" || (
  echo Failed to enter repository root.
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul
if errorlevel 1 (
  echo This script must be run inside a Git repository.
  exit /b 1
)

for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH (
  echo Refusing to push from detached HEAD. Please checkout a branch first.
  exit /b 1
)

set "COMMIT_MESSAGE="
:collect_message
if "%~1"=="" goto :message_done
if defined COMMIT_MESSAGE (
  set "COMMIT_MESSAGE=%COMMIT_MESSAGE% %~1"
) else (
  set "COMMIT_MESSAGE=%~1"
)
shift
goto :collect_message

:message_done
if not defined COMMIT_MESSAGE set "COMMIT_MESSAGE=chore: sync local changes"

echo Repository: %CD%
echo Branch: %CURRENT_BRANCH%
echo Commit message: %COMMIT_MESSAGE%

if "%DRY_RUN%"=="1" (
  echo.
  echo [dry-run] Current working tree changes:
  git status --short
  echo.
  git rev-parse --abbrev-ref --symbolic-full-name @{u} >nul 2>nul
  if errorlevel 1 (
    echo [dry-run] No upstream configured. Would run: git push -u origin "%CURRENT_BRANCH%"
  ) else (
    for /f "delims=" %%U in ('git rev-parse --abbrev-ref --symbolic-full-name @{u} 2^>nul') do echo [dry-run] Upstream: %%U
    echo [dry-run] Would run: git push
  )
  echo [dry-run] No files were staged, committed, or pushed.
  exit /b 0
)

echo.
echo Staging all changes...
git add -A
if errorlevel 1 (
  echo git add failed.
  exit /b 1
)

git diff --cached --quiet
if errorlevel 1 (
  echo Creating commit...
  git commit -m "%COMMIT_MESSAGE%"
  if errorlevel 1 (
    echo git commit failed.
    exit /b 1
  )
) else (
  echo No staged changes found. Skipping commit.
)

echo.
git rev-parse --abbrev-ref --symbolic-full-name @{u} >nul 2>nul
if errorlevel 1 (
  echo No upstream configured. Pushing and setting upstream to origin/%CURRENT_BRANCH%...
  git push -u origin "%CURRENT_BRANCH%"
) else (
  echo Pushing to configured upstream...
  git push
)

if errorlevel 1 (
  echo git push failed.
  exit /b 1
)

echo.
echo Done. No release tag was created.
exit /b 0

:help
echo Usage:
echo   scripts\%SCRIPT_NAME% [--dry-run] ["commit message"]
echo.
echo Examples:
echo   scripts\%SCRIPT_NAME%
echo   scripts\%SCRIPT_NAME% "chore: sync local changes"
echo   scripts\%SCRIPT_NAME% --dry-run "chore: sync local changes"
echo.
echo Behavior:
echo   - Runs from the repository root.
echo   - Stages all changes with git add -A.
echo   - Commits with the provided message, or "chore: sync local changes".
echo   - Pushes the current branch to its upstream.
echo   - If no upstream exists, pushes to origin/current-branch and sets upstream.
echo   - Does not create tags and does not publish a release.
exit /b 0
