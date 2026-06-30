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
  core/      领域模型、业务规则、分析逻辑、schema、纯函数
  services/  跨端服务接口和平台 adapter
  app/       跨端前端查询层、状态模型、页面 workspace 编排
  http/      本地 HTTP / 工具接口层
  desktop/   Electron 桌面应用
docs/        正式文档
```

### 2.1 核心边界

- `packages/core`
  - 负责领域模型、schema 和跨端类型
  - 负责确定性分析、评分、愿望单、目标规则等纯业务规则
  - 负责 Bungie / Manifest 数据到领域模型的转换逻辑

- `packages/services`
  - 负责 Profile / Manifest / LocalData / AI 等服务接口
  - 负责桌面、本地、Web、移动端或远端 API 的 adapter
  - 负责把网络、存储、鉴权等平台能力收口到服务边界

- `packages/app`
  - 负责跨端前端查询层、状态模型和页面 workspace 编排
  - 复用 services，不直接依赖 Electron、Node runtime 或桌面 UI

- `packages/http`
  - 暴露本地 HTTP / 工具接口
  - 复用 core / services，不单独维护业务真相

- `packages/desktop`
  - 负责 GUI、Electron 主进程、preload、IPC 和前端交互
  - 负责桌面端导航、布局、窗口级交互、安装更新等系统能力

### 2.2 Renderer feature 边界

- `packages/desktop/src/renderer/pages/HomePage.tsx` 是桌面端菜单 composition root，只做菜单接线和跨 feature 状态组装。
- `packages/desktop/src/renderer/features/<menu>/` 是菜单私有实现。feature 可以 import `shared/`、`components/`、`utils/` 和 `api/`，但不能 import 其他 feature。
- `packages/desktop/src/renderer/shared/` 只能放跨菜单复用能力，不能反向 import `features/`。
- 跨账号、仓库、资料库复用的装备详情、配装定位、状态卡片等能力应先进入 `shared/`，再由各 feature 引用。
- `packages/desktop/src/renderer/api/types.ts` 是 renderer 侧平台无关 API 聚合入口，只组合 `AppApi` 并重导出分域契约；账号、仓库、资料库、配装、AI、写操作等 DTO 应放在 `api/*Api.ts` 或 `api/sharedTypes.ts`，后续 Mac / 移动端适配应优先复用这些类型边界。
- `packages/desktop/src/renderer/api/client.ts` 只做 Electron renderer 运行时绑定：声明 `window.d2`、导出 `api`，并兼容性重导出 `types.ts` 里的类型。
- `packages/desktop/src/renderer/shared/copy.ts` 保存当前中文优先的文案规则和通用 copy；目前只做中文，不提供语言切换 UI。
- 默认数据目录由 `packages/core/src/config/defaults.ts` 的平台感知 helper 统一计算：Windows 使用 `%APPDATA%\d2-tools`，macOS 使用 `~/Library/Application Support/d2-tools`，Linux / 其他平台使用 `$XDG_DATA_HOME/d2-tools` 或 `~/.local/share/d2-tools`。
- `packages/desktop/test/renderer-boundaries.test.ts` 会拦截 feature 互相 import 和 shared 反向依赖 feature。
- `packages/desktop/test/renderer-api-boundaries.test.ts` 会拦截把大型 DTO 类型重新塞回 `api/client.ts` 或重新塞回一个巨型 `api/types.ts`。
- 源码目录下的 `packages/*/src/**/*.js` 和 `packages/*/src/**/*.d.ts` 默认视为构建或迁移过程产生的衍生文件，不作为正式源码提交目标；常规开发应以 `.ts` / `.tsx` 为准，构建产物优先落到 `dist/`。

### 2.3 并行开发规则

- 普通功能按菜单并行：账号页改 `features/account/`，仓库页改 `features/vault/`，资料库改 `features/library/`，配装改 `features/loadouts/`，AI 改 `features/ai/`，设置改 `features/settings/`，每日 / 每周改 `features/daily/`。
- 跨菜单能力先抽到 `shared/`，再由各 feature 引用；不要让一个 feature 直接 import 另一个 feature。
- 共享详情、配装来源、仓库清理等跨菜单逻辑应放到 `shared/components/`、`shared/hooks/` 或 `shared/domain/`。
- Renderer API 按领域维护在 `api/*Api.ts`，`types.ts` 只聚合，`client.ts` 只绑定 Electron runtime。
- 主进程 IPC 按领域维护在 `src/main/ipc/` 子模块，`ipc.ts` 只聚合。
- 新增可见文案优先进入 copy 体系；当前只维护中文。
- `HomePage.tsx`、`ItemDetailModal.tsx`、`useItemDetailWorkspace.ts`、`VaultPanel.tsx`、`api/types.ts`、`api/client.ts`、`ipc.ts` 等公共接线文件是并行开发高冲突区，修改前要确认是否真的需要，并说明影响范围。

### 2.4 Renderer UI 样式系统

- 桌面端 UI 按“页面底层 / 主面板 / 子块或列表项”三层组织；页面必须有主工作区，辅助信息和低频信息下沉。
- 全局样式 token 定义在 `packages/desktop/src/renderer/styles.css` 的 `:root`：间距使用 `--space-8/12/16/24/32`，圆角使用 `--radius-control/panel/pill`，颜色使用 `--surface-*`、`--border-*`、`--text-*` 和 `--status-*`。
- 桌面 UI 设计系统 v2 继续补齐 `--field-*`、`--chip-*`、`--item-*`、`--drawer-*` 和 `--game-*` token：普通桌面 UI 必须使用 field / chip / item / drawer 语义色，`--game-*` 只用于装备详情顶部等明确游戏视觉区域。
- AI 抽屉是桌面外壳的独立 pane：`.shell-content` 和 `.global-assistant-panel` 各自滚动，抽屉不得再用 fixed 遮罩覆盖主工作区。
- 明暗色模式由 `config.json` 的 `features.color_mode` 持久化，默认 `light`；桌面启动状态必须携带保存的颜色模式，避免应用重启或覆盖更新后回到默认外观。
- 新增状态文案统一使用 `status-message status-neutral|pending|ready|warning|error`，不要再在 TSX 中新增 `notice` 或 `error` 类。
- 新增列表、筛选和对象卡片优先复用 `ui-list-row`、`ui-filter-toolbar`、`ui-item-card`、`ui-badge`；设置页或工具区子块优先复用 `panel-subsection`。
- `tool-panel` 是主面板层；不要把普通说明块做成嵌套大卡片。装备详情顶部可以保留游戏内视觉语义，但底部工具区继续使用桌面工具样式。
- `packages/desktop/test/ui-style-system.test.ts` 负责锁定 token、共享样式类、设置页布局和状态语言，防止回到逐页零散修补。
- 后续 UI 开发以本节和 `packages/desktop/test/ui-style-system.test.ts` 为准，不再维护单独的历史样式规范文档。

### 2.5 桌面外壳、更新和后台任务

- 桌面外壳必须稳定展示应用版本、资料库状态和后台任务状态；用户不进入设置页，也应能看到应用更新、资料库过期和后台任务运行状态。
- 应用更新由主进程 `updates` IPC 和后台任务中心持有生命周期；renderer 只发起检查、下载、安装确认和订阅状态。
- 应用更新检查失败后进入后台重试，重试策略允许最后一个有限间隔持续复用；不要在网络失败后只提示一次就停止。
- 资料库版本检查由主进程 `manifest` IPC 和后台任务中心持有生命周期；每次启动应用会检查最新 Bungie Manifest。
- 本地 Manifest 未初始化、必要 definition component 缺失或版本落后时，必须提示并允许后台更新；未初始化或组件缺失时，资料库依赖功能应阻断搜索或详情入口。
- 切换菜单、卸载页面或重新进入页面不得中断资料库更新、应用更新下载等长任务；页面只订阅 `useBackgroundTasks` 和 `useManifestStatus` 等共享状态。
- 设置页负责详细管理入口：应用更新、资料库状态、后台任务、AI、写操作、备份迁移、诊断导出和操作日志。
- 新增长任务优先进入 `packages/desktop/src/shared/backgroundTasks.ts`、`packages/desktop/src/main/backgroundTasks.ts` 和对应领域 IPC，不要把长任务生命周期藏在 renderer feature hook 中。

## 3. 本地开发

安装依赖：

```powershell
npx pnpm@9.15.0 install
```

日常开发桌面端时，推荐用命令行启动：

```powershell
npx pnpm@9.15.0 dev:desktop
```

也可以直接运行底层 PowerShell 脚本：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev-desktop.ps1
```

这条链路会：

1. 构建 `@d2-tools/core` 和 `@d2-tools/http`
2. 编译 Electron 主进程和 preload
3. 启动 Vite 前端开发服务器
4. 打开 Electron 开发版桌面应用

这不是打包流程，不会生成或解压 `release/win-unpacked`。渲染层改动支持热更新；主进程、preload、core 或 http 改动后，关闭桌面窗口再重新运行 `npx pnpm@9.15.0 dev:desktop` 即可重新编译启动。

如果只想单独启动前端页面：

```powershell
npx pnpm@9.15.0 dev
```

如果你已经手动启动了 Vite，并且只想单独启动 Electron 主进程：

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

GitHub Actions 中的最小 CI 会在 Windows runner 上执行：

1. `pnpm install --frozen-lockfile`
2. `pnpm test`
3. `pnpm typecheck`

也就是说，任何会影响依赖锁文件、测试结果、类型边界或文档检查脚本的改动，都会在 PR / push 阶段被拦截。

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

打包链路主要用于发布前或需要验证 Windows NSIS 安装器时；日常开发优先使用 `npx pnpm@9.15.0 dev:desktop`，不要为了看一次本地改动反复打包安装。

仅构建 Windows NSIS 安装器（跳过测试和类型检查）：

```powershell
npx pnpm@9.15.0 package:win
```

当前产物一般会落在：

```text
packages/desktop/release/
```

常见目录：

- `win-unpacked/`
- `d2-tools-setup-<version>.exe`
- `latest.yml`
- `d2-tools-setup-<version>.exe.blockmap`

## 6. 发布

当前发布主路径是 GitHub Release 自动打包 Windows NSIS 安装器，并上传自动更新元数据。

### 6.1 发版流程

1. 更新所有 `package.json` 版本号（root、core、app、services、desktop、http 保持一致）
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
- 只有 tag 名包含 `-beta` 或 `-rc` 时，GitHub Release 才会自动标记为 Pre-release，例如 `v0.0.8-beta.1`、`v1.0.0-rc.1`
- Release workflow 接受两类 tag：正式版 `vX.Y.Z`，或与当前包版本一致的预发布 tag（例如 `vX.Y.Z-beta.1`、`vX.Y.Z-rc.1`）
- Release Assets 当前包含 `d2-tools-setup-<version>.exe`、`latest.yml` 和安装器 blockmap

### 6.3 发布前检查

1. `test` 通过
2. `typecheck` 通过
3. `pnpm release:preview --version x.y.z` 输出符合预期
4. README 和核心文档没有明显失真
5. 版本号和 tag 一致

### 6.4 备份与恢复

桌面端当前使用本地数据目录保存配置、Manifest 缓存、愿望单、本地标签、目标规则和操作日志。发布安装器、覆盖安装、迁移电脑或排查数据问题时，按下面的规则处理：

1. 备份前先关闭 d2-tools。
2. 关闭 d2-tools 后复制整个数据目录。Windows 默认目录来自 `%APPDATA%\d2-tools`，实际路径以设置页“本地数据目录”为准。
3. 恢复或迁移时，先在目标电脑安装并首次启动 d2-tools，让程序创建数据目录。
4. 关闭 d2-tools，再用备份目录覆盖目标电脑的数据目录。
5. 重新启动后检查 Bungie 配置、Manifest、愿望单、本地标签、目标规则和操作日志。

设置页提供“复制备份/迁移说明”和“复制脱敏诊断”。诊断导出不包含 token、client secret 或 API Key，可用于排查更新、配置、Manifest 和写操作问题。

## 7. 文档结构

当前只保留这些文档入口：

```text
README.md
CHANGELOG.md
docs/
  user-guide.md
  bungie-setup.md
  faq.md
  security.md
  todo.md
  development.md
  work/
    backlog/
    references/
```

不要把一次性设计稿、执行计划、阶段进度或临时分析文档放在 `docs/` 根目录。确实需要记录当前短期待办、验收状态、需求或 bug 时，统一更新 `docs/todo.md`；确实需要保留未完成设计或调研材料时，放进 `docs/work/backlog/` 或 `docs/work/references/`。外部流程如果要求写入 `docs/superpowers/`，本仓库统一改写到 `docs/work/backlog/` 或 `docs/work/references/`。确实需要记录长期规则或少量长期方向结论时，更新 `docs/development.md`；已发布变化写入 `CHANGELOG.md`。

## 7.1 长期方向（简版）

这里只保留不适合写进 `todo.md` 的长期演进方向，不单独维护路线图文档：

- 多端架构：按 `core -> services -> app -> 端 UI` 收口业务、服务和前端查询层，桌面端先落地，Web 和移动端后续复用同一套边界。
- 仓库整理体验：继续增强同名对比、批量处理、护甲属性价值判断和评分解释。
- 今日 / 本周信息：优先补齐可确认的商人、遗失区域和轮换线索，保持“只展示可确认数据”。
- AI 助手：围绕真实账号数据问答、仓库建议、结果结构化和安全边界继续打磨。
- 活动与桌面体验：逐步补齐基础复盘、安装更新、备份恢复和诊断导出体验。

## 8. 文档维护原则

- 对用户的回答、可见思路摘要、计划、状态更新和仓库文档默认使用中文
- 任何用户可见内容都必须使用中文，包括 thinking/analysis 面板中展示的推理摘要、工具调用前后的状态说明、阶段性解释和最终回答；不要把用户可见的 thinking 内容视为隐藏推理
- 代码标识符、API 名称、文件路径、命令、包名和上游原文引用可保留原语言
- 读取或编辑中文文档时使用 UTF-8，避免 PowerShell 或本地默认编码导致乱码
- Windows PowerShell 查看中文文件时，先执行：
  ```powershell
  $OutputEncoding=[System.Text.Encoding]::UTF8
  [Console]::OutputEncoding=[System.Text.Encoding]::UTF8
  Get-Content -Encoding UTF8 path\to\file
  ```
- 不要把未指定 UTF-8 的 PowerShell 输出复制回源码或文档；中文文案改动优先使用 `apply_patch`，批量脚本必须显式指定 UTF-8。
- `pnpm docs:check` 会同时执行文档结构检查和编码检查，拦截非法 UTF-8、典型 mojibake、Unicode replacement character 和连续问号造成的信息丢失。
- README 只做入口，不塞太多细节
- 同一件事只保留一个权威文档
- 玩家文档优先讲“怎么做”
- `todo.md` 是唯一当前待办、短期进度、需求和 bug 来源
- 长期方向如确实需要保留，合并到 `docs/development.md`，不要再单独维护 `roadmap.md`
- `work/backlog/` 保存未完成但暂不推进的设计和计划
- `work/references/` 保存外部资料分析和数据源调研
- 完成、取消或改变方向且影响当前短期待办、验收状态或优先级时，必须在同一次开发收尾时更新 `todo.md`
- 修复、确认无效或转为长期需求的 bug，必须在同一次开发收尾时更新 `todo.md` 对应条目
- `todo.md` 中的 `Bug #数字` 必须全局唯一；需要按领域区分时，在标题中加领域前缀，不要复用编号
- 设计/计划文档默认不作为正式入口；需要长期保留的结论应合并进正式文档
- `docs/work/` 只保留仍对当前工作有直接帮助的材料，不再额外维护索引文档
- 已完成或仅作历史追溯的过程材料直接删除，不再放入 archive 目录
- 本地临时日志、调试输出、pid / port / token 等运行态文件统一写到 `.local-data/tmp/`；不要把 `tmp-*`、`.tmp-*`、`*.err.log` 直接写到仓库根目录
