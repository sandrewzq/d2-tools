# 社区 Perk 推荐功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 d2-tools 中增加基于 DIM wishlist（可选 AI 查询 light.gg）的社区 perk 推荐参考，覆盖武器详情弹窗、仓库匹配度提示、资料库查询三个入口。

**Architecture:** 在 `packages/core` 新增可插拔的 `CommunityPerkRecommendationService`，实现 `DimWishlistSource` 和 `AiLightggSource`；`packages/desktop` 通过新增 IPC 暴露服务，并在 `HomePage.tsx`/`VaultPanel.tsx`/资料库渲染中接入。

**Tech Stack:** TypeScript, Electron IPC, React, pnpm workspace, Vitest

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `packages/core/src/analysis/communityPerks.ts` | 社区推荐服务抽象、`DimWishlistSource`、`AiLightggSource`、缓存与降级逻辑 |
| `packages/core/src/analysis/communityPerksCache.ts` | AI light.gg 查询结果的本地文件缓存（读写 + TTL） |
| `packages/core/src/index.ts` | 导出新增公共类型与函数 |
| `packages/core/test/community.perks.test.ts` | 核心逻辑单元测试 |
| `packages/core/test/community.perks.cache.test.ts` | 缓存逻辑单元测试 |
| `packages/desktop/src/main/ipc.ts` | 注册 `community:recommendations` IPC handler |
| `packages/desktop/src/preload/preload.cts` | 暴露 `getCommunityPerkRecommendations` 给渲染进程 |
| `packages/desktop/src/renderer/api/client.ts` | 前端 API 封装与类型导出 |
| `packages/desktop/src/renderer/components/CommunityRecommendationPanel.tsx` | 武器详情弹窗中的社区推荐展示 |
| `packages/desktop/src/renderer/utils/communityPerks.ts` | 仓库命中统计、roll 匹配判断等工具函数 |
| `packages/desktop/src/renderer/pages/HomePage.tsx` | 接入武器详情弹窗与仓库命中提示 |
| `packages/desktop/src/renderer/components/VaultPanel.tsx` | 仓库列表/详情命中提示 |
| `packages/desktop/src/renderer/utils/libraryFilters.ts` | 资料库结果中展示社区推荐 |
| `packages/desktop/src/renderer/components/AiSettingsPanel.tsx` | AI 设置中增加 light.gg 实时分析开关 |
| `packages/core/src/config/schema.ts` | 增加 `features.enable_ai_lightgg` 配置字段 |

---

## Phase 1: DIM wishlist 数据源 + 武器详情弹窗

### Task 1: 定义社区推荐核心类型

**Files:**
- Create: `packages/core/src/analysis/communityPerks.ts`

- [ ] **Step 1: 写入类型定义**

```typescript
import type { D2Config } from "../config/schema.js";
import type { DimWishlist, DimWishlistRule } from "./wishlistImport.js";

export type PerkRef = {
  hash: number;
  name: string;
  name_en?: string;
  icon?: string;
};

export type PerkCombo = {
  perks: PerkRef[];
  popularity?: number;
  source: "dim_wishlist" | "ai_lightgg";
  mode?: "pve" | "pvp" | "general";
  note?: string;
};

export type WeaponRecommendation = {
  item_hash: number;
  item_name: string;
  combos: PerkCombo[];
  individual_perks?: PerkRef[];
  sample_size?: string;
  source_label: string;
  disclaimer: string;
  ai_analysis?: string;
};

export type SourceOptions = {
  data_dir: string;
  manifest_language: string;
  item_name?: string;
};

export interface CommunityPerkSource {
  name: string;
  isAvailable(config: D2Config): boolean;
  getRecommendations(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null>;
}

export type CommunityPerkServiceInput = {
  config: D2Config;
  wishlist?: DimWishlist | null;
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/core/src/analysis/communityPerks.ts
git commit -m "feat: add community perk recommendation types"
```

---

### Task 2: 实现 DimWishlistSource

**Files:**
- Modify: `packages/core/src/analysis/communityPerks.ts`

- [ ] **Step 1: 在文件末尾添加实现**
