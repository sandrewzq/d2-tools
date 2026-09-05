import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import {
  clearExternalRecommendationSet,
  externalRecommendationMigrationState,
  loadExternalRecommendationSet,
  markExternalRecommendationMigrationChecked,
  saveExternalRecommendationSet,
  type ExternalRecommendationSetRecord
} from "../community/externalRecommendationStore.js";
import { listRecommendationSourceOverrides } from "../community/recommendationOverrides.js";

const wishlistFileName = "dim-wishlist.json";
const sourceKind = "dim_wishlist" as const;
const legacyMigrationMetadataKey = "legacy_dim_wishlist_migration";

export function loadDimWishlist(dataDir: string): DimWishlist | null {
  const sourceState = listRecommendationSourceOverrides(dataDir)
    .find((entry) => entry.source_key === sourceKind)?.state ?? "active";
  if (sourceState !== "active") return null;
  const stored = loadExternalRecommendationSet(dataDir, sourceKind);
  if (stored) return externalSetToDimWishlist(stored);

  if (externalRecommendationMigrationState(dataDir, legacyMigrationMetadataKey)) {
    return null;
  }

  const legacy = loadLegacyDimWishlist(dataDir);
  if (!legacy) {
    markExternalRecommendationMigrationChecked(dataDir, legacyMigrationMetadataKey);
    return null;
  }

  return externalSetToDimWishlist(saveDimWishlistSet(dataDir, legacy, {}));
}

export function saveDimWishlist(dataDir: string, wishlist: DimWishlist): DimWishlist {
  return externalSetToDimWishlist(saveDimWishlistSet(dataDir, wishlist, {}));
}

export function saveDimWishlistFromSource(
  dataDir: string,
  wishlist: DimWishlist,
  source: { source_url: string; revision: string; imported_at?: string; source_fingerprint?: string }
): DimWishlist {
  return externalSetToDimWishlist(saveDimWishlistSet(dataDir, wishlist, source));
}

export function clearDimWishlist(dataDir: string): void {
  clearExternalRecommendationSet(dataDir, sourceKind, legacyMigrationMetadataKey);
}

function saveDimWishlistSet(
  dataDir: string,
  wishlist: DimWishlist,
  source: { source_url?: string; revision?: string; imported_at?: string; source_fingerprint?: string }
): ExternalRecommendationSetRecord {
  const normalized = normalizeDimWishlist(wishlist);
  return saveExternalRecommendationSet(dataDir, {
    source_kind: sourceKind,
    title: normalized.title,
    description: normalized.description ?? "",
    author: normalized.author ?? "",
    source_url: source.source_url ?? "",
    revision: source.revision ?? "",
    blocks: (normalized.source_blocks ?? []).map((block) => ({
      block_key: block.id,
      title: block.title ?? "",
      description: block.description ?? "",
      note: block.note ?? "",
      author: block.author ?? "",
      tags: block.tags ?? []
    })),
    rules: normalized.rules.map((rule) => ({
      item_hash: rule.item_hash,
      perk_hashes: rule.perk_hashes,
      mode: rule.mode,
      note: rule.note,
      author: rule.author ?? "",
      source_note: rule.source_note ?? "",
      source_title: rule.source_title ?? "",
      source_description: rule.source_description ?? "",
      source_label: "",
      ...(rule.source_block_id ? { block_key: rule.source_block_id } : {}),
      tags: rule.tags ?? []
    })),
    migration_metadata_key: legacyMigrationMetadataKey,
    ...(source.imported_at ? { imported_at: source.imported_at } : {}),
    ...(source.source_fingerprint ? { source_fingerprint: source.source_fingerprint } : {})
  });
}

function loadLegacyDimWishlist(dataDir: string): DimWishlist | null {
  const file = wishlistPath(dataDir);
  if (!existsSync(file)) return null;

  const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<DimWishlist>;
  if (!Array.isArray(parsed.rules) || parsed.rules.length === 0) return null;
  return normalizeDimWishlist({
    title: typeof parsed.title === "string" ? parsed.title : "DIM Wishlist",
    ...(typeof parsed.description === "string" ? { description: parsed.description } : {}),
    ...(typeof parsed.author === "string" ? { author: parsed.author } : {}),
    ...(Array.isArray(parsed.source_blocks) ? { source_blocks: parsed.source_blocks } : {}),
    rules: parsed.rules
  });
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
  const rules = wishlist.rules.flatMap((rule) => {
    const itemHash = Number(rule.item_hash);
    const perkHashes = Array.isArray(rule.perk_hashes)
      ? [...new Set(rule.perk_hashes.map(Number).filter(isUnsignedHash))]
      : [];
    if (!isUnsignedHash(itemHash) || perkHashes.length === 0) return [];
    return [{
      ...(typeof rule.rule_stable_id === "string" && rule.rule_stable_id.trim()
        ? { rule_stable_id: rule.rule_stable_id.trim() }
        : {}),
      item_hash: itemHash,
      perk_hashes: perkHashes,
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

function externalSetToDimWishlist(set: ExternalRecommendationSetRecord): DimWishlist {
  return {
    title: set.title || "DIM Wishlist",
    ...(set.description ? { description: set.description } : {}),
    ...(set.author ? { author: set.author } : {}),
    ...(set.blocks.length
      ? {
          source_blocks: set.blocks.map((block) => ({
            id: block.block_key,
            ...(block.title ? { title: block.title } : {}),
            ...(block.description ? { description: block.description } : {}),
            ...(block.note ? { note: block.note } : {}),
            ...(block.tags.length ? { tags: block.tags } : {}),
            ...(block.author ? { author: block.author } : {})
          }))
        }
      : {}),
    rules: set.rules.map((rule) => ({
      rule_stable_id: rule.rule_stable_id,
      item_hash: rule.item_hash,
      perk_hashes: rule.perk_hashes,
      mode: rule.mode,
      note: rule.note,
      ...(rule.tags.length ? { tags: rule.tags } : {}),
      ...(rule.author ? { author: rule.author } : {}),
      ...(rule.source_note ? { source_note: rule.source_note } : {}),
      ...(rule.source_title ? { source_title: rule.source_title } : {}),
      ...(rule.source_description ? { source_description: rule.source_description } : {}),
      ...(rule.block_key ? { source_block_id: rule.block_key } : {})
    }))
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

function wishlistPath(dataDir: string): string {
  return join(dataDir, wishlistFileName);
}
