import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildMigratedEquipmentTargetStore,
  createEmptyEquipmentTargetStore,
  normalizeEquipmentTargetStore,
  type BuildMigratedEquipmentTargetsInput,
  type EquipmentTargetStore
} from "@d2-tools/core/targets/equipmentTargets";

export const equipmentTargetFileName = "equipment-targets.json";

export function loadEquipmentTargetStore(dataDir: string): EquipmentTargetStore | null {
  const file = equipmentTargetPath(dataDir);
  if (!existsSync(file)) return null;
  return normalizeEquipmentTargetStore(JSON.parse(readFileSync(file, "utf8")) as unknown);
}

export async function loadOrMigrateEquipmentTargetStore(
  dataDir: string,
  input: BuildMigratedEquipmentTargetsInput
): Promise<EquipmentTargetStore> {
  const existing = loadEquipmentTargetStore(dataDir);
  if (existing) return existing;
  const migrated = await buildMigratedEquipmentTargetStore(input);
  return saveEquipmentTargetStore(dataDir, migrated);
}

export function saveEquipmentTargetStore(
  dataDir: string,
  store: EquipmentTargetStore
): EquipmentTargetStore {
  const normalized = normalizeEquipmentTargetStore({
    ...store,
    updated_at: new Date().toISOString()
  });
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(equipmentTargetPath(dataDir), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export function clearEquipmentTargetStore(dataDir: string): EquipmentTargetStore {
  return saveEquipmentTargetStore(dataDir, createEmptyEquipmentTargetStore());
}

function equipmentTargetPath(dataDir: string): string {
  return join(dataDir, equipmentTargetFileName);
}
