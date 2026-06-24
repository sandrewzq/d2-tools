# d2-tools Tauri development desktop launcher.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev-desktop.ps1
# Keep this file ASCII-only: Windows PowerShell -File may parse UTF-8 without BOM as ANSI.

$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$npx = "npx.cmd"

function Invoke-Checked {
  param(
    [string] $FilePath,
    [string[]] $ArgumentList
  )

  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($ArgumentList -join ' ')"
  }
}

Push-Location $rootDir
try {
  Write-Host "=== 1/2 Build workspace dependencies ===" -ForegroundColor Cyan
  Invoke-Checked $npx @("pnpm@9.15.0", "--filter", "@d2-tools/desktop", "build:deps")

  Write-Host ""
  Write-Host "=== 2/2 Start Tauri dev desktop ===" -ForegroundColor Cyan
  Write-Host "Vite HMR is handled by tauri dev. Restart this command after Rust, Cargo, or Tauri config changes." -ForegroundColor Green
  Invoke-Checked $npx @("pnpm@9.15.0", "--filter", "@d2-tools/desktop", "dev:desktop")
} finally {
  Pop-Location
}
