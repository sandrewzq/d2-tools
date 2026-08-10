import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createEmptyGuideDerivedRelationStore,
  normalizeGuideDerivedRelationStore,
  removeGuideDerivedRelationsForEntity,
  upsertGuideDerivedRelation,
  type GuideDerivedEntityRef,
  type GuideDerivedRelation,
  type GuideDerivedRelationStore
} from "@d2-tools/core/guides/relations";

export const guideDerivedRelationFileName = "guide-derived-relations.json";
const maxRelations = 5000;

export function loadGuideDerivedRelationStore(dataDir: string): GuideDerivedRelationStore {
  const file = relationStorePath(dataDir);
  if (!existsSync(file)) return createEmptyGuideDerivedRelationStore();
  try {
    return normalizeGuideDerivedRelationStore(JSON.parse(readFileSync(file, "utf8")) as unknown);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`guide derived relations could not be read: ${detail}`);
  }
}

export function saveGuideDerivedRelationStore(
  dataDir: string,
  store: GuideDerivedRelationStore
): GuideDerivedRelationStore {
  const normalized = normalizeGuideDerivedRelationStore(store);
  if (normalized.relations.length > maxRelations) {
    throw new Error(`guide derived relations are limited to ${maxRelations} records`);
  }
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(relationStorePath(dataDir), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export function recordGuideDerivedRelation(
  dataDir: string,
  relation: GuideDerivedRelation
): GuideDerivedRelationStore {
  return saveGuideDerivedRelationStore(
    dataDir,
    upsertGuideDerivedRelation(loadGuideDerivedRelationStore(dataDir), relation)
  );
}

export function removeStoredGuideDerivedRelationsForEntity(
  dataDir: string,
  entity: Pick<GuideDerivedEntityRef, "kind" | "id">
): GuideDerivedRelationStore {
  const current = loadGuideDerivedRelationStore(dataDir);
  const next = removeGuideDerivedRelationsForEntity(current, entity);
  return next.relations.length === current.relations.length
    ? current
    : saveGuideDerivedRelationStore(dataDir, next);
}

export function removeStoredGuideDerivedRelationsForGuide(
  dataDir: string,
  guideDocumentId: string
): GuideDerivedRelationStore {
  const current = loadGuideDerivedRelationStore(dataDir);
  const directRelations = current.relations.filter((relation) => (
    (relation.source.kind === "guide" && relation.source.id === guideDocumentId)
    || (relation.target.kind === "guide" && relation.target.id === guideDocumentId)
  ));
  const derivedEntities = directRelations.flatMap((relation) => (
    relation.target.kind === "loadout_candidates" || relation.target.kind === "armor_constraint_draft"
      ? [{ kind: relation.target.kind, id: relation.target.id } as const]
      : []
  ));
  let next = removeGuideDerivedRelationsForEntity(current, { kind: "guide", id: guideDocumentId });
  for (const entity of derivedEntities) next = removeGuideDerivedRelationsForEntity(next, entity);
  return next.relations.length === current.relations.length
    ? current
    : saveGuideDerivedRelationStore(dataDir, next);
}

function relationStorePath(dataDir: string): string {
  return join(dataDir, guideDerivedRelationFileName);
}
