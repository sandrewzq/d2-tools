import { existsSync } from "node:fs";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import type {
  DefinitionComponentData,
  DefinitionComponentName,
  DefinitionRecord
} from "@d2-tools/core/manifest/definitions";
import type { DefinitionReader } from "./definitionReader.js";
import { toSignedHash, toUnsignedHash } from "./definitionReader.js";

export type SqliteDefinitionReaderOptions = {
  databasePath: string;
  batchSize?: number;
  cacheSize?: number;
  readonly?: boolean;
};

type DefinitionRow = {
  id: number | bigint;
  json: Uint8Array | string;
};

export function createSqliteDefinitionReader(
  options: SqliteDefinitionReaderOptions
): DefinitionReader {
  if (!existsSync(options.databasePath)) {
    throw new Error(`SQLite Manifest does not exist: ${options.databasePath}`);
  }

  const database = new DatabaseSync(options.databasePath, {
    readOnly: options.readonly ?? true,
    timeout: 5_000
  });
  let tableNames: Set<string>;
  try {
    database.exec("PRAGMA query_only = ON; PRAGMA temp_store = MEMORY;");
    tableNames = new Set(
      (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>)
        .map((row) => row.name)
    );
  } catch (error) {
    database.close();
    throw error;
  }
  const statements = new Map<DefinitionComponentName, StatementSync>();
  const batchStatements = new Map<string, StatementSync>();
  const batchSize = Math.min(900, Math.max(1, options.batchSize ?? 512));
  const cache = new DefinitionLruCache(options.cacheSize ?? 2_000);
  let closed = false;

  const statementFor = (component: DefinitionComponentName) => {
    if (!tableNames.has(component)) {
      return null;
    }
    let statement = statements.get(component);
    if (!statement) {
      statement = database.prepare(
        `SELECT id, json FROM ${quoteIdentifier(component)} WHERE id = ? LIMIT 1`
      );
      statements.set(component, statement);
    }
    return statement;
  };

  const get = (component: DefinitionComponentName, hash: number): DefinitionRecord | null => {
    const unsignedHash = toUnsignedHash(hash);
    const cacheKey = `${component}:${unsignedHash}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const statement = statementFor(component);
    if (!statement) {
      cache.set(cacheKey, null);
      return null;
    }

    const row = statement.get(toSignedHash(unsignedHash)) as DefinitionRow | undefined;
    const definition = row ? parseDefinitionRow(row, unsignedHash) : null;
    cache.set(cacheKey, definition);
    return definition;
  };

  const getMany = (
    component: DefinitionComponentName,
    hashes: Iterable<number>
  ): DefinitionComponentData => {
    const requested = [...new Set([...hashes].map(toUnsignedHash))];
    const definitions: DefinitionComponentData = {};
    const missing: number[] = [];
    for (const hash of requested) {
      const cacheKey = `${component}:${hash}`;
      const cached = cache.get(cacheKey);
      if (cached === undefined) {
        missing.push(hash);
      } else if (cached) {
        definitions[String(hash)] = cached;
      }
    }

    if (!missing.length) return definitions;
    if (!tableNames.has(component)) {
      for (const hash of missing) cache.set(`${component}:${hash}`, null);
      return definitions;
    }

    for (let offset = 0; offset < missing.length; offset += batchSize) {
      const chunk = missing.slice(offset, offset + batchSize);
      const statementKey = `${component}:${chunk.length}`;
      let statement = batchStatements.get(statementKey);
      if (!statement) {
        statement = database.prepare(
          `SELECT id, json FROM ${quoteIdentifier(component)} WHERE id IN (${chunk.map(() => "?").join(",")})`
        );
        batchStatements.set(statementKey, statement);
      }
      const rows = statement.all(...chunk.map(toSignedHash)) as DefinitionRow[];
      const found = new Map<number, DefinitionRecord>();
      for (const row of rows) {
        const hash = toUnsignedHash(Number(row.id));
        found.set(hash, parseDefinitionRow(row, hash));
      }
      for (const hash of chunk) {
        const definition = found.get(hash) ?? null;
        cache.set(`${component}:${hash}`, definition);
        if (definition) definitions[String(hash)] = definition;
      }
    }
    return definitions;
  };

  return {
    hasComponent(component) {
      return tableNames.has(component);
    },

    get,

    getMany,

    close() {
      if (closed) {
        return;
      }
      closed = true;
      cache.clear();
      statements.clear();
      batchStatements.clear();
      database.close();
    }
  };
}

function parseDefinitionRow(row: DefinitionRow, fallbackHash: number): DefinitionRecord {
  const json = typeof row.json === "string"
    ? row.json
    : Buffer.from(row.json).toString("utf8");
  const definition = JSON.parse(json) as DefinitionRecord;
  if (!Number.isFinite(Number(definition.hash))) {
    definition.hash = toUnsignedHash(Number(row.id ?? fallbackHash));
  } else {
    definition.hash = toUnsignedHash(Number(definition.hash));
  }
  return definition;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

class DefinitionLruCache {
  private readonly entries = new Map<string, DefinitionRecord | null>();

  constructor(private readonly maxEntries: number) {}

  get(key: string): DefinitionRecord | null | undefined {
    const value = this.entries.get(key);
    if (value === undefined && !this.entries.has(key)) {
      return undefined;
    }
    this.entries.delete(key);
    this.entries.set(key, value ?? null);
    return value ?? null;
  }

  set(key: string, value: DefinitionRecord | null): void {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) {
        break;
      }
      this.entries.delete(oldest);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
