# 当前待办

> 更新时间：2026-07-24
> 这里只保留当前健康度、未完成任务和未解决 bug。已完成 Bug 与阶段过程使用 Git 历史追溯；详细目标、切片和验收标准在 `docs/work/backlog/`。

## 健康度

| 检查项 | 状态 | 备注 |
|---|---|---|
| GitHub CI | ⏳ push 后异步执行 | 执行 frozen install、`pnpm test`、共享 Shell 原型计算样式契约和 `pnpm typecheck`，并上传 Shell 截图；agent 不等待普通 push 的 CI |
| Release 门禁 | ⏳ 发版时执行 | `tools\git-auto-release.cmd` 必须等待本地门禁和 GitHub Release 全部成功 |
| Agent 自动验证 | ⛔ 默认禁用 | 普通开发不自动运行；用户主动本地测试或打包时照常运行现有测试和类型检查 |

构建提醒：Prototype / Web 生产构建的 chunk 大小提示和 Vite CJS Node API 弃用提示当前不阻断验证。

## 当前任务

| 编号 | 优先级 | 状态 | 任务 | Backlog | 下一步 |
|---|---|---|---|---|---|
| T1 | P1 | 🟡 待推进 | 配装方案与攻略导入 | [配装方案与攻略导入](work/backlog/T1-loadout-plans-and-guide-import.md) | 重做 Bungie 游戏内配装与本地配装方案的边界；第一期完成装备 / Perk 匹配、方案应用和攻略导入，技能与模组后续再做 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [仓库推荐与清理工作台](work/backlog/T2-vault-recommendation-and-cleanup-workbench.md) | 统一 DIM wishlist、本地目标、同名对比和清理清单 |
| T3 | P1 | 🟡 待验收 | 商人结构、覆盖与官方获取来源 | [商人结构、覆盖与官方获取来源](work/backlog/T3-vendors-and-drop-sources.md) | 已接入 Vendor Group / 目的地两级目录、持久缓存、启动预热和周期刷新；仄已按周六到、周三走规则过滤离场缓存；下一步验收真实地点覆盖、跨重置边界、Offer 时效、去重和机灵模组 A/B |
| T4 | P3 | 🟡 待推进 | 活动复盘增强 | [活动复盘增强](work/backlog/T4-activity-review-enhancement.md) | 接 PGCR、完成时间推算和副本级趋势 |
| T7 | P1 | 🟡 待推进 | 社区推荐边界收口 | [社区推荐边界收口](work/backlog/T7-architecture-boundary-hardening.md) | Core、Services、App、UI 与平台壳的主边界已完成；下一步将本地社区表、个人知识及 AI/light.gg 缓存和外部调用迁入 Services，Core 只保留规则、DTO、解析和匹配。 |
| T8 | P1 | 🟡 UI 对照中 | 全应用 UI 还原 | [全应用 UI 还原](work/backlog/T8-full-application-ui-functional-convergence.md) | 首页已按最新冻结原型重建共享内容层与刷新节奏；共享 Shell 已统一页面头与侧栏菜单首项的垂直基线；下一步在 Prototype / Desktop 验收实际窗口，再继续其余菜单唯一页面还原 |

## 验证入口

- 普通 push：GitHub CI 异步执行，不在本地重复运行。
- Release：运行 `tools\git-auto-release.cmd` 并等待全部步骤成功。
- 专项排查：仅在用户明确指定时运行对应命令。
