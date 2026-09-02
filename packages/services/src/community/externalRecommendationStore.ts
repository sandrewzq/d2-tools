import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  openRecommendationDatabase,
  recommendationMetadataValue,
  writeRecommendationMetadata
} from "./recommendationDatabase.js";

export type ExternalRecommendationSourceKind = "dim_wishlist" | "local_community";

export type ExternalRecommendationBlockRecord = {
  block_key: string;
  title: string;
  description: string;
  note: string;
  author: string;
  tags: string[];
};

export type ExternalRecommendationRuleRecord = {
  item_hash: number;
  perk_hashes: number[];
  mode: "pve" | "pvp" | "general";
  note: string;
  author: string;
  source_note: string;
  source_title: string;
  source_description: string;
  source_label: string;
  block_key?: string;
  tags: string[];
};

export type ExternalRecommendationSetRecord = {
  source_kind: ExternalRecommendationSourceKind;
  title: string;
  description: string;
  author: string;
  source_url: string;
  revision: string;
  source_fingerprint: string;
  imported_at: string;
  blocks: ExternalRecommendationBlockRecord[];
  rules: ExternalRecommendationRuleRecord[];
};

export type SaveExternalRecommendationSetInput = Omit<
  ExternalRecommendationSetRecord,
  "source_fingerprint" | "imported_at"
> & {
  migration_metadata_key: string;
  imported_at?: string;
  source_fingerprint?: string;
};

export function saveExternalRecommendationSet(
  dataDir: string,
  input: SaveExternalRecommendationSetInput
): ExternalRecommendationSetRecord {
  const normalized = normalizeExternalSet(input);
  const importedAt = input.imported_at ?? new Date().toISOString();
  const providedFingerprint = input.source_fingerprint?.trim().toLowerCase() ?? "";
  if (providedFingerprint && !/^[a-f0-9]{64}$/.test(providedFingerprint)) {
    throw new Error("外部推荐数据的来源 SHA256 无效。");
  }
  const fingerprint = providedFingerprint
    || createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  const database = openRecommendationDatabase(dataDir);
  try {
    replaceExternalSet(database, {
      ...normalized,
      source_fingerprint: fingerprint,
      imported_at: importedAt
    }, input.migration_metadata_key);
  } finally {
    database.close();
  }
  return loadExternalRecommendationSet(dataDir, input.source_kind) ?? {
    ...normalized,
    source_fingerprint: fingerprint,
    imported_at: importedAt
  };
}

export function loadExternalRecommendationSet(
  dataDir: string,
  sourceKind: ExternalRecommendationSourceKind
): ExternalRecommendationSetRecord | null {
  const database = openRecommendationDatabase(dataDir);
  try {
    const set = database.prepare(`
      SELECT source_kind, title, description, author, source_url, revision,
             source_fingerprint, imported_at
      FROM external_recommendation_sets
      WHERE source_kind = ?
    `).get(sourceKind) as Omit<ExternalRecommendationSetRecord, "blocks" | "rules"> | undefined;
    if (!set) return null;

    const blockRows = database.prepare(`
      SELECT id, block_key, title, description, note, author
      FROM external_recommendation_blocks
      WHERE source_kind = ?
      ORDER BY ordinal
    `).all(sourceKind) as Array<{
      id: number;
      block_key: string;
      title: string;
      description: string;
      note: string;
      author: string;
    }>;
    const blockTags = database.prepare(`
      SELECT b.id AS block_id, t.tag
      FROM external_recommendation_blocks b
      JOIN external_recommendation_block_tags t ON t.block_id = b.id
      WHERE b.source_kind = ?
      ORDER BY b.ordinal, t.ordinal
    `).all(sourceKind) as Array<{ block_id: number; tag: string }>;
    const tagsByBlock = groupTextValues(blockTags.map((row) => ({
      id: row.block_id,
      value: row.tag
    })));
    const blocks = blockRows.map((block) => ({
      block_key: block.block_key,
      title: block.title,
      description: block.description,
      note: block.note,
      author: block.author,
      tags: tagsByBlock.get(block.id) ?? []
    }));

    const ruleRows = database.prepare(`
      SELECT r.id, r.item_hash, r.mode, r.note, r.author, r.source_note,
             r.source_title, r.source_description, r.source_label, b.block_key
      FROM external_recommendation_rules r
      LEFT JOIN external_recommendation_blocks b ON b.id = r.block_id
      WHERE r.source_kind = ?
      ORDER BY r.ordinal
    `).all(sourceKind) as Array<{
      id: number;
      item_hash: number;
      mode: "pve" | "pvp" | "general";
      note: string;
      author: string;
      source_note: string;
      source_title: string;
      source_description: string;
      source_label: string;
      block_key?: string | null;
    }>;
    const perkRows = database.prepare(`
      SELECT r.id AS rule_id, p.perk_hash
      FROM external_recommendation_rules r
      JOIN external_recommendation_rule_perks p ON p.rule_id = r.id
      WHERE r.source_kind = ?
      ORDER BY r.ordinal, p.ordinal
    `).all(sourceKind) as Array<{ rule_id: number; perk_hash: number }>;
    const ruleTags = database.prepare(`
      SELECT r.id AS rule_id, t.tag
      FROM external_recommendation_rules r
      JOIN external_recommendation_rule_tags t ON t.rule_id = r.id
      WHERE r.source_kind = ?
      ORDER BY r.ordinal, t.ordinal
    `).all(sourceKind) as Array<{ rule_id: number; tag: string }>;
    const perksByRule = groupNumberValues(perkRows.map((row) => ({
      id: row.rule_id,
      value: row.perk_hash
    })));
    const tagsByRule = groupTextValues(ruleTags.map((row) => ({
      id: row.rule_id,
      value: row.tag
    })));
    const rules = ruleRows.map((rule) => ({
      item_hash: Number(rule.item_hash),
      perk_hashes: perksByRule.get(rule.id) ?? [],
      mode: rule.mode,
      note: rule.note,
      author: rule.author,
      source_note: rule.source_note,
      source_title: rule.source_title,
      source_description: rule.source_description,
      source_label: rule.source_label,
      ...(rule.block_key ? { block_key: rule.block_key } : {}),
      tags: tagsByRule.get(rule.id) ?? []
    }));

    return { ...set, blocks, rules };
  } finally {
    database.close();
  }
}

export function clearExternalRecommendationSet(
  dataDir: string,
  sourceKind: ExternalRecommendationSourceKind,
  migrationMetadataKey: string
): void {
  const database = openRecommendationDatabase(dataDir);
  database.exec("BEGIN IMMEDIATE;");
  try {
    database.prepare("DELETE FROM external_recommendation_sets WHERE source_kind = ?").run(sourceKind);
    writeRecommendationMetadata(database, migrationMetadataKey, `cleared:${new Date().toISOString()}`);
    database.exec("COMMIT;");
  } catch (error) {
    try {
      database.exec("ROLLBACK;");
    } catch {
      // 保留原始清理错误。
    }
    throw error;
  } finally {
    database.close();
  }
}

export function externalRecommendationMigrationState(dataDir: string, key: string): string {
  const database = openRecommendationDatabase(dataDir);
  try {
    return recommendationMetadataValue(database, key);
  } finally {
    database.close();
  }
}

export function markExternalRecommendationMigrationChecked(dataDir: string, key: string): void {
  const database = openRecommendationDatabase(dataDir);
  database.exec("BEGIN IMMEDIATE;");
  try {
    writeRecommendationMetadata(database, key, `absent:${new Date().toISOString()}`);
    database.exec("COMMIT;");
  } catch (error) {
    try {
      database.exec("ROLLBACK;");
    } catch {
      // 保留原始迁移状态错误。
    }
    throw error;
  } finally {
    database.close();
  }
}

function replaceExternalSet(
  database: DatabaseSync,
  set: ExternalRecommendationSetRecord,
  migrationMetadataKey: string
): void {
  const insertSet = database.prepare(`
    INSERT INTO external_recommendation_sets (
      source_kind, title, description, author, source_url, revision, source_fingerprint, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertBlock = database.prepare(`
    INSERT INTO external_recommendation_blocks (
      source_kind, block_key, ordinal, title, description, note, author
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertBlockTag = database.prepare(`
    INSERT INTO external_recommendation_block_tags (block_id, ordinal, tag) VALUES (?, ?, ?)
  `);
  const insertRule = database.prepare(`
    INSERT INTO external_recommendation_rules (
      source_kind, ordinal, item_hash, mode, note, author, source_note,
      source_title, source_description, source_label, block_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPerk = database.prepare(`
    INSERT INTO external_recommendation_rule_perks (rule_id, ordinal, perk_hash) VALUES (?, ?, ?)
  `);
  const insertRuleTag = database.prepare(`
    INSERT INTO external_recommendation_rule_tags (rule_id, ordinal, tag) VALUES (?, ?, ?)
  `);

  database.exec("BEGIN IMMEDIATE;");
  try {
    database.prepare("DELETE FROM external_recommendation_sets WHERE source_kind = ?").run(set.source_kind);
    insertSet.run(
      set.source_kind,
      set.title,
      set.description,
      set.author,
      set.source_url,
      set.revision,
      set.source_fingerprint,
      set.imported_at
    );

    const blockIds = new Map<string, number>();
    set.blocks.forEach((block, ordinal) => {
      const result = insertBlock.run(
        set.source_kind,
        block.block_key,
        ordinal,
        block.title,
        block.description,
        block.note,
        block.author
      );
      const blockId = Number(result.lastInsertRowid);
      blockIds.set(block.block_key, blockId);
      block.tags.forEach((tag, tagOrdinal) => insertBlockTag.run(blockId, tagOrdinal, tag));
    });

    set.rules.forEach((rule, ordinal) => {
      const result = insertRule.run(
        set.source_kind,
        ordinal,
        rule.item_hash,
        rule.mode,
        rule.note,
        rule.author,
        rule.source_note,
        rule.source_title,
        rule.source_description,
        rule.source_label,
        rule.block_key ? blockIds.get(rule.block_key) ?? null : null
      );
      const ruleId = Number(result.lastInsertRowid);
      rule.perk_hashes.forEach((perkHash, perkOrdinal) => insertPerk.run(ruleId, perkOrdinal, perkHash));
      rule.tags.forEach((tag, tagOrdinal) => insertRuleTag.run(ruleId, tagOrdinal, tag));
    });

    const counts = database.prepare(`
      SELECT
        (SELECT COUNT(*) FROM external_recommendation_rules WHERE source_kind = ?) AS rule_count,
        (SELECT COUNT(*) FROM external_recommendation_blocks WHERE source_kind = ?) AS block_count
    `).get(set.source_kind, set.source_kind) as { rule_count: number; block_count: number };
    if (Number(counts.rule_count) !== set.rules.length || Number(counts.block_count) !== set.blocks.length) {
      throw new Error("外部推荐数据写入后的数量校验失败。");
    }
    writeRecommendationMetadata(database, migrationMetadataKey, `complete:${set.imported_at}`);
    database.exec("COMMIT;");
  } catch (error) {
    try {
      database.exec("ROLLBACK;");
    } catch {
      // 保留原始推荐数据写入错误。
    }
    throw error;
  }
}

function normalizeExternalSet(
  input: SaveExternalRecommendationSetInput
): Omit<ExternalRecommendationSetRecord, "source_fingerprint" | "imported_at"> {
  const blockKeys = new Set<string>();
  const blocks = input.blocks.map((block) => {
    const key = block.block_key.trim();
    if (!key || blockKeys.has(key)) throw new Error(`外部推荐来源块 ID 重复或为空：${key || "空值"}`);
    blockKeys.add(key);
    return {
      block_key: key,
      title: block.title.trim(),
      description: block.description.trim(),
      note: block.note.trim(),
      author: block.author.trim(),
      tags: uniqueText(block.tags)
    };
  });
  const rules = input.rules.map((rule, index) => {
    if (!isUnsignedHash(rule.item_hash)) throw new Error(`外部推荐第 ${index + 1} 条武器 ID 无效。`);
    const perkHashes = [...new Set(rule.perk_hashes.map(Number))];
    if (perkHashes.length === 0 || perkHashes.some((hash) => !isUnsignedHash(hash))) {
      throw new Error(`外部推荐第 ${index + 1} 条 Perk ID 无效。`);
    }
    if (rule.block_key && !blockKeys.has(rule.block_key)) {
      throw new Error(`外部推荐第 ${index + 1} 条引用了不存在的来源块：${rule.block_key}`);
    }
    return {
      item_hash: Number(rule.item_hash),
      perk_hashes: perkHashes,
      mode: rule.mode,
      note: rule.note.trim(),
      author: rule.author.trim(),
      source_note: rule.source_note.trim(),
      source_title: rule.source_title.trim(),
      source_description: rule.source_description.trim(),
      source_label: rule.source_label.trim(),
      ...(rule.block_key ? { block_key: rule.block_key } : {}),
      tags: uniqueText(rule.tags)
    };
  });
  if (rules.length === 0) throw new Error("外部推荐数据至少需要一条有效规则。");
  return {
    source_kind: input.source_kind,
    title: input.title.trim(),
    description: input.description.trim(),
    author: input.author.trim(),
    source_url: input.source_url.trim(),
    revision: input.revision.trim(),
    blocks,
    rules
  };
}

function uniqueText(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isUnsignedHash(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function groupTextValues(rows: Array<{ id: number; value: string }>): Map<number, string[]> {
  const grouped = new Map<number, string[]>();
  for (const row of rows) grouped.set(row.id, [...(grouped.get(row.id) ?? []), row.value]);
  return grouped;
}

function groupNumberValues(rows: Array<{ id: number; value: number }>): Map<number, number[]> {
  const grouped = new Map<number, number[]>();
  for (const row of rows) grouped.set(row.id, [...(grouped.get(row.id) ?? []), row.value]);
  return grouped;
}
