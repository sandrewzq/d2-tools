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
docs/        正式文档与归档材料
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

构建 Windows 绿色包：

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

发布前至少确认：

1. `test` 通过
2. `typecheck` 通过
3. README 和核心文档没有明显失真
4. 版本号和包名一致

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

历史材料放在：

```text
docs/archive/
```

`docs/superpowers/` 保留给设计稿、执行计划等内部工作材料，不作为普通读者主入口。

## 8. 归档说明

这些内容不应该再被当成“当前正式文档”引用：

- 历史设计稿
- 阶段计划
- superpowers 计划文档

如果它们仍有价值，应迁入 `docs/archive/`，而不是继续和正式文档并列展示。

## 9. 文档维护原则

- README 只做入口，不塞太多细节
- 同一件事只保留一个权威文档
- 玩家文档优先讲“怎么做”
- 项目状态和路线图分开维护
- 历史材料归档，不抢正式入口
