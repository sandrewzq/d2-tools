import type {
  DefinitionComponentData,
  DefinitionComponentName,
  DefinitionRecord
} from "@d2-tools/core/manifest/definitions";

export type DefinitionReader = {
  hasComponent(component: DefinitionComponentName): boolean;
  get(component: DefinitionComponentName, hash: number): DefinitionRecord | null;
  getMany(component: DefinitionComponentName, hashes: Iterable<number>): DefinitionComponentData;
  getAll(component: DefinitionComponentName): DefinitionComponentData;
  close(): void;
};

export function definitionDataFromRecords(
  records: Iterable<DefinitionRecord>
): DefinitionComponentData {
  const definitions: DefinitionComponentData = {};
  for (const record of records) {
    const hash = Number(record.hash);
    if (Number.isFinite(hash)) {
      definitions[String(toUnsignedHash(hash))] = record;
    }
  }
  return definitions;
}

export function toUnsignedHash(hash: number): number {
  return hash >>> 0;
}

export function toSignedHash(hash: number): number {
  return toUnsignedHash(hash) | 0;
}
