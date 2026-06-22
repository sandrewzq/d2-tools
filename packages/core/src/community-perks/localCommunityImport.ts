export type LocalCommunityMode = "pve" | "pvp" | "general";

export type LocalCommunityRecommendationRule = {
  item_hash: number;
  perk_hashes: number[];
  mode: LocalCommunityMode;
  note: string;
  source_label?: string;
};

export type LocalCommunityRecommendationTable = {
  title: string;
  rules: LocalCommunityRecommendationRule[];
};

export function parseLocalCommunityRecommendations(text: string): LocalCommunityRecommendationTable {
  const trimmed = text.trim();
  if (!trimmed) {
    return { title: "本地社区表", rules: [] };
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return normalizeLocalCommunityRecommendationTable(JSON.parse(trimmed) as unknown);
  }

  return parseCsvTable(text);
}

export function normalizeLocalCommunityRecommendationTable(value: unknown): LocalCommunityRecommendationTable {
  const source = Array.isArray(value)
    ? { title: "本地社区表", rules: value }
    : (value && typeof value === "object" ? value as Record<string, unknown> : {});
  const title = typeof source.title === "string" && source.title.trim()
    ? source.title.trim()
    : "本地社区表";
  const rawRules = Array.isArray(source.rules) ? source.rules : [];

  return {
    title,
    rules: rawRules
      .map(normalizeRule)
      .filter((rule): rule is LocalCommunityRecommendationRule => Boolean(rule))
  };
}

function normalizeRule(value: unknown): LocalCommunityRecommendationRule | null {
  if (!value || typeof value !== "object") return null;
  const rule = value as Record<string, unknown>;
  const item_hash = Number(rule.item_hash ?? rule.itemHash);
  const perk_hashes = parsePerkHashes(rule.perk_hashes ?? rule.perkHashes ?? rule.perks);
  if (!Number.isFinite(item_hash) || perk_hashes.length === 0) return null;

  return {
    item_hash,
    perk_hashes,
    mode: normalizeMode(rule.mode),
    note: typeof rule.note === "string" ? rule.note.trim() : "",
    source_label: typeof rule.source_label === "string" && rule.source_label.trim()
      ? rule.source_label.trim()
      : undefined
  };
}

function parseCsvTable(text: string): LocalCommunityRecommendationTable {
  let title = "本地社区表";
  let headers: string[] | null = null;
  const rules: LocalCommunityRecommendationRule[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    if (line.toLowerCase().startsWith("title:")) {
      title = line.slice("title:".length).trim() || title;
      continue;
    }

    const values = splitCsvLine(line);
    if (!headers) {
      headers = values.map((value) => value.trim().toLowerCase());
      continue;
    }

    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    const rule = normalizeRule({
      item_hash: row.item_hash,
      perk_hashes: row.perk_hashes,
      mode: row.mode,
      note: row.note,
      source_label: row.source_label
    });
    if (rule) rules.push(rule);
  }

  return { title, rules };
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index++;
      continue;
    }
    if (char === "\"") {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function parsePerkHashes(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter(Number.isFinite);
  }
  if (typeof value === "string") {
    return value.split(/[|;,+\s]+/).map(Number).filter(Number.isFinite);
  }
  return [];
}

function normalizeMode(value: unknown): LocalCommunityMode {
  const normalized = String(value ?? "general").toLowerCase().trim();
  if (normalized === "pve") return "pve";
  if (normalized === "pvp") return "pvp";
  return "general";
}
