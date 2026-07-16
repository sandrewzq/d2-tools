import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type PersonalWeaponKnowledgeMode = "pve" | "pvp" | "general";

export type PersonalWeaponKnowledgeEntry = {
  id: string;
  weapon_name: string;
  weapon_hash?: number;
  mode: PersonalWeaponKnowledgeMode;
  title: string;
  perk_options: Array<{ column_key: string; names: string[] }>;
  masterwork_names: string[];
  mod_names: string[];
  reason: string;
  enabled: boolean;
  origin: "user" | "confirmed_external";
  external_url?: string;
  created_at: string;
  updated_at: string;
};

export type PersonalWeaponKnowledgeTable = {
  version: 1;
  entries: PersonalWeaponKnowledgeEntry[];
};

export type SavePersonalWeaponKnowledgeInput = {
  confirmed: true;
  entry: Omit<PersonalWeaponKnowledgeEntry, "id" | "created_at" | "updated_at"> & {
    id?: string;
  };
};

const fileName = "personal-weapon-knowledge.json";

export function loadPersonalWeaponKnowledge(
  dataDir: string,
  weaponName?: string
): PersonalWeaponKnowledgeTable {
  const table = readTable(dataDir);
  const normalizedName = normalizeName(weaponName);
  return normalizedName
    ? { ...table, entries: table.entries.filter((entry) => normalizeName(entry.weapon_name) === normalizedName) }
    : table;
}

export function savePersonalWeaponKnowledge(
  dataDir: string,
  input: SavePersonalWeaponKnowledgeInput
): PersonalWeaponKnowledgeTable {
  if (input.confirmed !== true) {
    throw new Error("保存到我的推荐前必须由用户明确确认。");
  }
  if (input.entry.origin === "confirmed_external" && !normalizeExternalUrl(input.entry.external_url)) {
    throw new Error("保存外部知识时必须提供有效的 HTTP(S) 原始链接。");
  }

  const now = new Date().toISOString();
  const table = readTable(dataDir);
  const existing = input.entry.id
    ? table.entries.find((entry) => entry.id === input.entry.id)
    : undefined;
  const nextEntry = normalizeEntry({
    ...input.entry,
    id: input.entry.id ?? createEntryId(input.entry.weapon_name, input.entry.mode, now),
    created_at: existing?.created_at ?? now,
    updated_at: now
  });
  if (!nextEntry) {
    throw new Error("我的推荐缺少武器名称、标题或有效推荐内容。");
  }

  const entries = existing
    ? table.entries.map((entry) => entry.id === existing.id ? nextEntry : entry)
    : [nextEntry, ...table.entries];
  return writeTable(dataDir, { version: 1, entries });
}

export function setPersonalWeaponKnowledgeEnabled(
  dataDir: string,
  id: string,
  enabled: boolean
): PersonalWeaponKnowledgeTable {
  const table = readTable(dataDir);
  if (!table.entries.some((entry) => entry.id === id)) {
    throw new Error("没有找到要更新的个人推荐。");
  }
  return writeTable(dataDir, {
    version: 1,
    entries: table.entries.map((entry) => entry.id === id
      ? { ...entry, enabled, updated_at: new Date().toISOString() }
      : entry)
  });
}

export function deletePersonalWeaponKnowledge(dataDir: string, id: string): PersonalWeaponKnowledgeTable {
  const table = readTable(dataDir);
  return writeTable(dataDir, {
    version: 1,
    entries: table.entries.filter((entry) => entry.id !== id)
  });
}

export function clearPersonalWeaponKnowledge(dataDir: string): void {
  rmSync(tablePath(dataDir), { force: true });
}

function readTable(dataDir: string): PersonalWeaponKnowledgeTable {
  const file = tablePath(dataDir);
  if (!existsSync(file)) return { version: 1, entries: [] };
  const value = JSON.parse(readFileSync(file, "utf8")) as { entries?: unknown[] };
  return {
    version: 1,
    entries: (value.entries ?? []).map(normalizeEntry).filter((entry): entry is PersonalWeaponKnowledgeEntry => Boolean(entry))
  };
}

function writeTable(dataDir: string, table: PersonalWeaponKnowledgeTable): PersonalWeaponKnowledgeTable {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(tablePath(dataDir), `${JSON.stringify(table, null, 2)}\n`, "utf8");
  return table;
}

function normalizeEntry(value: unknown): PersonalWeaponKnowledgeEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  const weaponName = typeof entry.weapon_name === "string" ? entry.weapon_name.trim() : "";
  const title = typeof entry.title === "string" ? entry.title.trim() : "";
  const reason = typeof entry.reason === "string" ? entry.reason.trim() : "";
  const perkOptions = Array.isArray(entry.perk_options)
    ? entry.perk_options.flatMap((option) => {
      if (!option || typeof option !== "object") return [];
      const record = option as Record<string, unknown>;
      const names = stringArray(record.names);
      if (!names.length) return [];
      return [{ column_key: String(record.column_key ?? "Perk"), names }];
    })
    : [];
  const masterworkNames = stringArray(entry.masterwork_names);
  const modNames = stringArray(entry.mod_names);
  if (!weaponName || !title || (!perkOptions.length && !masterworkNames.length && !modNames.length && !reason)) return null;

  return {
    id: String(entry.id ?? "").trim(),
    weapon_name: weaponName,
    weapon_hash: Number.isFinite(Number(entry.weapon_hash)) ? Number(entry.weapon_hash) : undefined,
    mode: normalizeMode(entry.mode),
    title,
    perk_options: perkOptions,
    masterwork_names: masterworkNames,
    mod_names: modNames,
    reason,
    enabled: entry.enabled !== false,
    origin: entry.origin === "confirmed_external" ? "confirmed_external" : "user",
    external_url: normalizeExternalUrl(entry.external_url),
    created_at: String(entry.created_at ?? ""),
    updated_at: String(entry.updated_at ?? "")
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => String(item).trim()).filter(Boolean))]
    : [];
}

function normalizeMode(value: unknown): PersonalWeaponKnowledgeMode {
  return value === "pve" || value === "pvp" ? value : "general";
}

function normalizeName(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? "";
}

function normalizeExternalUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function createEntryId(weaponName: string, mode: PersonalWeaponKnowledgeMode, now: string): string {
  const slug = normalizeName(weaponName).replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "weapon"}-${mode}-${Date.parse(now)}`;
}

function tablePath(dataDir: string): string {
  return join(dataDir, fileName);
}
