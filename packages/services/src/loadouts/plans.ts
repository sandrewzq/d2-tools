import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CreateLocalLoadoutPlanInput,
  LocalLoadoutPlan,
  LocalLoadoutArmorPlanReference,
  LocalLoadoutPlanSource,
  LoadoutPlanArmorConstraints,
  LoadoutPlanArmorPlannerMode,
  LoadoutPlanItemTarget,
  LoadoutPlanSubclassTarget,
  UpdateLocalLoadoutPlanInput
} from "@d2-tools/core/loadouts/plans";

export type {
  CreateLocalLoadoutPlanInput,
  LocalLoadoutPlan,
  LocalLoadoutArmorPlanReference,
  LocalLoadoutPlanSource,
  LoadoutPlanArmorConstraints,
  LoadoutPlanItemTarget,
  LoadoutPlanSubclassTarget,
  UpdateLocalLoadoutPlanInput
} from "@d2-tools/core/loadouts/plans";

const plansFileName = "loadout-plans.json";
const maxPlans = 50;

export function listLocalLoadoutPlans(dataDir: string): LocalLoadoutPlan[] {
  const path = plansPath(dataDir);
  if (!existsSync(path)) return [];

  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return Array.isArray(raw) ? raw.flatMap(normalizeLocalLoadoutPlan) : [];
  } catch {
    return [];
  }
}

export function createLocalLoadoutPlan(
  dataDir: string,
  input: CreateLocalLoadoutPlanInput,
  now = new Date()
): LocalLoadoutPlan {
  const plan = buildLocalLoadoutPlan({
    ...input,
    id: randomUUID(),
    created_at: now.toISOString()
  });
  writeLocalLoadoutPlans(dataDir, [plan, ...listLocalLoadoutPlans(dataDir)].slice(0, maxPlans));
  return plan;
}

export function updateLocalLoadoutPlan(
  dataDir: string,
  id: string,
  input: UpdateLocalLoadoutPlanInput,
  now = new Date()
): LocalLoadoutPlan {
  const plans = listLocalLoadoutPlans(dataDir);
  const existing = plans.find((plan) => plan.id === id);
  if (!existing) throw new Error("local loadout plan was not found");

  const updated = buildLocalLoadoutPlan({
    ...input,
    id: existing.id,
    created_at: existing.created_at,
    updated_at: now.toISOString()
  });
  writeLocalLoadoutPlans(dataDir, plans.map((plan) => plan.id === id ? updated : plan));
  return updated;
}

export function deleteLocalLoadoutPlan(dataDir: string, id: string): LocalLoadoutPlan[] {
  const plans = listLocalLoadoutPlans(dataDir);
  const nextPlans = plans.filter((plan) => plan.id !== id);
  if (nextPlans.length !== plans.length) writeLocalLoadoutPlans(dataDir, nextPlans);
  return nextPlans;
}

function buildLocalLoadoutPlan(value: LocalLoadoutPlan): LocalLoadoutPlan {
  const plan = normalizeLocalLoadoutPlan(value)[0];
  if (!plan) throw new Error("invalid local loadout plan");
  if (!plan.name.trim()) throw new Error("local loadout plan name is required");
  if (!plan.class_name.trim()) throw new Error("local loadout plan class is required");
  return plan;
}

function normalizeLocalLoadoutPlan(value: unknown): LocalLoadoutPlan[] {
  if (!isRecord(value)) return [];
  if (!isString(value.id) || !isString(value.name) || !isString(value.class_name) || !isString(value.created_at)) {
    return [];
  }

  return [{
    id: value.id,
    name: value.name.trim(),
    class_name: value.class_name.trim(),
    target_character_id: optionalString(value.target_character_id),
    source: normalizeSource(value.source),
    item_targets: Array.isArray(value.item_targets)
      ? value.item_targets.flatMap(normalizeItemTarget)
      : [],
    subclass_target: normalizeSubclassTarget(value.subclass_target),
    armor_constraints: normalizeArmorConstraints(value.armor_constraints),
    armor_plan: normalizeArmorPlanReference(value.armor_plan),
    notes: optionalString(value.notes),
    guidance: normalizeGuidance(value.guidance),
    created_at: value.created_at,
    updated_at: optionalString(value.updated_at)
  }];
}

function normalizeSource(value: unknown): LocalLoadoutPlanSource {
  if (!isRecord(value)) return { kind: "manual" };
  const kind = value.kind;
  if (kind !== "manual" && kind !== "current-equipment" && kind !== "bungie-loadout" && kind !== "dim-link" && kind !== "guide" && kind !== "armor-plan" && kind !== "assistant-targets") {
    return { kind: "manual" };
  }
  return {
    kind,
    source_id: optionalString(value.source_id),
    reference_url: optionalString(value.reference_url),
    label: optionalString(value.label)
  };
}

function normalizeItemTarget(value: unknown): LoadoutPlanItemTarget[] {
  if (!isRecord(value) || !isString(value.slot)) return [];
  const candidateConditions = isRecord(value.candidate_conditions)
    ? {
      require_owned: typeof value.candidate_conditions.require_owned === "boolean"
        ? value.candidate_conditions.require_owned
        : undefined,
      allowed_item_hashes: numberArray(value.candidate_conditions.allowed_item_hashes),
      required_plug_hashes: numberArray(value.candidate_conditions.required_plug_hashes)
    }
    : undefined;
  return [{
    slot: value.slot,
    item_hash: optionalNumber(value.item_hash),
    selected_instance_id: optionalString(value.selected_instance_id),
    plug_hashes: numberArray(value.plug_hashes),
    candidate_conditions: candidateConditions,
    notes: optionalString(value.notes)
  }];
}

function normalizeSubclassTarget(value: unknown): LoadoutPlanSubclassTarget | undefined {
  if (!isRecord(value)) return undefined;
  return {
    subclass_hash: optionalNumber(value.subclass_hash),
    ability_hashes: numberArray(value.ability_hashes),
    aspect_hashes: numberArray(value.aspect_hashes),
    fragment_hashes: numberArray(value.fragment_hashes),
    mod_hashes: numberArray(value.mod_hashes)
  };
}

function normalizeArmorConstraints(value: unknown): LoadoutPlanArmorConstraints | undefined {
  if (!isRecord(value)) return undefined;
  const statKeys = ["health", "melee", "grenade", "super", "class", "weapon"] as const;
  const statMinimums = Object.fromEntries(statKeys.flatMap((key) => {
    const amount = optionalNumber(isRecord(value.stat_minimums) ? value.stat_minimums[key] : undefined);
    return amount === undefined ? [] : [[key, amount]];
  })) as LoadoutPlanArmorConstraints["stat_minimums"];
  const fragmentBonuses = Object.fromEntries(statKeys.flatMap((key) => {
    const amount = optionalNumber(isRecord(value.fragment_stat_bonuses) ? value.fragment_stat_bonuses[key] : undefined);
    return amount === undefined ? [] : [[key, amount]];
  })) as LoadoutPlanArmorConstraints["fragment_stat_bonuses"];
  const allowedLocations = stringArray(value.allowed_locations).filter((location): location is LoadoutPlanArmorConstraints["allowed_locations"][number] => (
    location === "equipped" || location === "inventory" || location === "vault" || location === "postmaster"
  ));
  return {
    planner_mode: normalizeArmorPlannerMode(value.planner_mode),
    stat_minimums: statMinimums,
    priority_stats: stringArray(value.priority_stats).filter((key): key is LoadoutPlanArmorConstraints["priority_stats"][number] => statKeys.includes(key as typeof statKeys[number])),
    fragment_stat_bonuses: fragmentBonuses,
    five_point_mod_budget: nonNegativeNumber(value.five_point_mod_budget),
    ten_point_mod_budget: nonNegativeNumber(value.ten_point_mod_budget),
    exotic_item_hash: optionalNumber(value.exotic_item_hash),
    exotic_instance_id: optionalString(value.exotic_instance_id),
    locked_instance_ids: stringArray(value.locked_instance_ids),
    excluded_instance_ids: stringArray(value.excluded_instance_ids),
    allowed_locations: allowedLocations.length
      ? allowedLocations
      : ["equipped", "inventory", "vault", "postmaster"],
    set_constraint: normalizeArmorSetConstraint(value.set_constraint)
  };
}

function normalizeArmorPlanReference(value: unknown): LocalLoadoutArmorPlanReference | undefined {
  if (!isRecord(value)) return undefined;
  const explicitCacheKey = optionalString(value.cache_key);
  const resultId = optionalString(value.result_id) ?? explicitCacheKey;
  const cacheKey = explicitCacheKey ?? (resultId?.startsWith("armor:") ? resultId : undefined);
  const candidateId = optionalString(value.candidate_id);
  const rulesetVersion = optionalNumber(value.ruleset_version);
  const sourceRevisions = isRecord(value.source_revisions) ? value.source_revisions : null;
  const rulesetRevision = optionalString(sourceRevisions?.ruleset);
  if (!resultId || !candidateId || (value.mode !== "owned" && value.mode !== "upgrade") || value.ruleset_id !== "armor-3.0"
    || rulesetVersion === undefined || !rulesetRevision) {
    return undefined;
  }
  return {
    result_id: resultId,
    ...(cacheKey ? { cache_key: cacheKey } : {}),
    checked_at: optionalString(value.checked_at),
    expires_at: optionalString(value.expires_at),
    candidate_id: candidateId,
    mode: value.mode,
    ruleset_id: "armor-3.0",
    ruleset_version: Math.max(1, Math.trunc(rulesetVersion)),
    manifest_version: optionalString(value.manifest_version),
    source_revisions: {
      account: optionalString(sourceRevisions?.account),
      manifest: optionalString(sourceRevisions?.manifest),
      ruleset: rulesetRevision
    },
    selected_instance_ids: stringArray(value.selected_instance_ids)
  };
}

function normalizeArmorPlannerMode(value: unknown): LoadoutPlanArmorPlannerMode {
  return value === "theoretical" || value === "acquisition" || value === "upgrade"
    ? value
    : "owned";
}

function normalizeArmorSetConstraint(value: unknown): LoadoutPlanArmorConstraints["set_constraint"] {
  if (!isRecord(value)) return { mode: "none" };
  if (value.mode === "single") {
    const setHash = optionalNumber(value.set_hash);
    const pieceCount = value.piece_count === 4 ? 4 : value.piece_count === 2 ? 2 : undefined;
    return setHash === undefined || pieceCount === undefined
      ? { mode: "none" }
      : { mode: "single", set_hash: setHash >>> 0, piece_count: pieceCount };
  }
  if (value.mode === "split-2-2") {
    const firstSetHash = optionalNumber(value.first_set_hash);
    const secondSetHash = optionalNumber(value.second_set_hash);
    return firstSetHash === undefined || secondSetHash === undefined
      ? { mode: "none" }
      : {
          mode: "split-2-2",
          first_set_hash: firstSetHash >>> 0,
          second_set_hash: secondSetHash >>> 0
        };
  }
  return { mode: "none" };
}

function normalizeGuidance(value: unknown): LocalLoadoutPlan["guidance"] | undefined {
  if (!isRecord(value)) return undefined;
  return {
    raw_text: optionalString(value.raw_text),
    warnings: stringArray(value.warnings),
    evidence: stringArray(value.evidence)
  };
}

function writeLocalLoadoutPlans(dataDir: string, plans: LocalLoadoutPlan[]): void {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(plansPath(dataDir), `${JSON.stringify(plans, null, 2)}\n`, "utf8");
}

function plansPath(dataDir: string): string {
  return join(dataDir, plansFileName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function optionalString(value: unknown): string | undefined {
  return isString(value) && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function nonNegativeNumber(value: unknown): number {
  return Math.max(optionalNumber(value) ?? 0, 0);
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => isString(item) && item.trim().length > 0)
    : [];
}
