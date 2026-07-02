@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_NAME=%~nx0"
set "REPO_ROOT=%~dp0.."

if /I "%~1"=="--help" goto :help
if /I "%~1"=="/?" goto :help

set "DRY_RUN=0"
if /I "%~1"=="--dry-run" (
  set "DRY_RUN=1"
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
  echo Refusing to release from detached HEAD. Please checkout a branch first.
  exit /b 1
)

for /f "delims=" %%V in ('node -p "require('./package.json').version"') do set "CURRENT_VERSION=%%V"
for /f "delims=" %%V in ('node -p "let v=process.argv[1].split('.').map(Number); ++v[2]; v.join('.')" "%CURRENT_VERSION%"') do set "NEXT_VERSION=%%V"
if not defined NEXT_VERSION (
  echo Failed to calculate next version from %CURRENT_VERSION%.
  exit /b 1
)

set "RELEASE_TAG=v%NEXT_VERSION%"
set "COMMIT_MESSAGE=release: prepare %RELEASE_TAG%"

echo Repository: %CD%
echo Branch: %CURRENT_BRANCH%
echo Current version: %CURRENT_VERSION%
echo Next version: %NEXT_VERSION%
echo Release tag: %RELEASE_TAG%
echo Commit message: %COMMIT_MESSAGE%

git rev-parse -q --verify "refs/tags/%RELEASE_TAG%" >nul 2>nul
if not errorlevel 1 (
  echo Local tag already exists: %RELEASE_TAG%
  exit /b 1
)

git ls-remote --exit-code --tags origin "refs/tags/%RELEASE_TAG%" >nul 2>nul
set "REMOTE_TAG_CHECK=%ERRORLEVEL%"
if "%REMOTE_TAG_CHECK%"=="0" (
  echo Remote tag already exists: %RELEASE_TAG%
  exit /b 1
)
if not "%REMOTE_TAG_CHECK%"=="2" (
  echo Failed to check remote tag %RELEASE_TAG%.
  exit /b 1
)

if "%DRY_RUN%"=="1" (
  echo.
  echo [dry-run] Would update package versions and CHANGELOG:
  node scripts\prepare-auto-release.mjs --dry-run
  if errorlevel 1 exit /b 1
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
  echo [dry-run] Would run: npx pnpm@9.15.0 docs:check
  echo [dry-run] Would run: npx pnpm@9.15.0 release:preview --version "%NEXT_VERSION%"
  echo [dry-run] Would run: git add -A
  echo [dry-run] Would run: git commit -m "%COMMIT_MESSAGE%"
  echo [dry-run] Would run: git tag "%RELEASE_TAG%"
  echo [dry-run] Would run: git push origin "%RELEASE_TAG%"
  echo [dry-run] No files were changed, staged, committed, tagged, or pushed.
  exit /b 0
)

echo.
echo Updating package versions and CHANGELOG...
node scripts\prepare-auto-release.mjs
if errorlevel 1 (
  echo Failed to prepare release files.
  exit /b 1
)

echo.
echo Running documentation checks...
call npx pnpm@9.15.0 docs:check
if errorlevel 1 (
  echo docs:check failed.
  exit /b 1
)

echo.
echo Validating release notes...
call npx pnpm@9.15.0 release:preview --version "%NEXT_VERSION%" >nul
if errorlevel 1 (
  echo Release notes validation failed. Check CHANGELOG.md.
  exit /b 1
)

echo.
echo Staging all changes...
git add -A
if errorlevel 1 (
  echo git add failed.
  exit /b 1
)

git diff --cached --quiet
if not errorlevel 1 (
  echo No staged changes found after preparing release.
  exit /b 1
)

echo Creating release commit...
git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 (
  echo git commit failed.
  exit /b 1
)

echo.
git rev-parse --abbrev-ref --symbolic-full-name @{u} >nul 2>nul
if errorlevel 1 (
  echo No upstream configured. Pushing and setting upstream to origin/%CURRENT_BRANCH%...
  git push -u origin "%CURRENT_BRANCH%"
) else (
  echo Pushing branch to configured upstream...
  git push
)
if errorlevel 1 (
  echo git push failed.
  exit /b 1
)

echo.
echo Creating release tag...
git tag "%RELEASE_TAG%"
if errorlevel 1 (
  echo git tag failed.
  exit /b 1
)

echo Pushing release tag...
git push origin "%RELEASE_TAG%"
if errorlevel 1 (
  echo git push tag failed.
  exit /b 1
)

echo.
echo Done. Release workflow should start from tag %RELEASE_TAG%.
exit /b 0

:help
echo Usage:
echo   tools\%SCRIPT_NAME%
echo.
echo Examples:
echo   tools\%SCRIPT_NAME%
echo   tools\%SCRIPT_NAME% --dry-run
echo.
echo Behavior:
echo   - Automatically bumps patch version, for example 0.0.10 -^> 0.0.11.
echo   - Updates root and packages/* package.json versions.
echo   - Inserts a new CHANGELOG.md section for the generated version.
echo   - Runs docs:check and release:preview for the generated version.
echo   - Stages all changes, commits, pushes the current branch, creates tag vX.Y.Z, and pushes the tag.
echo   - The pushed tag triggers the GitHub Release workflow.
exit /b 0
