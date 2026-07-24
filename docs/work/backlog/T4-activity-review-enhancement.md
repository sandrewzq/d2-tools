# 活动复盘增强

> 状态：Backlog
> 更新时间：2026-06-29

## 目标

在当前基础活动复盘之上，逐步补齐 Raid Report、Destiny Tracker 方向的轻量能力：完成时间推算、队伍成员、副本级趋势和活动历史解释。该 backlog 不追求完整排行榜或完整第三方统计站复刻。

## 用户场景

玩家希望查看：

- 最近打过哪些 Raid、Dungeon、PVP 或日常活动。
- 某次活动花了多久。
- 和谁一起打。
- 某个副本最近完成趋势。
- 是否能从活动记录跳到装备、配装或账号上下文。

## 数据来源

优先使用：

- Bungie Profile 活动历史。
- PGCR：需要队伍成员、活动详情和完成数据时接入。
- Destiny Manifest：活动名称、模式、图标、分类。
- 本地缓存：最近活动记录。

可选使用：

- 本地统计聚合。
- 用户手动筛选和标签。

禁止行为：

- 无 PGCR 时伪造队伍成员。
- 无数据时展示排行榜式结论。
- 把完整 Raid Report 级能力当成当前主线。

## 功能范围

### 必做

- 活动历史稳定展示。
- 完成时间推算。
- 副本 / 模式级趋势。
- 数据缺失时说明原因。

### 后续可做

- PGCR 队伍成员。
- 活动详情页。
- 与配装记录联动。
- 与小日向问答联动。

### 暂不做

- 全站排行榜。
- 完整 Raid Report 复刻。
- 完整 Destiny Tracker 复刻。

## 代码边界

建议落点：

- `packages/core/src/activities/history.ts`
- `packages/core/src/activities/review.ts`
- `packages/services/src/contracts.ts`
- `packages/app/src/workspaces/`
- `packages/desktop/src/renderer/api/activityApi.ts`
- `packages/desktop/src/renderer/features/` 中对应活动页面或复盘入口。

## 开发切片

### 切片 1：完成时间推算

产出：

- 从活动历史或 PGCR 可用字段推算完成时间。
- 数据不足时输出未知。

验收：

- 活动列表能显示完成时间或明确未知。

### 切片 2：队伍成员

产出：

- 接 PGCR 获取队伍成员。
- 成员数据缓存和失败降级。

验收：

- 有 PGCR 时展示成员。
- PGCR 失败时不影响基础复盘。

### 切片 3：副本级趋势

产出：

- 按活动 hash 或模式聚合最近趋势。
- 展示完成次数、最近完成、耗时变化。

验收：

- 趋势只基于本地或 API 可确认数据。

## 测试要求

推荐命令：

```powershell
npx pnpm@9.15.0 test
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 docs:check
```

## 完成标准

1. 基础活动历史可稳定查看。
2. 完成时间有可靠推算或明确未知。
3. PGCR 队伍成员可作为增强能力接入。
4. 副本趋势不依赖外部排行榜。

