import type { AccountItemSummary, AccountSummary } from "../account/summary.js";
import type { ArmorStatKey } from "./analysis.js";
import {
  loadoutPlanArmorStatKeys,
  type LoadoutPlanArmorConstraints,
  type LoadoutPlanArmorLocation
} from "./plans.js";

export type LoadoutArmorCandidateItem = {
  instance_id: string;
  item_hash: number;
  name: string;
  bucket_name: string;
  location: LoadoutPlanArmorLocation;
  source_character_id?: string;
};

export type LoadoutArmorStatMod = {
  stat: ArmorStatKey;
  value: 5 | 10;
  count: number;
};

export type LoadoutArmorCandidate = {
  items: LoadoutArmorCandidateItem[];
  final_stats: Record<ArmorStatKey, number>;
  stat_mods: LoadoutArmorStatMod[];
  target_gaps: Partial<Record<ArmorStatKey, number>>;
  stat_waste: number;
  equipped_count: number;
  transfer_count: number;
  unmet_reasons: string[];
};

export type LoadoutArmorSolveResult = {
  candidates: LoadoutArmorCandidate[];
  unavailable_reasons: string[];
};

type SourcedArmorItem = {
  item: AccountItemSummary;
  location: LoadoutPlanArmorLocation;
  source_character_id?: string;
  slot: ArmorSlot;
};

type ArmorSlot = "helmet" | "arms" | "chest" | "legs" | "class";

const armorSlots: ArmorSlot[] = ["helmet", "arms", "chest", "legs", "class"];

export function solveLoadoutArmorCandidates(input: {
  account: AccountSummary;
  target_character_id?: string;
  constraints: LoadoutPlanArmorConstraints;
  limit?: number;
}): LoadoutArmorSolveResult {
  const unavailableReasons: string[] = [];
  const allowedLocations = new Set(
    input.constraints.allowed_locations.length
      ? input.constraints.allowed_locations
      : ["equipped", "inventory", "vault", "postmaster"]
  );
  const sourceItems = collectSourcedArmorItems(input.account)
    .filter((entry) => allowedLocations.has(entry.location))
    .filter((entry) => !input.constraints.excluded_instance_ids.includes(entry.item.instance_id!));
  const lockedItems = resolveLockedItems(sourceItems, input.constraints, unavailableReasons);
  if (unavailableReasons.length) return { candidates: [], unavailable_reasons: unavailableReasons };

  const bySlot = new Map<ArmorSlot, SourcedArmorItem[]>();
  for (const slot of armorSlots) {
    let candidates = sourceItems.filter((entry) => entry.slot === slot);
    const locked = lockedItems.get(slot);
    if (locked) candidates = candidates.filter((entry) => entry.item.instance_id === locked.item.instance_id);
    bySlot.set(slot, candidates);
  }

  if (input.constraints.exotic_item_hash !== undefined) {
    const exoticItems = sourceItems.filter((entry) => entry.item.hash === input.constraints.exotic_item_hash);
    if (!exoticItems.length) {
      return {
        candidates: [],
        unavailable_reasons: ["指定异域护甲当前不在允许的账号位置中。"]
      };
    }
    for (const slot of armorSlots) {
      const exoticForSlot = exoticItems.filter((entry) => entry.slot === slot);
      if (exoticForSlot.length) bySlot.set(slot, exoticForSlot);
    }
  }

  for (const slot of armorSlots) {
    if (!bySlot.get(slot)?.length) {
      unavailableReasons.push(`${slotLabel(slot)}没有满足位置、锁定和排除条件的真实护甲实例。`);
    }
  }
  if (unavailableReasons.length) return { candidates: [], unavailable_reasons: unavailableReasons };

  const limit = Math.max(input.limit ?? 5, 1);
  const beamLimit = Math.max(limit * 30, 120);
  let partials: Array<{ items: SourcedArmorItem[]; stats: Record<ArmorStatKey, number> }> = [{
    items: [],
    stats: emptyStats()
  }];
  for (const slot of armorSlots) {
    const next: Array<{ items: SourcedArmorItem[]; stats: Record<ArmorStatKey, number> }> = [];
    for (const partial of partials) {
      for (const item of bySlot.get(slot) ?? []) {
        next.push({
          items: [...partial.items, item],
          stats: addStats(partial.stats, item.item.armor_stats!)
        });
      }
    }
    partials = next
      .sort((left, right) => scorePartial(right.stats, input.constraints) - scorePartial(left.stats, input.constraints))
      .slice(0, beamLimit);
  }

  const uniqueCandidates = new Map<string, LoadoutArmorCandidate>();
  for (const partial of partials) {
    const candidate = buildCandidate(partial.items, partial.stats, input);
    const key = candidate.items.map((item) => item.instance_id).join("|");
    if (!uniqueCandidates.has(key)) uniqueCandidates.set(key, candidate);
  }

  return {
    candidates: [...uniqueCandidates.values()]
      .sort((left, right) => scoreCandidate(right, input.constraints) - scoreCandidate(left, input.constraints))
      .slice(0, limit),
    unavailable_reasons: []
  };
}

function resolveLockedItems(
  items: SourcedArmorItem[],
  constraints: LoadoutPlanArmorConstraints,
  unavailableReasons: string[]
): Map<ArmorSlot, SourcedArmorItem> {
  const locked = new Map<ArmorSlot, SourcedArmorItem>();
  for (const instanceId of constraints.locked_instance_ids) {
    const item = items.find((entry) => entry.item.instance_id === instanceId);
    if (!item) {
      unavailableReasons.push(`锁定的护甲实例 ${instanceId} 当前不在允许的位置中。`);
      continue;
    }
    if (locked.has(item.slot)) {
      unavailableReasons.push(`${slotLabel(item.slot)}存在多个锁定实例，无法同时装备。`);
      continue;
    }
    locked.set(item.slot, item);
  }
  return locked;
}

function buildCandidate(
  items: SourcedArmorItem[],
  baseStats: Record<ArmorStatKey, number>,
  input: {
    target_character_id?: string;
    constraints: LoadoutPlanArmorConstraints;
  }
): LoadoutArmorCandidate {
  const modResult = allocateStatMods(baseStats, input.constraints);
  const targetGaps = Object.fromEntries(loadoutPlanArmorStatKeys.flatMap((stat) => {
    const required = input.constraints.stat_minimums[stat] ?? 0;
    const gap = Math.max(required - modResult.finalStats[stat], 0);
    return gap ? [[stat, gap]] : [];
  }));
  const unmetReasons = Object.entries(targetGaps).map(([stat, gap]) => `${statLabel(stat as ArmorStatKey)}还差 ${gap}。`);
  const equippedCount = items.filter((item) => item.location === "equipped" && item.source_character_id === input.target_character_id).length;
  const transferCount = items.filter((item) => {
    if (item.source_character_id === input.target_character_id && (item.location === "equipped" || item.location === "inventory")) {
      return false;
    }
    return true;
  }).length;

  return {
    items: items.map((entry) => ({
      instance_id: entry.item.instance_id!,
      item_hash: entry.item.hash,
      name: entry.item.name,
      bucket_name: entry.item.bucket_name ?? slotLabel(entry.slot),
      location: entry.location,
      source_character_id: entry.source_character_id
    })),
    final_stats: modResult.finalStats,
    stat_mods: modResult.mods,
    target_gaps: targetGaps,
    stat_waste: loadoutPlanArmorStatKeys.reduce((total, stat) => total + (modResult.finalStats[stat] % 10), 0),
    equipped_count: equippedCount,
    transfer_count: transferCount,
    unmet_reasons: unmetReasons
  };
}

function allocateStatMods(
  baseStats: Record<ArmorStatKey, number>,
  constraints: LoadoutPlanArmorConstraints
): { finalStats: Record<ArmorStatKey, number>; mods: LoadoutArmorStatMod[] } {
  const finalStats = addStats(baseStats, constraints.fragment_stat_bonuses);
  let fiveBudget = constraints.five_point_mod_budget;
  let tenBudget = constraints.ten_point_mod_budget;
  const allocated = new Map<string, number>();
  const orderedStats = [...new Set([...constraints.priority_stats, ...loadoutPlanArmorStatKeys])];

  for (const stat of orderedStats) {
    const minimum = constraints.stat_minimums[stat] ?? 0;
    while (finalStats[stat] < minimum && (fiveBudget > 0 || tenBudget > 0)) {
      const deficit = minimum - finalStats[stat];
      const useFive = fiveBudget > 0 && (tenBudget === 0 || deficit <= 5 || deficit % 10 <= 5);
      const value = useFive ? 5 : 10;
      if (useFive) fiveBudget -= 1;
      else tenBudget -= 1;
      finalStats[stat] += value;
      const key = `${stat}:${value}`;
      allocated.set(key, (allocated.get(key) ?? 0) + 1);
    }
  }

  return {
    finalStats,
    mods: [...allocated.entries()].map(([key, count]) => {
      const [stat, value] = key.split(":");
      return { stat: stat as ArmorStatKey, value: Number(value) as 5 | 10, count };
    })
  };
}

function collectSourcedArmorItems(account: AccountSummary): SourcedArmorItem[] {
  const items: SourcedArmorItem[] = [];
  for (const character of account.characters) {
    items.push(...toSourcedArmorItems(character.equipped_items, "equipped", character.character_id));
    items.push(...toSourcedArmorItems(character.inventory_items, "inventory", character.character_id));
    items.push(...toSourcedArmorItems(character.postmaster_items, "postmaster", character.character_id));
  }
  items.push(...toSourcedArmorItems(account.vault.items, "vault"));
  return items;
}

function toSourcedArmorItems(
  items: AccountItemSummary[],
  location: LoadoutPlanArmorLocation,
  sourceCharacterId?: string
): SourcedArmorItem[] {
  return items.flatMap((item) => {
    const slot = armorSlot(item.bucket_name);
    if (item.group_key !== "armor" || !item.instance_id || !item.armor_stats || !slot) return [];
    return [{ item, location, source_character_id: sourceCharacterId, slot }];
  });
}

function armorSlot(bucketName?: string): ArmorSlot | null {
  const value = bucketName?.toLowerCase() ?? "";
  if (value.includes("头") || value.includes("helmet")) return "helmet";
  if (value.includes("臂") || value.includes("gauntlet") || value.includes("arms")) return "arms";
  if (value.includes("胸") || value.includes("chest")) return "chest";
  if (value.includes("腿") || value.includes("leg")) return "legs";
  if (value.includes("职业") || value.includes("class item")) return "class";
  return null;
}

function emptyStats(): Record<ArmorStatKey, number> {
  return { health: 0, melee: 0, grenade: 0, super: 0, class: 0, weapon: 0 };
}

function addStats(
  left: Record<ArmorStatKey, number>,
  right: Partial<Record<ArmorStatKey, number>>
): Record<ArmorStatKey, number> {
  const result = emptyStats();
  for (const stat of loadoutPlanArmorStatKeys) {
    result[stat] = left[stat] + (right[stat] ?? 0);
  }
  return result;
}

function scorePartial(stats: Record<ArmorStatKey, number>, constraints: LoadoutPlanArmorConstraints): number {
  return loadoutPlanArmorStatKeys.reduce((score, stat) => {
    const required = constraints.stat_minimums[stat] ?? 0;
    const priority = constraints.priority_stats.indexOf(stat);
    const weight = priority === -1 ? 1 : constraints.priority_stats.length - priority + 2;
    return score + Math.min(stats[stat], required || stats[stat]) * weight;
  }, 0);
}

function scoreCandidate(candidate: LoadoutArmorCandidate, constraints: LoadoutPlanArmorConstraints): number {
  const totalGap = Object.values(candidate.target_gaps).reduce((total, gap) => total + (gap ?? 0), 0);
  const priorityScore = constraints.priority_stats.reduce((total, stat, index) => (
    total + candidate.final_stats[stat] * (constraints.priority_stats.length - index + 1)
  ), 0);
  return (totalGap === 0 ? 1_000_000 : -totalGap * 10_000)
    + priorityScore * 10
    - candidate.stat_waste
    - candidate.transfer_count * 4;
}

function slotLabel(slot: ArmorSlot): string {
  return {
    helmet: "头盔",
    arms: "臂铠",
    chest: "胸甲",
    legs: "腿甲",
    class: "职业物品"
  }[slot];
}

function statLabel(stat: ArmorStatKey): string {
  return {
    health: "生命值",
    melee: "近战",
    grenade: "手雷",
    super: "超能",
    class: "职业",
    weapon: "武器"
  }[stat];
}
