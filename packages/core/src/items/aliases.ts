export type ItemAliasKind = "item" | "perk";
export type ItemAliasEntry = { alias: string; target: string; kind: ItemAliasKind };
export type ItemAliases = { entries: ItemAliasEntry[] };
export function expandAliasQuery(query: string, aliases: ItemAliases): string[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  const targets = aliases.entries.filter((entry) => entry.alias.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase()).map((entry) => entry.target);
  return [...new Set([normalizedQuery, ...targets])];
}
