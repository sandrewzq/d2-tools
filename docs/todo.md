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
| T1 | P1 | 🟡 待推进 | 配装攻略导入与账号匹配 | [配装攻略导入与账号匹配](work/backlog/T1-loadout-guide-import-and-matching.md) | 第一期只做装备与明确 Perk 的真实匹配；保留全输入方式、历史版本和可编辑草稿，技能与模组匹配后续再做 |
| T2 | P1 | 🟡 待推进 | 仓库推荐与清理工作台 | [仓库推荐与清理工作台](work/backlog/T2-vault-recommendation-and-cleanup-workbench.md) | 统一 DIM wishlist、本地目标、同名对比和清理清单 |
| T3 | P1 | 🟡 待验收 | 商人结构、覆盖与官方获取来源 | [商人结构、覆盖与官方获取来源](work/backlog/T3-vendors-and-drop-sources.md) | 已接入 Vendor Group / 目的地两级目录、持久缓存、启动预热和周期刷新；仄已按周六到、周三走规则过滤离场缓存；下一步验收真实地点覆盖、跨重置边界、Offer 时效、去重和机灵模组 A/B |
| T4 | P3 | 🟡 待推进 | 活动复盘增强 | [活动复盘增强](work/backlog/T4-activity-review-enhancement.md) | 接 PGCR、完成时间推算和副本级趋势 |
| T6 | P1 | 🟡 等待 Release | 资料库与运行时性能架构升级 | [资料库与运行时性能架构升级](work/backlog/T6-game-data-performance-architecture-upgrade.md) | 代码、全仓回归、Windows NSIS 打包、隔离安装版和性能预算已完成；下一次正式发版执行 Release workflow 与真实更新/回滚观察，稳定 Release 后删除 JSON/旧 IPC/旧 core HTTP 兼容层 |
| T7 | P1 | 🟡 待验证 | 架构边界收口 | [架构边界收口](work/backlog/T7-architecture-boundary-hardening.md) | 独立本地 store、Bungie 写操作、诊断导出和社区推荐编排已迁 Services，Prototype/Web fixture 已收紧；下一步由 CI 验证，并迁移 Core 中剩余的本地社区与 light.gg 读写实现 |
| T8 | P1 | 🟡 UI 对照中 | 全应用 UI 还原 | [全应用 UI 还原](work/backlog/T8-full-application-ui-functional-convergence.md) | 三个冻结原型已确认；T8.1 共享 Shell / 设置页与各菜单内容层可并行对照，分别完成唯一页面还原和 Prototype / Desktop 验收 |

## 验证入口

- 普通 push：GitHub CI 异步执行，不在本地重复运行。
- Release：运行 `tools\git-auto-release.cmd` 并等待全部步骤成功。
- 专项排查：仅在用户明确指定时运行对应命令。
