# d2-tools 社区 Perk 推荐功能设计

更新时间：2026-06-21

关联方向：仓库整理体验、资料库、AI 助手

## 1. 背景

当前 `d2-tools` 已经具备：

- 武器详情弹窗中的「实际 Roll」、「所有可能 Perk」、「DIM 愿望单命中」、「本地评分」
- DIM wishlist 导入与解析能力
- 本地启发式 perk 评价
- AI 单件/仓库分析能力

玩家在日常整理仓库时，除了看自己手上的 roll 好不好，还希望知道**社区里大家普遍用什么 perk 组合**。Light.gg 的 `Popular Trait Combos` / `Popular Individual Perks` 就是这种需求的典型参考。

本设计目标是在 `d2-tools` 中增加一套**社区 perk 推荐参考**，数据来源以稳定的 DIM wishlist 为主、可选的 AI 实时查询 light.gg 为辅，并在三个入口展示。

## 2. 版本目标

本次设计要达成：

1. 新增可插拔的社区 perk 推荐数据源抽象。
2. 实现 `DimWishlistSource`：基于本地导入的 DIM wishlist，按武器提取推荐 perk 组合。
3. 实现 `AiLightggSource`：在支持工具的 AI provider（如 OpenAI Responses）启用时，让 AI 查询 light.gg 并生成中文分析。
4. 在武器详情弹窗新增「社区推荐」区块。
5. 在仓库视图为武器增加「社区推荐命中」提示。
6. 在资料库查询中为武器增加独立的社区推荐入口。
7. Perk 名称以中文为主，同时展示英文原名。
8. AI 查询默认关闭，开启时明确提示成本与免责声明。

## 3. 明确边界

### 3.1 本设计要做

- `CommunityPerkRecommendationService` 抽象与统一接口。
- `DimWishlistSource`：解析 DIM wishlist，输出推荐组合。
- `AiLightggSource`：基于 AI 工具调用查询 light.gg，输出分析文本。
- 武器详情弹窗的「社区推荐」区块。
- 仓库列表/详情的社区推荐命中提示。
- 资料库武器查询的社区推荐展示。
- 本地缓存与失败降级。
- AI 设置中的功能开关与成本提示。

### 3.2 本设计不做

- 不直接编写程序爬虫抓取 light.gg（绕过 Cloudflare 风险高、维护重）。
- 不自建全球玩家装备统计服务。
- 不提供「绝对强度」评分，只提供「社区推荐/流行度参考」。
- 不在没有 AI 配置时默认启用 light.gg 实时分析。
- 不修改 wishlist 导入文件的格式。
- 不将 perk 推荐数据上传到任何服务端。

### 3.3 约束

- 所有数据优先本地可确认；AI 查询仅作为可选增强。
- 保持 d2-tools 的中文界面风格。
- AI 查询失败时不能阻塞主功能。
- 不在公开分发包中内置任何 AI key 或 light.gg 凭证。
- 遵循现有 `core` / `desktop` 包分层。

## 4. 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│  UI 层（packages/desktop/src/renderer）                      │
│  ├─ 武器详情弹窗：CommunityRecommendationPanel               │
│  ├─ 仓库视图：CommunityMatchBadge / VaultItemRow             │
│  └─ 资料库：LibraryWeaponRecommendationCard                  │
├─────────────────────────────────────────────────────────────┤
│  API / IPC 层                                                │
│  └─ 新增 IPC：getCommunityPerkRecommendations(item_hash)     │
├─────────────────────────────────────────────────────────────┤
│  服务层（packages/core/src/analysis/communityPerks.ts）      │
│  ├─ CommunityPerkRecommendationService                     │
│  │   ├─ DimWishlistSource（默认）                           │
│  │   └─ AiLightggSource（可选）                             │
│  └─ 本地缓存 + TTL + 失败降级                                │
└─────────────────────────────────────────────────────────────┘
```

## 5. 数据模型

### 5.1 PerkCombo

```typescript
type PerkCombo = {
  perks: PerkRef[];
  popularity?: number;
  source: "dim_wishlist" | "ai_lightgg";
  mode?: "pve" | "pvp" | "general";
  note?: string;
};

type PerkRef = {
  hash: number;
  name: string;
  name_en?: string;
  icon?: string;
};
```

### 5.2 WeaponRecommendation

```typescript
type WeaponRecommendation = {
  item_hash: number;
  item_name: string;
  combos: PerkCombo[];
  individual_perks?: PerkRef[];
  sample_size?: string;
  source_label: string;
  disclaimer: string;
  ai_analysis?: string;
};
```

### 5.3 数据源接口

```typescript
interface CommunityPerkSource {
  name: string;
  isAvailable(config: D2Config): boolean;
  getRecommendations(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null>;
}
```

## 6. 数据源设计

### 6.1 DimWishlistSource

- **输入**：已导入的 `DimWishlist` 规则数组。
- **处理**：
  - 按 `item_hash` 过滤规则。
  - 将规则中的 `perk_hashes` 与武器的 socket 插槽匹配，把同一规则内同时出现的 trait 列 perk 组合成 `PerkCombo`。
  - 通过现有 `perks.ts` / `perkSearch.ts` 把 perk hash 映射为中文/英文名称。
- **输出**：`WeaponRecommendation`，`source_label` 为「DIM 愿望单」，无百分比。
- **可用性**：只要用户导入过 wishlist 就可用。

### 6.2 AiLightggSource

- **输入**：武器 hash、名称、当前 AI 配置。
- **处理**：
  - 检查 provider 是否支持网页/搜索工具（如 OpenAI Responses 的 `web_search` 或浏览器工具）。
  - 若支持，构造提示词让 AI 访问 `https://www.light.gg/db/items/{hash}/{slug}/`。
  - 要求 AI 返回：
    - Popular Trait Combos 的前几名及百分比
    - Popular Individual Perks 的前几名及百分比
    - 一段面向中文玩家的简要分析
  - 解析 AI 返回的文本，按武器缓存 24 小时。
- **输出**：`WeaponRecommendation`，`source_label` 为「AI 实时查询 light.gg」，含 `ai_analysis`。
- **可用性**：需要用户开启 AI、配置支持工具的 provider、并在设置中勾选「启用 light.gg 实时分析」。

### 6.3 数据源优先级

1. 若 AI 开关开启且 provider 支持工具，优先尝试 `AiLightggSource`。
2. `AiLightggSource` 失败或超时时，自动回退到 `DimWishlistSource`。
3. 若 AI 未启用，仅使用 `DimWishlistSource`。
4. 两者都不可用时，展示「暂无社区推荐」。

## 7. UI 设计

### 7.1 武器详情弹窗

在现有「实际 Roll」和「所有可能 Perk」之间新增一个可折叠区块：

- **标题**：社区推荐
- **内容**：
  - 数据来源标签（DIM 愿望单 / AI 实时查询 light.gg）
  - 推荐组合列表，每项显示：
    - perk 图标 + 中文名（英文名）
    - 百分比（若来自 AI）
    - PvE / PvP / 通用 标签
  - AI 分析文本（若来自 AI）
  - 免责声明

### 7.2 仓库视图

- 在仓库列表的每件武器行上增加一个轻量提示：
  - 命中 N 个社区推荐组合
  - 无命中时不显示，避免信息过载
- 在武器详情弹窗顶部或评分面板旁增加「社区推荐命中数」。

### 7.3 资料库查询

- 资料库搜索武器后，在结果卡片或详情面板中增加「社区推荐」入口。
- 不依赖账号实例，仅基于 DIM wishlist 展示推荐组合。
- 若启用 AI，资料库武器的 light.gg 分析可延迟加载。

## 8. 缓存与更新策略

### 8.1 DIM wishlist 数据

- 基于内存 + 导入时解析结果，无需额外缓存。
- 用户重新导入 wishlist 时刷新。

### 8.2 AI light.gg 数据

- 本地文件缓存：`%APPDATA%/d2-tools/cache/lightgg/{item_hash}.json`
- TTL：24 小时
- 提供手动刷新按钮
- 缓存内容：原始 AI 返回文本 + 解析后的结构化数据 + 缓存时间

## 9. 错误处理与降级

| 场景 | 行为 |
|---|---|
| AI provider 不支持网页/搜索工具 | 隐藏 light.gg 开关，仅展示 DIM wishlist 数据 |
| AI 查询超时/失败 | 降级到 DIM wishlist，UI 显示「light.gg 查询失败，显示 DIM 愿望单数据」 |
| DIM wishlist 未导入 | 提示用户导入 wishlist 或开启 AI |
| 武器无推荐数据 | 显示「暂无社区推荐」 |
| AI 返回无法解析 | 直接展示 AI 原始分析文本，不展示结构化组合 |

## 10. 安全与成本

### 10.1 安全

- AI 查询只发送武器 hash、名称等公开 manifest 信息，不发送用户账号、token、vault 标签。
- 不在公开包中内置任何 key。
- light.gg 查询通过用户自己的 AI provider 发起，不经过 d2-tools 服务端。

### 10.2 成本

- DIM wishlist 解析零成本。
- AI 查询每次都会产生 provider 费用，需要在设置页明确提示。
- 默认关闭，用户手动开启。
- 24 小时缓存减少重复查询。

## 11. 实现阶段

### Phase 1：DIM wishlist 数据源 + 武器详情弹窗

- 新增 `packages/core/src/analysis/communityPerks.ts`
- 实现 `DimWishlistSource`
- 在 `HomePage.tsx` 新增 `CommunityRecommendationPanel`
- 测试：无 wishlist、有 wishlist、多件武器

### Phase 2：仓库匹配度 + 资料库入口

- 在 `VaultPanel.tsx` 增加命中提示
- 在资料库结果中增加推荐展示
- 新增 `buildCommunityMatchSummary` 工具函数
- 测试：仓库列表、资料库搜索

### Phase 3：AI light.gg 实时分析

- 扩展 `packages/core/src/ai/chat.ts`，支持工具调用（优先 OpenAI Responses）
- 实现 `AiLightggSource`
- 在 AI 设置面板增加「启用 light.gg 实时分析」开关和成本提示
- 测试：AI 查询成功、失败降级、provider 不支持工具

## 12. 测试策略

- **单元测试**：
  - `DimWishlistSource` 解析多种 wishlist 规则
  - 缓存读写与 TTL
  - 失败降级逻辑
  - AI 返回解析
- **集成测试**：
  - 武器详情弹窗正确渲染推荐组合
  - 仓库列表命中提示更新
  - 资料库查询展示推荐
- **人工测试**：
  - 真实 DIM wishlist 导入后的展示效果
  - OpenAI Responses 查询 light.gg 的可用性
  - 中文 perk 名与英文原名的展示效果

## 13. 后续可扩展

- 接入更多社区数据源（如 voltron、 blueberries.gg 推荐列表）。
- 支持用户自定义本地推荐规则。
- 按活动类型（Raid / PvP / Grandmaster）过滤推荐组合。
- 在 AI 分析中加入当前 roll 与社区推荐的对比结论。
