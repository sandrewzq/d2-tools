import type { DimWishlist, DimWishlistRule } from "@d2-tools/core/analysis/wishlistImport";
import { clearDimRecommendationDocuments, loadDimRecommendationDocumentInfo, loadDimRecommendationSources, saveDimRecommendationDocument } from "../community/recommendationDocumentStore.js";

// 新三级模型（文档 / 来源实例 / 规则）是 DIM 的唯一读写路径。
// 旧版单例表只在首次升级时读一次并迁移，迁移后不再参与读写。
// 只要新三级模型有数据就可用；旧版单例迁移入口已移除（不再迁移历史单例数据）。
export function loadDimWishlist(dataDir: string): DimWishlist | null {
  return loadWishlistFromDocuments(dataDir);
}

function loadWishlistFromDocuments(dataDir: string): DimWishlist | null {
  const sources = loadDimRecommendationSources(dataDir);
  if (!sources.length) return null;
  const info = loadDimRecommendationDocumentInfo(dataDir);
  const seenBlocks = new Set<string>();
  const blocks = sources
    .flatMap((source) => source.wishlist.source_blocks ?? [])
    .filter((block) => (seenBlocks.has(block.id) ? false : (seenBlocks.add(block.id), true)));
  return {
    title: info?.title || sources[0].wishlist.title,
    ...(info?.author ? { author: info.author } : {}),
    ...(blocks.length ? { source_blocks: blocks } : {}),
    rules: sources.flatMap((source) => source.wishlist.rules)
  };
}

export function saveDimWishlist(dataDir: string, wishlist: DimWishlist): DimWishlist {
  const normalized = normalizeDimWishlist(wishlist);
  saveDimRecommendationDocument(dataDir, normalized, { origin: "file" });
  return loadWishlistFromDocuments(dataDir) ?? normalized;
}

export function saveDimWishlistFromSource(
  dataDir: string,
  wishlist: DimWishlist,
  source: { source_url: string; revision: string; imported_at?: string; source_fingerprint?: string }
): DimWishlist {
  const normalized = normalizeDimWishlist(wishlist);
  saveDimRecommendationDocument(dataDir, normalized, {
    origin: "url",
    source_url: source.source_url,
    revision: source.revision,
    ...(source.imported_at ? { imported_at: source.imported_at } : {}),
    ...(source.source_fingerprint ? { fingerprint: source.source_fingerprint } : {})
  });
  return loadWishlistFromDocuments(dataDir) ?? normalized;
}

export function clearDimWishlist(dataDir: string): void {
  clearDimRecommendationDocuments(dataDir);
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
    title: wishlist.title.trim() || "DIM Wishlist",
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

