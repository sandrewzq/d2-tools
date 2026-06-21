# d2-tools 本地一键打包脚本
# 用法: powershell -File scripts/local-package.ps1
# 自动安装依赖、测试、类型检查、打包，完成后打开产物目录

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Push-Location $rootDir
try {
  # 关闭已有 d2-tools，避免文件被锁
  $running = Get-Process -Name "d2-tools" -ErrorAction SilentlyContinue
  if ($running) {
    Write-Host "关闭已有 d2-tools 进程..." -ForegroundColor Yellow
    $running | Stop-Process -Force
    Start-Sleep -Seconds 2
  }

  Write-Host "=== 1/3 安装依赖 ===" -ForegroundColor Cyan
  npx pnpm@9.15.0 install

  Write-Host ""
  Write-Host "=== 2/3 构建 + 测试 + 类型检查 ===" -ForegroundColor Cyan
  npx pnpm@9.15.0 build
  npx vitest --run
  npx pnpm@9.15.0 typecheck

  Write-Host ""
  Write-Host "=== 3/3 打包 ===" -ForegroundColor Cyan
  npx pnpm@9.15.0 package:win

  $exe = Get-Item "packages/desktop/release/win-unpacked/d2-tools.exe" -ErrorAction Stop

  Write-Host ""
  Write-Host "======================================" -ForegroundColor Green
  Write-Host "打包完成!" -ForegroundColor Green
  Write-Host "exe: $($exe.FullName)" -ForegroundColor Green
  Write-Host "======================================" -ForegroundColor Green

  # 打开产物目录
  Invoke-Item $exe.DirectoryName
} finally {
  Pop-Location
}
