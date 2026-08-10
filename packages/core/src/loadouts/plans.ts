import type { AccountItemSummary, AccountSummary } from "../account/summary.js";
import type { ArmorSetConstraint } from "../armor/sets.js";
import type { ArmorStatKey } from "./analysis.js";

export const loadoutPlanArmorStatKeys = [
  "health",
  "melee",
  "grenade",
  "super",
  "class",
  "weapon"
] as const;

export type LoadoutPlanArmorStatKey = ArmorStatKey;

export type LocalLoadoutPlanSourceKind =
  | "manual"
  | "current-equipment"
  | "bungie-loadout"
  | "dim-link"
  | "guide"
  | "armor-plan"
  | "assistant-targets";

export type LocalLoadoutPlanSource = {
  kind: LocalLoadoutPlanSourceKind;
  source_id?: string;
  reference_url?: string;
  label?: string;
};

export type LoadoutPlanItemCandidateConditions = {
  require_owned?: boolean;
  allowed_item_hashes?: number[];
  required_plug_hashes?: number[];
};

export type LoadoutPlanItemTarget = {
  slot: string;
  item_hash?: number;
  selected_instance_id?: string;
  plug_hashes: number[];
  candidate_conditions?: LoadoutPlanItemCandidateConditions;
  notes?: string;
};

export type LoadoutPlanSubclassTarget = {
  subclass_hash?: number;
  ability_hashes: number[];
  aspect_hashes: number[];
  fragment_hashes: number[];
  mod_hashes: number[];
};

export type LoadoutPlanArmorLocation = "equipped" | "inventory" | "vault" | "postmaster";
export type LoadoutPlanArmorPlannerMode = "owned" | "theoretical" | "acquisition" | "upgrade";

export type LoadoutPlanArmorConstraints = {
  planner_mode?: LoadoutPlanArmorPlannerMode;
  stat_minimums: Partial<Record<LoadoutPlanArmorStatKey, number>>;
  priority_stats: LoadoutPlanArmorStatKey[];
  fragment_stat_bonuses: Partial<Record<LoadoutPlanArmorStatKey, number>>;
  five_point_mod_budget: number;
  ten_point_mod_budget: number;
  exotic_item_hash?: number;
  exotic_instance_id?: string;
  locked_instance_ids: string[];
  excluded_instance_ids: string[];
  allowed_locations: LoadoutPlanArmorLocation[];
  set_constraint?: ArmorSetConstraint;
};

export type LoadoutPlanGuidance = {
  raw_text?: string;
  warnings: string[];
  evidence: string[];
};

export type LocalLoadoutArmorPlanReference = {
  result_id: string;
  cache_key?: string;
  checked_at?: string;
  expires_at?: string;
  candidate_id: string;
  mode: "owned" | "upgrade";
  ruleset_id: "armor-3.0";
  ruleset_version: number;
  manifest_version?: string;
  source_revisions: {
    account?: string;
    manifest?: string;
    ruleset: string;
  };
  selected_instance_ids: string[];
};

export type LocalLoadoutPlan = {
  id: string;
  name: string;
  class_name: string;
  target_character_id?: string;
  source: LocalLoadoutPlanSource;
  item_targets: LoadoutPlanItemTarget[];
  subclass_target?: LoadoutPlanSubclassTarget;
  armor_constraints?: LoadoutPlanArmorConstraints;
  armor_plan?: LocalLoadoutArmorPlanReference;
  notes?: string;
  guidance?: LoadoutPlanGuidance;
  created_at: string;
  updated_at?: string;
};

export type CreateLocalLoadoutPlanInput = Omit<LocalLoadoutPlan, "id" | "created_at" | "updated_at">;

export type UpdateLocalLoadoutPlanInput = Omit<LocalLoadoutPlan, "id" | "created_at" | "updated_at">;

export type LocalLoadoutPlanItemLocation = {
  key: LoadoutPlanArmorLocation;
  label: string;
  character_id?: string;
};

export type LocalLoadoutPlanMatchedItem = {
  item: AccountItemSummary;
  location: LocalLoadoutPlanItemLocation;
};

export type LocalLoadoutPlanItemMatchStatus =
  | "unconfigured"
  | "selected"
  | "available"
  | "needs-selection"
  | "missing"
  | "plug-unavailable";

export type LocalLoadoutPlanItemMatch = {
  target: LoadoutPlanItemTarget;
  status: LocalLoadoutPlanItemMatchStatus;
  candidates: LocalLoadoutPlanMatchedItem[];
};

export type LocalLoadoutPlanMatch = {
  item_matches: LocalLoadoutPlanItemMatch[];
  selected_count: number;
  available_count: number;
  needs_selection_count: number;
  missing_count: number;
  plug_unavailable_count: number;
  unconfigured_count: number;
};

export function createLocalLoadoutPlanFromEquippedItems(input: {
  name: string;
  class_name: string;
  target_character_id?: string;
  equipped_items: AccountItemSummary[];
  source?: LocalLoadoutPlanSource;
}): CreateLocalLoadoutPlanInput {
  return {
    name: input.name,
    class_name: input.class_name,
    target_character_id: input.target_character_id,
    source: input.source ?? { kind: "current-equipment" },
    item_targets: input.equipped_items.map((item) => ({
      slot: item.bucket_name ?? item.group_key,
      item_hash: item.hash,
      selected_instance_id: item.instance_id,
      plug_hashes: item.socket_plugs.map((plug) => plug.hash)
    }))
  };
}

export function matchLocalLoadoutPlan(
  plan: Pick<LocalLoadoutPlan, "item_targets">,
  account: AccountSummary
): LocalLoadoutPlanMatch {
  const accountItems = collectAccountItems(account);
  const itemMatches = plan.item_targets.map((target) => matchItemTarget(target, accountItems));

  return {
    item_matches: itemMatches,
    selected_count: countMatches(itemMatches, "selected"),
    available_count: countMatches(itemMatches, "available"),
    needs_selection_count: countMatches(itemMatches, "needs-selection"),
    missing_count: countMatches(itemMatches, "missing"),
    plug_unavailable_count: countMatches(itemMatches, "plug-unavailable"),
    unconfigured_count: countMatches(itemMatches, "unconfigured")
  };
}

function matchItemTarget(
  target: LoadoutPlanItemTarget,
  accountItems: LocalLoadoutPlanMatchedItem[]
): LocalLoadoutPlanItemMatch {
  if (!target.item_hash && !target.selected_instance_id) {
    return { target, status: "unconfigured", candidates: [] };
  }

  const sameDefinition = accountItems.filter((candidate) => (
    (!target.item_hash || candidate.item.hash === target.item_hash)
    && (!target.selected_instance_id || candidate.item.instance_id === target.selected_instance_id)
  ));
  const candidates = sameDefinition.filter((candidate) => itemMatchesTarget(candidate.item, target));

  if (target.selected_instance_id) {
    if (sameDefinition.length === 0) {
      return { target, status: "missing", candidates: [] };
    }
    if (candidates.length === 0) {
      return { target, status: "plug-unavailable", candidates: sameDefinition };
    }
    return { target, status: "selected", candidates };
  }

  if (candidates.length === 0) {
    return {
      target,
      status: sameDefinition.length > 0 ? "plug-unavailable" : "missing",
      candidates: sameDefinition
    };
  }

  return {
    target,
    status: candidates.length === 1 ? "available" : "needs-selection",
    candidates
  };
}

function itemMatchesTarget(item: AccountItemSummary, target: LoadoutPlanItemTarget): boolean {
  const requiredItemHashes = target.candidate_conditions?.allowed_item_hashes;
  if (requiredItemHashes?.length && !requiredItemHashes.includes(item.hash)) {
    return false;
  }
  const requiredPlugs = [
    ...target.plug_hashes,
    ...(target.candidate_conditions?.required_plug_hashes ?? [])
  ];
  return requiredPlugs.every((hash) => hasVerifiedPlug(item, hash));
}

function hasVerifiedPlug(item: AccountItemSummary, plugHash: number): boolean {
  if (item.socket_plugs.some((plug) => plug.hash === plugHash)) return true;
  return item.sockets?.some((socket) => socket.reusable_plugs.some((plug) => (
    plug.hash === plugHash && plug.can_insert !== false && plug.enabled !== false
  ))) ?? false;
}

function collectAccountItems(account: AccountSummary): LocalLoadoutPlanMatchedItem[] {
  const items: LocalLoadoutPlanMatchedItem[] = [];
  for (const character of account.characters) {
    const characterLocation = { character_id: character.character_id };
    items.push(...character.equipped_items.map((item) => ({
      item,
      location: { key: "equipped" as const, label: "已装备", ...characterLocation }
    })));
    items.push(...character.inventory_items.map((item) => ({
      item,
      location: { key: "inventory" as const, label: "角色背包", ...characterLocation }
    })));
    items.push(...character.postmaster_items.map((item) => ({
      item,
      location: { key: "postmaster" as const, label: "邮政官", ...characterLocation }
    })));
  }
  items.push(...account.vault.items.map((item) => ({
    item,
    location: { key: "vault" as const, label: "仓库" }
  })));
  return items;
}

function countMatches(matches: LocalLoadoutPlanItemMatch[], status: LocalLoadoutPlanItemMatchStatus): number {
  return matches.filter((match) => match.status === status).length;
}
