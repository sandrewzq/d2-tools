# 当前待办

> 更新时间：2026-07-03
> 这是唯一当前待办目录。这里只保留当前健康度、未完成任务、近期关键 bug 和 backlog 入口；完整需求、切片、验收标准放在 `docs/work/backlog/`。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| `pnpm test` | ✅ 通过 | 本轮 CI 断言同步后全量验证通过：157 个测试文件 / 541 条测试 |
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

## 当前任务目录

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T1 | P1 | 🟡 待推进 | 小日向与 d2-skill 产品级能力 | [总纲](work/backlog/kohinata-d2-skill-product-architecture.md) / [攻略证据工作台](work/backlog/kohinata-guide-evidence-workbench.md) | 先做攻略解析、账号命中、perk 证据和配装草稿 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [仓库推荐与清理工作台](work/backlog/vault-recommendation-and-cleanup-workbench.md) | 统一 DIM wishlist、本地目标、同名对比和清理清单；推荐数据只支持用户导入，不默认内置未授权社区数据 |
| T3 | P1 | 🟡 待推进 | 小日向日报、商人与掉落查询 | [日报、商人与掉落查询](work/backlog/daily-report-and-drops-assistant.md) | 只展示可确认数据，先补商人、活动和掉落来源状态 |
| T4 | P1 | 🟡 待推进 | 跨端 UI 壳、可交互原型与桌面视觉收口 | [跨端 UI 壳收口](work/backlog/cross-platform-ui-shell-refactor.md) / [桌面视觉与详情打磨](work/backlog/desktop-ui-account-detail-polish.md) | UI 抽壳成果已提交；配装页和装备详情纯 ViewModel 已下沉到 `packages/app`；`api/client.ts` 使用方已拆为运行时 `api` 与类型入口；Web 已补 snapshot provider / HTTP fallback；账号页、设置页、资料库页和配装页常驻文案已进入 i18n；Prototype fallback 和顶部状态条已补稳定 `interfaceLocale` / `ShellStatusItem.key` 边界；Prototype 主菜单已补齐仓库、配装、资料库共享 View 和 mock 工作台；全局 AI 抽屉已收口为共享 `AiAssistantPanelView`；产品样式已收口到 `packages/ui/src/styles.css`，Prototype / Web / Desktop 共用同一份产品 CSS，Desktop renderer 私有 CSS 只保留 Electron 平台说明；视觉脚本已强制校验真实 `data-color-mode`，并通过 `D2_COLOR_MODE` 让 Desktop startup / diagnostics 与视觉主题一致；`visual:all` 已补 Prototype / Web / Desktop、明暗主题、主菜单和设置分区的 DOM 样式扫描。后续继续推进移动端壳和其他页面文案收口 |
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
