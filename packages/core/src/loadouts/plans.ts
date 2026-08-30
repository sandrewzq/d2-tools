import type { AccountItemSummary, AccountSummary } from "../account/summary.js";
import {
  armorSlots,
  type ArmorSlot,
  type ArmorStatModSlotRuleMode
} from "../armor/model.js";
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

export type LoadoutPlanArmorStatModSlotRule = {
  slot: ArmorSlot;
  mode: ArmorStatModSlotRuleMode;
  stat?: LoadoutPlanArmorStatKey;
};

export type LoadoutPlanArmorConstraints = {
  planner_mode?: LoadoutPlanArmorPlannerMode;
  stat_minimums: Partial<Record<LoadoutPlanArmorStatKey, number>>;
  priority_stats: LoadoutPlanArmorStatKey[];
  fragment_stat_bonuses: Partial<Record<LoadoutPlanArmorStatKey, number>>;
  five_point_mod_budget: number;
  ten_point_mod_budget: number;
  armor_stat_mod_slot_rules?: LoadoutPlanArmorStatModSlotRule[];
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
  planned_armor_plugs: Array<{
    slot?: ArmorSlot;
    instance_id: string;
    tuning_plug_hash?: number;
    armor_stat_mod_plug_hash?: number;
    armor_stat_mod_value?: 5 | 10;
    armor_stat_mod_stat?: LoadoutPlanArmorStatKey;
    armor_stat_mod_socket_index?: number;
    armor_stat_mod_energy_cost?: number;
    energy_capacity: number;
    reserved_energy: number;
    final_energy: number;
  }>;
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

export function createDefaultArmorStatModSlotRules(): LoadoutPlanArmorStatModSlotRule[] {
  return armorSlots.map((slot) => ({ slot, mode: "auto" }));
}

export function normalizeLoadoutPlanArmorStatModSlotRules(
  constraints: Pick<LoadoutPlanArmorConstraints, "armor_stat_mod_slot_rules"> | undefined
): LoadoutPlanArmorStatModSlotRule[] {
  const bySlot = new Map<ArmorSlot, LoadoutPlanArmorStatModSlotRule>();
  for (const rule of constraints?.armor_stat_mod_slot_rules ?? []) {
    if (!armorSlots.includes(rule.slot)) continue;
    const mode = (["auto", "none", "plus5", "plus10"] as const).includes(rule.mode)
      ? rule.mode
      : "auto";
    const stat = (mode === "plus5" || mode === "plus10")
      && rule.stat && loadoutPlanArmorStatKeys.includes(rule.stat)
      ? rule.stat
      : undefined;
    bySlot.set(rule.slot, {
      slot: rule.slot,
      mode,
      ...(stat ? { stat } : {})
    });
  }
  return armorSlots.map((slot) => bySlot.get(slot) ?? { slot, mode: "auto" });
}

export function summarizeLoadoutPlanArmorStatModRules(
  constraints: Pick<
    LoadoutPlanArmorConstraints,
    "armor_stat_mod_slot_rules" | "five_point_mod_budget" | "ten_point_mod_budget"
  > | undefined
): { plus5: number; plus10: number; automatic: number; none: number; legacy: boolean } {
  if (!constraints?.armor_stat_mod_slot_rules) {
    return {
      plus5: Math.max(0, Math.trunc(constraints?.five_point_mod_budget ?? 0)),
      plus10: Math.max(0, Math.trunc(constraints?.ten_point_mod_budget ?? 0)),
      automatic: 0,
      none: 0,
      legacy: true
    };
  }
  const rules = normalizeLoadoutPlanArmorStatModSlotRules(constraints);
  return {
    plus5: rules.filter((rule) => rule.mode === "plus5").length,
    plus10: rules.filter((rule) => rule.mode === "plus10").length,
    automatic: rules.filter((rule) => rule.mode === "auto").length,
    none: rules.filter((rule) => rule.mode === "none").length,
    legacy: false
  };
}

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
  plan: Pick<LocalLoadoutPlan, "item_targets" | "armor_plan">,
  account: AccountSummary
): LocalLoadoutPlanMatch {
  const accountItems = collectAccountItems(account);
  const plannedArmorPlugs = new Map((plan.armor_plan?.planned_armor_plugs ?? []).map((assignment) => [
    assignment.instance_id,
    new Set([
      ...(plan.item_targets.find((target) => target.selected_instance_id === assignment.instance_id)?.plug_hashes ?? []),
      assignment.tuning_plug_hash,
      assignment.armor_stat_mod_plug_hash
    ].filter((hash): hash is number => hash !== undefined))
  ]));
  const itemMatches = plan.item_targets.map((target) => matchItemTarget(
    target,
    accountItems,
    target.selected_instance_id ? plannedArmorPlugs.get(target.selected_instance_id) : undefined
  ));

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
  accountItems: LocalLoadoutPlanMatchedItem[],
  plannedArmorPlugs: ReadonlySet<number> | undefined
): LocalLoadoutPlanItemMatch {
  if (!target.item_hash && !target.selected_instance_id) {
    return { target, status: "unconfigured", candidates: [] };
  }

  const sameDefinition = accountItems.filter((candidate) => (
    (!target.item_hash || candidate.item.hash === target.item_hash)
    && (!target.selected_instance_id || candidate.item.instance_id === target.selected_instance_id)
  ));
  const candidates = sameDefinition.filter((candidate) => itemMatchesTarget(
    candidate.item,
    target,
    plannedArmorPlugs
  ));

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

function itemMatchesTarget(
  item: AccountItemSummary,
  target: LoadoutPlanItemTarget,
  plannedArmorPlugs: ReadonlySet<number> | undefined
): boolean {
  const requiredItemHashes = target.candidate_conditions?.allowed_item_hashes;
  if (requiredItemHashes?.length && !requiredItemHashes.includes(item.hash)) {
    return false;
  }
  const requiredPlugs = [
    ...target.plug_hashes,
    ...(target.candidate_conditions?.required_plug_hashes ?? [])
  ];
  return requiredPlugs.every((hash) => hasVerifiedPlug(item, hash, plannedArmorPlugs?.has(hash) ?? false));
}

function hasVerifiedPlug(item: AccountItemSummary, plugHash: number, plannedArmorPlug: boolean): boolean {
  if (item.socket_plugs.some((plug) => plug.hash === plugHash)) return true;
  return item.sockets?.some((socket) => socket.reusable_plugs.some((plug) => (
    plug.hash === plugHash
    && plug.enabled !== false
    && (plannedArmorPlug || plug.can_insert !== false)
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
