@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "GIT_PAGER=cat"
set "PAGER=cat"
set "SCRIPT_NAME=%~nx0"
set "REPO_ROOT=%~dp0.."
set "FAILURE_STAGE=Unknown release step"
set "FAILURE_HINT=Review the command output above, fix the problem, and run this script again."
set "FAILURE_SAFETY=No commit, push, tag, or GitHub Release was created."

if /I "%~1"=="--help" goto :help
if /I "%~1"=="/?" goto :help

set "DRY_RUN=0"
if /I "%~1"=="--dry-run" (
  set "DRY_RUN=1"
)

cd /d "%REPO_ROOT%" || (
  set "FAILURE_STAGE=Enter repository root"
  set "FAILURE_HINT=Check that the repository path still exists and is accessible."
  goto :release_failed
)

git rev-parse --is-inside-work-tree >nul
if errorlevel 1 (
  set "FAILURE_STAGE=Validate Git repository"
  set "FAILURE_HINT=Run the script from the d2-service repository."
  goto :release_failed
)

for /f "delims=" %%B in ('git branch --show-current 2^>nul') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH (
  set "FAILURE_STAGE=Read current Git branch"
  set "FAILURE_HINT=Checkout a branch before releasing; detached HEAD is not supported."
  goto :release_failed
)

for /f "delims=" %%V in ('node -p "require('./package.json').version"') do set "CURRENT_VERSION=%%V"
set "CURRENT_TAG=v%CURRENT_VERSION%"
for /f "delims=" %%V in ('node -p "let v=process.argv[1].split('.').map(Number); ++v[2]; v.join('.')" "%CURRENT_VERSION%"') do set "NEXT_VERSION=%%V"
if not defined NEXT_VERSION (
  set "FAILURE_STAGE=Calculate next version from %CURRENT_VERSION%"
  set "FAILURE_HINT=Check that package.json uses a numeric x.y.z version."
  goto :release_failed
)

where gh >nul 2>nul
if errorlevel 1 (
  set "FAILURE_STAGE=Find GitHub CLI"
  set "FAILURE_HINT=Install gh and authenticate it before releasing."
  goto :release_failed
)

gh repo view >nul 2>nul
if errorlevel 1 (
  set "FAILURE_STAGE=Query GitHub repository"
  set "FAILURE_HINT=Check the network connection and run gh auth status."
  goto :release_failed
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
    set "FAILURE_STAGE=Check remote tag %RELEASE_TAG%"
    set "FAILURE_HINT=Check the network connection and origin remote permissions."
    goto :release_failed
  )
)

if "%RELEASE_MODE%"=="bump-patch" (
  git rev-parse -q --verify "refs/tags/%RELEASE_TAG%" >nul 2>nul
  if not errorlevel 1 (
    set "FAILURE_STAGE=Validate local target tag %RELEASE_TAG%"
    set "FAILURE_HINT=The target tag already exists locally. Inspect it before retrying the release."
    goto :release_failed
  )

  if "%REMOTE_TAG_CHECK%"=="0" (
    set "FAILURE_STAGE=Validate remote target tag %RELEASE_TAG%"
    set "FAILURE_HINT=The target tag already exists on origin. Inspect the existing release state first."
    goto :release_failed
  )
)

if "%DRY_RUN%"=="1" (
  echo.
  echo [dry-run] Release mode: %RELEASE_MODE%
  if "%RELEASE_MODE%"=="bump-patch" (
    echo [dry-run] Would update package versions and CHANGELOG:
    node scripts\prepare-auto-release.mjs --dry-run
    if errorlevel 1 (
      set "FAILURE_STAGE=Preview release file preparation"
      set "FAILURE_HINT=The dry-run version or CHANGELOG preparation failed. Review the error above."
      goto :release_failed
    )
  ) else (
    echo [dry-run] Would reuse current package version and CHANGELOG section for %TARGET_VERSION%.
  )
  echo.
  echo [dry-run] Current working tree changes:
  git status --short
  echo.
  echo [dry-run] Would run local CI before changing release files:
  echo [dry-run]   npx pnpm@9.15.0 install --frozen-lockfile
  echo [dry-run]   npx pnpm@9.15.0 test
  echo [dry-run]   npx pnpm@9.15.0 typecheck
  echo.
  git rev-parse --abbrev-ref --symbolic-full-name @{u} >nul 2>nul
  if errorlevel 1 (
    echo [dry-run] No upstream configured. Would run: git push -u origin "%CURRENT_BRANCH%"
  ) else (
    for /f "delims=" %%U in ('git rev-parse --abbrev-ref --symbolic-full-name @{u} 2^>nul') do echo [dry-run] Upstream: %%U
    echo [dry-run] Would run: git push
  )
  echo [dry-run] Would run: npx pnpm@9.15.0 verify:release
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

echo.
echo ============================================================
echo Running local CI before any release files are changed...
echo This must pass before commit, push, tag, or GitHub Release.
echo ============================================================

echo.
echo [Local CI 1/3] Installing dependencies with frozen lockfile...
call npx pnpm@9.15.0 install --frozen-lockfile
if errorlevel 1 (
  set "FAILURE_STAGE=Local CI dependency installation"
  set "FAILURE_HINT=The lockfile or dependency installation failed. Review the pnpm output above."
  goto :release_failed
)

echo.
echo [Local CI 2/3] Running the release test gate...
call npx pnpm@9.15.0 test
if errorlevel 1 (
  set "FAILURE_STAGE=Local CI release test gate"
  set "FAILURE_HINT=A behavior, architecture, documentation, build, or test-quality check failed. The exact failure is shown above."
  goto :release_failed
)

echo.
echo [Local CI 3/3] Running the full typecheck...
call npx pnpm@9.15.0 typecheck
if errorlevel 1 (
  set "FAILURE_STAGE=Local CI typecheck"
  set "FAILURE_HINT=TypeScript reported an error. The package, file, and line are shown above."
  goto :release_failed
)

echo.
echo Local CI passed. Release preparation can continue.

if "%RELEASE_MODE%"=="bump-patch" (
  echo.
  echo Updating package versions and CHANGELOG...
  node scripts\prepare-auto-release.mjs
  if errorlevel 1 (
    set "FAILURE_STAGE=Prepare release files"
    set "FAILURE_HINT=Version or CHANGELOG preparation failed. Review the error above."
    goto :release_failed
  )
) else (
  echo.
  echo Reusing package version and CHANGELOG for %TARGET_VERSION% because %CURRENT_TAG% has no GitHub Release.
)

echo.
echo Running release-specific checks after version preparation...
call npx pnpm@9.15.0 verify:release
if errorlevel 1 (
  set "FAILURE_STAGE=Release-specific validation"
  set "FAILURE_HINT=Release metadata, documentation, or release tests failed. Review the output above."
  goto :release_failed
)

echo.
echo Validating release notes...
call npx pnpm@9.15.0 release:preview --version "%TARGET_VERSION%" >nul
if errorlevel 1 (
  set "FAILURE_STAGE=Validate release notes for %TARGET_VERSION%"
  set "FAILURE_HINT=Check that CHANGELOG.md contains a valid section for the target version."
  goto :release_failed
)

echo.
echo Staging all changes...
git add -A
if errorlevel 1 (
  set "FAILURE_STAGE=Stage release changes"
  set "FAILURE_HINT=Git could not stage the working tree. Review the Git error above."
  goto :release_failed
)

git diff --cached --quiet
if not errorlevel 1 (
  if "%RELEASE_MODE%"=="bump-patch" (
    set "FAILURE_STAGE=Confirm prepared release changes"
    set "FAILURE_HINT=No staged changes were found after preparing a new patch release."
    goto :release_failed
  )
  echo No staged changes found; retrying release tag from current HEAD.
) else (
  echo Creating release commit...
  git commit -m "%COMMIT_MESSAGE%"
  if errorlevel 1 (
    set "FAILURE_STAGE=Create release commit"
    set "FAILURE_HINT=Git commit failed. Review hooks, identity configuration, and the Git output above."
    goto :release_failed
  )
  set "FAILURE_SAFETY=A local release commit may exist, but no successful push, tag, or GitHub Release was confirmed."
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
  set "FAILURE_STAGE=Push release branch"
  set "FAILURE_HINT=The branch push failed. Check the network, upstream branch, and repository permissions."
  goto :release_failed
)
set "FAILURE_SAFETY=The release branch was pushed, but no release tag or GitHub Release was confirmed."

echo.
if "%RELEASE_MODE%"=="retry-current" (
  echo Updating release tag...
  git tag -f "%RELEASE_TAG%"
  if errorlevel 1 (
    set "FAILURE_STAGE=Update local release tag %RELEASE_TAG%"
    set "FAILURE_HINT=Git could not update the local release tag. Review the Git output above."
    goto :release_failed
  )
  set "FAILURE_SAFETY=The release branch was pushed and the local tag may exist, but the remote tag and GitHub Release were not confirmed."

  echo Force pushing release tag because GitHub Release is missing for %RELEASE_TAG%...
  git push --force origin "%RELEASE_TAG%"
  if errorlevel 1 (
    set "FAILURE_STAGE=Force push release tag %RELEASE_TAG%"
    set "FAILURE_HINT=The remote release tag update failed. Check network access and tag permissions."
    goto :release_failed
  )
) else (
  echo Creating release tag...
  git tag "%RELEASE_TAG%"
  if errorlevel 1 (
    set "FAILURE_STAGE=Create local release tag %RELEASE_TAG%"
    set "FAILURE_HINT=Git could not create the local release tag. Review the Git output above."
    goto :release_failed
  )
  set "FAILURE_SAFETY=The release branch was pushed and the local tag may exist, but the remote tag and GitHub Release were not confirmed."

  echo Pushing release tag...
  git push origin "%RELEASE_TAG%"
  if errorlevel 1 (
    set "FAILURE_STAGE=Push release tag %RELEASE_TAG%"
    set "FAILURE_HINT=The remote release tag push failed. Check network access and tag permissions."
    goto :release_failed
  )
)

echo.
echo Done. Release workflow should start from tag %RELEASE_TAG%.
exit /b 0

:release_failed
echo.
echo ============================================================
echo RELEASE STOPPED
echo Failure stage: %FAILURE_STAGE%
echo Reason or next step: %FAILURE_HINT%
echo %FAILURE_SAFETY%
echo.
echo The detailed command output is still visible above.
echo Fix the reported problem, then run tools\%SCRIPT_NAME% again.
echo ============================================================
echo.
pause
exit /b 1

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
echo   - Before changing release files, runs the same local CI gate as GitHub: frozen install, release test gate, and full typecheck.
echo   - Stops before commit or push when local CI fails, shows the failing stage and command output, and waits for a key press.
echo   - Runs verify:release and release:preview for the target version after release files are prepared.
echo   - Stages all changes, commits if needed, pushes the current branch, creates or updates tag vX.Y.Z, and pushes the tag.
echo   - The pushed tag triggers the GitHub Release workflow.
exit /b 0
