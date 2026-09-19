# T82：首页简报的定义读取失败会抛穿，且与「数据集未覆盖」不可区分

> 状态：✅ 已通过实窗验收（2026-09-19）
> 来源：T74 第九节第 3 条（2026-09-18 拍板单独开号）。
> 关联：T74（掉落池数据链路）。

## 一、两个问题

1. **未包 `try/catch`**：`desktop/src/main/runtime/homeBriefing.ts:132` 的
   `await getDefinitions("DestinyInventoryItemDefinition", lootPoolHashes)` 直接挂在
   `buildHomeBriefing` 的主流程上。定义批量读取一旦失败，抛穿的是**整个首页简报**，
   不是单张卡片——首页会整体不可用。
2. **两种失败分不开**：`getDefinitions` 失败与「活动不在受控数据集里」在界面上
   分不出该重试还是该等数据补齐。**这条要修正措辞**：按 2026-09-19 的代码，两者
   并不是「落到同一条 `is-pending` 分支」——数据集未覆盖走 `HomePageContentView.tsx`
   的 `is-pending`「掉落池待核对」，而读取失败在 `:132` 就抛穿了，用户看到的是
   **整页首页失败**。形态是「一个降级、一个整页挂」，不是「同一个空态」；
   但「用户不知道该怎么办」这个结论成立。

## 二、目标

- 掉落池定义读取失败只降级这一处（该活动不显示掉落池），不影响首页其余部分；
- 两种失败给出可区分的文案与状态：一类是「读不到，可以重试」，一类是「轮换已确认，掉落关系尚未核对」。

## 三、约束

- 不改 T74 的数据集与生成脚本；这是错误路径，不是数据覆盖。
- 按 `AGENTS.md`，`homeBriefing.ts` 属主进程运行时，改动要说明影响范围。

## 四、实现记录（2026-09-19）

| 文件 | 改动 |
|---|---|
| `packages/desktop/src/main/runtime/homeBriefing.ts` | `:132` 的 `getDefinitions` 包 `try/catch`：失败时记一条 `console.warn` 并置 `lootPoolReadFailed`，简报照常往下走；`attachRotatingLootPools` 多收一个 `lootPoolReadFailed` 参数，把标记打在「受控数据集确实覆盖了这个活动」的条目上（新增 `hasControlledLootPool` 判断），数据集本来就没覆盖的活动保持原样 |
| `packages/core/src/weekly/summary.ts` | `WeeklyActivityEntry` 新增可选字段 `loot_pool_read_failed?: boolean` |
| `packages/ui/src/home/HomePageContentView.tsx` | 条目类型同步该字段；`HomeActivityEntry` 里读失败时不退回聚合奖励（那块内容不是掉落池，挂在「掉落池」标签下属于错误归因），并按状态渲染两种文案 |
| `packages/ui/src/styles/menus/home/03-content.css` | `.weekly-activity-reward.is-error` 与 `.is-pending` 共用单列布局 |
| `packages/ui/src/i18n/copy/home.ts` | 两条新文案的英文条目 |

两种状态的界面对照：

| 情形 | 标题 | 说明 | 颜色 |
|---|---|---|---|
| 受控数据集没覆盖这个活动 | 掉落池待核对 | 轮换已确认，掉落关系尚未核对。 | 沿用原配色 |
| 掉落池定义这次没读到 | 掉落池读取失败 | 这次没读到掉落池定义，刷新首页可以重试。 | `data-text-tone="status" data-status="error"` → `var(--red)` |

缓存版本号**不动**：`briefingStore.ts` 的 `isWeeklySummary` 不校验条目字段，新增的是可选字段，旧缓存读出来只是没有这个标记。

**判据之外的一处口径修正**：本文件第一节第 2 条原来写「两种失败落到同一个 `is-pending` 空态」，按 2026-09-19 的代码不成立，已在上方就地改正。

### 影响范围

`buildHomeBriefing` 一条链路：只有掉落池那一次定义批量读取被兜住，首页其余部分（每日/每周摘要、商人、Xur）走的是原有路径。成功路径的行为一个字没变——`try` 块里还是原来那两行。

### 未跑本地自动化验证

本地未跑 typecheck / 构建 / 测试，由 CI 与 Release 负责。
