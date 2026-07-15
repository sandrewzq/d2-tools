# 仓库推荐与清理工作台

> 状态：Backlog
> 更新时间：2026-06-29

## 目标

把仓库页、装备详情、本地目标规则、DIM wishlist 和社区推荐整合成一个可解释的仓库整理工作台。用户应能看懂每件装备为什么值得留、为什么可清、命中了什么来源、风险在哪里，并能生成清理清单辅助进游戏手动处理。

这份 backlog 独立描述仓库整理方向，不依赖“小日向攻略解析”文档才能实施。

## 与其他任务的边界

本任务只负责仓库中的保留、复查和清理决策，以及支撑这些决策的同名对比、DIM wishlist、本地目标、社区来源和清理清单。

- 不负责解析攻略、理解自然语言配装目标或生成攻略证据；这些能力由“小日向攻略解析与账号证据工作台”负责。
- 可以向小日向和装备详情提供结构化仓库证据，但不在本任务中维护聊天问答或日报能力。
- 不负责判断商人当前库存或装备当前是否可刷；只消费已有来源事实。

## 用户场景

玩家仓库快满了，希望 d2-tools 帮他回答：

- 哪些装备命中我导入的 DIM wishlist。
- 哪些装备命中我自己的本地目标规则。
- 哪些同名装备重复且明显弱。
- 哪些装备只是启发式疑似好 roll，不能直接清。
- 哪些装备缺少数据，应该暂时保留。
- 最后生成一个“建议复查 / 可清理候选 / 必留”清单。

## 产品原则

1. 不自动分解装备：d2-tools 只生成清理建议和定位提示。
2. 推荐来源必须可见：DIM wishlist、本地目标、社区推荐、light.gg、启发式必须区分。
3. 默认保守：数据不足时进入复查，不进入可清理。
4. 用户规则优先：本地目标规则优先级高于社区推荐。
5. 同名对比优先于全局评分：仓库整理时，玩家最常见问题是“同名留哪把”。

## 数据来源优先级

推荐优先级从高到低：

1. 用户手动锁定 / 收藏状态。
2. 本地目标规则。
3. 用户导入的 DIM wishlist。
4. 同名装备对比结果。
5. 本地社区推荐表或用户显式导入的数据。
6. 用户显式开启的 light.gg AI 分析缓存。
7. 本地启发式提示。

关键规则：

- 用户锁定装备永远不能进入“可清理候选”。
- 命中本地目标规则的装备默认必留或复查。
- 命中 DIM wishlist 的装备默认必留或复查。
- 只有低风险、无命中、重复劣势明显、数据完整的装备才进入可清理候选。

## 推荐解释模型

建议统一成 `VaultDecisionEvidence`：

```ts
type VaultDecision = "keep" | "review" | "cleanup_candidate" | "unknown";

interface VaultDecisionEvidence {
  item_instance_id: string;
  item_hash: number;
  decision: VaultDecision;
  confidence: "high" | "medium" | "low";
  reasons: VaultDecisionReason[];
  warnings: string[];
  compared_with: string[];
}
```

每条 `VaultDecisionReason` 必须包含：

- 来源：本地目标、DIM wishlist、同名对比、社区推荐、light.gg、启发式、用户状态。
- 命中的具体条件：perk hash、属性阈值、目标规则 id、wishlist rule id。
- 中文解释。

## 功能范围

### 必做

- 仓库列表显示统一决策标签：必留、复查、可清理候选、未知。
- 详情弹框显示完整来源和证据。
- 同名装备对比进入同一套解释模型。
- DIM wishlist 命中、未命中、来源失败提示统一。
- 本地目标规则与仓库筛选联动。
- 生成清理清单，包含位置、角色、装备名、风险说明。

### 可选

- 批量加标签。
- 批量锁定或解锁计划。
- 按活动来源、赛季、武器类型分组清理。
- 导出文本清单。

### 暂不做

- 自动分解。
- 默认内置未经授权的社区 god roll 数据。
- 完整 DIM 搜索语法。
- 完整拖拽移动体验。

## UI 设计

### 仓库页

仓库页应形成三层结构：

1. 顶部筛选：类别、位置、标签、目标命中、DIM wishlist、清理状态。
2. 主列表：装备卡片显示名称、槽位、位置、关键 perk、决策标签。
3. 侧向或弹框详情：展示证据、同名对比、社区推荐和操作建议。

### 装备详情

详情弹框应重点优化解释成本：

- 顶部保留游戏内风格，展示装备核心身份。
- 工具区展示本地目标、DIM wishlist、同名对比、社区推荐。
- 每个推荐来源都有“为什么命中 / 为什么未命中”。
- 数据源失败时显示降级结果，不遮挡本地判断。

### 清理清单

清理清单不应像聊天回复，应像工作台：

- 按风险分组。
- 按角色 / 仓库位置排序。
- 显示“需要复查”的原因。
- 允许复制清单。
- 允许按清单筛选仓库。

## 代码边界

建议落点：

- `packages/core/src/analysis/wishlist.ts`：DIM wishlist 与本地启发式解释。
- `packages/core/src/analysis/wishlistImport.ts`：导入解析。
- `packages/core/src/community-perks/*`：社区推荐来源。
- `packages/core/src/items/*`：装备实例与来源归一。
- `packages/app/src/workspaces/vaultList.ts`：仓库 workspace 输出。
- `packages/desktop/src/renderer/features/vault/*`：仓库页私有 UI。
- `packages/desktop/src/renderer/shared/components/item-detail/*`：装备详情共享工具区。
- `packages/desktop/src/renderer/shared/hooks/useItemDetailWorkspace.ts`：详情数据组合。

边界要求：

- 仓库 feature 不直接 import 其他 feature。
- 跨仓库、账号、资料库共用的详情逻辑放在 `shared/`。
- Renderer API DTO 放到分域 API 或 `sharedTypes.ts`，不要塞回巨型 `api/types.ts`。

## 开发切片

### 切片 1：决策证据模型

产出：

- 定义统一 `VaultDecisionEvidence`。
- 把 DIM wishlist、本地目标、启发式提示归一到统一输出。
- 为锁定装备、目标命中、wishlist 命中建立优先级。

验收：

- 仓库列表和装备详情使用同一套决策来源。
- 命中原因能展示到具体规则或 perk。

### 切片 2：同名对比纳入决策

产出：

- 同名装备分组。
- 同名 roll / 属性差异摘要。
- 弱势重复装备进入复查或可清理候选。

验收：

- 同名装备不会只显示“重复”，必须说明差在哪。
- 锁定、目标命中、wishlist 命中的同名装备不会被误判可清理。

### 切片 3：清理清单

产出：

- 清理候选列表。
- 风险分组。
- 复制清单。
- 按清单筛选仓库。

验收：

- 清单里每件装备都有位置、原因和风险提示。
- 用户能从清单回到仓库定位装备。

### 切片 4：详情解释优化

产出：

- 详情工具区统一展示来源。
- 本地目标 / DIM wishlist / 社区推荐 / 同名对比视觉层级统一。
- 外部来源失败时保留本地判断。

验收：

- 武器详情不再只显示“疑似好 roll”，而是说明来源。
- 装备详情能区分“无推荐”和“数据源失败”。

## 测试要求

必须覆盖：

- DIM wishlist 命中、未命中、导入失败。
- 本地目标规则优先级。
- 锁定装备保护。
- 同名对比不会误伤命中装备。
- 清理清单输出稳定。
- light.gg 失败时本地判断仍展示。

推荐命令：

```powershell
npx pnpm@9.15.0 test
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 docs:check
```

## 完成标准

这份 backlog 完成时，应满足：

1. 仓库列表能按必留、复查、可清理候选、未知筛选。
2. 装备详情能解释每个推荐来源和命中证据。
3. 清理清单不会包含锁定装备、目标命中装备或 DIM wishlist 命中装备。
4. 同名装备对比能进入保留 / 复查判断。
5. 外部推荐失败不会影响本地仓库整理。
