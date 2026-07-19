# d2-tools development desktop launcher.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev-desktop.ps1
# Keep this file ASCII-only: Windows PowerShell -File may parse UTF-8 without BOM as ANSI.

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$desktopDir = Join-Path $rootDir "packages\desktop"
$npx = "npx.cmd"
$node = (Get-Command "node.exe" -ErrorAction Stop).Source
$rendererPort = 53172
$rendererUrl = "http://127.0.0.1:${rendererPort}"
$previousRendererUrl = $env:D2_RENDERER_URL
$viteProcess = $null
$viteCli = Join-Path $desktopDir "node_modules\vite\bin\vite.js"

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

function Assert-FileExists {
  param(
    [string] $Path,
    [string] $Message
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw $Message
  }
}

function Stop-ProcessTree {
  param(
    [System.Diagnostics.Process] $Process
  )

  if ($null -eq $Process) {
    return
  }

  try {
    if (-not $Process.HasExited) {
      Write-Host ""
      Write-Host "Stopping renderer dev server..." -ForegroundColor Yellow
      & taskkill.exe /PID $Process.Id /T /F | Out-Null
    }
  } catch {
    Write-Host "Failed to stop renderer dev server: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

function Stop-StaleDesktopProcesses {
  $staleProcesses = Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" |
    Where-Object { $_.CommandLine -like "*dist/main/main.js*" }

  foreach ($staleProcess in $staleProcesses) {
    Write-Host "Stopping stale d2-tools desktop process: PID $($staleProcess.ProcessId)" -ForegroundColor Yellow
    & taskkill.exe /PID $staleProcess.ProcessId /T /F | Out-Null
  }

  if ($staleProcesses) {
    Start-Sleep -Milliseconds 500
  }
}

function Wait-RendererServer {
  param(
    [System.Diagnostics.Process] $Process,
    [string] $RendererUrl
  )

  Write-Host "Waiting for renderer dev server at $RendererUrl..." -ForegroundColor Cyan
  for ($attempt = 1; $attempt -le 60; $attempt++) {
    if ($Process.HasExited) {
      throw "Renderer dev server exited. Check the Vite output above."
    }

    try {
      Invoke-WebRequest -Uri $RendererUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  throw "Renderer dev server timed out. Check whether port $rendererPort is already in use."
}

Push-Location $rootDir
try {
  Stop-StaleDesktopProcesses

  Write-Host "=== 1/3 Build workspace packages ===" -ForegroundColor Cyan
  Invoke-Checked $npx @("pnpm@9.15.0", "--filter", "@d2-tools/core", "build")
  Invoke-Checked $npx @("pnpm@9.15.0", "--filter", "@d2-tools/http", "build")
  Invoke-Checked $npx @("pnpm@9.15.0", "--filter", "@d2-tools/services", "build")

  Write-Host ""
  Write-Host "=== 2/3 Build Electron main process and preload ===" -ForegroundColor Cyan
  Remove-Item -LiteralPath (Join-Path $desktopDir "tsconfig.main.tsbuildinfo") -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath (Join-Path $desktopDir "dist\main") -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath (Join-Path $desktopDir "dist\preload") -Recurse -Force -ErrorAction SilentlyContinue

  Push-Location $desktopDir
  try {
    Invoke-Checked $npx @("pnpm@9.15.0", "exec", "tsc", "-p", "tsconfig.main.json")
    Assert-FileExists (Join-Path $desktopDir "dist\main\main.js") "Electron main output is missing: dist\main\main.js"
    Invoke-Checked $npx @("pnpm@9.15.0", "exec", "vite", "build", "--config", "vite.preload.config.ts")
    Assert-FileExists (Join-Path $desktopDir "dist\preload\preload.cjs") "Electron preload CJS output is missing: dist\preload\preload.cjs"
  } finally {
    Pop-Location
  }

  Write-Host ""
  Write-Host "=== 3/3 Start development desktop app ===" -ForegroundColor Cyan
  Assert-FileExists $viteCli "Vite CLI is missing: $viteCli"
  $viteProcess = Start-Process -FilePath $node -ArgumentList @("`"$viteCli`"", "--host", "127.0.0.1", "--port", "$rendererPort", "--strictPort") -WorkingDirectory $desktopDir -NoNewWindow -PassThru
  Wait-RendererServer -Process $viteProcess -RendererUrl $rendererUrl

  Write-Host "Renderer is ready at $rendererUrl. Opening Electron. Close the desktop window to stop the dev server." -ForegroundColor Green
  $env:D2_RENDERER_URL = $rendererUrl
  Invoke-Checked $npx @("pnpm@9.15.0", "--filter", "@d2-tools/desktop", "dev:electron")
} finally {
  if ($null -eq $previousRendererUrl) {
    Remove-Item Env:\D2_RENDERER_URL -ErrorAction SilentlyContinue
  } else {
    $env:D2_RENDERER_URL = $previousRendererUrl
  }
  Stop-ProcessTree -Process $viteProcess
  Pop-Location
}
