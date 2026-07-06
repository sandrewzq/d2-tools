# 当前待办

> 更新时间：2026-07-06
> 这是唯一当前待办目录。这里只保留当前健康度、未完成任务、近期关键 bug 和 backlog 入口；完整需求、切片、验收标准放在 `docs/work/backlog/`。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| `pnpm test` | ✅ 通过 | 本轮 Release v0.0.11 断言同步后全量验证通过：162 个测试文件 / 575 条测试 |
| `pnpm typecheck` | ✅ 通过 | 本次全仓类型检查通过 |
| `pnpm docs:check` | ✅ 通过 | 本轮文档结构与编码检查通过 |

> 构建提醒：Vite 提示 `DiagnosticsPanel.tsx` 和 `VaultPanel.tsx` 同时被静态和动态导入，不阻塞构建。npm 提示 `.npmrc` 中 Electron mirror 配置未来可能不被支持，不阻塞构建。

## 近期关键 Bug

| 状态 | 标题 | 备注 |
|---|---|---|
| ✅ 已修复 | Bug #22 桌面启动：每次打开停留在启动页数秒 | 启动状态改为只读取轻量 Manifest metadata 和定义缓存文件存在性，不再解析 199MB 级 Bungie 定义 JSON；启动鉴权不再刷新 token；启动状态读取失败时显示可重试错误 |
| ✅ 已修复 | Bug #25 桌面启动：5173 端口冲突时 Electron 打开其他应用 | 开发端口统一规范为 Prototype `53170`、Web `53171`、Desktop renderer `53172`；桌面启动脚本使用 Vite strict port，并把同一个 `D2_RENDERER_URL` 注入 Electron；发布版继续加载安装包内 `dist/renderer/index.html`，不依赖本地端口 |
| ✅ 已修复 | Bug #26 脚本：发布和本地打包脚本中文说明存在乱码 | `scripts/generate-release-notes.mjs` 的 Release footer 和 `scripts/local-package.ps1` 的中文注释/输出已恢复为 UTF-8 中文；`pnpm docs:check` 会继续拦截 mojibake 和编码回退 |
| ✅ 已修复 | Bug #27 测试：设置页共享 UI 迁移后视觉 harness 断言未同步 | 设置页、资料库和配装相关测试已改为检查 `packages/ui` 的 `*ContentView.tsx`，Desktop feature 只检查 adapter 接线 |
| ✅ 已修复 | Bug #28 CI：i18n 收口后桌面源码断言未同步 | 账号页目录和设置页资料库状态断言已改为检查 `accountText` / `settingsText` i18n 调用，避免要求组件退回中文硬编码 |
| ✅ 已修复 | Bug #29 Prototype：设置页 fallback 菜单无法切换 | `SettingsPageView` fallback 已补内部 `activeSection` 状态和菜单点击；Prototype 设置页的账号、资料库、备份迁移和诊断分区可正常切换 |
| ✅ 已修复 | Bug #30 Prototype：AI 抽屉仍是占位内容 | Prototype / Web / Desktop 全局 AI 抽屉已统一复用 `packages/ui` 的 `AiAssistantPanelView`；Desktop 只保留真实 AI 调用和历史 adapter，Prototype / Web 只提供 mock 数据和 mock 回复，并加回归测试防止回退到本地占位或“小日向”标题 |
| ✅ 已修复 | Bug #31 Prototype：AI 抽屉暗色模式露出浅色背景 | `AppShell` 统一持有 `global-assistant-sidebar` 包装层，Desktop 不再自建抽屉内层；暗色 drawer token、消息气泡和视觉脚本 computed background 校验已补齐，防止 Prototype / Web / Desktop 抽屉背景再次分叉 |
| ✅ 已修复 | Bug #32 Prototype：配装页暗色模式露出浅色面板 | 配装页复用的 `daily-source.source-ready`、配装模板和操作日志样式已收口到共享语义 token；新增 `visual:loadouts` 覆盖 Prototype 与 Desktop 暗色配装页，防止共享 UI 再出现白底面板 |
| ✅ 已修复 | Bug #33 跨端视觉：单页截图无法覆盖所有暗色漏白 | 新增 `visual:all`，遍历 Prototype / Web / Desktop、明暗主题、主菜单和设置分区，对 `.app-shell` 可见 DOM 做 computed style 扫描、浅色大背景拦截和基础文字对比度检查；同时补齐 dark 派生 token，并用样式测试禁止新增直接浅色 background |
| ✅ 已修复 | Bug #34 Desktop 启动：右上角原生窗口按钮白块割裂 | 移除 Electron 原生 `titleBarOverlay`，窗口控制按钮改为 `packages/ui` 共享 `AppShell` 自绘，Desktop 只通过 IPC 注入最小化、最大化/还原和关闭动作 |
| ✅ 已修复 | Bug #35 Prototype：首页内容区混入原型场景控制 | Prototype 场景切换从页面内容区移到右下角可收起调试面板，首页默认只展示共享产品内容，避免原型与 Desktop/Web 对比时误判多出状态块 |
| ✅ 已修复 | Bug #36 Prototype：调试面板亮色模式下拉菜单文字过浅 | Prototype 调试面板改回 `.app-shell` 主题作用域内渲染，浮层仍 fixed 不占页面布局；同时补齐标题、按钮、select 和 option 的语义色，避免亮色模式使用错误前景色 |
| ✅ 已修复 | Bug #37 跨端 UI：Prototype 账号和仓库页仍与 Desktop 分叉 | Prototype 账号页已改用共享 `AccountPageContentView` 和 mock workspace；仓库完整 UI 已迁入 `packages/ui/src/vault/`，包括筛选、列表、整理、同名对比、目标规则和推荐数据导入，Prototype / Web / Desktop 共用同一仓库内容页 |
| ✅ 已修复 | Bug #38 Web：非首页菜单仍渲染首页 fallback | Web 已按菜单接入账号、仓库、配装、资料库和设置共享内容页，并补 mock 数据；测试禁止 Web 非首页继续渲染 `HomePageView` fallback |
| ✅ 已修复 | Bug #39 配装页：Prototype 与 Desktop 因游戏内槽位置顶造成观感分叉 | 配装页 workspace 新增统一 `loadoutEntries`，把本地模板和 Bungie 游戏内配装栏合并到同一个配装工作台列表；共享 UI 不再渲染独立置顶的游戏内配装栏大区，Prototype / Desktop 继续共用同一内容页 |
| ✅ 已修复 | Bug #40 配装页：工作台筛选、卡片和详情提示在窄屏重叠 | 配装工作台的响应式覆盖已移到基础规则之后，小屏下左右面板改为单列；筛选、按钮和状态 chip 允许弹性换行，并补配装 UI 回归断言和多视口矩形扫描 |
| ✅ 已修复 | Bug #42 配装页：覆盖游戏内配装栏返回 Bungie 1622 | `SnapshotLoadout` 改按 Bungie update 请求体发送 `colorHash`、`iconHash`、`nameHash` 的 nullable 字段，避免覆盖当前装备时被判定为 invalid request |
| ✅ 已修复 | Bug #41 跨端 UI：打开 AI 抽屉后账号页内容挤压重叠 | 账号页在 `.assistant-open` 状态下主动切换为紧凑单列布局，目录、角色标题、装备/背包比较和侧栏摘要不再等窄屏媒体查询才换行；补账号页抽屉回归断言和 Prototype 账号页 + AI 抽屉矩形检查 |
| ✅ 已修复 | Bug #43 Release v0.0.11：测试断言未同步导致发布失败 | `Release Windows Package` 在 Test 步骤被导航和仓库样式断言拦截；导航期望已纳入“商人”，仓库样式测试改为检查 `packages/ui/src/vault/` 共享 View 和 Desktop adapter 接线 |
| ✅ 已修复 | Bug #44 Release 脚本：失败重发时错误升 patch 版本 | `tools/git-auto-release.cmd` 先检查当前版本 GitHub Release；当前版本 Release 缺失时复用当前版本并更新同名 tag 重跑发布，只有当前版本已发布成功时才自动升到下一个 patch 版本 |
| ✅ 已修复 | Bug #45 Release 脚本：`git diff --check` 打开 pager 卡住 | `tools/git-auto-release.cmd` 启动时禁用 Git pager，发布检查输出不再停在 `(END)` 等待手动按 `q` |
| ✅ 已修复 | Bug #46 跨端 UI：首页泄漏参考说明文案 | 参考 HTML 的规范说明块改为 `d2-reference-only` 边界和 `data-reference-only="true"` 双标记；真实首页移除说明条，`workspace-layout.test.ts` 会抽取标记块文案并拦截其进入 `packages/ui` |
| ✅ 已修复 | Bug #47 仓库页：容量数字和方案命中提示占据顶部导致布局混乱 | 仓库页不再把筛选结果当容量显示；仓库已读取数量来自 `account.vault.item_count`，筛选命中和方案命中改为命令栏小型状态 chip；AI 抽屉打开时优先展示筛选工作台，摘要下沉 |

## 当前任务目录

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T1 | P1 | 🟡 待推进 | 小日向与 d2-skill 产品级能力 | [总纲](work/backlog/kohinata-d2-skill-product-architecture.md) / [攻略证据工作台](work/backlog/kohinata-guide-evidence-workbench.md) | 先做攻略解析、账号命中、perk 证据和配装草稿 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [仓库推荐与清理工作台](work/backlog/vault-recommendation-and-cleanup-workbench.md) | 统一 DIM wishlist、本地目标、同名对比和清理清单；推荐数据只支持用户导入，不默认内置未授权社区数据 |
| T3 | P1 | 🟡 待推进 | 小日向日报、商人与掉落查询 | [日报、商人与掉落查询](work/backlog/daily-report-and-drops-assistant.md) | 商人页已接共享 UI、Desktop 入口、公共商人刷新、9 商人目录兜底和 Bungie 图标路径修复；下一步继续补活动、掉落来源状态和更完整的购买判断 |
| T4 | P1 | 🟡 进行中 | 跨端 UI 壳、可交互原型与桌面视觉收口 | [工作区骨架与样式收口](work/backlog/cross-platform-workspace-style-hardening.md) / [桌面视觉与详情打磨](work/backlog/desktop-ui-account-detail-polish.md) | 工作区骨架结构已收口：`ProductShellHost` 统一持有页面骨架，首页、仓库、配装、资料库、商人、账号和设置真实入口改为纯内容层，平台入口不再依赖 `showInternalHeading={false}`。首层 panel / side rail chrome、仓库卡片抗压、配装详情 panel 化和视觉脚本卡住问题已修复；`verify:ui`、`verify:desktop`、`verify:docs`、`visual:home`、`visual:settings`、`visual:loadouts`、`visual:ai`、`visual:all` 已通过。下一步由用户人工复核 Prototype / Desktop 真实观感；如仍不统一，继续优先改 `packages/ui`。 |
| T5 | P3 | 🟡 待推进 | 活动复盘增强 | [活动复盘增强](work/backlog/activity-review-enhancement.md) | 后续接 PGCR、完成时间推算和副本级趋势 |
| T6 | P4 | 🟡 待推进 | 桌面发布、更新与迁移体验 | [桌面发布体验](work/backlog/desktop-release-experience.md) | 继续验证真实 GitHub Release、更新提示、备份迁移和诊断体验 |

## 暂不优先

| 项目 | 状态 | 原因 |
|---|---|---|
| 配装模板使用引导 | 暂缓 | 已有能力但引导不足，后续补使用说明 |

## 验证命令

```powershell
npx pnpm@9.15.0 docs:check
npx pnpm@9.15.0 test
npx pnpm@9.15.0 typecheck
```
