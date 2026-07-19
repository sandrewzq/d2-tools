# 当前待办

> 更新时间：2026-07-19
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
| T3 | P1 | 🟡 待验证 | 商人结构、覆盖与官方获取来源 | [商人结构、覆盖与官方获取来源](work/backlog/vendors-and-drop-sources.md) | 已增加实时库存持久缓存、后台差异刷新、请求合并和分阶段性能记录；下一步由 CI 与真实账号验证冷启动、超时恢复、机灵模组 A/B 和逐商人库存 |
| T4 | P3 | 🟡 待推进 | 活动复盘增强 | [活动复盘增强](work/backlog/activity-review-enhancement.md) | 接 PGCR、完成时间推算和副本级趋势 |
| T5 | P1 | 🟡 进行中 | 统一装备详情与知识分析 | [统一装备详情与知识分析](work/backlog/equipment-detail-and-knowledge-analysis.md) | 已修复新式武器强化候选重复与 `frames` 特性误分类；下一步由 CI 和真实武器验证后开发独立护甲详情 |
| T6 | P1 | 🟡 待验证 | 资料库与运行时性能架构升级 | [资料库与运行时性能架构升级](work/backlog/game-data-performance-architecture-upgrade.md) | 已增加首页简报持久缓存与缓存优先后台刷新；下一步由 CI 和真实冷启动确认首页立即展示旧数据、内容变化后自动替换，再进入 Release 验证 |
| T7 | P1 | 🟡 待验证 | 架构边界收口 | [架构边界收口](work/backlog/architecture-boundary-hardening.md) | 第二轮已迁 IO/HTTP、fixture、preload CJS，并修复资料库未就绪时的启动请求与错误编码；下一步由 CI 验证，再迁 core 剩余 store/client 与宽松 fixture |

## 当前 Bug

| 编号 | 优先级 | 状态 | 问题 | 下一步 |
|---|---|---|---|---|
| Bug #1 | P1 | 🟡 待验证 | 武器详情将强化枪管、弹匣和特性重复计入默认 Perk 池，并把 `frames` 分类下的普通特性误判为固有框架 | 使用“赐予者的祝福”等真实武器确认普通候选数量、两列特性池和当前 Roll 均正确 |
| Bug #2 | P1 | 🟡 待验证 | 切换武器 Perk 时 `InsertSocketPlugFree` 请求将 `plug` 错误序列化为数字，导致 Bungie 返回 ErrorCode 25 / JSON Serialization Error | 由 CI 检查请求结构，并使用可切换 Perk 的真实武器确认写操作成功 |
| Bug #3 | P1 | 🟡 待验证 | “装备最高光等”逐件串行调用 `EquipItem`，多件装备时长时间停留在执行中，且 Bungie 请求无超时会导致真正的永久卡住 | 已改为单次 `EquipItems` 批量请求并为写操作设置 45 秒超时；由 CI 检查请求结构，再用真实角色验证完成时间和超时恢复 |
| Bug #4 | P1 | 🟡 待验证 | 商人库存请求没有持久缓存和底层超时，且首页与商人页会并发读取角色商人数据，导致页面长时间或永久停在“正在读取实时商人库存” | 已增加按账号/角色/语言隔离的库存缓存、缓存优先后台差异刷新、共享请求合并、30 秒底层超时、分阶段性能记录和失败重试；由 CI 与真实账号验证 |

## 验证入口

- 普通 push：GitHub CI 异步执行，不在本地重复运行。
- Release：运行 `tools\git-auto-release.cmd` 并等待全部步骤成功。
- 专项排查：仅在用户明确指定时运行对应命令。
