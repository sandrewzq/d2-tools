import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type ItemAliasKind = "item" | "perk";

export type ItemAliasEntry = {
  alias: string;
  target: string;
  kind: ItemAliasKind;
};

export type ItemAliases = {
  entries: ItemAliasEntry[];
};

const aliasesFileName = "item-aliases.json";

export function loadItemAliases(dataDir: string): ItemAliases {
  const path = aliasesPath(dataDir);
  if (!existsSync(path)) {
    return { entries: [] };
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<ItemAliases>;
  return {
    entries: (parsed.entries ?? []).filter(isValidAlias)
  };
}

export function saveItemAlias(dataDir: string, entry: ItemAliasEntry): ItemAliases {
  const alias = entry.alias.trim();
  const target = entry.target.trim();
  if (!alias || !target) {
    throw new Error("alias and target are required");
  }

  const aliases = loadItemAliases(dataDir);
  const next: ItemAliases = {
    entries: [
      { alias, target, kind: entry.kind },
      ...aliases.entries.filter((item) => item.alias.toLocaleLowerCase() !== alias.toLocaleLowerCase())
    ].slice(0, 200)
  };
  writeAliases(dataDir, next);
  return next;
}

export function expandAliasQuery(query: string, aliases: ItemAliases): string[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const targets = aliases.entries
    .filter((entry) => entry.alias.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase())
    .map((entry) => entry.target);

  return [...new Set([normalizedQuery, ...targets])];
}

function writeAliases(dataDir: string, aliases: ItemAliases): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(aliasesPath(dataDir), `${JSON.stringify(aliases, null, 2)}\n`, "utf8");
}

function aliasesPath(dataDir: string): string {
  return join(dataDir, aliasesFileName);
}

function isValidAlias(entry: Partial<ItemAliasEntry>): entry is ItemAliasEntry {
  return typeof entry.alias === "string"
    && typeof entry.target === "string"
    && (entry.kind === "item" || entry.kind === "perk");
}
