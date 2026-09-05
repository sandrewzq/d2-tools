import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databaseFileName = "weapon-recommendations.sqlite";
export const recommendationDatabaseSchemaVersion = 5;
export const recommendationSemanticValidationVersion = 1;

export function openRecommendationDatabase(dataDir: string): DatabaseSync {
  mkdirSync(join(dataDir, "knowledge"), { recursive: true });
  const database = new DatabaseSync(recommendationDatabasePath(dataDir), { timeout: 5_000 });
  try {
    database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");
    ensureRecommendationSchema(database);
    return database;
  } catch (error) {
    try {
      database.close();
    } catch {
      // 保留原始数据库错误。
    }
    throw error;
  }
}

export function recommendationDatabasePath(dataDir: string): string {
  return join(dataDir, "knowledge", databaseFileName);
}

export function recommendationMetadataValue(database: DatabaseSync, key: string): string {
  const row = database.prepare("SELECT value FROM knowledge_metadata WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

export function writeRecommendationMetadata(database: DatabaseSync, key: string, value: string): void {
  database.prepare(`
    INSERT INTO knowledge_metadata (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function ensureRecommendationSchema(database: DatabaseSync): void {
  const versionRow = database.prepare("PRAGMA user_version").get() as { user_version?: number | bigint } | undefined;
  const currentVersion = Number(versionRow?.user_version ?? 0);
  const hasTables = hasRecommendationTables(database);
  const shouldRebuildAll = hasTables && currentVersion < 2;
  const shouldRebuildCurated = hasTables
    && currentVersion >= 2
    && currentVersion < 4;

  database.exec("BEGIN IMMEDIATE;");
  try {
    if (shouldRebuildAll) dropRecommendationTables(database);
    else if (shouldRebuildCurated) dropCuratedRecommendationTables(database);
    migrateCuratedRecommendationRules(database);
    migrateExternalRecommendationRules(database);
    database.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS recommendation_sources (
        id INTEGER PRIMARY KEY,
        source_key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        source_url TEXT NOT NULL DEFAULT ''
      ) STRICT;

      CREATE TABLE IF NOT EXISTS weapon_recommendations (
        id INTEGER PRIMARY KEY,
        rule_stable_id TEXT NOT NULL,
        identity_key TEXT NOT NULL,
        normalized_weapon_name TEXT NOT NULL,
        weapon_name TEXT NOT NULL,
        normalized_english_name TEXT NOT NULL DEFAULT '',
        english_name TEXT NOT NULL DEFAULT '',
        source_id INTEGER NOT NULL REFERENCES recommendation_sources(id) ON DELETE CASCADE,
        page TEXT NOT NULL DEFAULT '',
        rating TEXT NOT NULL DEFAULT '',
        ranking TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL DEFAULT '',
        page_updated_at TEXT NOT NULL DEFAULT '',
        version TEXT NOT NULL DEFAULT '',
        source_location TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT '',
        icon_url TEXT NOT NULL DEFAULT '',
        stats TEXT NOT NULL DEFAULT '',
        frame TEXT NOT NULL DEFAULT '',
        season TEXT NOT NULL DEFAULT '',
        acquisition_source TEXT NOT NULL DEFAULT '',
        champion TEXT NOT NULL DEFAULT '',
        champion_icon_url TEXT NOT NULL DEFAULT '',
        ammo_generation TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        shield TEXT NOT NULL DEFAULT '',
        charge_efficiency TEXT NOT NULL DEFAULT '',
        UNIQUE (source_id, rule_stable_id),
        UNIQUE (identity_key, source_id)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS weapon_recommendation_item_ids (
        recommendation_id INTEGER NOT NULL REFERENCES weapon_recommendations(id) ON DELETE CASCADE,
        item_hash INTEGER NOT NULL,
        PRIMARY KEY (recommendation_id, item_hash)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS weapon_recommendation_purposes (
        recommendation_id INTEGER NOT NULL REFERENCES weapon_recommendations(id) ON DELETE CASCADE,
        purpose TEXT NOT NULL CHECK (purpose IN ('pve', 'pvp', 'general')),
        PRIMARY KEY (recommendation_id, purpose)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS weapon_recommendation_perks (
        recommendation_id INTEGER NOT NULL REFERENCES weapon_recommendations(id) ON DELETE CASCADE,
        slot TEXT NOT NULL CHECK (slot IN ('barrel', 'magazine', 'masterwork', 'perk1', 'perk2', 'origin')),
        ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
        perk_name TEXT NOT NULL,
        normalized_perk_name TEXT NOT NULL,
        PRIMARY KEY (recommendation_id, slot, normalized_perk_name)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS external_recommendation_sets (
        source_kind TEXT PRIMARY KEY CHECK (source_kind IN ('dim_wishlist', 'local_community')),
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL DEFAULT '',
        revision TEXT NOT NULL DEFAULT '',
        source_fingerprint TEXT NOT NULL,
        imported_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS external_recommendation_blocks (
        id INTEGER PRIMARY KEY,
        source_kind TEXT NOT NULL REFERENCES external_recommendation_sets(source_kind) ON DELETE CASCADE,
        block_key TEXT NOT NULL,
        ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        UNIQUE (source_kind, block_key),
        UNIQUE (source_kind, ordinal)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS external_recommendation_block_tags (
        block_id INTEGER NOT NULL REFERENCES external_recommendation_blocks(id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
        tag TEXT NOT NULL,
        PRIMARY KEY (block_id, tag)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS external_recommendation_rules (
        id INTEGER PRIMARY KEY,
        source_kind TEXT NOT NULL REFERENCES external_recommendation_sets(source_kind) ON DELETE CASCADE,
        rule_stable_id TEXT NOT NULL,
        ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
        item_hash INTEGER NOT NULL CHECK (item_hash >= 0 AND item_hash <= 4294967295),
        mode TEXT NOT NULL CHECK (mode IN ('pve', 'pvp', 'general')),
        note TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        source_note TEXT NOT NULL DEFAULT '',
        source_title TEXT NOT NULL DEFAULT '',
        source_description TEXT NOT NULL DEFAULT '',
        source_label TEXT NOT NULL DEFAULT '',
        block_id INTEGER REFERENCES external_recommendation_blocks(id) ON DELETE SET NULL,
        UNIQUE (source_kind, rule_stable_id),
        UNIQUE (source_kind, ordinal),
        CHECK (block_id IS NULL OR block_id > 0)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS external_recommendation_rule_perks (
        rule_id INTEGER NOT NULL REFERENCES external_recommendation_rules(id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
        perk_hash INTEGER NOT NULL CHECK (perk_hash >= 0 AND perk_hash <= 4294967295),
        PRIMARY KEY (rule_id, ordinal),
        UNIQUE (rule_id, perk_hash)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS external_recommendation_rule_tags (
        rule_id INTEGER NOT NULL REFERENCES external_recommendation_rules(id) ON DELETE CASCADE,
        ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
        tag TEXT NOT NULL,
        PRIMARY KEY (rule_id, tag)
      ) STRICT;

      CREATE TABLE IF NOT EXISTS recommendation_source_overrides (
        source_key TEXT PRIMARY KEY,
        state TEXT NOT NULL CHECK (state IN ('active', 'disabled', 'removed')),
        updated_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE IF NOT EXISTS recommendation_rule_overrides (
        source_key TEXT NOT NULL,
        rule_stable_id TEXT NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('active', 'removed')),
        reason TEXT NOT NULL DEFAULT '',
        source_revision TEXT NOT NULL DEFAULT '',
        review_required INTEGER NOT NULL DEFAULT 0 CHECK (review_required IN (0, 1)),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (source_key, rule_stable_id)
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_weapon_recommendations_name
        ON weapon_recommendations(normalized_weapon_name);
      CREATE INDEX IF NOT EXISTS idx_weapon_recommendations_english_name
        ON weapon_recommendations(normalized_english_name);
      CREATE INDEX IF NOT EXISTS idx_weapon_recommendations_source
        ON weapon_recommendations(source_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_weapon_recommendations_stable_id
        ON weapon_recommendations(source_id, rule_stable_id);
      CREATE INDEX IF NOT EXISTS idx_weapon_recommendation_item_ids_hash
        ON weapon_recommendation_item_ids(item_hash);
      CREATE INDEX IF NOT EXISTS idx_weapon_recommendation_purposes_purpose
        ON weapon_recommendation_purposes(purpose, recommendation_id);
      CREATE INDEX IF NOT EXISTS idx_weapon_recommendation_perks_lookup
        ON weapon_recommendation_perks(recommendation_id, slot, normalized_perk_name);
      CREATE INDEX IF NOT EXISTS idx_external_recommendation_rules_item
        ON external_recommendation_rules(source_kind, item_hash);
      CREATE INDEX IF NOT EXISTS idx_external_recommendation_rules_stable_id
        ON external_recommendation_rules(source_kind, rule_stable_id);
      CREATE INDEX IF NOT EXISTS idx_external_recommendation_rules_block
        ON external_recommendation_rules(block_id);
      CREATE INDEX IF NOT EXISTS idx_external_recommendation_perks_hash
        ON external_recommendation_rule_perks(perk_hash, rule_id);
      CREATE INDEX IF NOT EXISTS idx_recommendation_rule_overrides_state
        ON recommendation_rule_overrides(source_key, state, review_required);
    `);
    database.exec(`PRAGMA user_version = ${recommendationDatabaseSchemaVersion};`);
    database.exec("COMMIT;");
  } catch (error) {
    try {
      database.exec("ROLLBACK;");
    } catch {
      // 保留原始 schema 错误。
    }
    throw error;
  }
}

function migrateCuratedRecommendationRules(database: DatabaseSync): void {
  if (!tableExists(database, "weapon_recommendations")) return;
  if (columnExists(database, "weapon_recommendations", "rule_stable_id")) return;
  database.exec(`
    ALTER TABLE weapon_recommendations
      ADD COLUMN rule_stable_id TEXT NOT NULL DEFAULT '';
    UPDATE weapon_recommendations
    SET rule_stable_id = identity_key || ':' || source_id || ':' || id;
  `);
}

function migrateExternalRecommendationRules(database: DatabaseSync): void {
  if (!tableExists(database, "external_recommendation_rules")) return;
  if (columnExists(database, "external_recommendation_rules", "rule_stable_id")) return;
  database.exec(`
    ALTER TABLE external_recommendation_rules
      ADD COLUMN rule_stable_id TEXT NOT NULL DEFAULT '';
    UPDATE external_recommendation_rules
    SET rule_stable_id = source_kind || ':' || item_hash || ':' || mode || ':' || id;
  `);
}

function tableExists(database: DatabaseSync, tableName: string): boolean {
  const row = database.prepare(`
    SELECT 1 AS present
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName) as { present?: number } | undefined;
  return row?.present === 1;
}

function columnExists(database: DatabaseSync, tableName: string, columnName: string): boolean {
  const rows = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name?: string }>;
  return rows.some((row) => row.name === columnName);
}

function hasRecommendationTables(database: DatabaseSync): boolean {
  const row = database.prepare(`
    SELECT COUNT(*) AS table_count
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN (
        'knowledge_metadata',
        'recommendation_sources',
        'weapon_recommendations',
        'external_recommendation_sets'
      )
  `).get() as { table_count?: number | bigint } | undefined;
  return Number(row?.table_count ?? 0) > 0;
}

function dropRecommendationTables(database: DatabaseSync): void {
  database.exec(`
    DROP TABLE IF EXISTS external_recommendation_rule_tags;
    DROP TABLE IF EXISTS external_recommendation_rule_perks;
    DROP TABLE IF EXISTS external_recommendation_rules;
    DROP TABLE IF EXISTS external_recommendation_block_tags;
    DROP TABLE IF EXISTS external_recommendation_blocks;
    DROP TABLE IF EXISTS external_recommendation_sets;
    DROP TABLE IF EXISTS recommendation_rule_overrides;
    DROP TABLE IF EXISTS recommendation_source_overrides;
    DROP TABLE IF EXISTS weapon_recommendation_perks;
    DROP TABLE IF EXISTS weapon_recommendation_purposes;
    DROP TABLE IF EXISTS weapon_recommendation_item_ids;
    DROP TABLE IF EXISTS weapon_recommendations;
    DROP TABLE IF EXISTS recommendation_sources;
    DROP TABLE IF EXISTS knowledge_metadata;
  `);
}

function dropCuratedRecommendationTables(database: DatabaseSync): void {
  database.exec(`
    DROP TABLE IF EXISTS weapon_recommendation_perks;
    DROP TABLE IF EXISTS weapon_recommendation_purposes;
    DROP TABLE IF EXISTS weapon_recommendation_item_ids;
    DROP TABLE IF EXISTS weapon_recommendations;
    DROP TABLE IF EXISTS recommendation_sources;
    DELETE FROM knowledge_metadata
      WHERE key IN (
        'schema_version',
        'source_fingerprint',
        'imported_at',
        'semantic_validation_version',
        'validated_manifest_version',
        'dataset_revision'
      );
  `);
}
