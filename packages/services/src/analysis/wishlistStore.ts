import { createHash } from "node:crypto";
import type { DimWishlist, DimWishlistRule, DimWishlistSourceBlock } from "@d2-tools/core/analysis/wishlistImport";
import {
  loadRecommendationDocumentInfo,
  loadRecommendationSources,
  saveRecommendationDocument,
  type RecommendationImportMode,
  type StoredRecommendationInstance
} from "../community/recommendationDocumentStore.js";
import type { RecommendationStoredRule } from "../community/recommendationRuleStore.js";

/**
 * DIM 格式的适配器：把愿望单文本形状（`DimWishlist`）与三级模型对齐。
 *
 * 三级模型（文档 / 来源实例 / 规则）是两种格式共用的存储；本文件是**唯一**知道
 * 「DIM 的注释段 = 一份来源实例」「DIM 的 Perk 列表 = 无栏位要求」这些格式知识的地方，
 * 所以按格式分叉在这里是正当的（分层图的 ②）。
 */

// 三级模型是 DIM 的唯一读写路径。旧版单例表只在首次升级时读一次并迁移，
// 迁移后不再参与读写。只要三级模型有 dim 实例就可用。
export function loadDimWishlist(dataDir: string): DimWishlist | null {
  const sources = loadRecommendationSources(dataDir, "dim");
  if (!sources.length) return null;
  const info = loadRecommendationDocumentInfo(dataDir);
  const blocks = sourceBlocks(sources);
  return {
    title: info?.title || sources[0].title,
    ...(info?.author ? { author: info.author } : {}),
    ...(blocks.length ? { source_blocks: blocks } : {}),
    rules: sources.flatMap((source) => source.rules.map(toDimWishlistRule))
  };
}

export function saveDimWishlist(
  dataDir: string,
  wishlist: DimWishlist,
  options: { name: string; mode: RecommendationImportMode; origin?: "file" | "paste" }
): DimWishlist {
  const normalized = normalizeDimWishlist(wishlist);
  saveRecommendationDocument(dataDir, {
    kind: "dim",
    name: options.name,
    mode: options.mode,
    origin: options.origin ?? "file",
    description: normalized.description ?? "",
    author: normalized.author ?? "",
    instances: dimInstances(normalized)
  });
  return loadDimWishlist(dataDir) ?? normalized;
}

export function saveDimWishlistFromSource(
  dataDir: string,
  wishlist: DimWishlist,
  source: {
    name: string;
    mode: RecommendationImportMode;
    source_url: string;
    revision: string;
    imported_at?: string;
    source_fingerprint?: string;
  }
): DimWishlist {
  const normalized = normalizeDimWishlist(wishlist);
  saveRecommendationDocument(dataDir, {
    kind: "dim",
    name: source.name,
    mode: source.mode,
    origin: "url",
    sourceUrl: source.source_url,
    revision: source.revision,
    ...(source.imported_at ? { importedAt: source.imported_at } : {}),
    ...(source.source_fingerprint ? { fingerprint: source.source_fingerprint } : {}),
    description: normalized.description ?? "",
    author: normalized.author ?? "",
    instances: dimInstances(normalized)
  });
  return loadDimWishlist(dataDir) ?? normalized;
}

/**
 * 一个来源实例 → 该实例视角的愿望单（规则 + 注释段）。
 * 运行时投影按实例取规则，而不是把整份文档的规则混在一起。
 */
export function dimWishlistForSource(source: StoredRecommendationInstance): DimWishlist {
  const blocks = sourceBlocks([source]);
  return {
    title: source.title || source.documentTitle,
    ...(source.documentDescription ? { description: source.documentDescription } : {}),
    ...(source.documentAuthor ? { author: source.documentAuthor } : {}),
    ...(blocks.length ? { source_blocks: blocks } : {}),
    rules: source.rules.map(toDimWishlistRule)
  };
}

// 注释段有标题或作者时，每个身份建立一个来源实例；完全没有身份时全部归入文档级来源，
// 避免数百个无标题注释段变成数百个「未标注来源 #N」行。
function dimInstances(wishlist: DimWishlist) {
  const blocksById = new Map((wishlist.source_blocks ?? []).map((block) => [block.id, block] as const));
  const groups = new Map<string, { key: string; rules: DimWishlistRule[]; block?: DimWishlistSourceBlock }>();
  for (const rule of wishlist.rules) {
    const block = rule.source_block_id ? blocksById.get(rule.source_block_id) : undefined;
    const key = sourceIdentityKey(block);
    const existing = groups.get(key);
    if (existing) existing.rules.push(rule);
    else groups.set(key, { key, rules: [rule], ...(block ? { block } : {}) });
  }
  return [...groups.values()].map(({ key, rules, block }) => {
    // 标签只在导入期决定一次并持久化；读取路径不再推导，避免内部编号泄漏到界面。
    const base = sourceBaseName(key, block, wishlist.title);
    return {
      identity: key,
      label: block?.author?.trim() ? `${base} · ${block.author.trim()}` : base,
      title: base,
      ...(block?.author ? { author: block.author } : {}),
      ...(block?.id ? { blockId: block.id } : {}),
      // DIM 只是把「用途 = 格式自带的单值 mode」「每个 Perk 一条无栏位要求」喂给统一接口。
      // 分组键不显式给：统一默认「同一实例同一武器互为备选」正合 DIM 的语义。
      rules: rules.map((rule) => {
        const ruleId = rule.rule_stable_id || sha256(JSON.stringify(rule));
        return {
          ruleId,
          itemHashes: [rule.item_hash],
          purposes: [rule.mode],
          kind: rule.kind ?? (rule.perk_hashes.length ? "roll" as const : "weapon_only" as const),
          requirements: rule.perk_hashes.map((perkHash) => ({ slot: "", candidates: [perkHash] })),
          note: rule.note ?? "",
          tags: rule.tags ?? [],
          author: rule.author ?? "",
          sourceNote: rule.source_note ?? "",
          sourceTitle: rule.source_title ?? "",
          sourceDescription: rule.source_description ?? "",
          blockId: rule.source_block_id ?? ""
        };
      })
    };
  });
}

// 规则里保留了原始 block_id；读取时按文件内顺序还原注释段结构，
// 让 resolveDimWishlistRuleMetadata 等下游仍能按 block 取到来源信息。
function sourceBlocks(sources: readonly StoredRecommendationInstance[]): DimWishlistSourceBlock[] {
  const seen = new Set<string>();
  const blocks: DimWishlistSourceBlock[] = [];
  for (const source of sources) {
    for (const rule of source.rules) {
      if (!rule.blockId || seen.has(rule.blockId)) continue;
      seen.add(rule.blockId);
      blocks.push({ id: rule.blockId, ...(source.author ? { author: source.author } : {}) });
    }
  }
  return blocks;
}

/**
 * 存储规则 → DIM 规则。无栏位要求按写入顺序拼回原来的 Perk 列表；
 * DIM 每条要求只有一个候选，所以这一趟是逐字段无损的（迁移前存的就是这个数组）。
 */
function toDimWishlistRule(rule: RecommendationStoredRule): DimWishlistRule {
  return {
    rule_stable_id: rule.ruleId,
    item_hash: rule.itemHashes[0] ?? 0,
    mode: rule.mode,
    kind: rule.kind,
    note: rule.note,
    perk_hashes: rule.requirements.flatMap((requirement) => requirement.candidates),
    ...(rule.tags.length ? { tags: rule.tags } : {}),
    ...(rule.author ? { author: rule.author } : {}),
    ...(rule.sourceNote ? { source_note: rule.sourceNote } : {}),
    ...(rule.sourceTitle ? { source_title: rule.sourceTitle } : {}),
    ...(rule.sourceDescription ? { source_description: rule.sourceDescription } : {}),
    ...(rule.blockId ? { source_block_id: rule.blockId } : {})
  };
}

function sourceIdentityKey(block?: DimWishlistSourceBlock): string {
  const title = block?.title?.trim() ?? "";
  const author = block?.author?.trim() ?? "";
  if (!title && !author) return "document";
  return `identity:${sha256(JSON.stringify([title, author])).slice(0, 16)}`;
}

function sourceBaseName(
  key: string,
  block: DimWishlistSourceBlock | undefined,
  documentName: string
): string {
  // 没有名字的来源一律落到文档名，而文档名来自用户输入，不来自数据。
  if (key === "document") return documentName;
  return block?.title?.trim() || documentName;
}

function normalizeDimWishlist(wishlist: DimWishlist): DimWishlist {
  const blocks = (wishlist.source_blocks ?? []).flatMap((block) => {
    if (!block || typeof block.id !== "string" || !block.id.trim()) return [];
    return [{
      id: block.id.trim(),
      ...(typeof block.title === "string" && block.title.trim() ? { title: block.title.trim() } : {}),
      ...(typeof block.description === "string" && block.description.trim()
        ? { description: block.description.trim() }
        : {}),
      ...(typeof block.note === "string" && block.note.trim() ? { note: block.note.trim() } : {}),
      ...(Array.isArray(block.tags) ? optionalTags(block.tags) : {}),
      ...(typeof block.author === "string" && block.author.trim() ? { author: block.author.trim() } : {})
    }];
  });
  const rules: DimWishlistRule[] = wishlist.rules.flatMap((rule): DimWishlistRule[] => {
    const itemHash = Number(rule.item_hash);
    const perkHashes = Array.isArray(rule.perk_hashes)
      ? [...new Set(rule.perk_hashes.map(Number).filter(isUnsignedHash))]
      : [];
    if (!isUnsignedHash(itemHash)) return [];
    return [{
      ...(typeof rule.rule_stable_id === "string" && rule.rule_stable_id.trim()
        ? { rule_stable_id: rule.rule_stable_id.trim() }
        : {}),
      item_hash: itemHash,
      perk_hashes: perkHashes,
      kind: perkHashes.length > 0 ? "roll" : "weapon_only",
      mode: rule.mode === "pve" || rule.mode === "pvp" ? rule.mode : "general" as const,
      note: typeof rule.note === "string" ? rule.note.trim() : "",
      ...(Array.isArray(rule.tags) ? optionalTags(rule.tags) : {}),
      ...(typeof rule.author === "string" && rule.author.trim() ? { author: rule.author.trim() } : {}),
      ...(typeof rule.source_note === "string" && rule.source_note.trim()
        ? { source_note: rule.source_note.trim() }
        : {}),
      ...(typeof rule.source_title === "string" && rule.source_title.trim()
        ? { source_title: rule.source_title.trim() }
        : {}),
      ...(typeof rule.source_description === "string" && rule.source_description.trim()
        ? { source_description: rule.source_description.trim() }
        : {}),
      ...(typeof rule.source_block_id === "string" && rule.source_block_id.trim()
        ? { source_block_id: rule.source_block_id.trim() }
        : {})
    }];
  });

  if (rules.length === 0) {
    throw new Error("DIM Wishlist 至少需要一条有效规则。");
  }

  return {
    title: wishlist.title.trim(),
    ...(wishlist.description?.trim() ? { description: wishlist.description.trim() } : {}),
    ...(wishlist.author?.trim() ? { author: wishlist.author.trim() } : {}),
    ...(blocks.length ? { source_blocks: blocks } : {}),
    rules
  };
}

function optionalTags(values: string[]): { tags?: string[] } {
  const tags = [...new Set(values.filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim()).filter(Boolean))];
  return tags.length ? { tags } : {};
}

function isUnsignedHash(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
