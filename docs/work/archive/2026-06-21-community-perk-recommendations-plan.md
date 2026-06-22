# 社区 Perk 推荐功能 · 实施计划

> 相关设计文档：[2026-06-21-community-perk-recommendations-design.md](./2026-06-21-community-perk-recommendations-design.md)
> 语言：TypeScript（ESM，严格模式，noImplicitAny），不添加代码注释

---

## 现有代码模式速览

在开始实现前，先确认关键模块的约定，以便我们复用它们：

### wishlist 数据流程

`DimWishlist` 以 `dim-wishlist.json` 的形式保存在 `data_dir` 下，由 `wishlistStore.ts` 读写。规则的类型已经存在于 `wishlistImport.ts` 中：

```
DimWishlistRule: { item_hash, perk_hashes, mode, note }
DimWishlist: { title, rules }
```

`loadDimWishlist(dataDir) → DimWishlist | null` 在文件不存在时返回 `null`，已做类型校验（数字过滤、默认值回填）。我们在实现 `DimWishlistSource` 时直接调用它。

### AI 调用模式

`ai/chat.ts` 暴露了 `callAiText(settings, messages, temperature, fetcher)`（内部函数，外部不可直接使用），以及：
- `generateItemAiAdvice(input) → { score, ai: { provider, model, text, sections } }`：用于单个装备的 AI 解读
- `generateAiChatReply(input) → { provider, model, text }`：用于通用聊天
- `testAiConnection(input) → { ok, provider, model, text }`：连接测试
- `normalizeAiConfig(partial) → { provider, api_key, model, base_url }`：配置标准化

这些函数的 common contract：
1. 入口参数里的 `input.config` 来自 `D2Config`；
2. `settings.provider` 为空时抛错，`settings.api_key` 为空时抛错，`settings.model` 为空时抛错；
3. 输出固定返回 `provider + model + text`，我们新增的工具调用版本复用此 contract。

### 武器详情弹窗模式

`HomePage.tsx` 中 `renderItemModal()` 在 `selectedItem` 非空时渲染。区块顺序大致为：

```
Header（图标、名称、品质、类型、物品栏来源）
├─ 基础信息（power、锁定状态、描述）
├─ 来源信息（.daily-source）
├─ DIM Wishlist 命中（.wishlist-panel）          ← 已有
├─ 本地备注（.item-note-panel）                   ← 已有
├─ AI 装备解读（.ai-advice-panel，可选）           ← 已有
├─ 同名对比
├─ 实际 Roll（.modal-perk-group）                 ← 已有
└─ 所有可能 Perks（.modal-perks / .modal-perk-group） ← 已有
```

新的「社区推荐」区块插入在 **DIM Wishlist 命中** 与 **本地备注** 之间。这样它在已有信息链中最符合逻辑：用户先看基础信息→再看是否命中 wishlist→再看社区推荐 perk 组合→再看本地备注/AI解读/实际 roll。

### IPC 约定

主进程 `ipc.ts` 使用 `ipcMain.handle("namespace:action", handler)`；前端通过 `window.ipc.invoke("namespace:action", ...args)` 调用。返回值为 Promise，错误同步抛出。

### 命名约定

- 函数名：动词开头（`loadXxx`, `saveXxx`, `generateXxx`, `summarizeXxx`）
- 组件名：PascalCase + 名词（`AiAdvicePanel`, `VaultPanel`）
- 类型名：PascalCase（`D2Config`, `DefinitionRecord`, `DimWishlist`）
- 测试：位于 `tests/` 目录，导入来自 `../src/xxx.js`，使用 Node.js 内置 test runner（`node --test`）

---

## Phase 1：核心服务层 + DimWishlistSource + 武器详情弹窗社区推荐

**目标**：让武器详情弹窗里显示「社区推荐 Perk 组合」区块，数据来自 DIM wishlist。

### 1.1 新增类型定义

文件：`packages/core/src/communityPerks/types.ts`

```
import type { DefinitionRecord, DefinitionComponentData } from "../manifest/definitions.js";

export type PerkRef = {
  hash: number;
  name: string;
  description?: string;
  icon?: string;
};

export type PerkCombo = {
  perks: PerkRef[];
  popularity?: number;
  source: "dim_wishlist" | "ai_lightgg";
  mode: "pve" | "pvp" | "general";
  note?: string;
};

export type WeaponRecommendation = {
  item_hash: number;
  item_name: string;
  combos: PerkCombo[];
  matched_modes: Array<"pve" | "pvp" | "general">;
  disclaimer?: string;
};

export type SourceOptions = {
  itemDefinitions?: DefinitionComponentData;
  plugSetDefinitions?: DefinitionComponentData;
  item_name?: string;
};

export interface CommunityPerkSource {
  name: string;
  isAvailable(config: { data?: { data_dir?: string } } | null | undefined): boolean;
  getRecommendations(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null>;
}
```

### 1.2 实现 DimWishlistSource

文件：`packages/core/src/communityPerks/dimWishlistSource.ts`

**依赖**：`wishlistStore.loadDimWishlist`、`wishlistImport.DimWishlistRule`、`items/perks.summarizeItemPerks`（可选）、`items/detail.getItemDefinitionDetail`（可选）

**核心逻辑**：

```
1. 读取本地 dim-wishlist.json → DimWishlist | null
   如果为空 → 返回 null
   如果不存在 → 返回 null

2. 从 rules 中筛选 item_hash === 当前 hash 的规则 → matchingRules
   如果为空 → 返回 null

3. 构建 weapon 的所有可能 perk（按 socket 分组），以支持"哪些 perk 属于哪个槽位"的语义
   - 若 options.itemDefinitions 存在 → 使用 summarizeItemPerks 获取分组
   - 若不存在 → 跳过分组校验，直接把 rule.perk_hashes 中的每个 hash 转成 PerkRef（name 用 hash string 作为 fallback，显示由前端做本地化解析）

4. 对每个 rule：
   - 取 rule.perk_hashes（已是去重后的 hash 列表）
   - 将这些 hash 与武器的 socket 分组做匹配，从分组中挑出对应名称
   - 构造 PerkCombo：
       perks: PerkRef[] = rule.perk_hashes 对应的每个 perk 的 { hash, name, description, icon }
       popularity: undefined（DIM wishlist 不提供 popularity 数值）
       source: "dim_wishlist"
       mode: rule.mode
       note: rule.note
   - 跳过 perk_hashes 为空的规则（wishlistStore 已在保存时过滤）

5. 合并结果：
   combos: 按 mode 分组后的 combo 列表（pve 在前，pvp 次之，general 最后）
   matched_modes: 从规则中收集到的去重 mode
   disclaimer: "数据来自本地导入的 DIM Wishlist，仅反映愿望单作者的偏好。"
   item_name: options.item_name ?? 规则所在武器的名称（由调用方提供）
   item_hash: hash

6. 若 combos 为空 → 返回 null
```

**函数签名**：

```
export function createDimWishlistSource(data_dir: string): CommunityPerkSource;
```

内部构造为：

```
return {
  name: "DIM Wishlist",
  isAvailable: (config) => {
    const dir = config?.data?.data_dir ?? data_dir;
    try {
      return loadDimWishlist(dir) !== null;
    } catch {
      return false;
    }
  },
  getRecommendations: async (item_hash, options) => {
    const wishlist = loadDimWishlist(data_dir);
    if (!wishlist) return null;
    // ...
  }
};
```

**注意**：`getRecommendations` 必须声明为 `async`，即使内部没有 I/O，也要保持与 `CommunityPerkSource` 接口一致，方便 Phase 3 的 AI 数据源无缝接入。

### 1.3 实现社区推荐服务层

文件：`packages/core/src/communityPerks/communityPerkRecommendationService.ts`

**功能**：
- 注册并管理多个 `CommunityPerkSource`
- 按顺序调用数据源，第一个返回非 null 的结果作为最终推荐
- （为 Phase 3 预留）支持并行查询多个数据源，合并结果

**核心流程**：

```
export class CommunityPerkRecommendationService {
  private sources: CommunityPerkSource[];
  private config: { data?: { data_dir?: string } } | null | undefined;

  constructor(config: { data?: { data_dir?: string } } | null | undefined, sources?: CommunityPerkSource[]) {
    this.config = config;
    this.sources = sources ?? [];
  }

  addSource(source: CommunityPerkSource): void {
    this.sources.push(source);
  }

  async getRecommendations(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null> {
    for (const source of this.sources) {
      if (!source.isAvailable(this.config)) {
        continue;
      }
      const result = await source.getRecommendations(item_hash, options);
      if (result && result.combos.length > 0) {
        return result;
      }
    }
    return null;
  }

  async getRecommendationsWithAllSources(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null> {
    // Phase 3 扩展：并行查询多个数据源，合并 combos
    const available = this.sources.filter((s) => s.isAvailable(this.config));
    if (available.length === 0) return null;

    const results = await Promise.all(
      available.map((s) => s.getRecommendations(item_hash, options))
    );
    const valid = results.filter((r): r is WeaponRecommendation => r !== null && r.combos.length > 0);
    if (valid.length === 0) return null;

    const combos = valid.flatMap((r) => r.combos);
    const modes = Array.from(new Set(combos.map((c) => c.mode))) as Array<"pve" | "pvp" | "general">;

    return {
      item_hash,
      item_name: options.item_name ?? valid[0].item_name,
      combos,
      matched_modes: modes,
      disclaimer: valid.map((r) => r.disclaimer).filter(Boolean).join(" | ")
    };
  }
}
```

**便捷函数**：

```
export function createDefaultCommunityPerkService(
  config: { data?: { data_dir?: string } } | null | undefined
): CommunityPerkRecommendationService {
  const service = new CommunityPerkRecommendationService(config);
  const data_dir = config?.data?.data_dir;
  if (data_dir) {
    service.addSource(createDimWishlistSource(data_dir));
  }
  return service;
}
```

### 1.4 更新 index.ts 导出

文件：`packages/core/src/index.ts`

在现有的 wishlist 导出之后插入：

```
export * from "./communityPerks/types.js";
export * from "./communityPerks/dimWishlistSource.js";
export * from "./communityPerks/communityPerkRecommendationService.js";
```

### 1.5 新增 IPC 句柄

文件：`packages/desktop/src/main/ipc.ts`

在 `wishlist:clear` 句柄之后，新增：

```
import {
  createDefaultCommunityPerkService,
  type SourceOptions,
  type WeaponRecommendation,
} from "@d2-tools/core";

ipcMain.handle("community:recommendations:get", (_event, item_hash: number, options?: SourceOptions) => {
  const config = loadConfig();
  const service = createDefaultCommunityPerkService({ data: { data_dir: config.data.data_dir } });

  // 如果前端没传，从本地加载定义以提供更丰富的 perk 信息
  const merged: SourceOptions = {
    itemDefinitions: options?.itemDefinitions ??
      loadDefinitionComponent(config.data.data_dir, "DestinyInventoryItemDefinition") ?? undefined,
    plugSetDefinitions: options?.plugSetDefinitions ??
      loadDefinitionComponent(config.data.data_dir, "DestinyPlugSetDefinition") ?? undefined,
    item_name: options?.item_name
  };

  return service.getRecommendations(Number(item_hash), merged);
});
```

同时在 `packages/desktop/src/main/ipc.ts` 顶部的 `@d2-tools/core` import 中追加需要的符号（已在上面代码块里体现）。

### 1.6 武器详情弹窗：新增社区推荐区块

文件：`packages/desktop/src/renderer/pages/HomePage.tsx`

**状态新增**：

在组件顶部的 `useState` 调用附近，找到 `const [selectedItem, setSelectedItem]` 之后，新增：

```
const [communityRecommendations, setCommunityRecommendations] = useState<WeaponRecommendation | null>(null);
const [isCommunityRecommendationsLoading, setIsCommunityRecommendationsLoading] = useState(false);
```

**清空时机**：`closeItemDetail()` 中同时 `setCommunityRecommendations(null); setIsCommunityRecommendationsLoading(false);`

**加载逻辑**：在 `openItemDetail()` 的内部 `await itemDetail` 加载完成之后、在 `setSelectedItem(...)` 之后，追加：

```
setIsCommunityRecommendationsLoading(true);
window.ipc.invoke("community:recommendations:get", selectedItem.hash, { item_name: selectedItem.name })
  .then((result) => setCommunityRecommendations(result))
  .catch((error) => {
    console.warn("社区推荐加载失败：", error);
  })
  .finally(() => setIsCommunityRecommendationsLoading(false));
```

**UI 区块**：在 `wishlist-panel`（第 ~3370 行 `wishlist.matched` 条件块结束后）与 `item-note-panel`（`local note` 块）之间插入：

```
{communityRecommendations ? (
  <section className="community-recommendations-panel">
    <div className="community-recommendations-header">
      <div>
        <h3>社区推荐 Perk 组合</h3>
        <p>
          {communityRecommendations.matched_modes.map(formatCommunityMode).join(" / ") || "未标注模式"}
        </p>
      </div>
      <div className="community-source-badges">
        {communityRecommendations.combos[0]?.source === "dim_wishlist" ? (
          <span className="community-source-badge">DIM Wishlist</span>
        ) : null}
        {communityRecommendations.combos[0]?.source === "ai_lightgg" ? (
          <span className="community-source-badge">AI · light.gg</span>
        ) : null}
      </div>
    </div>
    <ul className="community-combos">
      {communityRecommendations.combos.map((combo, index) => (
        <li key={index} className={`community-combo mode-${combo.mode}`}>
          <div className="community-combo-mode">
            <strong>{formatCommunityMode(combo.mode)}</strong>
            {combo.popularity ? <small>热度 {combo.popularity.toFixed(1)}</small> : null}
          </div>
          <div className="community-combo-perks">
            {combo.perks.map((perk) => (
              <div className="community-perk" key={perk.hash}>
                {perk.icon ? <img alt="" src={perk.icon} /> : null}
                <div>
                  <strong>{perk.name}</strong>
                  {perk.description ? <p>{perk.description}</p> : null}
                </div>
              </div>
            ))}
          </div>
          {combo.note ? (
            <small className="community-combo-note">{combo.note}</small>
          ) : null}
        </li>
      ))}
    </ul>
    {communityRecommendations.disclaimer ? (
      <small>{communityRecommendations.disclaimer}</small>
    ) : null}
  </section>
) : isCommunityRecommendationsLoading ? (
  <section className="community-recommendations-panel loading">
    <p className="notice">正在读取社区推荐...</p>
  </section>
) : null}
```

**辅助函数**：在 HomePage 组件内新增：

```
function formatCommunityMode(mode: "pve" | "pvp" | "general"): string {
  switch (mode) {
    case "pve": return "PvE";
    case "pvp": return "PvP";
    case "general": return "通用";
    default: return mode;
  }
}
```

### 1.7 新增样式

文件：`packages/desktop/src/renderer/styles/home-page.css`

在现有样式之后追加：

```
.community-recommendations-panel {
  background: rgba(120, 80, 0, 0.08);
  border: 1px solid rgba(180, 140, 60, 0.35);
  border-radius: 6px;
  padding: 12px 14px;
  margin-top: 10px;
}

.community-recommendations-panel.loading {
  background: rgba(120, 120, 120, 0.05);
  border-color: rgba(150, 150, 150, 0.25);
  opacity: 0.8;
}

.community-recommendations-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.community-recommendations-header h3 {
  margin: 0;
}

.community-recommendations-header p {
  margin: 2px 0 0 0;
  font-size: 0.85rem;
  color: rgba(200, 200, 200, 0.85);
}

.community-source-badges {
  display: flex;
  gap: 6px;
}

.community-source-badge {
  background: rgba(180, 140, 60, 0.18);
  border: 1px solid rgba(200, 160, 80, 0.4);
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 0.75rem;
  color: rgba(220, 200, 140, 0.9);
}

.community-combos {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.community-combo {
  background: rgba(40, 30, 10, 0.3);
  border: 1px solid rgba(180, 140, 60, 0.2);
  border-radius: 5px;
  padding: 8px 10px;
}

.community-combo.mode-pve {
  border-left: 3px solid rgba(90, 160, 220, 0.7);
}

.community-combo.mode-pvp {
  border-left: 3px solid rgba(220, 110, 110, 0.7);
}

.community-combo.mode-general {
  border-left: 3px solid rgba(160, 160, 160, 0.6);
}

.community-combo-mode {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.community-combo-mode small {
  color: rgba(200, 200, 200, 0.7);
}

.community-combo-perks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 6px;
}

.community-perk {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: rgba(60, 45, 15, 0.3);
  border-radius: 4px;
  padding: 6px 8px;
}

.community-perk img {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.community-perk strong {
  display: block;
  font-size: 0.9rem;
}

.community-perk p {
  margin: 2px 0 0 0;
  font-size: 0.75rem;
  color: rgba(180, 180, 180, 0.8);
}

.community-combo-note {
  display: block;
  margin-top: 6px;
  color: rgba(200, 200, 200, 0.7);
  font-size: 0.8rem;
}

.community-recommendations-panel > small:last-child {
  display: block;
  margin-top: 8px;
  color: rgba(160, 160, 160, 0.7);
  font-size: 0.75rem;
}
```

### 1.8 类型导入修复

确保 HomePage.tsx 顶部从 `@d2-tools/core` 导入了 `WeaponRecommendation` 类型。

如果现有导入已经存在，追加逗号和新符号；如果不存在，新增：

```
import type { WeaponRecommendation } from "@d2-tools/core";
```

### 1.9 Phase 1 自测清单

- [ ] `packages/core` 编译通过（`tsc -p packages/core/tsconfig.json --noEmit`）
- [ ] `packages/desktop` 编译通过（`tsc -p packages/desktop/tsconfig.json --noEmit`）
- [ ] 武器详情弹窗中，对导入了 DIM wishlist 规则的武器，会显示社区推荐区块
- [ ] 每个 combo 按 mode 有不同的左侧色条
- [ ] 未导入 wishlist 或规则不匹配时，不显示社区推荐区块
- [ ] 关闭弹窗后，社区推荐状态被清空

---

## Phase 2：仓库匹配度提示 + 资料库入口

**目标**：在仓库列表中为每件武器显示「命中社区推荐组合数量」的小标记；在资料库中，对武器详情额外提供「社区推荐」入口。

### 2.1 新增：批量社区命中计算

文件：`packages/core/src/communityPerks/communityPerkRecommendationService.ts`（扩展）

**新增方法**：

```
async matchVaultItems(
  items: Array<{ hash: number; socket_plugs?: Array<{ hash: number }> }>
): Promise<Map<number, { matched: number; modes: Array<"pve" | "pvp" | "general"> }>> {
  // 第一步：按 hash 聚合，避免重复查询同一武器
  const uniqueHashes = Array.from(new Set(items.map((i) => i.hash)));

  // 第二步：对每个唯一 hash 查询推荐
  const hashResults = new Map<number, WeaponRecommendation | null>();
  for (const hash of uniqueHashes) {
    try {
      hashResults.set(hash, await this.getRecommendations(hash, {}));
    } catch {
      hashResults.set(hash, null);
    }
  }

  // 第三步：对每件物品比较实际 socket_plugs 与每个 combo 的 perk hash 集合
  const result = new Map<number, { matched: number; modes: Array<"pve" | "pvp" | "general"> }>();
  for (const item of items) {
    const rec = hashResults.get(item.hash);
    if (!rec) {
      result.set(item.hash, { matched: 0, modes: [] });
      continue;
    }

    const actualHashes = new Set(item.socket_plugs?.map((p) => p.hash) ?? []);
    let matched = 0;
    const matchedModes = new Set<"pve" | "pvp" | "general">();

    for (const combo of rec.combos) {
      // 如果 combo 的所有 perk hash 都在实际 roll 中，则视为命中
      const allIn = combo.perks.every((perk) => actualHashes.has(perk.hash));
      if (allIn) {
        matched++;
        matchedModes.add(combo.mode);
      }
    }

    result.set(item.hash, { matched, modes: Array.from(matchedModes) });
  }

  return result;
}
```

**设计说明**：此方法返回一个 `Map<number, ...>`，其中 key 是武器 hash（非实例 item_key，因为仓库中同一件武器的多个实例可能有不同 roll，需要每个实例单独计算）。

前端调用时用 `Map` 可以快速 O(1) 查找。由于 hash 相同的武器共享同样的推荐数据，批量查询能避免对同一武器多次重复加载。

### 2.2 IPC 批量命中句柄

文件：`packages/desktop/src/main/ipc.ts`

在 `community:recommendations:get` 之后新增：

```
ipcMain.handle("community:vault:match", (_event, items: Array<{ hash: number; socket_plugs?: Array<{ hash: number }> }>) => {
  const config = loadConfig();
  const service = createDefaultCommunityPerkService({ data: { data_dir: config.data.data_dir } });

  // Map 在 IPC 中需要转成数组传递
  const map = service.matchVaultItems(items);
  return map.then((resultMap) => {
    const arr: Array<{ hash: number; matched: number; modes: Array<"pve" | "pvp" | "general"> }> = [];
    resultMap.forEach((value, hash) => {
      arr.push({ hash, matched: value.matched, modes: value.modes });
    });
    return arr;
  });
});
```

### 2.3 仓库列表：显示命中标记

文件：`packages/desktop/src/renderer/pages/HomePage.tsx`

**状态新增**：

```
const [vaultCommunityMatch, setVaultCommunityMatch] = useState<Map<number, { matched: number; modes: Array<"pve" | "pvp" | "general"> }>>(new Map());
const [isVaultCommunityMatchLoading, setIsVaultCommunityMatchLoading] = useState(false);
```

**加载逻辑**：在现有的仓库数据加载完成后（`summarizeVault` 调用之后），追加：

```
if (allItems?.length) {
  const matchItems = allItems
    .filter((item) => item.hash)
    .map((item) => ({
      hash: item.hash,
      socket_plugs: item.socket_plugs?.map((plug) => ({ hash: plug.hash }))
    }));

  if (matchItems.length > 0) {
    setIsVaultCommunityMatchLoading(true);
    window.ipc.invoke("community:vault:match", matchItems)
      .then((result: Array<{ hash: number; matched: number; modes: Array<"pve" | "pvp" | "general"> }>) => {
        const map = new Map<number, { matched: number; modes: Array<"pve" | "pvp" | "general"> }>();
        for (const entry of result) {
          map.set(entry.hash, { matched: entry.matched, modes: entry.modes });
        }
        setVaultCommunityMatch(map);
      })
      .catch((error) => console.warn("社区匹配度加载失败：", error))
      .finally(() => setIsVaultCommunityMatchLoading(false));
  }
}
```

这里的 `allItems` 是现有仓库渲染流程中得到的 `AccountItemSummary[]`。需要确认获取该列表的变量名（在 HomePage 中可能是不同的命名）。

**渲染命中标记**：在仓库每行的 item 显示区域（显示 wishlist 命中小徽章的位置附近），追加：

```
{matchInfo?.matched ? (
  <span className="community-match-badge">
    社区推荐 · 命中 {matchInfo.matched}
    {matchInfo.modes.length ? `（${matchInfo.modes.map(formatCommunityMode).join("/")}）` : ""}
  </span>
) : null}
```

其中 `matchInfo = vaultCommunityMatch.get(item.hash)`。

**样式**：在 `home-page.css` 中追加：

```
.community-match-badge {
  display: inline-block;
  background: rgba(180, 140, 60, 0.18);
  border: 1px solid rgba(200, 160, 80, 0.4);
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 0.7rem;
  color: rgba(220, 200, 140, 0.9);
  margin-left: 4px;
}
```

### 2.4 资料库：武器卡片显示社区推荐数量

文件：`packages/desktop/src/renderer/components/LibraryPage.tsx`（或对应资料库页面组件）

逻辑与仓库匹配度类似。当用户在资料库中打开一个武器卡片（hash 查询或浏览到），在卡片上显示「社区推荐 N 个组合」信息。

**加载方式**：当用户查询资料库中武器时，对查询结果列表调用 `community:vault:match`（用 `socket_plugs: undefined` 来匹配所有组合，仅返回推荐数量）。

如果资料库页面中已经有 `items:detail` 调用，把它替换为同时查询详情 + 社区推荐；或在 `items:detail` 成功后追加一次 `community:recommendations:get` 调用。

**UI 呈现**：在资料库武器卡片的标题下方、来源信息上方，加入一行小标记：

```
{communityCount > 0 ? <small className="library-community-count">社区推荐 {communityCount} 个组合</small> : null}
```

### 2.5 Phase 2 自测清单

- [ ] 仓库列表中，命中社区推荐组合的武器会显示「社区推荐 · 命中 N」标记
- [ ] 资料库中，查询到的武器会显示「社区推荐 N 个组合」信息
- [ ] 切换角色/重新加载后，匹配度信息能正确更新
- [ ] 未导入 wishlist 或没有匹配的武器，不显示任何标记

---

## Phase 3：AI light.gg 实时分析

**目标**：通过 AI provider 的工具调用能力，让 AI 读取 light.gg 对应武器页面，提取 perk 组合并生成分析文本。

### 3.1 新增 AI 工具调用基础设施

文件：`packages/core/src/ai/aiToolcall.ts`（新增）

**依赖**：`openai` 包的工具调用能力（或 `fetch` 调用通用兼容 API），复用 `ai/chat.ts` 中的 `normalizeAiConfig` 和现有 `fetch` 封装。

**类型**：

```
import { normalizeAiConfig, type AiConnectionTestResult } from "./chat.js";

export type AiTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type AiToolCallResult = {
  name: string;
  arguments: Record<string, unknown>;
  content?: string;
};

export type AiToolcallOptions = {
  settings: {
    provider: string;
    api_key: string;
    model: string;
    base_url?: string;
  };
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_call_id?: string;
    tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  }>;
  tools?: AiTool[];
  tool_choice?: string | { type: "function"; function: { name: string } };
  temperature?: number;
  fetcher?: typeof fetch;
};

export type AiToolcallResponse = {
  choices: Array<{
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
};
```

**核心函数**：

```
export async function callAiWithTools(options: AiToolcallOptions): Promise<AiToolcallResponse> {
  const { settings, messages, tools, tool_choice, temperature = 0.2, fetcher = fetch } = options;

  const baseUrl = settings.base_url?.replace(/\/$/, "") ?? "https://api.openai.com";
  const url = `${baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model: settings.model,
    messages,
    temperature
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    if (tool_choice) {
      body.tool_choice = tool_choice;
    }
  }

  const response = await fetcher(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.api_key}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI tool call failed (${response.status}): ${text}`);
  }

  return (await response.json()) as AiToolcallResponse;
}
```

**注意**：`provider` 在本函数中只用于验证，实际 API 调用走统一的 OpenAI-compatible 路径。只有当用户的 provider 配置了支持工具调用时，Phase 3 的功能才启用（在 AiLightggSource 的 `isAvailable` 中校验）。

### 3.2 新增 AiLightggSource

文件：`packages/core/src/communityPerks/aiLightggSource.ts`

```
import { callAiWithTools } from "../ai/aiToolcall.js";
import { normalizeAiConfig } from "../ai/chat.js";
import type { CommunityPerkSource, PerkCombo, PerkRef, SourceOptions, WeaponRecommendation } from "./types.js";

type LightggConfig = {
  provider: string;
  api_key: string;
  model: string;
  base_url?: string;
};

const READ_WEB_TOOL: AiTool = {
  type: "function",
  function: {
    name: "read_web_page",
    description: "读取网页内容。用于查询 light.gg 上命运 2 武器的 perk 组合、推荐配置和社区评论。",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "要读取的网页 URL，例如 https://www.light.gg/db/items/3644223508/"
        }
      },
      required: ["url"]
    }
  }
};

export function createAiLightggSource(config: LightggConfig | null | undefined): CommunityPerkSource {
  const settings = config ? normalizeAiConfig(config) : null;

  return {
    name: "AI · light.gg",
    isAvailable: (_outer_config) => {
      // 仅当用户显式启用 AI provider 并且 model 非空时启用
      if (!settings?.provider || !settings.api_key || !settings.model) return false;

      // 仅对支持工具调用的 provider 启用：openai（包括兼容 API）
      const provider = settings.provider.toLowerCase();
      return provider.includes("openai") || provider.includes("compatible");
    },
    async getRecommendations(item_hash: number, options: SourceOptions): Promise<WeaponRecommendation | null> {
      if (!settings || !settings.provider || !settings.api_key || !settings.model) {
        return null;
      }

      // 构造 light.gg URL：light.gg/db/items/{hash}/
      const url = `https://www.light.gg/db/items/${item_hash}/`;

      // 第一轮：让 AI 读取页面并提取 perk 组合
      const initialMessages: AiToolcallOptions["messages"] = [
        {
          role: "system",
          content: [
            "你是一个命运 2 武器 perk 分析助手。",
            "使用 read_web_page 工具读取指定的 light.gg 武器页面。",
            "提取 Popular Trait Combos、Individual Perks 以及 Recommended Loadouts 等板块的信息。",
            "用 JSON 输出结果，格式为：",
            "{ combos: [ { perks: [ { hash?: number, name: string } ], mode: 'pve' | 'pvp' | 'general', popularity?: number, note?: string } ], item_name: string, disclaimer: string }",
            "如果无法读取或页面不存在，返回 { combos: [], item_name: '', disclaimer: '无法访问 light.gg' }。",
            "只输出 JSON，不要输出额外说明文字。"
          ].join("\n")
        },
        {
          role: "user",
          content: `请读取 ${url}${options.item_name ? `（武器：${options.item_name}）` : ""} 并提取社区推荐 perk 组合。`
        }
      ];

      const firstResponse = await callAiWithTools({
        settings,
        messages: initialMessages,
        tools: [READ_WEB_TOOL],
        tool_choice: { type: "function", function: { name: "read_web_page" } },
        temperature: 0.1
      });

      const toolCalls = firstResponse.choices[0]?.message.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return null;
      }

      // 执行工具调用结果的回传（实际 fetch + 解析由 provider 内部完成；此处我们继续把结果返给 AI）
      const pageContent: string = `[Light.gg 页面内容：已读取 ${url}]`; // provider 的网页读取工具会自动填充
      const finalMessages: AiToolcallOptions["messages"] = [
        ...initialMessages,
        {
          role: "assistant",
          content: null as unknown as string,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function",
            function: { name: tc.function.name, arguments: tc.function.arguments }
          }))
        },
        {
          role: "tool",
          tool_call_id: toolCalls[0].id,
          content: pageContent
        }
      ];

      const secondResponse = await callAiWithTools({
        settings,
        messages: finalMessages,
        temperature: 0.1
      });

      const finalText = secondResponse.choices[0]?.message.content ?? "";

      // 解析 JSON
      const parsed = parseAiLightggJsonResponse(finalText);
      if (!parsed || parsed.combos.length === 0) {
        return null;
      }

      const combos: PerkCombo[] = parsed.combos.map((c) => ({
        perks: c.perks.map((p) => ({
          hash: p.hash ?? 0,
          name: p.name,
          description: undefined,
          icon: undefined
        })),
        popularity: c.popularity,
        source: "ai_lightgg",
        mode: c.mode || "general",
        note: c.note
      }));

      const modes = Array.from(new Set(combos.map((c) => c.mode))) as Array<"pve" | "pvp" | "general">;

      return {
        item_hash,
        item_name: options.item_name ?? parsed.item_name ?? String(item_hash),
        combos,
        matched_modes: modes,
        disclaimer: parsed.disclaimer || "数据由 AI 从 light.gg 实时提取，可能受缓存或页面变化影响。"
      };
    }
  };
}

function parseAiLightggJsonResponse(text: string): {
  combos: Array<{ perks: Array<{ hash?: number; name: string }>; mode?: "pve" | "pvp" | "general"; popularity?: number; note?: string }>;
  item_name?: string;
  disclaimer?: string;
} | null {
  // 先尝试直接 JSON.parse
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // 回退：查找 ```json ... ``` 代码块
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
```

### 3.3 服务层注册 AiLightggSource

文件：`packages/core/src/communityPerks/communityPerkRecommendationService.ts`

**新增便捷函数**：

```
export function createFullCommunityPerkService(
  config: { data?: { data_dir?: string }; ai?: { provider?: string; api_key?: string; model?: string; base_url?: string } } | null | undefined
): CommunityPerkRecommendationService {
  const service = new CommunityPerkRecommendationService(config);
  const data_dir = config?.data?.data_dir;

  if (data_dir) {
    service.addSource(createDimWishlistSource(data_dir));
  }

  if (config?.ai?.provider && config.ai.api_key && config.ai.model) {
    service.addSource(createAiLightggSource({
      provider: config.ai.provider,
      api_key: config.ai.api_key,
      model: config.ai.model,
      base_url: config.ai.base_url
    }));
  }

  return service;
}
```

### 3.4 配置扩展：可选开关

文件：`packages/core/src/config/schema.ts`

在 `ai` 配置下追加一个可选字段（不破坏向后兼容）：

```
ai: {
  provider: string;
  api_key: string;
  model: string;
  base_url: string;
  enable_lightgg?: boolean;   // 可选，默认 false
};
```

文件：`packages/core/src/config/defaults.ts`

在 `ai` 字段中追加默认值：

```
ai: {
  provider: "",
  api_key: "",
  model: "",
  base_url: "",
  enable_lightgg: false
}
```

### 3.5 IPC 更新：使用 full service

文件：`packages/desktop/src/main/ipc.ts`

将 `createDefaultCommunityPerkService` 的调用改为 `createFullCommunityPerkService`，并传入 AI 配置：

```
const service = createFullCommunityPerkService({
  data: { data_dir: config.data.data_dir },
  ai: {
    provider: config.ai.provider,
    api_key: config.ai.api_key,
    model: config.ai.model,
    base_url: config.ai.base_url
  }
});
```

### 3.6 前端：AI 模式的额外 UI

在武器详情弹窗的社区推荐区块中，已经通过 `combo.source === "ai_lightgg"` 的分支显示不同的来源徽章。不需要额外改动。

为 AI 模式添加一个「手动触发 AI 查询」的按钮，让用户在 DIM wishlist 没有数据时也能主动触发 AI 查询：

```
{communityRecommendations ? null : isCommunityRecommendationsLoading ? null : (
  <button
    type="button"
    className="secondary-button"
    onClick={() => {
      setIsCommunityRecommendationsLoading(true);
      window.ipc.invoke("community:recommendations:get", selectedItem.hash, { item_name: selectedItem.name })
        .then((result) => setCommunityRecommendations(result))
        .catch((error) => console.warn("AI 社区推荐加载失败：", error))
        .finally(() => setIsCommunityRecommendationsLoading(false));
    }}
  >
    使用 AI 查询 light.gg 社区推荐
  </button>
)}
```

将该按钮放在社区推荐区块应该出现的位置（wishlist-panel 之后），在没有数据时显示。

### 3.7 Phase 3 自测清单

- [ ] 配置 `ai.enable_lightgg = true` 且 provider 为 `openai`（或兼容）的用户，能通过 AI 获取 light.gg 数据
- [ ] DIM wishlist 有数据时，优先显示 DIM wishlist 数据（按服务层数据源顺序）
- [ ] DIM wishlist 无数据时，能手动点击按钮触发 AI 查询
- [ ] AI 查询失败时，不破坏页面其他功能
- [ ] `enable_lightgg` 为 `false` 或未配置时，AI 数据源不可用但不报错

---

## 实施顺序与注意事项

### 推荐的按文件/按功能交付顺序

1. `packages/core/src/communityPerks/types.ts` + `dimWishlistSource.ts`（先编译通过）
2. `communityPerkRecommendationService.ts`（服务层）
3. 更新 `packages/core/src/index.ts`
4. `packages/core/tests/communityPerks.test.ts`（单元测试）
5. `packages/desktop/src/main/ipc.ts`（新增句柄）
6. `packages/desktop/src/renderer/pages/HomePage.tsx`（武器详情弹窗社区推荐区块 + 状态）
7. `packages/desktop/src/renderer/styles/home-page.css`（样式）
8. Phase 1 自测 & 修复
9. 扩展 `communityPerkRecommendationService.ts`（`matchVaultItems`）
10. `packages/desktop/src/main/ipc.ts`（批量命中句柄）
11. `packages/desktop/src/renderer/pages/HomePage.tsx`（仓库匹配度）
12. `packages/desktop/src/renderer/components/LibraryPage.tsx`（资料库入口）
13. Phase 2 自测 & 修复
14. `packages/core/src/ai/aiToolcall.ts`（工具调用基础设施）
15. `packages/core/src/communityPerks/aiLightggSource.ts`
16. 扩展 `communityPerkRecommendationService.ts`（`createFullCommunityPerkService`）
17. 扩展 `packages/core/src/config/schema.ts` + `defaults.ts`（可选开关）
18. 更新 `packages/desktop/src/main/ipc.ts`（使用 full service）
19. 扩展 `HomePage.tsx`（AI 查询按钮）
20. Phase 3 自测 & 修复

### 约束与注意事项

- **不要在实现代码中添加注释**，遵循现有约定
- **不要在未受影响的文件中做无关修改**
- **IPC 调用中所有返回值必须是可序列化的 JSON**，不能包含 `Map`、`Set`、函数等
- **类型使用 `| undefined` 而不是可选属性**，在需要的地方显式标注
- **ESM 导入必须带 `.js` 后缀**（在 `src/` 内互相导入时）
- **`@d2-tools/core` 是 monorepo 内部包名**，desktop 中以此名称导入
- **`--noEmit` 验证**，不要求 `dist/` 产物存在，只需要类型检查通过
- **所有新增的 CommunityPerkSource 必须保持接口一致性**，`getRecommendations` 必须声明为 `async`
- **AI 模式是可选项**，任何 AI 相关的错误必须被捕获并降级到 DIM wishlist（如果有的话）或静默不显示

---

## 验收标准

- **编译**：`packages/core` 和 `packages/desktop` 的 `tsc --noEmit` 均通过，无新错误
- **功能（Phase 1）**：在武器详情弹窗中看到社区推荐 Perk 组合区块，每个 combo 有模式色条和 perk 卡片
- **功能（Phase 2）**：仓库列表中每件武器有「社区推荐 · 命中 N」标记；资料库中武器卡片显示推荐数量
- **功能（Phase 3）**：正确配置 AI 后，可触发 light.gg 查询，结果以 `AI · light.gg` 徽章标记
- **降级**：未导入 wishlist、未配置 AI 时，功能不报错，仅不显示区块或标记
- **现有功能**：原有的 wishlist 命中区块、AI 装备解读、仓库操作等保持不变

---

_最后更新：2026-06-21_
