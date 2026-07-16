# 当前待办

> 更新时间：2026-07-16
> 这里只保留当前健康度、未完成任务和未解决 bug。已完成 Bug 与阶段过程使用 Git 历史追溯；详细目标、切片和验收标准在 `docs/work/backlog/`。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| GitHub CI | ⏳ push 后异步执行 | 执行 frozen install、`pnpm test` 和 `pnpm typecheck`；agent 不等待普通 push 的 CI |
| Release 门禁 | ⏳ 发版时执行 | `tools\git-auto-release.cmd` 必须等待本地门禁和 GitHub Release 全部成功 |
| Agent 自动验证 | ⛔ 默认禁用 | 普通开发不自动运行；用户主动本地测试或打包时照常运行现有测试和类型检查 |

构建提醒：Prototype / Web 生产构建的 chunk 大小提示和 Vite CJS Node API 弃用提示当前不阻断验证。

## 当前任务

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T1 | P1 | 🟡 待推进 | 小日向攻略解析与账号匹配 | [攻略证据工作台](work/backlog/kohinata-guide-evidence-workbench.md) | 统一攻略要求、账号命中、perk 证据、护甲可达性和配装草稿 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [仓库推荐与清理工作台](work/backlog/vault-recommendation-and-cleanup-workbench.md) | 统一 DIM wishlist、本地目标、同名对比和清理清单 |
| T3 | P1 | 🟡 进行中 | 商人结构、覆盖与官方获取来源 | [商人结构、覆盖与官方获取来源](work/backlog/vendors-and-drop-sources.md) | 收口官方来源模型、Offer 时效和去重，继续机灵模组 A/B 与逐商人验收 |
| T4 | P3 | 🟡 待推进 | 活动复盘增强 | [活动复盘增强](work/backlog/activity-review-enhancement.md) | 接 PGCR、完成时间推算和副本级趋势 |
| T5 | P1 | 🟡 进行中 | 统一装备详情与知识分析 | [统一装备详情与知识分析](work/backlog/equipment-detail-and-knowledge-analysis.md) | 武器详情代码已按冻结基准收口；下一步人工验收真实数据与明暗主题、补充可选 AI 外部搜索适配器并开发独立护甲详情 |

## 验证入口

- 普通 push：GitHub CI 异步执行，不在本地重复运行。
- Release：运行 `tools\git-auto-release.cmd` 并等待全部步骤成功。
- 专项排查：仅在用户明确指定时运行对应命令。
