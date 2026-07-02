# 当前待办

> 更新时间：2026-07-02
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

## 当前任务目录

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T1 | P1 | 🟡 待推进 | 小日向与 d2-skill 产品级能力 | [总纲](work/backlog/kohinata-d2-skill-product-architecture.md) / [攻略证据工作台](work/backlog/kohinata-guide-evidence-workbench.md) | 先做攻略解析、账号命中、perk 证据和配装草稿 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [仓库推荐与清理工作台](work/backlog/vault-recommendation-and-cleanup-workbench.md) | 统一 DIM wishlist、本地目标、同名对比和清理清单；推荐数据只支持用户导入，不默认内置未授权社区数据 |
| T3 | P1 | 🟡 待推进 | 小日向日报、商人与掉落查询 | [日报、商人与掉落查询](work/backlog/daily-report-and-drops-assistant.md) | 只展示可确认数据，先补商人、活动和掉落来源状态 |
| T4 | P1 | 🟡 待推进 | 跨端 UI 壳、可交互原型与桌面视觉收口 | [跨端 UI 壳收口](work/backlog/cross-platform-ui-shell-refactor.md) / [桌面视觉与详情打磨](work/backlog/desktop-ui-account-detail-polish.md) | UI 抽壳成果已提交；配装页和装备详情纯 ViewModel 已下沉到 `packages/app`；`api/client.ts` 使用方已拆为运行时 `api` 与类型入口；Web 已补 snapshot provider / HTTP fallback；账号页、设置页、资料库页和配装页常驻文案已进入 i18n；Prototype fallback 和顶部状态条已补稳定 `interfaceLocale` / `ShellStatusItem.key` 边界。后续继续推进移动端壳和其他页面文案收口 |
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
