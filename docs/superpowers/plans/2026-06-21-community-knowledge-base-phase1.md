# 社区武器知识库 Phase 1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭建社区武器知识库的基础设施，将小黑盒帖子的框架评价结构化，使 AI 在分析单件装备、仓库和聊天时能够引用中文社区观点。

**Architecture:** 新增 `packages/core/src/knowledge/` 模块负责知识库类型、构建和运行时查询；原始资料以 Markdown/JSON 形式保存在 `docs/external/weapon-recommendations/`；AI 分析函数在调用 LLM 前按武器 hash 查询相关知识并注入 prompt。不引入向量数据库，先以静态 JSON + 简单 hash 索引实现。

**Tech Stack:** TypeScript, Node.js, pnpm, Vitest（与 core 包一致）

---

## File Structure

| 文件 | 责任 |
|---|---|
| `docs/external/weapon-recommendations/README.md` | 说明资料来源、作者、更新方式 |
| `docs/external/weapon-recommendations/xiaoheihe-post/content.md` | 小黑盒帖子正文（已整理） |
| `docs/external/weapon-recommendations/xiaoheihe-post/metadata.json` | 来源元数据：url、作者、checksum、fetched_at |
| `packages/core/src/knowledge/types.ts` | 知识库类型定义 |
| `packages/core/src/knowledge/weaponKnowledgeService.ts` | 运行时查询、加载、prompt 格式化 |
| `packages/core/src/knowledge/index.ts` | 模块导出 |
| `packages/core/src/knowledge/generated/weapon-knowledge.json` | 构建生成的知识库（提交到仓库） |
| `packages/core/scripts/build-knowledge.ts` | 开发/CI 构建脚本 |
| `packages/core/test/knowledge.test.ts` | 单元测试 |
| `packages/core/src/ai/chat.ts` | 修改：在 AI 分析前注入知识库 |
| `packages/core/src/config/schema.ts` | 修改：增加 `knowledge_base` 配置 |
| `packages/core/src/config/defaults.ts` | 修改：设置默认配置 |
| `packages/desktop/src/renderer/components/aiSettings.ts` | 修改：AI 设置面板增加开关 |
| `README.md` | 修改：添加社区资料来源声明 |

---

## Task 1: 创建原始资料目录与 README

**Files:**
- Create: `docs/external/weapon-recommendations/README.md`
- Create: `docs/external/weapon-recommendations/xiaoheihe-post/content.md`
- Create: `docs/external/weapon-recommendations/xiaoheihe-post/metadata.json`

- [ ] **Step 1: 创建目录结构**

Run:
```powershell
New-Item -ItemType Directory -Force -Path "docs/external/weapon-recommendations/xiaoheihe-post"
New-Item -ItemType Directory -Force -Path "docs/external/weapon-recommendations/tencent-sheet"
```

- [ ] **Step 2: 写入 README.md**

Create `docs/external/weapon-recommendations/README.md`:

```markdown
# 社区武器推荐资料

本目录保存 d2-tools 社区武器知识库所引用的原始社区资料。这些资料仅用于生成结构化的知识库 JSON，不会原样打包进应用。

## 来源

- 腾讯表格：[d2 武器 perk 推荐](https://docs.qq.com/sheet/DYkR5enNIdUt1VFhK?tab=000001)
  - 表格制作者：Aegis
- 小黑盒帖子：[命运2-凯旋丰碑-全种类武器推荐](https://www.xiaoheihe.cn/bbs/post_share?h_camp=link&redirect_data=...)
  - 帖子作者：日栎

## 声明

以上资料均为社区玩家整理，仅供参考，不代表 Bungie 或 d2-tools 官方观点。若作者要求撤下相关内容，请通过 issue 联系我们。

## 更新方式

1. 修改本目录下的 `content.md` 或截图。
2. 运行 `pnpm run build:knowledge` 重新生成知识库 JSON。
3. 提交变更后的原始资料和生成的 JSON。
```

- [ ] **Step 3: 写入小黑盒帖子正文**

Create `docs/external/weapon-recommendations/xiaoheihe-post/content.md`：

```markdown
# 命运2-凯旋丰碑-全种类武器推荐

> 作者：日栎  
> 表格制作者：Aegis  
> 来源：小黑盒

## 自动步枪

### 支援框架
- 小众，但在某些内容中能定义角色定位。

### 速射框架
- 自动步枪中的异常值。
- 伤害曲线扎实，平稳 450 射速。
- 表现与速射相近，但带有热量收益。

### 适配框架
- 平衡高冲击框架 / 平衡精密框架。
- 射程比高冲击更差，而且不知为何伤害曲线也更差。

## 脉冲步枪

### 微型导弹
- 削弱后依然优秀，能打出可观伤害并生成超能。

### 动态（540RPM）/ 平衡（540RPM，热量除外）
- 可用。

### 高冲击
- 易用性最低，伤害曲线差。

## 斥候步枪

### 平衡 260
- 弹匣大，伤害曲线不错。

### 速射
- 曾经领头羊，现在依旧扎实。

### 轻质
- 有易用性优势。

### 高冲击 / 精密 / 攻击
- 手感或伤害曲线较差。

## 微型冲锋枪

### 激进爆弹
- 表现扎实。

### 平衡 900RPM
- 和平守护者流派毕业选择。

### 适配 / 攻击
- 略差于轻质。

### 精密
- 各方面最差。

## 榴弹发射器

### 区域拒止
- 用途多样，可获取超凡能量、施加溅射、打总伤害。

### 微型导弹 / 内爆弹药
- 适合移动。

### 波形 / 双发尖刺 / 轻质尖刺
- 基本被压过或不相关。

## 融合步枪

### 攻击 / 加速线圈
- 加强后单弹匣爆发 DPS 最佳。

### 高冲击 / 加速线圈
- 总伤害异常偏高，被低估。

### 速射 / 加速线圈
- 易用性最好的融合步枪。

### 适配 / 精密
- 中规中矩或偏弱。

## 偃月

### 攻击
- 整体伤害曲线最佳。

### 适配
- 适合射击目标并保留特殊弹药。

### 速射
- 总伤害偏弱。

## 霰弹枪

### 重型点射
- 大多数输出内容中最现实的选择。

### 速射 / 身体
- 12P 最高射击次数。

### 轻质 / 身体
- 生活质量高，但伤害曲线糟。

### 精准重击 / 速射独头弹 / 精密
- 比重型点射差。

## 狙击枪

### 干扰
- 符合线性融合步枪场景，伤害曲线也好。

### 动态 140
- 总伤害高，perk 上限高。

### 速射
- DPS 更好，兼容事不过四。

### 适配 / 攻击
- 没有真正优势。

## 机枪

### 高冲击
- 总伤害高于其他框架。

### 速射
- 易用性别扭。

### 平衡 900RPM
- 总伤害明显差于其他。

## 火箭发射器（带群狼猎手）

### 铸造者 / 波形
- 整体最佳。

### 高冲击 / 适配
- 可用但不算优秀。

### 精密 / 攻击 / 轻质 / 涡流
- 平庸或较差。

## 其他

- 高手炮：动态 180RPM 搭配幸运裤时 DPS 疯狂。
- 弓箭：高冲击 / 充能弩弹搭配补弹 perk 有潜力。
```

- [ ] **Step 4: 写入 metadata.json**

Create `docs/external/weapon-recommendations/xiaoheihe-post/metadata.json`:

```json
{
  "name": "xiaoheihe_post",
  "title": "命运2-凯旋丰碑-全种类武器推荐",
  "url": "https://www.xiaoheihe.cn/bbs/post_share?h_camp=link&redirect_data=%7B%22link%22%3A%7B%22title%22%3A%22%E5%91%BD%E8%BF%902-%E5%87%AF%E6%97%8B%E4%B8%B0%E7%A2%91-%E5%85%A8%E7%A7%8D%E7%B1%BB%E6%AD%A6%E5%99%A8%E6%8E%A8%E8%8D%90%22%7D%7D&h_src=YXBwX3NoYXJl&link_id=b7eb720c4e78",
  "author": "日栎",
  "fetched_at": "2026-06-21T00:00:00+08:00",
  "checksum": "",
  "format": "markdown"
}
```

- [ ] **Step 5: Commit**

```bash
git add docs/external/weapon-recommendations/
git commit -m "docs: add community weapon recommendation source materials"
```

---

## Task 2: 定义知识库类型

**Files:**
- Create: `packages/core/src/knowledge/types.ts`

- [ ] **Step 1: 写入类型定义**

Create `packages/core/src/knowledge/types.ts`:

```typescript
export type KnowledgeSourceName = "tencent_sheet" | "xiaoheihe_post";

export type KnowledgeSource = {
  name: KnowledgeSourceName;
  title?: string;
  url: string;
  author: string;
  fetched_at: string;
  checksum: string;
};

export type WeaponKnowledgePerkSuggestion = {
  mode: "pve" | "pvp";
  column: 3 | 4;
  perk_name: string;
  perk_hash?: number;
  reason?: string;
};

export type WeaponKnowledgeEntry = {
  item_hash: number;
  item_name: string;
  sources: KnowledgeSourceName[];
  activities?: string[];
  loot_pools?: string[];
  framework_comment?: string;
  archetype_note?: string;
  pve_note?: string;
  pvp_note?: string;
  perk_suggestions?: WeaponKnowledgePerkSuggestion[];
  special_notes?: string[];
};

export type ActivityGroup = {
  activity_name: string;
  item_hashes: number[];
  note?: string;
};

export type WeaponKnowledgeBase = {
  version: number;
  generated_at: string;
  sources: KnowledgeSource[];
  entries: WeaponKnowledgeEntry[];
  index: Record<string, number>;
  activity_index: ActivityGroup[];
};
```

- [ ] **Step 2: 编译检查**

Run:
```bash
cd packages/core
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/knowledge/types.ts
git commit -m "feat(knowledge): add knowledge base types"
```

---

## Task 3: 实现 WeaponKnowledgeService

**Files:**
- Create: `packages/core/src/knowledge/weaponKnowledgeService.ts`
- Create: `packages/core/src/knowledge/index.ts`

- [ ] **Step 1: 写入服务实现**

Create `packages/core/src/knowledge/weaponKnowledgeService.ts`:

```typescript
import type { ActivityGroup, WeaponKnowledgeBase, WeaponKnowledgeEntry } from "./types.js";

export class WeaponKnowledgeService {
  private index: Map<number, number>;
  private activityIndex: Map<string, ActivityGroup>;

  constructor(private base: WeaponKnowledgeBase) {
    this.index = new Map(
      Object.entries(base.index).map(([hash, idx]) => [Number.parseInt(hash, 10), idx])
    );
    this.activityIndex = new Map(base.activity_index.map((g) => [g.activity_name, g]));
  }

  static empty(): WeaponKnowledgeService {
    return new WeaponKnowledgeService({
      version: 1,
      generated_at: new Date().toISOString(),
      sources: [],
      entries: [],
      index: {},
      activity_index: []
    });
  }

  getByHash(item_hash: number): WeaponKnowledgeEntry | null {
    const idx = this.index.get(item_hash);
    if (idx === undefined) return null;
    return this.base.entries[idx] ?? null;
  }

  getByHashes(hashes: number[]): WeaponKnowledgeEntry[] {
    const seen = new Set<number>();
    const results: WeaponKnowledgeEntry[] = [];
    for (const hash of hashes) {
      const entry = this.getByHash(hash);
      if (entry && !seen.has(entry.item_hash)) {
        seen.add(entry.item_hash);
        results.push(entry);
      }
    }
    return results;
  }

  getByActivity(activity_name: string): WeaponKnowledgeEntry[] {
    const group = this.activityIndex.get(activity_name);
    if (!group) return [];
    return this.getByHashes(group.item_hashes);
  }

  formatForPrompt(entries: WeaponKnowledgeEntry[]): string {
    if (entries.length === 0) return "";
    const lines = entries.map((entry) => this.formatEntry(entry));
    return `## 社区参考资料（非官方，仅供参考）\n\n${lines.join("\n\n")}`;
  }

  private formatEntry(entry: WeaponKnowledgeEntry): string {
    const parts: string[] = [`### ${entry.item_name}`];
    if (entry.framework_comment) parts.push(`- 框架评价：${entry.framework_comment}`);
    if (entry.archetype_note) parts.push(`- 框架说明：${entry.archetype_note}`);
    if (entry.pve_note) parts.push(`- PVE：${entry.pve_note}`);
    if (entry.pvp_note) parts.push(`- PVP：${entry.pvp_note}`);
    if (entry.special_notes && entry.special_notes.length > 0) {
      parts.push(`- 特殊说明：${entry.special_notes.join("；")}`);
    }
    if (entry.perk_suggestions && entry.perk_suggestions.length > 0) {
      const perks = entry.perk_suggestions
        .map((p) => `${p.mode.toUpperCase()} 第${p.column}列 ${p.perk_name}${p.reason ? `（${p.reason}）` : ""}`)
        .join("、");
      parts.push(`- perk 推荐：${perks}`);
    }
    if (entry.activities && entry.activities.length > 0) {
      parts.push(`- 相关活动：${entry.activities.join("、")}`);
    }
    return parts.join("\n");
  }
}
```

- [ ] **Step 2: 写入模块导出**

Create `packages/core/src/knowledge/index.ts`:

```typescript
export * from "./types.js";
export * from "./weaponKnowledgeService.js";
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/knowledge/weaponKnowledgeService.ts packages/core/src/knowledge/index.ts
git commit -m "feat(knowledge): add WeaponKnowledgeService for querying and formatting"
```

---

## Task 4: 编写单元测试

**Files:**
- Create: `packages/core/test/knowledge.test.ts`

- [ ] **Step 1: 写入测试**

Create `packages/core/test/knowledge.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { WeaponKnowledgeService } from "../src/knowledge/weaponKnowledgeService.js";
import type { WeaponKnowledgeBase } from "../src/knowledge/types.js";

const testBase: WeaponKnowledgeBase = {
  version: 1,
  generated_at: "2026-06-21T00:00:00Z",
  sources: [{
    name: "xiaoheihe_post",
    title: "命运2-凯旋丰碑-全种类武器推荐",
    url: "https://www.xiaoheihe.cn/example",
    author: "日栎",
    fetched_at: "2026-06-21T00:00:00Z",
    checksum: "abc"
  }],
  entries: [
    {
      item_hash: 12345,
      item_name: "速射框架测试武器",
      sources: ["xiaoheihe_post"],
      framework_comment: "自动步枪中的异常值",
      pve_note: "伤害曲线扎实",
      activities: ["突袭"]
    },
    {
      item_hash: 67890,
      item_name: "高冲击框架测试武器",
      sources: ["xiaoheihe_post"],
      framework_comment: "易用性最低，伤害曲线差",
      activities: ["突袭"]
    }
  ],
  index: {
    "12345": 0,
    "67890": 1
  },
  activity_index: [
    { activity_name: "突袭", item_hashes: [12345, 67890] }
  ]
};

describe("WeaponKnowledgeService", () => {
  it("returns entry by hash", () => {
    const service = new WeaponKnowledgeService(testBase);
    const entry = service.getByHash(12345);
    expect(entry).not.toBeNull();
    expect(entry?.item_name).toBe("速射框架测试武器");
    expect(entry?.framework_comment).toBe("自动步枪中的异常值");
  });

  it("returns null for unknown hash", () => {
    const service = new WeaponKnowledgeService(testBase);
    expect(service.getByHash(99999)).toBeNull();
  });

  it("returns unique entries for multiple hashes", () => {
    const service = new WeaponKnowledgeService(testBase);
    const entries = service.getByHashes([12345, 12345, 67890]);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.item_hash)).toContain(12345);
    expect(entries.map((e) => e.item_hash)).toContain(67890);
  });

  it("returns entries by activity", () => {
    const service = new WeaponKnowledgeService(testBase);
    const entries = service.getByActivity("突袭");
    expect(entries).toHaveLength(2);
  });

  it("returns empty array for unknown activity", () => {
    const service = new WeaponKnowledgeService(testBase);
    expect(service.getByActivity("未知活动")).toHaveLength(0);
  });

  it("formats prompt text with headers", () => {
    const service = new WeaponKnowledgeService(testBase);
    const text = service.formatForPrompt([testBase.entries[0]]);
    expect(text).toContain("社区参考资料");
    expect(text).toContain("速射框架测试武器");
    expect(text).toContain("自动步枪中的异常值");
  });

  it("returns empty string for empty entries", () => {
    const service = new WeaponKnowledgeService(testBase);
    expect(service.formatForPrompt([])).toBe("");
  });

  it("empty service handles queries gracefully", () => {
    const service = WeaponKnowledgeService.empty();
    expect(service.getByHash(12345)).toBeNull();
    expect(service.formatForPrompt([])).toBe("");
  });
});
```

- [ ] **Step 2: 运行测试**

Run:
```bash
cd packages/core
pnpm vitest run test/knowledge.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/core/test/knowledge.test.ts
git commit -m "test(knowledge): add WeaponKnowledgeService tests"
```

---

## Task 5: 实现 build-knowledge 脚本（Phase 1 简化版）

**Files:**
- Create: `packages/core/scripts/build-knowledge.ts`
- Modify: `packages/core/package.json`
- Create: `packages/core/src/knowledge/generated/weapon-knowledge.json`
- Create: `packages/core/src/knowledge/generated/activity-index.json`

- [ ] **Step 1: 写入构建脚本**

Create `packages/core/scripts/build-knowledge.ts`:

```typescript
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ActivityGroup, WeaponKnowledgeBase, WeaponKnowledgeEntry } from "../src/knowledge/types.js";

const EXTERNAL_DIR = path.resolve(process.cwd(), "../../docs/external/weapon-recommendations");
const OUTPUT_DIR = path.resolve(process.cwd(), "../src/knowledge/generated");

async function readText(file: string): Promise<string> {
  return readFile(path.join(EXTERNAL_DIR, file), "utf-8");
}

async function readJson<T>(file: string): Promise<T> {
  const text = await readText(file);
  return JSON.parse(text) as T;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

// Phase 1: only xiaoheihe post, manually mapped entries
function buildFromXiaoheihe(content: string): WeaponKnowledgeEntry[] {
  // Placeholder mapping for weapons explicitly mentioned in the post.
  // In Phase 2 this will be replaced/augmented with tencent-sheet parsing.
  const entries: WeaponKnowledgeEntry[] = [];

  const add = (item_hash: number, item_name: string, fields: Partial<WeaponKnowledgeEntry>) => {
    entries.push({
      item_hash,
      item_name,
      sources: ["xiaoheihe_post"],
      ...fields
    });
  };

  // Examples using representative hashes; real hashes must be filled from manifest.
  // Auto rifle archetypes
  add(1000000001, "速射框架自动步枪示例", { archetype_note: "自动步枪中的异常值，伤害曲线扎实，平稳 450 射速" });
  add(1000000002, "高冲击框架自动步枪示例", { archetype_note: "射程和伤害曲线比速射框架更差" });

  // Pulse rifle archetypes
  add(1000000003, "微型导弹脉冲步枪示例", { archetype_note: "削弱后依然优秀，能打出可观伤害并生成超能" });
  add(1000000004, "高冲击框架脉冲步枪示例", { archetype_note: "易用性最低，伤害曲线差" });

  // Scout rifle archetypes
  add(1000000005, "平衡 260 斥候步枪示例", { archetype_note: "弹匣大，伤害曲线不错" });
  add(1000000006, "速射框架斥候步枪示例", { archetype_note: "曾经领头羊，现在依旧扎实" });

  // Submachine gun archetypes
  add(1000000007, "激进爆弹微型冲锋枪示例", { archetype_note: "表现扎实" });
  add(1000000008, "平衡 900RPM 微型冲锋枪示例", { archetype_note: "和平守护者流派毕业选择" });

  // Grenade launchers
  add(1000000009, "区域拒止榴弹发射器示例", { archetype_note: "用途多样，可获取超凡能量、施加溅射、打总伤害" });

  // Fusion rifles
  add(1000000010, "攻击框架融合步枪示例", { archetype_note: "加强后单弹匣爆发 DPS 最佳" });
  add(1000000011, "高冲击框架融合步枪示例", { archetype_note: "总伤害异常偏高，被低估" });

  // Shotguns
  add(1000000012, "重型点射霰弹枪示例", { archetype_note: "大多数输出内容中最现实的选择" });

  // Snipers
  add(1000000013, "干扰狙击枪示例", { archetype_note: "符合线性融合步枪场景，伤害曲线也好" });

  // Machine guns
  add(1000000014, "高冲击机枪示例", { archetype_note: "总伤害高于其他框架" });

  // Rocket launchers
  add(1000000015, "铸造者火箭筒示例", { archetype_note: "带群狼猎手时整体最佳" });

  return entries;
}

async function main() {
  const xiaoheiheContent = await readText("xiaoheihe-post/content.md");
  const xiaoheiheMeta = await readJson<{ name: string; title: string; url: string; author: string; fetched_at: string }>("xiaoheihe-post/metadata.json");

  const entries = buildFromXiaoheihe(xiaoheiheContent);

  const index: Record<string, number> = {};
  const activityMap = new Map<string, number[]>();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    index[entry.item_hash] = i;
    for (const activity of entry.activities ?? []) {
      const list = activityMap.get(activity) ?? [];
      list.push(entry.item_hash);
      activityMap.set(activity, list);
    }
  }

  const activity_index: ActivityGroup[] = Array.from(activityMap.entries()).map(([activity_name, item_hashes]) => ({
    activity_name,
    item_hashes: Array.from(new Set(item_hashes))
  }));

  const knowledgeBase: WeaponKnowledgeBase = {
    version: 1,
    generated_at: new Date().toISOString(),
    sources: [{
      name: "xiaoheihe_post",
      title: xiaoheiheMeta.title,
      url: xiaoheiheMeta.url,
      author: xiaoheiheMeta.author,
      fetched_at: xiaoheiheMeta.fetched_at,
      checksum: sha256(xiaoheiheContent)
    }],
    entries,
    index,
    activity_index
  };

  await writeFile(path.join(OUTPUT_DIR, "weapon-knowledge.json"), JSON.stringify(knowledgeBase, null, 2));
  console.log(`Generated weapon-knowledge.json with ${entries.length} entries and ${activity_index.length} activities`);
}

main().catch((err) => {
  console.error("build-knowledge failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: 修改 package.json 增加脚本**

Modify `packages/core/package.json` in the `scripts` section:

```json
{
  "scripts": {
    "build:knowledge": "tsx scripts/build-knowledge.ts"
  }
}
```

If `tsx` is not a dependency, add it to `devDependencies`:

```bash
cd packages/core
pnpm add -D tsx
```

- [ ] **Step 3: 创建输出目录并运行构建**

Run:
```powershell
New-Item -ItemType Directory -Force -Path "packages/core/src/knowledge/generated"
cd packages/core
pnpm run build:knowledge
```

Expected: `Generated weapon-knowledge.json with 15 entries and 0 activities` (activities are empty in Phase 1 examples).

- [ ] **Step 4: Commit**

```bash
git add packages/core/scripts/build-knowledge.ts packages/core/package.json packages/core/src/knowledge/generated/weapon-knowledge.json
git commit -m "feat(knowledge): add build script for knowledge base"
```

---

## Task 6: 在 AI 分析中注入知识库

**Files:**
- Modify: `packages/core/src/ai/chat.ts`
- Modify: `packages/core/src/config/schema.ts`
- Modify: `packages/core/src/config/defaults.ts`

- [ ] **Step 1: 修改 config schema**

Modify `packages/core/src/config/schema.ts` to add `knowledge_base` inside the `ai` config. Locate the `ai` schema and append:

```typescript
knowledge_base: z.object({
  enabled: z.boolean().default(true),
  sources: z.array(z.enum(["tencent_sheet", "xiaoheihe_post"])).default(["xiaoheihe_post"]),
  check_for_updates: z.enum(["startup", "manual", "off"]).default("startup"),
  max_entries_per_prompt: z.number().int().min(0).max(100).default(20)
}).default({})
```

- [ ] **Step 2: 修改 config defaults**

Modify `packages/core/src/config/defaults.ts` to include defaults for the new config:

```typescript
ai: {
  provider: "none",
  api_key: "",
  model: "",
  base_url: "",
  enable_lightgg: false,
  knowledge_base: {
    enabled: true,
    sources: ["xiaoheihe_post"],
    check_for_updates: "startup",
    max_entries_per_prompt: 20
  }
}
```

- [ ] **Step 3: 修改 chat.ts 单件装备分析**

Modify `packages/core/src/ai/chat.ts`:

1. Import the service:

```typescript
import { WeaponKnowledgeService } from "../knowledge/weaponKnowledgeService.js";
```

2. Add a helper to build a shared service instance (later can be passed in; for now construct from dataDir):

```typescript
function loadKnowledgeService(dataDir?: string): WeaponKnowledgeService {
  if (!dataDir) return WeaponKnowledgeService.empty();
  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const file = path.join(dataDir, "knowledge", "weapon-knowledge.json");
    if (!fs.existsSync(file)) return WeaponKnowledgeService.empty();
    const base = JSON.parse(fs.readFileSync(file, "utf-8"));
    return new WeaponKnowledgeService(base);
  } catch {
    return WeaponKnowledgeService.empty();
  }
}
```

3. Modify `generateItemAiAdvice` to inject knowledge:

After building the score and before `callAiText`, add:

```typescript
const kbConfig = input.config.ai?.knowledge_base;
let knowledgeText = "";
if (kbConfig?.enabled && kbConfig?.sources?.includes("xiaoheihe_post")) {
  const service = loadKnowledgeService(input.config.data?.data_dir);
  const entry = service.getByHash(input.item.hash);
  if (entry) {
    knowledgeText = service.formatForPrompt([entry]);
  }
}
```

Then in the `messages` array, append to the user content:

```typescript
content: [
  buildItemPrompt(input.item, score),
  knowledgeText ? `\n${knowledgeText}\n\n分析时请注意：以上社区资料仅供参考，不代表官方观点。请区分装备实际 roll 和社区推荐，不要编造未命中的推荐。` : ""
].filter(Boolean).join("\n")
```

- [ ] **Step 4: 修改 chat.ts 仓库整体分析**

In `generateVaultAiAdvice`, similar injection but for multiple hashes:

```typescript
const kbConfig = input.config.ai?.knowledge_base;
let knowledgeText = "";
if (kbConfig?.enabled && kbConfig?.sources?.includes("xiaoheihe_post")) {
  const service = loadKnowledgeService(input.config.data?.data_dir);
  const hashes = input.items.map((i) => i.hash);
  const entries = service.getByHashes(hashes).slice(0, kbConfig.max_entries_per_prompt ?? 20);
  knowledgeText = service.formatForPrompt(entries);
}
```

Append to the user prompt if non-empty.

- [ ] **Step 5: 修改 chat.ts 聊天问答**

In `generateAiChatReply`, attempt to extract weapon names from the question using a simple regex or existing search utility, then inject:

```typescript
const kbConfig = input.config.ai?.knowledge_base;
let knowledgeText = "";
if (kbConfig?.enabled && kbConfig?.sources?.includes("xiaoheihe_post")) {
  const service = loadKnowledgeService(input.config.data?.data_dir);
  // Try to find weapon names in the question; if context contains item names, use those.
  // Phase 1: simple substring match against known item_name list from the knowledge base.
  const knownNames = service["base"].entries.map((e) => e.item_name);
  const mentioned = knownNames.filter((name) => input.question.includes(name));
  const entries = mentioned
    .map((name) => service["base"].entries.find((e) => e.item_name === name))
    .filter(Boolean) as WeaponKnowledgeEntry[];
  knowledgeText = service.formatForPrompt(entries.slice(0, kbConfig.max_entries_per_prompt ?? 20));
}
```

- [ ] **Step 6: 运行核心测试**

Run:
```bash
cd packages/core
pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/ai/chat.ts packages/core/src/config/schema.ts packages/core/src/config/defaults.ts
git commit -m "feat(ai): inject community knowledge base into AI prompts"
```

---

## Task 7: 在 AI 设置面板增加开关

**Files:**
- Modify: `packages/desktop/src/renderer/components/aiSettings.ts`

- [ ] **Step 1: 读取现有 aiSettings.ts**

Read `packages/desktop/src/renderer/components/aiSettings.ts` to understand its structure.

- [ ] **Step 2: 增加 knowledge_base 控件**

Add UI controls for:
- 启用社区知识库（checkbox）
- 选择来源（multi-select/checkboxes for xiaoheihe_post, tencent_sheet）
- 启动时检查更新（checkbox or select）
- 每次 prompt 最大条目数（number input, 0-100）

Bind them to `config.ai.knowledge_base`.

- [ ] **Step 3: 运行桌面端相关测试**

Run:
```bash
cd packages/desktop
pnpm test
```

Expected: existing tests pass; if new behavior requires updating snapshots, review and update carefully.

- [ ] **Step 4: Commit**

```bash
git add packages/desktop/src/renderer/components/aiSettings.ts
git commit -m "feat(settings): add community knowledge base options in AI settings"
```

---

## Task 8: 更新 README 来源声明

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 在 README 中增加数据来源章节**

Add a section near the end of `README.md`:

```markdown
## 社区数据来源

本工具的部分 AI 分析功能会引用以下社区资料，仅供参考：

- 腾讯表格《d2 武器 perk 推荐》：作者 Aegis
- 小黑盒帖子《命运2-凯旋丰碑-全种类武器推荐》：作者日栎

以上资料均为玩家社区整理，不代表 Bungie 或本工具官方观点。可在应用设置的"AI 助手"中开启或关闭社区知识库。
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(readme): add community data source attribution"
```

---

## Task 9: 集成测试与端到端验证

**Files:**
- Modify: `packages/core/test/ai.chat.test.ts` (add knowledge injection test)

- [ ] **Step 1: 增加 AI 知识库注入测试**

Add to `packages/core/test/ai.chat.test.ts` (or create `packages/core/test/ai.knowledge.test.ts`):

```typescript
import { describe, expect, it, vi } from "vitest";
import { generateItemAiAdvice } from "../src/ai/chat.js";

describe("AI knowledge base injection", () => {
  it("includes community knowledge when enabled", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "分析完成" } }]
      })
    });

    const result = await generateItemAiAdvice({
      config: {
        ai: {
          provider: "openai",
          api_key: "test",
          model: "gpt-4o-mini",
          base_url: "",
          enable_lightgg: false,
          knowledge_base: {
            enabled: true,
            sources: ["xiaoheihe_post"],
            check_for_updates: "startup",
            max_entries_per_prompt: 20
          }
        },
        data: { data_dir: "./src/knowledge/generated" }
      } as any,
      item: {
        hash: 1000000001,
        name: "速射框架自动步枪示例",
        tier: "legendary",
        item_type: "自动步枪",
        group_key: "auto_rifle",
        socket_plugs: [],
        power: 1800,
        locked: false
      } as any,
      tags: { items: {} },
      fetcher
    });

    expect(result.ai).not.toBeNull();
    const callBody = JSON.parse(fetcher.mock.calls[0][1].body);
    const userContent = callBody.messages.find((m: any) => m.role === "user").content;
    expect(userContent).toContain("社区参考资料");
  });

  it("skips community knowledge when disabled", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "分析完成" } }]
      })
    });

    const result = await generateItemAiAdvice({
      config: {
        ai: {
          provider: "openai",
          api_key: "test",
          model: "gpt-4o-mini",
          base_url: "",
          enable_lightgg: false,
          knowledge_base: {
            enabled: false,
            sources: ["xiaoheihe_post"],
            check_for_updates: "startup",
            max_entries_per_prompt: 20
          }
        },
        data: { data_dir: "./src/knowledge/generated" }
      } as any,
      item: {
        hash: 1000000001,
        name: "速射框架自动步枪示例",
        tier: "legendary",
        item_type: "自动步枪",
        group_key: "auto_rifle",
        socket_plugs: [],
        power: 1800,
        locked: false
      } as any,
      tags: { items: {} },
      fetcher
    });

    expect(result.ai).not.toBeNull();
    const callBody = JSON.parse(fetcher.mock.calls[0][1].body);
    const userContent = callBody.messages.find((m: any) => m.role === "user").content;
    expect(userContent).not.toContain("社区参考资料");
  });
});
```

- [ ] **Step 2: 运行全部核心测试**

Run:
```bash
cd packages/core
pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/core/test/ai.chat.test.ts
git commit -m "test(ai): verify knowledge base injection in AI prompts"
```

---

## Task 10: 最终检查

- [ ] **Step 1: 类型检查**

Run:
```bash
cd packages/core
pnpm tsc --noEmit
cd ../desktop
pnpm tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 2: 格式化/ lint**

Run:
```bash
pnpm run lint
```

If no lint script, run:
```bash
pnpm exec prettier --check .
```

Expected: no formatting errors (or run `pnpm exec prettier --write .` to fix).

- [ ] **Step 3: 提交最终变更**

```bash
git status
# Review all changes
git add -A
git commit -m "feat: integrate community weapon knowledge base into AI assistant (phase 1)"
```

---

## Spec Coverage Checklist

| Spec 要求 | 对应 Task |
|---|---|
| 按武器 hash 索引的知识库 | Task 2, 3, 4 |
| 支持按活动/副本分组 | Task 2 (types), Task 5 (activity-index.json) |
| 应用启动时检查更新 | Task 6 config, Phase 2 完整实现 |
| README 中注明来源 | Task 8 |
| AI prompt 注入 | Task 6 |
| 配置开关 | Task 6, 7 |
| 不引入向量数据库 | 整体设计 |
| 不打包原始全文 | Task 1 目录结构 |

## Notes

- Phase 1 先用占位 hash（1000000001+），Phase 2 替换为真实武器 hash 并接入 Manifest 查询。
- `loadKnowledgeService` 目前从 `data_dir/knowledge/weapon-knowledge.json` 读取，后续可改为从应用资源目录读取。
- 启动时更新检查（UpdateChecker）在 Phase 1 只完成配置和接口预留，完整实现在 Phase 2。
