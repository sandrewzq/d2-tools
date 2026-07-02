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
echo.
powershell -NoProfile -Command ^
  "$ports = @(@{Name='prototype';Port=53170}, @{Name='web';Port=53171}, @{Name='desktop';Port=53172});" ^
  "$rows = foreach ($item in $ports) {" ^
  "  $conn = Get-NetTCPConnection -LocalPort $item.Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
  "  if ($conn) {" ^
  "    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue;" ^
  "    [pscustomobject]@{Name=$item.Name; Url=('http://127.0.0.1:' + $item.Port); Status='in-use'; PID=$conn.OwningProcess; Process=$proc.ProcessName}" ^
  "  } else {" ^
  "    [pscustomobject]@{Name=$item.Name; Url=('http://127.0.0.1:' + $item.Port); Status='free'; PID=''; Process=''}" ^
  "  }" ^
  "};" ^
  "$rows | Format-Table -AutoSize"

exit /b 0

:help
echo Usage:
echo   tools\%SCRIPT_NAME%
echo.
echo Behavior:
echo   - Shows whether desktop/prototype/web dev ports are free or in use.
echo   - Does not start or stop any process.
exit /b 0
