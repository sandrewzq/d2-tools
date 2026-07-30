import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  deletePersonalWeaponKnowledgeFromTable,
  normalizePersonalWeaponKnowledgeTable,
  selectPersonalWeaponKnowledge,
  setPersonalWeaponKnowledgeEnabledInTable,
  upsertPersonalWeaponKnowledge,
  type PersonalWeaponKnowledgeTable,
  type SavePersonalWeaponKnowledgeInput
} from "@d2-tools/core/community-perks";

const fileName = "personal-weapon-knowledge.json";

export function loadPersonalWeaponKnowledge(
  dataDir: string,
  weaponName?: string
): PersonalWeaponKnowledgeTable {
  return selectPersonalWeaponKnowledge(readTable(dataDir), weaponName);
}

export function savePersonalWeaponKnowledge(
  dataDir: string,
  input: SavePersonalWeaponKnowledgeInput
): PersonalWeaponKnowledgeTable {
  return writeTable(
    dataDir,
    upsertPersonalWeaponKnowledge(readTable(dataDir), input, new Date().toISOString())
  );
}

export function setPersonalWeaponKnowledgeEnabled(
  dataDir: string,
  id: string,
  enabled: boolean
): PersonalWeaponKnowledgeTable {
  return writeTable(
    dataDir,
    setPersonalWeaponKnowledgeEnabledInTable(readTable(dataDir), id, enabled, new Date().toISOString())
  );
}

export function deletePersonalWeaponKnowledge(dataDir: string, id: string): PersonalWeaponKnowledgeTable {
  return writeTable(dataDir, deletePersonalWeaponKnowledgeFromTable(readTable(dataDir), id));
}

export function clearPersonalWeaponKnowledge(dataDir: string): void {
  rmSync(tablePath(dataDir), { force: true });
}

function readTable(dataDir: string): PersonalWeaponKnowledgeTable {
  const file = tablePath(dataDir);
  if (!existsSync(file)) return { version: 1, entries: [] };
  return normalizePersonalWeaponKnowledgeTable(JSON.parse(readFileSync(file, "utf8")) as unknown);
}

function writeTable(dataDir: string, table: PersonalWeaponKnowledgeTable): PersonalWeaponKnowledgeTable {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(tablePath(dataDir), `${JSON.stringify(table, null, 2)}\n`, "utf8");
  return table;
}

function tablePath(dataDir: string): string {
  return join(dataDir, fileName);
}
