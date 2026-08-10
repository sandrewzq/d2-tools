export type GuideDerivedEntityKind =
  | "guide"
  | "equipment_target"
  | "armor_result"
  | "armor_constraint_draft"
  | "loadout_candidates"
  | "local_loadout_plan";

export type GuideDerivedEntityRef = {
  kind: GuideDerivedEntityKind;
  id: string;
  secondary_id?: string;
  label?: string;
};

export type GuideDerivedRelationKind =
  | "guide_to_equipment_target"
  | "guide_to_armor_constraint_draft"
  | "guide_to_loadout_candidates"
  | "armor_result_to_equipment_target"
  | "armor_constraint_draft_to_local_loadout_plan"
  | "loadout_candidates_to_local_loadout_plan";

export type GuideDerivedRelation = {
  id: string;
  kind: GuideDerivedRelationKind;
  source: GuideDerivedEntityRef;
  target: GuideDerivedEntityRef;
  created_at: string;
};

export type GuideDerivedRelationStore = {
  version: 1;
  relations: GuideDerivedRelation[];
  updated_at: string;
};

export function createEmptyGuideDerivedRelationStore(now = new Date()): GuideDerivedRelationStore {
  return {
    version: 1,
    relations: [],
    updated_at: now.toISOString()
  };
}

export function createGuideDerivedRelation(input: {
  kind: GuideDerivedRelationKind;
  source: GuideDerivedEntityRef;
  target: GuideDerivedEntityRef;
  now?: Date;
}): GuideDerivedRelation {
  const source = normalizeEntityRef(input.source);
  const target = normalizeEntityRef(input.target);
  if (!source || !target) throw new Error("invalid guide derived relation entity");
  return {
    id: stableRelationId(input.kind, source, target),
    kind: input.kind,
    source,
    target,
    created_at: (input.now ?? new Date()).toISOString()
  };
}

export function normalizeGuideDerivedRelationStore(
  input: unknown,
  now = new Date()
): GuideDerivedRelationStore {
  const fallbackTimestamp = now.toISOString();
  if (!isRecord(input) || input.version !== 1 || !Array.isArray(input.relations)) {
    return createEmptyGuideDerivedRelationStore(now);
  }
  const relations = input.relations.flatMap((relation) => {
    const normalized = normalizeRelation(relation, fallbackTimestamp);
    return normalized ? [normalized] : [];
  });
  return {
    version: 1,
    relations: uniqueRelations(relations),
    updated_at: normalizeTimestamp(input.updated_at, fallbackTimestamp)
  };
}

export function upsertGuideDerivedRelation(
  store: GuideDerivedRelationStore,
  relation: GuideDerivedRelation,
  now = new Date()
): GuideDerivedRelationStore {
  const normalized = normalizeGuideDerivedRelationStore(store, now);
  const existing = normalized.relations.find((entry) => entry.id === relation.id);
  const next = existing
    ? { ...relation, created_at: existing.created_at }
    : relation;
  return {
    version: 1,
    relations: uniqueRelations([
      next,
      ...normalized.relations.filter((entry) => entry.id !== next.id)
    ]),
    updated_at: now.toISOString()
  };
}

export function removeGuideDerivedRelationsForEntity(
  store: GuideDerivedRelationStore,
  entity: Pick<GuideDerivedEntityRef, "kind" | "id">
): GuideDerivedRelationStore {
  const normalized = normalizeGuideDerivedRelationStore(store);
  const relations = normalized.relations.filter((relation) => !(
    sameEntity(relation.source, entity) || sameEntity(relation.target, entity)
  ));
  if (relations.length === normalized.relations.length) return normalized;
  return {
    ...normalized,
    relations,
    updated_at: new Date().toISOString()
  };
}

export function selectGuideDerivedRelations(
  store: GuideDerivedRelationStore,
  entity: Pick<GuideDerivedEntityRef, "kind" | "id">
): GuideDerivedRelation[] {
  return normalizeGuideDerivedRelationStore(store).relations.filter((relation) => (
    sameEntity(relation.source, entity) || sameEntity(relation.target, entity)
  ));
}

function normalizeRelation(input: unknown, fallbackTimestamp: string): GuideDerivedRelation | null {
  if (!isRecord(input) || !isRelationKind(input.kind)) return null;
  const source = normalizeEntityRef(input.source);
  const target = normalizeEntityRef(input.target);
  if (!source || !target) return null;
  return {
    id: stableRelationId(input.kind, source, target),
    kind: input.kind,
    source,
    target,
    created_at: normalizeTimestamp(input.created_at, fallbackTimestamp)
  };
}

function normalizeEntityRef(input: unknown): GuideDerivedEntityRef | null {
  if (!isRecord(input) || !isEntityKind(input.kind)) return null;
  const id = normalizeText(input.id);
  if (!id) return null;
  const secondaryId = normalizeText(input.secondary_id);
  const label = normalizeText(input.label);
  return {
    kind: input.kind,
    id,
    ...(secondaryId ? { secondary_id: secondaryId } : {}),
    ...(label ? { label } : {})
  };
}

function stableRelationId(
  kind: GuideDerivedRelationKind,
  source: GuideDerivedEntityRef,
  target: GuideDerivedEntityRef
): string {
  const identity = [
    kind,
    source.kind,
    source.id,
    source.secondary_id ?? "",
    target.kind,
    target.id,
    target.secondary_id ?? ""
  ].join("\u0000");
  return `guide-derived:${kind}:${fingerprint(identity)}`;
}

function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function uniqueRelations(relations: GuideDerivedRelation[]): GuideDerivedRelation[] {
  const byId = new Map<string, GuideDerivedRelation>();
  for (const relation of relations) if (!byId.has(relation.id)) byId.set(relation.id, relation);
  return [...byId.values()];
}

function sameEntity(
  left: GuideDerivedEntityRef,
  right: Pick<GuideDerivedEntityRef, "kind" | "id">
): boolean {
  return left.kind === right.kind && left.id === right.id;
}

function isRelationKind(input: unknown): input is GuideDerivedRelationKind {
  return input === "guide_to_equipment_target"
    || input === "guide_to_armor_constraint_draft"
    || input === "guide_to_loadout_candidates"
    || input === "armor_result_to_equipment_target"
    || input === "armor_constraint_draft_to_local_loadout_plan"
    || input === "loadout_candidates_to_local_loadout_plan";
}

function isEntityKind(input: unknown): input is GuideDerivedEntityKind {
  return input === "guide"
    || input === "equipment_target"
    || input === "armor_result"
    || input === "armor_constraint_draft"
    || input === "loadout_candidates"
    || input === "local_loadout_plan";
}

function normalizeTimestamp(input: unknown, fallback: string): string {
  if (typeof input !== "string" || !input.trim()) return fallback;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function normalizeText(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}
