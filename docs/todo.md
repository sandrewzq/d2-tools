# 当前待办

> 更新时间：2026-07-20
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
| T3 | P1 | 🟡 待验收 | 商人结构、覆盖与官方获取来源 | [商人结构、覆盖与官方获取来源](work/backlog/vendors-and-drop-sources.md) | 已接入 Vendor Group / 目的地两级目录、持久缓存、启动预热和周期刷新；下一步验收真实地点覆盖、跨重置边界、Offer 时效、去重和机灵模组 A/B |
| T4 | P3 | 🟡 待推进 | 活动复盘增强 | [活动复盘增强](work/backlog/activity-review-enhancement.md) | 接 PGCR、完成时间推算和副本级趋势 |
| T5 | P1 | 🟡 待验收 | 统一装备详情与知识分析 | [统一装备详情与知识分析](work/backlog/equipment-detail-and-knowledge-analysis.md) | 武器与独立护甲详情代码已收口；下一步验收资料库、商人、仓库真实对象与明暗主题，修正数据识别和视觉问题 |
| T6 | P1 | 🟡 等待 Release | 资料库与运行时性能架构升级 | [资料库与运行时性能架构升级](work/backlog/game-data-performance-architecture-upgrade.md) | 代码、全仓回归、Windows NSIS 打包、隔离安装版和性能预算已完成；下一次正式发版执行 Release workflow 与真实更新/回滚观察，稳定 Release 后删除 JSON/旧 IPC/旧 core HTTP 兼容层 |
| T7 | P1 | 🟡 待验证 | 架构边界收口 | [架构边界收口](work/backlog/architecture-boundary-hardening.md) | 独立本地 store 已迁 services，Prototype/Web fixture 已收紧；下一步由 CI 验证，并将 core 社区推荐编排与其剩余读写实现作为同一切片迁移 |

## 当前 Bug

| 编号 | 优先级 | 状态 | 问题 | 下一步 |
|---|---|---|---|---|
| Bug #2 | P1 | 🟡 待验证 | 切换武器 Perk 使用过时请求结构、错误角色或旧实例详情，导致 ErrorCode 25、1623、1679，并在成功后继续显示旧配置 | 多 Perk 现通过一次配置命令提交，主进程按 Bungie 限制顺序写入，正常路径仅在全部完成后刷新一次；异常时保留 1623/1679 单项恢复。详情请求绕过各层缓存并按目标 socket 校验，约 15 秒内自动重读且不提前显示完成；由真实武器验证 |
| Bug #8 | P2 | 🟡 待验证 | 商人装备首次打开时因预览对象尚未识别武器或护甲，先渲染旧通用详情和大面积空白，异步定义返回后再跳变为统一详情 | 加载期间改为固定尺寸的统一装备详情骨架，不再进入旧通用详情分支；由商人武器与护甲首次打开验证 |

## 验证入口

- 普通 push：GitHub CI 异步执行，不在本地重复运行。
- Release：运行 `tools\git-auto-release.cmd` 并等待全部步骤成功。
- 专项排查：仅在用户明确指定时运行对应命令。
