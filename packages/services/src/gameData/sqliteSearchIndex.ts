import { mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DefinitionRecord } from "@d2-tools/core/manifest/definitions";
import { toSignedHash, toUnsignedHash } from "./definitionReader.js";
import type {
  GameDataSearchIndex,
  GameDataSearchIndexBuildResult,
  GameDataSearchKind
} from "./searchIndex.js";

export type BuildSqliteSearchIndexOptions = {
  sourceDatabasePath: string;
  indexDatabasePath: string;
  manifestVersion: string;
  language: string;
};

type SourceRow = {
  id: number | bigint;
  json: Uint8Array | string;
};

type IndexedItem = {
  hash: number;
  canonicalKey: string;
  versionKey: string;
  rank: number;
};

const nonEquipmentItemTypes = new Set([0, 19, 20, 30]);
const searchIndexSchemaVersion = "3";

export function buildSqliteSearchIndex(
  options: BuildSqliteSearchIndexOptions
): GameDataSearchIndexBuildResult {
  mkdirSync(dirname(options.indexDatabasePath), { recursive: true });
  rmSync(options.indexDatabasePath, { force: true });

  const source = new DatabaseSync(options.sourceDatabasePath, {
    readOnly: true,
    timeout: 5_000
  });
  const index = new DatabaseSync(options.indexDatabasePath, { timeout: 5_000 });
  try {
    index.exec(`
      PRAGMA journal_mode = OFF;
      PRAGMA synchronous = OFF;
      PRAGMA temp_store = MEMORY;
    `);
    createSchema(index);

    const insertMetadata = index.prepare(
      "INSERT INTO metadata(key, value) VALUES (?, ?)"
    );
    insertMetadata.run("manifest_version", options.manifestVersion);
    insertMetadata.run("language", options.language.trim().toLowerCase());
    insertMetadata.run("schema_version", searchIndexSchemaVersion);

    const insertDocument = index.prepare(`
      INSERT INTO search_documents(kind, hash, canonical_key, name, search_text, rank)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertPerkPlug = index.prepare(
      "INSERT OR IGNORE INTO perk_plugs(perk_hash, plug_hash) VALUES (?, ?)"
    );
    const insertRelation = index.prepare(
      "INSERT OR IGNORE INTO perk_related_items(perk_hash, item_hash) VALUES (?, ?)"
    );
    const insertEnumDefinition = index.prepare(`
      INSERT OR REPLACE INTO definition_enums(kind, enum_value, hash)
      VALUES (?, ?, ?)
    `);
    const insertItemVersionRelation = index.prepare(`
      INSERT INTO item_version_relation(
        item_hash,
        canonical_hash,
        relation_key,
        rank
      ) VALUES (?, ?, ?, ?)
    `);

    const plugPerks = new Map<number, number[]>();
    const indexedItems: IndexedItem[] = [];
    let itemCount = 0;
    let perkCount = 0;
    let relationCount = 0;

    runTransaction(index, () => {
      for (const row of iterateTable(source, "DestinyInventoryItemDefinition")) {
        const definition = parseSourceRow(row);
        const hash = definitionHash(definition, row.id);
        const name = definition.displayProperties?.name?.trim();
        if (name && isSearchableEquipment(definition)) {
          const canonicalKey = equipmentCanonicalKey(definition, hash);
          const rank = equipmentDefinitionScore(definition);
          insertDocument.run(
            "item",
            toSignedHash(hash),
            canonicalKey,
            name,
            normalizeSearchText(name),
            rank
          );
          indexedItems.push({
            hash,
            canonicalKey,
            versionKey: equipmentVersionKey(definition, hash),
            rank
          });
          itemCount += 1;
        }

        const perkHashes = uniqueNumbers(
          (definition.perks ?? [])
            .map((perk) => perk.perkHash)
            .filter((perkHash): perkHash is number => typeof perkHash === "number")
        );
        if (perkHashes.length) {
          plugPerks.set(hash, perkHashes);
          for (const perkHash of perkHashes) {
            insertPerkPlug.run(toSignedHash(perkHash), toSignedHash(hash));
          }
        }
      }

      for (const row of iterateTable(source, "DestinySandboxPerkDefinition")) {
        const definition = parseSourceRow(row);
        const name = definition.displayProperties?.name?.trim();
        if (!name) {
          continue;
        }
        const description = definition.displayProperties?.description?.trim() ?? "";
        insertDocument.run(
          "perk",
          toSignedHash(definitionHash(definition, row.id)),
          `perk:${definitionHash(definition, row.id)}`,
          name,
          normalizeSearchText(`${name}\n${description}`),
          Number(definition.index ?? 0)
        );
        perkCount += 1;
      }

      for (const [kind, table] of [
        ["breaker", "DestinyBreakerTypeDefinition"],
        ["damage", "DestinyDamageTypeDefinition"]
      ] as const) {
        for (const row of iterateTable(source, table)) {
          const definition = parseSourceRow(row);
          const enumValue = Number(definition.enumValue);
          if (Number.isFinite(enumValue)) {
            insertEnumDefinition.run(
              kind,
              enumValue,
              toSignedHash(definitionHash(definition, row.id))
            );
          }
        }
      }
    });

    const canonicalItems = selectCanonicalItems(indexedItems);
    runTransaction(index, () => {
      for (const item of indexedItems) {
        insertItemVersionRelation.run(
          toSignedHash(item.hash),
          toSignedHash(canonicalItems.get(item.canonicalKey)?.hash ?? item.hash),
          item.versionKey,
          item.rank
        );
      }
    });

    const plugSets = loadPlugSets(source);
    runTransaction(index, () => {
      for (const row of iterateTable(source, "DestinyInventoryItemDefinition")) {
        const definition = parseSourceRow(row);
        if (!definition.displayProperties?.name?.trim() || !isSearchableEquipment(definition)) {
          continue;
        }
        const itemHash = definitionHash(definition, row.id);
        const relatedPerks = new Set<number>();
        for (const plugHash of collectItemPlugHashes(definition, plugSets)) {
          for (const perkHash of plugPerks.get(plugHash) ?? []) {
            relatedPerks.add(perkHash);
          }
        }
        for (const perkHash of relatedPerks) {
          const result = insertRelation.run(toSignedHash(perkHash), toSignedHash(itemHash));
          relationCount += Number(result.changes);
        }
      }
    });

    index.exec(`
      CREATE INDEX search_documents_kind_name_idx
        ON search_documents(kind, name);
      CREATE INDEX perk_related_items_perk_idx
        ON perk_related_items(perk_hash, item_hash);
      CREATE INDEX perk_plugs_perk_idx
        ON perk_plugs(perk_hash, plug_hash);
      CREATE INDEX item_version_relation_group_idx
        ON item_version_relation(relation_key, canonical_hash, rank);
    `);
    index.exec("PRAGMA optimize;");

    return { itemCount, perkCount, relationCount };
  } finally {
    index.close();
    source.close();
  }
}

export type SqliteSearchIndexOptions = {
  databasePath: string;
  expectedManifestVersion?: string;
  expectedLanguage?: string;
  requireCurrentSchema?: boolean;
};

export function createSqliteSearchIndex(
  options: SqliteSearchIndexOptions
): GameDataSearchIndex {
  const database = new DatabaseSync(options.databasePath, {
    readOnly: true,
    timeout: 5_000
  });
  let supportsItemVersionRelation = false;
  try {
    database.exec("PRAGMA query_only = ON;");
    const schemaVersion = assertIndexCompatibility(database, options);
    supportsItemVersionRelation = schemaVersion === searchIndexSchemaVersion;
  } catch (error) {
    database.close();
    throw error;
  }
  let closed = false;

  return {
    search(kind, terms, limit) {
      return searchHashes(database, kind, terms, limit);
    },

    getItemVersionHashes(itemHashes, limit) {
      return supportsItemVersionRelation
        ? queryItemVersionHashes(database, itemHashes, limit)
        : [...new Set([...itemHashes].map(toUnsignedHash))].slice(0, limit);
    },

    getRelatedItemHashes(perkHashes, limitPerPerk = 8) {
      return queryMappedHashes(
        database,
        "perk_related_items",
        "item_hash",
        perkHashes,
        limitPerPerk
      );
    },

    getPlugHashes(perkHashes) {
      return queryMappedHashes(database, "perk_plugs", "plug_hash", perkHashes);
    },

    getEnumHashes(kind, enumValues) {
      const statement = database.prepare(
        "SELECT hash FROM definition_enums WHERE kind = ? AND enum_value = ?"
      );
      const hashes = new Set<number>();
      for (const enumValue of new Set(enumValues)) {
        const row = statement.get(kind, enumValue) as { hash: number } | undefined;
        if (row) {
          hashes.add(toUnsignedHash(row.hash));
        }
      }
      return [...hashes];
    },

    close() {
      if (closed) {
        return;
      }
      closed = true;
      database.close();
    }
  };
}

function createSchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE search_documents (
      kind TEXT NOT NULL CHECK(kind IN ('item', 'perk')),
      hash INTEGER NOT NULL,
      canonical_key TEXT NOT NULL,
      name TEXT NOT NULL,
      search_text TEXT NOT NULL,
      rank INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(kind, hash)
    );
    CREATE TABLE perk_plugs (
      perk_hash INTEGER NOT NULL,
      plug_hash INTEGER NOT NULL,
      PRIMARY KEY(perk_hash, plug_hash)
    );
    CREATE TABLE perk_related_items (
      perk_hash INTEGER NOT NULL,
      item_hash INTEGER NOT NULL,
      PRIMARY KEY(perk_hash, item_hash)
    );
    CREATE TABLE definition_enums (
      kind TEXT NOT NULL CHECK(kind IN ('breaker', 'damage')),
      enum_value INTEGER NOT NULL,
      hash INTEGER NOT NULL,
      PRIMARY KEY(kind, enum_value)
    );
    CREATE TABLE item_version_relation (
      item_hash INTEGER PRIMARY KEY,
      canonical_hash INTEGER NOT NULL,
      relation_key TEXT NOT NULL,
      rank INTEGER NOT NULL DEFAULT 0
    );
  `);
}

function searchHashes(
  database: DatabaseSync,
  kind: GameDataSearchKind,
  terms: Iterable<string>,
  requestedLimit: number
): number[] {
  const normalizedTerms = [...new Set(
    [...terms].map(normalizeSearchText).filter(Boolean)
  )].slice(0, 16);
  if (!normalizedTerms.length) {
    return [];
  }

  const conditions = normalizedTerms.map(() => "instr(search_text, ?) > 0").join(" OR ");
  const limit = Math.max(1, Math.min(Math.trunc(requestedLimit), 500));
  const primaryTerm = normalizedTerms[0];
  const rows = database.prepare(`
    SELECT hash
    FROM (
      SELECT
        hash,
        name,
        rank,
        canonical_key,
        row_number() OVER (
          PARTITION BY canonical_key
          ORDER BY rank DESC, hash ASC
        ) AS canonical_rank
      FROM search_documents
      WHERE kind = ? AND (${conditions})
    )
    WHERE canonical_rank = 1
    ORDER BY
      CASE
        WHEN lower(name) = ? THEN 0
        WHEN instr(lower(name), ?) = 1 THEN 1
        ELSE 2
      END,
      rank DESC,
      length(name) ASC,
      hash ASC
    LIMIT ?
  `).all(kind, ...normalizedTerms, primaryTerm, primaryTerm, limit) as Array<{ hash: number }>;

  return rows.map((row) => toUnsignedHash(row.hash));
}

function equipmentCanonicalKey(definition: DefinitionRecord, hash: number): string {
  const name = normalizeSearchText(definition.displayProperties?.name ?? "");
  const icon = definition.displayProperties?.icon?.trim() ?? "";
  if (!name || !icon) {
    return `hash:${hash}`;
  }
  const releaseTraits = (definition.traitIds ?? [])
    .filter((traitId) => traitId.startsWith("releases."))
    .sort()
    .join(",");
  return [
    name,
    icon,
    definition.itemType ?? "",
    definition.classType ?? "",
    definition.inventory?.bucketTypeHash ?? "",
    releaseTraits
  ].join("|");
}

function equipmentVersionKey(definition: DefinitionRecord, hash: number): string {
  const name = normalizeSearchText(definition.displayProperties?.name ?? "");
  if (!name) {
    return `hash:${hash}`;
  }
  return [
    name,
    definition.itemType ?? "",
    definition.classType ?? "",
    definition.inventory?.bucketTypeHash ?? ""
  ].join("|");
}

function selectCanonicalItems(items: IndexedItem[]): Map<string, IndexedItem> {
  const selected = new Map<string, IndexedItem>();
  for (const item of items) {
    const current = selected.get(item.canonicalKey);
    if (
      !current
      || item.rank > current.rank
      || (item.rank === current.rank && toSignedHash(item.hash) < toSignedHash(current.hash))
    ) {
      selected.set(item.canonicalKey, item);
    }
  }
  return selected;
}

function queryItemVersionHashes(
  database: DatabaseSync,
  itemHashes: Iterable<number>,
  requestedLimit: number
): number[] {
  const limit = Math.max(1, Math.min(Math.trunc(requestedLimit), 500));
  const statement = database.prepare(`
    SELECT related.canonical_hash AS hash
    FROM item_version_relation AS source
    JOIN item_version_relation AS related
      ON related.relation_key = source.relation_key
    WHERE source.item_hash = ?
      AND related.item_hash = related.canonical_hash
    ORDER BY related.rank DESC, related.canonical_hash ASC
    LIMIT ?
  `);
  const results = new Set<number>();
  for (const hash of new Set([...itemHashes].map(toUnsignedHash))) {
    const remaining = limit - results.size;
    if (remaining <= 0) break;
    const rows = statement.all(toSignedHash(hash), remaining) as Array<{ hash: number }>;
    if (!rows.length) {
      results.add(hash);
      continue;
    }
    for (const row of rows) {
      results.add(toUnsignedHash(row.hash));
      if (results.size >= limit) break;
    }
  }
  return [...results];
}

function queryMappedHashes(
  database: DatabaseSync,
  table: "perk_related_items" | "perk_plugs",
  resultColumn: "item_hash" | "plug_hash",
  perkHashes: Iterable<number>,
  limitPerPerk?: number
): number[] {
  const result = new Set<number>();
  const statement = database.prepare(`
    SELECT ${resultColumn} AS hash
    FROM ${table}
    WHERE perk_hash = ?
    ORDER BY ${resultColumn}
    ${limitPerPerk ? "LIMIT ?" : ""}
  `);
  for (const perkHash of new Set([...perkHashes].map(toUnsignedHash))) {
    const rows = (limitPerPerk
      ? statement.all(toSignedHash(perkHash), limitPerPerk)
      : statement.all(toSignedHash(perkHash))) as Array<{ hash: number }>;
    for (const row of rows) {
      result.add(toUnsignedHash(row.hash));
    }
  }
  return [...result];
}

function assertIndexCompatibility(
  database: DatabaseSync,
  options: SqliteSearchIndexOptions
): string {
  const metadata = Object.fromEntries(
    (database.prepare("SELECT key, value FROM metadata").all() as Array<{ key: string; value: string }>)
      .map((row) => [row.key, row.value])
  );
  if (!new Set(["2", searchIndexSchemaVersion]).has(metadata.schema_version)) {
    throw new Error("Search index schema version is not supported");
  }
  if (options.requireCurrentSchema && metadata.schema_version !== searchIndexSchemaVersion) {
    throw new Error("Search index schema version is not current");
  }
  if (options.expectedManifestVersion && metadata.manifest_version !== options.expectedManifestVersion) {
    throw new Error("Search index Manifest version does not match the active database");
  }
  if (
    options.expectedLanguage
    && metadata.language !== options.expectedLanguage.trim().toLowerCase()
  ) {
    throw new Error("Search index language does not match the active database");
  }
  return metadata.schema_version;
}

function loadPlugSets(database: DatabaseSync): Map<number, number[]> {
  const plugSets = new Map<number, number[]>();
  for (const row of iterateTable(database, "DestinyPlugSetDefinition")) {
    const definition = parseSourceRow(row);
    plugSets.set(
      definitionHash(definition, row.id),
      uniqueNumbers(
        (definition.reusablePlugItems ?? [])
          .map((item) => item.plugItemHash)
          .filter((hash): hash is number => typeof hash === "number")
      )
    );
  }
  return plugSets;
}

function collectItemPlugHashes(
  definition: DefinitionRecord,
  plugSets: Map<number, number[]>
): number[] {
  return uniqueNumbers((definition.sockets?.socketEntries ?? []).flatMap((entry) => [
    ...(typeof entry.singleInitialItemHash === "number" ? [entry.singleInitialItemHash] : []),
    ...(entry.reusablePlugItems ?? [])
      .map((item) => item.plugItemHash)
      .filter((hash): hash is number => typeof hash === "number"),
    ...(typeof entry.reusablePlugSetHash === "number"
      ? plugSets.get(toUnsignedHash(entry.reusablePlugSetHash)) ?? []
      : []),
    ...(typeof entry.randomizedPlugSetHash === "number"
      ? plugSets.get(toUnsignedHash(entry.randomizedPlugSetHash)) ?? []
      : [])
  ]));
}

function iterateTable(database: DatabaseSync, table: string): Iterable<SourceRow> {
  const exists = database.prepare(
    "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ?"
  ).get(table) as { found: number } | undefined;
  if (!exists) {
    return [];
  }
  return database.prepare(`SELECT id, json FROM "${table}"`).iterate() as Iterable<SourceRow>;
}

function parseSourceRow(row: SourceRow): DefinitionRecord {
  const json = typeof row.json === "string"
    ? row.json
    : Buffer.from(row.json).toString("utf8");
  return JSON.parse(json) as DefinitionRecord;
}

function definitionHash(definition: DefinitionRecord, rowId: number | bigint): number {
  const hash = Number(definition.hash);
  return Number.isFinite(hash) ? toUnsignedHash(hash) : toUnsignedHash(Number(rowId));
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isSearchableEquipment(definition: DefinitionRecord): boolean {
  return typeof definition.itemType !== "number" || !nonEquipmentItemTypes.has(definition.itemType);
}

function equipmentDefinitionScore(definition: DefinitionRecord): number {
  return (definition.collectibleHash ? 1_000_000 : 0)
    + (definition.sourceData?.sourceString?.trim() ? 100_000 : 0)
    + Number(definition.index ?? 0);
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values.map(toUnsignedHash))];
}

function runTransaction(database: DatabaseSync, operation: () => void): void {
  database.exec("BEGIN IMMEDIATE;");
  try {
    operation();
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}
