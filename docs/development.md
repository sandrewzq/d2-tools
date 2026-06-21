# 开发说明

这份文档面向仓库维护者和贡献者，集中说明开发、测试、打包、发布和文档结构。

## 1. 技术栈

- Node.js 22
- pnpm 9
- TypeScript
- Electron
- React
- Vitest

## 2. 仓库结构

```text
packages/
  core/      核心能力：Bungie、Manifest、分析、配置、本地存储
  http/      本地 HTTP / 工具接口层
  desktop/   Electron 桌面应用
docs/        正式文档
```

### 2.1 核心边界

- `packages/core`
  - 负责 Bungie API 访问
  - 负责 Manifest 读取和解析
  - 负责本地配置、标签、愿望单、日志等存储
  - 负责确定性分析逻辑

- `packages/http`
  - 暴露本地 HTTP / 工具接口
  - 复用 core，不单独维护业务真相

- `packages/desktop`
  - 负责 GUI、Electron 主进程、preload、IPC 和前端交互
  - 不重复实现 core 里的规则

## 3. 本地开发

安装依赖：

```powershell
npx pnpm@9.15.0 install
```

启动前端开发环境：

```powershell
npx pnpm@9.15.0 dev
```

如果你要配合 Electron 主进程调试：

```powershell
npx pnpm@9.15.0 dev:electron
```

## 4. 测试与检查

全量测试：

```powershell
npx pnpm@9.15.0 test
```

类型检查：

```powershell
npx pnpm@9.15.0 typecheck
```

如果你只想跑桌面端某个定向测试，也可以直接用：

```powershell
npx pnpm@9.15.0 vitest --run packages/desktop/src/vault-panel.test.ts
```

## 5. 打包

一键本地打包（安装依赖 + 测试 + 类型检查 + 打包，完成后自动打开产物目录）：

```powershell
powershell -File scripts/local-package.ps1
```

该脚本内部执行：

1. `pnpm install`
2. `pnpm build`
3. `vitest --run`
4. `pnpm typecheck`
5. `pnpm package:win`

仅构建 Windows 绿色包（跳过测试和类型检查）：

```powershell
npx pnpm@9.15.0 package:win
```

当前产物一般会落在：

```text
packages/desktop/release/
```

常见目录：

- `win-unpacked/`
- `d2-tools-win-x64-<version>.7z`

## 6. 发布

当前发布主路径是 GitHub Release 自动打包 Windows `.7z` 绿色包。

### 6.1 发版流程

1. 更新所有 `package.json` 版本号（root、core、desktop、http 保持一致）
2. 更新 `CHANGELOG.md`，新增 `## x.y.z - YYYY-MM-DD` 章节
3. 本地预览 Release Body：
   ```powershell
   npx pnpm@9.15.0 release:preview --version x.y.z
   ```
4. 提交改动：
   ```powershell
   git add .
   git commit -m "release: prepare vX.Y.Z"
   ```
5. 打 tag 并推送：
   ```powershell
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
6. CI 自动构建、校验 CHANGELOG、生成 Release Body 并发布 GitHub Release

### 6.2 注意事项

- 如果 `CHANGELOG.md` 没有对应版本章节，CI 会失败，不会发布 Release
- `v0.0.x` 版本会自动标记为 Pre-release
- Release Assets 会同时包含 `d2-tools-win-x64-<version>.7z` 和 `latest.yml`

### 6.3 发布前检查

1. `test` 通过
2. `typecheck` 通过
3. `pnpm release:preview --version x.y.z` 输出符合预期
4. README 和核心文档没有明显失真
5. 版本号和 tag 一致

## 7. 文档结构

正式文档保留在：

```text
README.md
CHANGELOG.md
docs/
  user-guide.md
  bungie-setup.md
  faq.md
  security.md
  project-status.md
  roadmap.md
  development.md
```

`docs/superpowers/` 保留给设计稿、执行计划等内部工作材料，不作为普通读者主入口。

## 8. 文档维护原则

- README 只做入口，不塞太多细节
- 同一件事只保留一个权威文档
- 玩家文档优先讲“怎么做”
- 项目状态和路线图分开维护
- 历史材料归档，不抢正式入口
