# 小日向日报、商人与掉落查询

> 状态：Backlog
> 更新时间：2026-06-29

## 目标

让小日向具备中文玩家日常查询能力：今天有什么、这周有什么、商人卖什么、某件装备去哪刷、账号还有哪些进度值得看。该能力服务首页和小日向侧栏，但必须坚持“只展示可确认数据，不做泛关键词猜测”。

这份 backlog 独立描述日报和掉落查询方向，不依赖其他 backlog 文档才能实施。

## 用户场景

玩家每天打开 d2-tools，希望看到：

- 今日 / 本周重置后有哪些值得关注内容。
- 商人库存里有没有值得买的装备或材料。
- 遗失区域、夜幕、试炼、双倍奖励等是否有可靠数据。
- 想刷某把武器时，它可能来自哪里。
- 小日向能用中文回答“今天有什么”“不朽去哪刷”“本周有什么奖励”。

## 产品原则

1. 可确认才展示：Bungie API、Manifest 或本地维护数据无法确认时，不展示成事实。
2. 首页只放高频摘要：复杂解释放进小日向或详情页。
3. 来源可见：每条日报信息要能说明来自 API、Manifest、本地维护表还是用户缓存。
4. 外部失败可降级：GitHub、light.gg 或第三方不可用时，不影响本地账号和 Manifest 功能。
5. 维护成本可控：不依赖每天手工更新的大表作为主路径。

## 数据来源

优先使用：

- Bungie API：Activities、Vendors、Milestones、Profile。
- Destiny Manifest：活动、物品、来源、vendor、presentation node。
- 本地缓存：最近成功拉取的商人和活动数据。
- 用户账号数据：角色进度、已拥有装备、活动历史。

可选使用：

- 本地维护的少量轮换映射表。
- 用户显式开启的外部查询或 AI 分析。
- 社区公开数据，但必须标明来源和更新时间。

禁止行为：

- 遗失区域只靠关键词猜测。
- 夜幕、试炼、双倍奖励没有可靠来源时硬展示。
- 商人 API 失败时显示过期数据但不提示时间。
- 把 AI 总结当作数据源。

## 功能范围

### 首页摘要

首页只展示确定性高的信息：

- 账号同步状态。
- 可确认的每日 / 每周活动。
- 可确认的商人库存摘要。
- 可确认的奖励、里程碑或进度提醒。
- 数据不可用时显示原因和上次成功时间。

首页不展示：

- 无法确认的遗失区域。
- 无来源的夜幕武器。
- 无来源的试炼地图。
- 未授权社区数据。

### 小日向查询

小日向应支持：

- “今天有什么”
- “这周有什么”
- “枪匠卖什么”
- “艾达卖什么”
- “这把武器去哪刷”
- “我有没有这件装备”
- “这个活动我最近打过吗”

回答必须包含：

- 结论。
- 来源。
- 时间戳。
- 不确定项。
- 可继续操作入口，例如跳到资料库、仓库或活动复盘。

### 掉落查询

掉落查询应优先来自 Manifest 和可维护的来源映射：

- 资料库按装备名搜索。
- 展示来源类型：活动、商人、世界掉落、纪念碑、锻造、赛季。
- 展示是否账号已拥有。
- 展示能否从当前 API 确认正在可刷。

如果只能知道历史来源，必须标记为“来源线索”，不能标记为“当前可刷”。

## 数据模型

建议统一成 `DailySignal`：

```ts
type DailySignalStatus = "confirmed" | "stale" | "unavailable" | "unknown";

interface DailySignal {
  id: string;
  category: "activity" | "vendor" | "reward" | "drop_source" | "account_progress";
  title: string;
  summary: string;
  status: DailySignalStatus;
  source: DailySignalSource;
  updated_at: string | null;
  related_hashes: number[];
  warnings: string[];
}
```

每条 `DailySignalSource` 必须说明：

- 来源类型：Bungie API、Manifest、本地缓存、本地维护表、用户账号。
- 来源时间。
- 是否为实时数据。
- 是否可能过期。

## UI 设计

### 首页

首页信息应是“可扫读”的日常面板：

- 今日重点。
- 商人摘要。
- 奖励 / 进度提醒。
- 数据源状态。

首页不承载长问答，不展示大段解释文本。需要解释时进入小日向或资料库。

### 小日向侧栏

小日向侧栏展示：

- 查询意图。
- 结果摘要。
- 来源和更新时间。
- 不确定项。
- 跳转按钮。

示例：

- “枪匠库存已更新，来源 Bungie Vendor API，更新时间 2026-06-29 10:03。”
- “当前无法确认今日遗失区域，未展示猜测结果。”

### 资料库联动

资料库装备详情应展示：

- Manifest 来源线索。
- 当前是否可确认掉落。
- 账号是否拥有。
- 可跳转仓库筛选。

## 代码边界

建议落点：

- `packages/core/src/daily/liveData.ts`：每日 / 每周信号归一。
- `packages/core/src/items/liveAvailability.ts`：装备来源与可获取状态。
- `packages/services/src/contracts.ts`：Profile、Manifest、Vendor、Activity 服务契约。
- `packages/app/src/workspaces/*`：首页、资料库、小日向 workspace 组合。
- `packages/desktop/src/main/ipc/library.ts`：资料库 IPC。
- `packages/desktop/src/renderer/shared/components/DailySummaryPanel.tsx`：首页摘要。
- `packages/desktop/src/renderer/features/library/*`：资料库掉落查询。
- `packages/desktop/src/renderer/components/GlobalAssistantSidebar.tsx`：小日向查询展示。

边界要求：

- 每日数据计算放 `core` 或 `app`，不要散落在 UI。
- 主进程 IPC 分领域维护。
- UI 文案进入共享 copy 或领域 copy。

## 开发切片

### 切片 1：DailySignal 模型

产出：

- 统一每日 / 每周信号模型。
- 来源、时间戳、状态、警告字段。
- 首页和小日向可复用。

验收：

- 无来源的数据不能成为 `confirmed`。
- 过期缓存必须显示 `stale`。

### 切片 2：商人和活动信号

产出：

- Vendor API 数据归一。
- 可确认活动归一。
- API 失败时保留上次成功时间。

验收：

- 商人库存显示来源和更新时间。
- API 失败时不显示成实时结果。

### 切片 3：掉落来源查询

产出：

- 资料库装备来源线索。
- 当前可确认 / 历史线索区分。
- 账号已拥有状态。

验收：

- 查询一把武器时，用户能看见来源线索和拥有状态。
- 无法确认当前可刷时明确提示。

### 切片 4：小日向日报问答

产出：

- 小日向识别日常查询意图。
- 返回结构化日报结果。
- 支持跳转资料库、仓库或首页。

验收：

- “今天有什么”“这周有什么”“枪匠卖什么”“这把去哪刷”有稳定回答。
- 每个回答都有来源、时间戳和不确定项。

## 测试要求

必须覆盖：

- `DailySignal` 状态归一。
- Vendor 成功、失败、过期缓存。
- 掉落来源当前可确认和历史线索区分。
- 首页摘要文案。
- 小日向查询结果。

推荐命令：

```powershell
npx pnpm@9.15.0 test
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 docs:check
```

## 完成标准

这份 backlog 完成时，应满足：

1. 首页只展示可确认的日常信息。
2. 小日向能回答常用日报、商人和掉落查询。
3. 每条信息都有来源和更新时间。
4. 数据不可用时显示原因，不做猜测。
5. 资料库能展示装备来源线索和账号拥有状态。

## 非目标

- 不做 QQ Bot。
- 不做网页爬虫式日报。
- 不默认内置未经授权的社区轮换表。
- 不把 AI 作为事实来源。

