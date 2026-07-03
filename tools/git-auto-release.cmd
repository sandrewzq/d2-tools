@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "GIT_PAGER=cat"
set "PAGER=cat"
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
set "CURRENT_TAG=v%CURRENT_VERSION%"
for /f "delims=" %%V in ('node -p "let v=process.argv[1].split('.').map(Number); ++v[2]; v.join('.')" "%CURRENT_VERSION%"') do set "NEXT_VERSION=%%V"
if not defined NEXT_VERSION (
  echo Failed to calculate next version from %CURRENT_VERSION%.
  exit /b 1
)

where gh >nul 2>nul
if errorlevel 1 (
  echo GitHub CLI is required to check whether %CURRENT_TAG% was released successfully.
  exit /b 1
)

gh repo view >nul 2>nul
if errorlevel 1 (
  echo Failed to query GitHub repository with gh. Check network and authentication before releasing.
  exit /b 1
)

gh release view "%CURRENT_TAG%" >nul 2>nul
if errorlevel 1 (
  set "RELEASE_MODE=retry-current"
  set "TARGET_VERSION=%CURRENT_VERSION%"
  set "RELEASE_TAG=%CURRENT_TAG%"
  set "COMMIT_MESSAGE=release: retry %CURRENT_TAG%"
) else (
  set "RELEASE_MODE=bump-patch"
  set "TARGET_VERSION=%NEXT_VERSION%"
  set "RELEASE_TAG=v%NEXT_VERSION%"
  set "COMMIT_MESSAGE=release: prepare v%NEXT_VERSION%"
)

echo Repository: %CD%
echo Branch: %CURRENT_BRANCH%
echo Current version: %CURRENT_VERSION%
echo Next version: %NEXT_VERSION%
echo Release mode: %RELEASE_MODE%
echo Target version: %TARGET_VERSION%
echo Release tag: %RELEASE_TAG%
echo Commit message: %COMMIT_MESSAGE%

git ls-remote --exit-code --tags origin "refs/tags/%RELEASE_TAG%" >nul 2>nul
set "REMOTE_TAG_CHECK=%ERRORLEVEL%"
if not "%REMOTE_TAG_CHECK%"=="2" (
  if not "%REMOTE_TAG_CHECK%"=="0" (
    echo Failed to check remote tag %RELEASE_TAG%.
    exit /b 1
  )
)

if "%RELEASE_MODE%"=="bump-patch" (
  git rev-parse -q --verify "refs/tags/%RELEASE_TAG%" >nul 2>nul
  if not errorlevel 1 (
    echo Local target tag already exists: %RELEASE_TAG%
    exit /b 1
  )

  if "%REMOTE_TAG_CHECK%"=="0" (
    echo Remote target tag already exists: %RELEASE_TAG%
    exit /b 1
  )
)

if "%DRY_RUN%"=="1" (
  echo.
  echo [dry-run] Release mode: %RELEASE_MODE%
  if "%RELEASE_MODE%"=="bump-patch" (
    echo [dry-run] Would update package versions and CHANGELOG:
    node scripts\prepare-auto-release.mjs --dry-run
    if errorlevel 1 exit /b 1
  ) else (
    echo [dry-run] Would reuse current package version and CHANGELOG section for %TARGET_VERSION%.
  )
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
  echo [dry-run] Would run: npx pnpm@9.15.0 check
  echo [dry-run] Would run: npx pnpm@9.15.0 test:docs
  echo [dry-run] Would run: npx pnpm@9.15.0 release:preview --version "%TARGET_VERSION%"
  echo [dry-run] Would run: git add -A
  echo [dry-run] Would commit staged changes if present: git commit -m "%COMMIT_MESSAGE%"
  if "%RELEASE_MODE%"=="retry-current" (
    echo [dry-run] Would run: git tag -f "%RELEASE_TAG%"
    echo [dry-run] Would run: git push --force origin "%RELEASE_TAG%"
  ) else (
    echo [dry-run] Would run: git tag "%RELEASE_TAG%"
    echo [dry-run] Would run: git push origin "%RELEASE_TAG%"
  )
  echo [dry-run] No files were changed, staged, committed, tagged, or pushed.
  exit /b 0
)

if "%RELEASE_MODE%"=="bump-patch" (
  echo.
  echo Updating package versions and CHANGELOG...
  node scripts\prepare-auto-release.mjs
  if errorlevel 1 (
    echo Failed to prepare release files.
    exit /b 1
  )
) else (
  echo.
  echo Reusing package version and CHANGELOG for %TARGET_VERSION% because %CURRENT_TAG% has no GitHub Release.
)

echo.
echo Running fast checks...
call npx pnpm@9.15.0 check
if errorlevel 1 (
  echo check failed.
  exit /b 1
)

echo.
echo Running documentation policy tests...
call npx pnpm@9.15.0 test:docs
if errorlevel 1 (
  echo test:docs failed.
  exit /b 1
)

echo.
echo Validating release notes...
call npx pnpm@9.15.0 release:preview --version "%TARGET_VERSION%" >nul
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
  if "%RELEASE_MODE%"=="bump-patch" (
    echo No staged changes found after preparing release.
    exit /b 1
  )
  echo No staged changes found; retrying release tag from current HEAD.
) else (
  echo Creating release commit...
  git commit -m "%COMMIT_MESSAGE%"
  if errorlevel 1 (
    echo git commit failed.
    exit /b 1
  )
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
if "%RELEASE_MODE%"=="retry-current" (
  echo Updating release tag...
  git tag -f "%RELEASE_TAG%"
  if errorlevel 1 (
    echo git tag failed.
    exit /b 1
  )

  echo Force pushing release tag because GitHub Release is missing for %RELEASE_TAG%...
  git push --force origin "%RELEASE_TAG%"
  if errorlevel 1 (
    echo git push tag failed.
    exit /b 1
  )
) else (
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
echo   - Checks whether the current package version already has a GitHub Release.
echo   - If the current release is missing, reuses the current version and force-updates that tag.
echo   - If the current release exists, bumps patch version, for example 0.0.10 -^> 0.0.11.
echo   - Updates root and packages/* package.json versions only in bump-patch mode.
echo   - Inserts a new CHANGELOG.md section only in bump-patch mode.
echo   - Runs check, test:docs and release:preview for the target version.
echo   - Stages all changes, commits if needed, pushes the current branch, creates or updates tag vX.Y.Z, and pushes the tag.
echo   - The pushed tag triggers the GitHub Release workflow.
exit /b 0
