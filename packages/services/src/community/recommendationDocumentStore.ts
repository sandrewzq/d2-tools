import { createHash } from "node:crypto";
import type { DimWishlist, DimWishlistRule, DimWishlistSourceBlock } from "@d2-tools/core/analysis/wishlistImport";
import { openRecommendationDatabase } from "./recommendationDatabase.js";

export type RecommendationSourceInstanceRecord = {
  sourceId: string;
  documentId: string;
  kind: "dim";
  label: string;
  title: string;
  author?: string;
  blockId?: string;
  origin: "community" | "local-file" | "paste";
  sourceUrl?: string;
  revision?: string;
  fingerprint: string;
  state: "active" | "disabled" | "removed";
  wishlist: DimWishlist;
};

export function saveDimRecommendationDocument(
  dataDir: string,
  wishlist: DimWishlist,
  input: { origin?: "url" | "file" | "paste"; source_url?: string; revision?: string; fingerprint?: string; imported_at?: string } = {}
): RecommendationSourceInstanceRecord[] {
  const fingerprint = input.fingerprint || sha256(JSON.stringify(wishlist));
  const documentIdentity = input.source_url?.trim() || fingerprint;
  const documentId = `dim-document:${sha256(documentIdentity).slice(0, 24)}`;
  const importedAt = input.imported_at ?? new Date().toISOString();
  const origin = input.origin ?? "file";
  const groups = groupRules(wishlist);
  const database = openRecommendationDatabase(dataDir);
  try {
    database.exec("BEGIN IMMEDIATE;");
    database.prepare(`
      INSERT INTO recommendation_documents(document_id, origin, source_url, revision, fingerprint, imported_at, title, description, author)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(document_id) DO UPDATE SET
        origin = excluded.origin, source_url = excluded.source_url, revision = excluded.revision,
        fingerprint = excluded.fingerprint, imported_at = excluded.imported_at,
        title = excluded.title, description = excluded.description, author = excluded.author
    `).run(documentId, origin, input.source_url ?? "", input.revision ?? "", fingerprint, importedAt,
      wishlist.title, wishlist.description ?? "", wishlist.author ?? "");
    const saved: RecommendationSourceInstanceRecord[] = [];
    const existingSourceIds = new Set((database.prepare(
      "SELECT source_id FROM recommendation_source_instances WHERE document_id = ?"
    ).all(documentId) as Array<{ source_id: string }>).map((row) => row.source_id));
    for (const { key, rules, block } of groups) {
      const base = block?.title?.trim()
        || (groups.length === 1 && key === "unlabeled" ? "DIM Wishlist" : "未标注来源 #1");
      const label = block?.author?.trim() ? `${base} · ${block.author.trim()}` : base;
      const sourceId = `dim:${documentId.slice("dim-document:".length)}:${sha256(key).slice(0, 16)}`;
      database.prepare(`
        INSERT INTO recommendation_source_instances(
          source_id, document_id, kind, label, title, author, block_id, origin,
          source_url, revision, fingerprint, state
        ) VALUES (?, ?, 'dim', ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ON CONFLICT(source_id) DO UPDATE SET
          document_id = excluded.document_id, label = excluded.label, title = excluded.title,
          author = excluded.author, block_id = excluded.block_id, origin = excluded.origin,
          source_url = excluded.source_url, revision = excluded.revision,
          fingerprint = excluded.fingerprint
      `).run(sourceId, documentId, label, base, block?.author ?? "", block?.id ?? "",
        origin === "url" ? "community" : origin === "paste" ? "paste" : "local-file",
        input.source_url ?? "", input.revision ?? "", fingerprint);
      database.prepare("DELETE FROM recommendation_source_rules WHERE source_id = ?").run(sourceId);
      for (const rule of rules) {
        const ruleId = rule.rule_stable_id || sha256(JSON.stringify(rule));
        database.prepare(`
          INSERT INTO recommendation_source_rules(
            source_id, rule_id, item_hash, mode, kind, perk_hashes, note, tags, author,
            source_note, source_title, source_description, block_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(sourceId, ruleId, rule.item_hash, rule.mode, rule.kind ?? (rule.perk_hashes.length ? "roll" : "weapon_only"),
          JSON.stringify(rule.perk_hashes), rule.note ?? "", JSON.stringify(rule.tags ?? []), rule.author ?? "",
          rule.source_note ?? "", rule.source_title ?? "", rule.source_description ?? "", rule.source_block_id ?? "");
      }
      saved.push({
        sourceId, documentId, kind: "dim", label, title: base,
        ...(block?.author ? { author: block.author } : {}),
        ...(block?.id ? { blockId: block.id } : {}),
        origin: origin === "url" ? "community" : origin === "paste" ? "paste" : "local-file",
        ...(input.source_url ? { sourceUrl: input.source_url } : {}),
        ...(input.revision ? { revision: input.revision } : {}), fingerprint, state: "active",
        wishlist: { ...wishlist, title: label, rules }
      });
      existingSourceIds.delete(sourceId);
    }
    for (const staleSourceId of existingSourceIds) {
      database.prepare("UPDATE recommendation_source_instances SET state = 'removed' WHERE source_id = ?").run(staleSourceId);
    }
    database.exec("COMMIT;");
    return saved;
  } catch (error) {
    try { database.exec("ROLLBACK;"); } catch { /* preserve original error */ }
    throw error;
  } finally {
    database.close();
  }
}

export function loadDimRecommendationSources(dataDir: string): RecommendationSourceInstanceRecord[] {
  const database = openRecommendationDatabase(dataDir);
  try {
    const rows = database.prepare(`
      SELECT s.source_id, s.document_id, s.label, s.title, s.author, s.block_id, s.origin,
             s.source_url, s.revision, s.fingerprint, s.state,
             d.title AS document_title, d.description AS document_description, d.author AS document_author
      FROM recommendation_source_instances s
      JOIN recommendation_documents d ON d.document_id = s.document_id
      WHERE s.kind = 'dim' AND s.state <> 'removed'
      ORDER BY d.imported_at, s.source_id
    `).all() as Array<Record<string, string>>;
    return rows.map((row) => {
      const ruleRows = database.prepare(`
        SELECT rule_id, item_hash, mode, kind, perk_hashes, note, tags, author,
               source_note, source_title, source_description, block_id
        FROM recommendation_source_rules WHERE source_id = ? ORDER BY rowid
      `).all(row.source_id) as Array<Record<string, string | number>>;
      const rules: DimWishlistRule[] = ruleRows.map((rule) => ({
        rule_stable_id: String(rule.rule_id), item_hash: Number(rule.item_hash), mode: rule.mode as DimWishlistRule["mode"],
        kind: rule.kind === "weapon_only" ? "weapon_only" : "roll", perk_hashes: parseNumbers(rule.perk_hashes), note: String(rule.note ?? ""),
        ...(parseStrings(rule.tags).length ? { tags: parseStrings(rule.tags) } : {}),
        ...(String(rule.author ?? "") ? { author: String(rule.author) } : {}),
        ...(String(rule.source_note ?? "") ? { source_note: String(rule.source_note) } : {}),
        ...(String(rule.source_title ?? "") ? { source_title: String(rule.source_title) } : {}),
        ...(String(rule.source_description ?? "") ? { source_description: String(rule.source_description) } : {}),
        ...(String(rule.block_id ?? "") ? { source_block_id: String(rule.block_id) } : {})
      }));
      return {
        sourceId: row.source_id, documentId: row.document_id, kind: "dim" as const, label: row.label,
        title: row.title, ...(row.author ? { author: row.author } : {}), ...(row.block_id ? { blockId: row.block_id } : {}),
        origin: row.origin as RecommendationSourceInstanceRecord["origin"],
        ...(row.source_url ? { sourceUrl: row.source_url } : {}), ...(row.revision ? { revision: row.revision } : {}),
        fingerprint: row.fingerprint, state: row.state as RecommendationSourceInstanceRecord["state"],
        wishlist: { title: row.title || row.document_title, ...(row.document_description ? { description: row.document_description } : {}), ...(row.document_author ? { author: row.document_author } : {}), rules }
      };
    });
  } finally {
    database.close();
  }
}

export function clearDimRecommendationDocuments(dataDir: string): void {
  const database = openRecommendationDatabase(dataDir);
  try {
    database.prepare("DELETE FROM recommendation_documents WHERE document_id LIKE 'dim-document:%'").run();
  } finally {
    database.close();
  }
}

type DimWishlistRuleGroup = { key: string; rules: DimWishlistRule[]; block?: DimWishlistSourceBlock };

function groupRules(wishlist: DimWishlist): DimWishlistRuleGroup[] {
  const blocksById = new Map((wishlist.source_blocks ?? []).map((block) => [block.id, block] as const));
  const groups = new Map<string, DimWishlistRuleGroup>();
  for (const rule of wishlist.rules) {
    const block = rule.source_block_id ? blocksById.get(rule.source_block_id) : undefined;
    const key = block
      ? JSON.stringify([block.title?.trim() ?? "", block.author?.trim() ?? ""])
      : rule.source_block_id
        ? `block:${rule.source_block_id}`
        : "unlabeled";
    const existing = groups.get(key);
    if (existing) existing.rules.push(rule);
    else groups.set(key, { key, rules: [rule], ...(block ? { block } : {}) });
  }
  return [...groups.values()];
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseNumbers(value: unknown): number[] {
  try { const parsed = JSON.parse(String(value ?? "[]")); return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : []; } catch { return []; }
}

function parseStrings(value: unknown): string[] {
  try { const parsed = JSON.parse(String(value ?? "[]")); return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []; } catch { return []; }
}
