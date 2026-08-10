# d2-tools development desktop launcher.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev-desktop.ps1
# Keep this file ASCII-only: Windows PowerShell -File may parse UTF-8 without BOM as ANSI.

param(
  [switch] $Fast
)

$ErrorActionPreference = "Stop"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$desktopDir = Join-Path $rootDir "packages\desktop"
$npx = "npx.cmd"
$pnpmCommand = Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue
$pnpm = if ($pnpmCommand) { $pnpmCommand.Source } else { $null }
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

function Invoke-Pnpm {
  param([string[]] $ArgumentList)

  if ($pnpm) {
    Invoke-Checked $pnpm $ArgumentList
    return
  }
  Invoke-Checked $npx (@("pnpm@9.15.0") + $ArgumentList)
}

function Test-AnyPathNewerThan {
  param(
    [string[]] $Paths,
    [DateTime] $Timestamp
  )

  foreach ($path in $Paths) {
    if (-not (Test-Path -LiteralPath $path)) {
      continue
    }
    $item = Get-Item -LiteralPath $path
    if (-not $item.PSIsContainer) {
      if ($item.LastWriteTimeUtc -gt $Timestamp) { return $true }
      continue
    }
    $newer = Get-ChildItem -LiteralPath $path -Recurse -File -Force -ErrorAction SilentlyContinue |
      Where-Object { $_.LastWriteTimeUtc -gt $Timestamp } |
      Select-Object -First 1
    if ($newer) { return $true }
  }
  return $false
}

function Test-OutputNeedsBuild {
  param(
    [string] $OutputPath,
    [string[]] $InputPaths
  )

  if (-not (Test-Path -LiteralPath $OutputPath)) {
    return $true
  }

  $outputTime = (Get-Item -LiteralPath $OutputPath).LastWriteTimeUtc
  return Test-AnyPathNewerThan -Paths $InputPaths -Timestamp $outputTime
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

function Stop-StaleRendererServer {
  $listeners = Get-NetTCPConnection -LocalPort $rendererPort -State Listen -ErrorAction SilentlyContinue
  if (-not $listeners) {
    return
  }

  $processIds = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
      Write-Host "Stopping stale renderer process on port ${rendererPort}: PID ${processId} $($process.ProcessName)" -ForegroundColor Yellow
      Stop-Process -Id $processId -Force
    }
  }

  Start-Sleep -Milliseconds 500
  if (Get-NetTCPConnection -LocalPort $rendererPort -State Listen -ErrorAction SilentlyContinue) {
    throw "Renderer port ${rendererPort} is still in use after cleanup."
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
  Stop-StaleRendererServer

  $requiredOutputs = @(
    (Join-Path $rootDir "packages\core\dist\index.js"),
    (Join-Path $rootDir "packages\http\dist\server.js"),
    (Join-Path $rootDir "packages\services\dist\index.js"),
    (Join-Path $desktopDir "dist\main\main.js"),
    (Join-Path $desktopDir "dist\preload\preload.cjs")
  )
  $requiresFullBuild = -not $Fast
  $buildCore = $false
  $buildHttp = $false
  $buildServices = $false
  $buildMain = $false
  $buildPreload = $false

  if ($Fast) {
    $missingOutput = $requiredOutputs | Where-Object { -not (Test-Path -LiteralPath $_) } | Select-Object -First 1
    if ($missingOutput) {
      Write-Host "Required build output is missing; falling back to a full build." -ForegroundColor Yellow
      $requiresFullBuild = $true
    } else {
      $oldestOutputTime = ($requiredOutputs |
        ForEach-Object { Get-Item -LiteralPath $_ } |
        Sort-Object LastWriteTimeUtc |
        Select-Object -First 1).LastWriteTimeUtc
      $criticalChanged = Test-AnyPathNewerThan -Timestamp $oldestOutputTime -Paths @(
        (Join-Path $rootDir "package.json"),
        (Join-Path $rootDir "pnpm-lock.yaml"),
        (Join-Path $rootDir "pnpm-workspace.yaml"),
        (Join-Path $rootDir "tsconfig.base.json"),
        (Join-Path $rootDir "packages\app\package.json"),
        (Join-Path $rootDir "packages\ui\package.json"),
        (Join-Path $desktopDir "package.json")
      )
      if ($criticalChanged) {
        Write-Host "Dependency or root build configuration changed; falling back to a full build." -ForegroundColor Yellow
        $requiresFullBuild = $true
      } else {
        $coreOutput = Join-Path $rootDir "packages\core\dist\index.js"
        $httpOutput = Join-Path $rootDir "packages\http\dist\server.js"
        $servicesOutput = Join-Path $rootDir "packages\services\dist\index.js"
        $mainOutput = Join-Path $desktopDir "dist\main\main.js"
        $preloadOutput = Join-Path $desktopDir "dist\preload\preload.cjs"

        $buildCore = Test-OutputNeedsBuild -OutputPath $coreOutput -InputPaths @(
          (Join-Path $rootDir "packages\core\src"),
          (Join-Path $rootDir "packages\core\package.json"),
          (Join-Path $rootDir "packages\core\tsconfig.json")
        )
        $buildHttp = $buildCore -or (Test-OutputNeedsBuild -OutputPath $httpOutput -InputPaths @(
          $coreOutput,
          (Join-Path $rootDir "packages\http\src"),
          (Join-Path $rootDir "packages\http\package.json"),
          (Join-Path $rootDir "packages\http\tsconfig.json")
        ))
        $buildServices = $buildCore -or $buildHttp -or (Test-OutputNeedsBuild -OutputPath $servicesOutput -InputPaths @(
          $coreOutput,
          $httpOutput,
          (Join-Path $rootDir "packages\services\src"),
          (Join-Path $rootDir "packages\services\package.json"),
          (Join-Path $rootDir "packages\services\tsconfig.json")
        ))
        $buildMain = $buildCore -or $buildHttp -or $buildServices -or (Test-OutputNeedsBuild -OutputPath $mainOutput -InputPaths @(
          $coreOutput,
          $httpOutput,
          $servicesOutput,
          (Join-Path $desktopDir "src\contracts"),
          (Join-Path $desktopDir "src\main"),
          (Join-Path $desktopDir "tsconfig.main.json")
        ))
        $buildPreload = $buildCore -or $buildServices -or (Test-OutputNeedsBuild -OutputPath $preloadOutput -InputPaths @(
          $coreOutput,
          $servicesOutput,
          (Join-Path $desktopDir "src\contracts"),
          (Join-Path $desktopDir "src\preload"),
          (Join-Path $desktopDir "tsconfig.preload.json"),
          (Join-Path $desktopDir "vite.preload.config.ts")
        ))
      }
    }
  }

  if ($requiresFullBuild) {
    $buildCore = $true
    $buildHttp = $true
    $buildServices = $true
    $buildMain = $true
    $buildPreload = $true
  }

  Write-Host "=== 1/3 Prepare workspace packages ===" -ForegroundColor Cyan
  if ($buildCore) { Invoke-Pnpm @("--filter", "@d2-tools/core", "build") }
  if ($buildHttp) { Invoke-Pnpm @("--filter", "@d2-tools/http", "build") }
  if ($buildServices) { Invoke-Pnpm @("--filter", "@d2-tools/services", "build") }
  if (-not ($buildCore -or $buildHttp -or $buildServices)) {
    Write-Host "Workspace outputs are current; skipping package builds." -ForegroundColor Green
  }

  Write-Host ""
  Write-Host "=== 2/3 Prepare Electron main process and preload ===" -ForegroundColor Cyan
  if ($requiresFullBuild) {
    Remove-Item -LiteralPath (Join-Path $desktopDir "tsconfig.main.tsbuildinfo") -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $desktopDir "dist\main") -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath (Join-Path $desktopDir "dist\preload") -Recurse -Force -ErrorAction SilentlyContinue
  }

  Push-Location $desktopDir
  try {
    if ($buildMain) {
      Invoke-Pnpm @("exec", "tsc", "-p", "tsconfig.main.json")
      Assert-FileExists (Join-Path $desktopDir "dist\main\main.js") "Electron main output is missing: dist\main\main.js"
    }
    if ($buildPreload) {
      Invoke-Pnpm @("exec", "vite", "build", "--config", "vite.preload.config.ts")
      Assert-FileExists (Join-Path $desktopDir "dist\preload\preload.cjs") "Electron preload CJS output is missing: dist\preload\preload.cjs"
    }
    if (-not ($buildMain -or $buildPreload)) {
      Write-Host "Main and preload outputs are current; reusing existing files." -ForegroundColor Green
    }
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
  Invoke-Pnpm @("--filter", "@d2-tools/desktop", "dev:electron")
} finally {
  if ($null -eq $previousRendererUrl) {
    Remove-Item Env:\D2_RENDERER_URL -ErrorAction SilentlyContinue
  } else {
    $env:D2_RENDERER_URL = $previousRendererUrl
  }
  Stop-ProcessTree -Process $viteProcess
  Pop-Location
}
