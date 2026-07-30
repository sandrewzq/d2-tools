# 当前待办

> 更新时间：2026-07-30
> 本文件只保留当前任务、状态和下一步。详细范围与验收标准由对应 backlog 维护，阶段过程使用 Git 历史追溯。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| GitHub CI | ⏳ push 后异步执行 | 执行 frozen install、`pnpm test`、共享 Shell 视觉契约和 `pnpm typecheck`；普通 push 不等待结果 |
| Release 门禁 | ⏳ 发版时执行 | 必须通过 `tools\git-auto-release.cmd` 完成本地门禁、GitHub Actions、安装包和 GitHub Release |
| Agent 自动验证 | ⛔ 默认禁用 | 只有用户明确要求本地测试、构建或打包时才执行 |

## 当前任务

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T1 | P1 | 🟠 进行中 | 本地配装工作台、护甲优化与 DIM 导入 | [任务说明](work/backlog/T1-loadout-plans-and-guide-import.md) | 已迁入统一上下文工具栏、状态框和三栏基础工作区；下一步重建本地方案领域模型并接入真实编辑器、护甲候选与 DIM 预览 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [任务说明](work/backlog/T2-vault-recommendation-and-cleanup-workbench.md) | 统一 DIM Wishlist、本地目标、同名对比和清理清单 |
| T3 | P1 | 🟡 待验收 | 商人结构、覆盖与官方获取来源 | [任务说明](work/backlog/T3-vendors-and-drop-sources.md) | 验收真实地点覆盖、跨重置边界、Offer 时效、去重和机灵模组 A/B |
| T4 | P3 | 🟡 待推进 | 活动复盘增强 | [任务说明](work/backlog/T4-activity-review-enhancement.md) | 接入 PGCR、完成时间推算和副本级趋势 |
| T8 | P1 | 🟡 待视觉验收 | 全应用共享 UI 与视觉收口 | [任务说明](work/backlog/T8-full-application-ui-functional-convergence.md) | 继续统一圆角、删除非动画 `!important` 并修正横向溢出，再执行 Desktop `light / dark × 1280 / 980 / 760` 实窗验收 |

## T8 UI 待修

- 按全局轻圆角合同统一状态框、对象卡、控件和缩略图，清理遗留的 `8px` 以及 `3px / 5px / 7px` 圆角。
- 删除武器详情、护甲详情和账号区域中非无障碍动画用途的 `!important`，通过整理冲突规则确定唯一视觉来源。
- 移除主滚动区、装备详情和菜单侧栏中用于掩盖超宽布局的 `overflow-x: hidden`，通过响应式重排实现零横向溢出。
- 本轮只处理整体 UI；数据、mock、类型契约和 T1 配装工作台不纳入 T8 检查与修正范围。

## 说明

- Bug #1（配置）：旧版 `config.json` 的 `ai.provider` 会导致 Desktop 启动失败；已在配置读取层兼容迁移到当前 `ai.protocol`，等待后续本地测试或 CI 验证。
- T8 负责已经迁入 `packages/ui` 的共享视觉系统和页面收口；配装工作台的新领域模型与最终页面由 T1 负责。
- React Prototype 已退役；后续视觉链路统一为冻结 HTML 规格、Web 快速预览和 Desktop 真实功能验收。
- 当前没有单独登记的未解决 Bug；新增 Bug 必须使用全局唯一编号并在本文件中登记。
