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
| T1 | P1 | 🟠 进行中 | 本地配装工作台、护甲优化与 DIM 导入 | [任务说明](work/backlog/T1-loadout-plans-and-guide-import.md) | 重建本地方案领域模型和工作台状态；配装最终视觉与共享页面随 T1 更新，不再沿用旧 T8 配装规格 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [任务说明](work/backlog/T2-vault-recommendation-and-cleanup-workbench.md) | 统一 DIM Wishlist、本地目标、同名对比和清理清单 |
| T3 | P1 | 🟡 待验收 | 商人结构、覆盖与官方获取来源 | [任务说明](work/backlog/T3-vendors-and-drop-sources.md) | 验收真实地点覆盖、跨重置边界、Offer 时效、去重和机灵模组 A/B |
| T4 | P3 | 🟡 待推进 | 活动复盘增强 | [任务说明](work/backlog/T4-activity-review-enhancement.md) | 接入 PGCR、完成时间推算和副本级趋势 |
| T8 | P1 | 🟡 待视觉验收 | 全应用共享 UI 与视觉收口 | [任务说明](work/backlog/T8-full-application-ui-functional-convergence.md) | 对 Shell、设置、首页、账号、资料库、仓库、商人及统一装备详情执行 Desktop `light / dark × 1280 / 980 / 760` 实窗验收并修正差异 |

## 说明

- T8 负责已经迁入 `packages/ui` 的共享视觉系统和页面收口；配装工作台的新领域模型与最终页面由 T1 负责。
- 当前没有单独登记的未解决 Bug；新增 Bug 必须使用全局唯一编号并在本文件中登记。
