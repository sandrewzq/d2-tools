import type { ArmorSetCatalogEntry } from "../items/equipableItemSet.js";
import { armorSlots, type ArmorClass, type ArmorSlot } from "./model.js";
import type { ArmorRuleset } from "./ruleset.js";

export type ArmorSetConstraint =
  | { mode: "none" }
  | {
      mode: "single";
      set_hash: number;
      piece_count: 2 | 4;
    }
  | {
      mode: "split-2-2";
      first_set_hash: number;
      second_set_hash: number;
    };

export type NormalizedArmorSetRequirement = {
  set_hash: number;
  name: string;
  minimum_piece_count: 2 | 4;
  eligible_slots: ArmorSlot[];
};

export type NormalizedArmorSetConstraint = {
  mode: ArmorSetConstraint["mode"];
  requirements: NormalizedArmorSetRequirement[];
};

export type ArmorSetConstraintIssue = {
  code: string;
  message: string;
  set_hash?: number;
};

export type ArmorSetCoverageRequirement = {
  set_hash: number;
  name: string;
  minimum_piece_count: 2 | 4;
  actual_piece_count: number;
  missing_piece_count: number;
  satisfied: boolean;
};

export type ArmorSetCoverage = {
  mode: NormalizedArmorSetConstraint["mode"];
  satisfied: boolean;
  total_missing_piece_count: number;
  requirements: ArmorSetCoverageRequirement[];
};

export function normalizeArmorSetConstraint(input: {
  constraint?: ArmorSetConstraint;
  catalog?: readonly ArmorSetCatalogEntry[];
  ruleset: ArmorRuleset;
  class: ArmorClass;
}): { constraint: NormalizedArmorSetConstraint; issues: ArmorSetConstraintIssue[] } {
  const constraint = input.constraint ?? { mode: "none" };
  if (constraint.mode === "none") {
    return { constraint: { mode: "none", requirements: [] }, issues: [] };
  }

  const issues: ArmorSetConstraintIssue[] = [];
  if (input.class === "any" || input.class === "unknown") {
    issues.push({
      code: "armor_set_requires_concrete_class",
      message: "套装约束必须指定泰坦、猎人或术士职业。"
    });
  }
  if (!input.catalog?.length) {
    issues.push({
      code: "armor_set_catalog_unavailable",
      message: "当前没有可用的 Manifest 护甲套装目录。"
    });
    return { constraint: { mode: constraint.mode, requirements: [] }, issues };
  }

  const requested = constraint.mode === "single"
    ? [{ setHash: constraint.set_hash, pieceCount: constraint.piece_count }]
    : [
        { setHash: constraint.first_set_hash, pieceCount: 2 as const },
        { setHash: constraint.second_set_hash, pieceCount: 2 as const }
      ];
  if (constraint.mode === "split-2-2"
    && toUnsignedHash(constraint.first_set_hash) === toUnsignedHash(constraint.second_set_hash)) {
    issues.push({
      code: "duplicate_split_armor_set",
      message: "2+2 套装约束必须选择两个不同套装。"
    });
  }

  const catalogByHash = new Map(input.catalog.map((entry) => [toUnsignedHash(entry.hash), entry]));
  const requirements: NormalizedArmorSetRequirement[] = [];
  for (const request of requested) {
    const setHash = toUnsignedHash(request.setHash);
    const entry = catalogByHash.get(setHash);
    if (!entry) {
      issues.push({
        code: "unknown_armor_set",
        message: `Manifest 套装目录中不存在 ${setHash}。`,
        set_hash: setHash
      });
      continue;
    }
    if (!entry.member_definitions_complete) {
      issues.push({
        code: "incomplete_armor_set_members",
        message: `${entry.name} 的成员定义不完整，不能用于严格套装规划。`,
        set_hash: setHash
      });
    }
    if (!(entry.bonuses ?? []).some((bonus) => bonus.required_piece_count === request.pieceCount)) {
      issues.push({
        code: "missing_armor_set_bonus_threshold",
        message: `${entry.name} 没有可确认的 ${request.pieceCount} 件套奖励。`,
        set_hash: setHash
      });
    }
    const eligibleSlots = armorSetEligibleSlots(entry, input.class, input.ruleset);
    if (eligibleSlots.length < request.pieceCount) {
      issues.push({
        code: "insufficient_armor_set_slot_coverage",
        message: `${entry.name} 只覆盖 ${eligibleSlots.length} 个当前职业护甲槽位。`,
        set_hash: setHash
      });
    }
    requirements.push({
      set_hash: setHash,
      name: entry.name,
      minimum_piece_count: request.pieceCount,
      eligible_slots: eligibleSlots
    });
  }

  if (constraint.mode === "split-2-2" && requirements.length === 2
    && !hasDisjointSlotSelection(requirements[0]!, requirements[1]!)) {
    issues.push({
      code: "armor_set_split_slot_conflict",
      message: "两个 2 件套无法分配到四个互不冲突的护甲槽位。"
    });
  }

  return {
    constraint: { mode: constraint.mode, requirements },
    issues
  };
}

export function armorSetEligibleSlots(
  entry: ArmorSetCatalogEntry,
  armorClass: ArmorClass,
  ruleset: ArmorRuleset
): ArmorSlot[] {
  const slots = new Set<ArmorSlot>();
  for (const member of entry.members) {
    if (!classTypeMatches(member.class_type, armorClass)) continue;
    const slot = ruleset.slots.find((rule) => (
      typeof member.bucket_hash === "number" && rule.bucket_hashes.includes(member.bucket_hash)
    ))?.slot;
    if (slot) slots.add(slot);
  }
  return armorSlots.filter((slot) => slots.has(slot));
}

export function buildArmorSetCoverage(
  constraint: NormalizedArmorSetConstraint,
  counts: readonly number[]
): ArmorSetCoverage {
  const requirements = constraint.requirements.map((requirement, index) => {
    const actualPieceCount = counts[index] ?? 0;
    const missingPieceCount = Math.max(requirement.minimum_piece_count - actualPieceCount, 0);
    return {
      set_hash: requirement.set_hash,
      name: requirement.name,
      minimum_piece_count: requirement.minimum_piece_count,
      actual_piece_count: actualPieceCount,
      missing_piece_count: missingPieceCount,
      satisfied: missingPieceCount === 0
    };
  });
  const totalMissingPieceCount = requirements.reduce(
    (total, requirement) => total + requirement.missing_piece_count,
    0
  );
  return {
    mode: constraint.mode,
    satisfied: totalMissingPieceCount === 0,
    total_missing_piece_count: totalMissingPieceCount,
    requirements
  };
}

function hasDisjointSlotSelection(
  first: NormalizedArmorSetRequirement,
  second: NormalizedArmorSetRequirement
): boolean {
  const firstPairs = chooseSlots(first.eligible_slots, 2);
  const secondPairs = chooseSlots(second.eligible_slots, 2);
  return firstPairs.some((left) => secondPairs.some((right) => (
    left.every((slot) => !right.includes(slot))
  )));
}

function chooseSlots(slots: readonly ArmorSlot[], count: number): ArmorSlot[][] {
  if (count === 0) return [[]];
  return slots.flatMap((slot, index) => (
    chooseSlots(slots.slice(index + 1), count - 1).map((tail) => [slot, ...tail])
  ));
}

function classTypeMatches(classType: number | undefined, armorClass: ArmorClass): boolean {
  if (classType === 3) return true;
  if (armorClass === "titan") return classType === 0;
  if (armorClass === "hunter") return classType === 1;
  if (armorClass === "warlock") return classType === 2;
  return false;
}

function toUnsignedHash(value: number): number {
  return Number.isFinite(value) ? value >>> 0 : 0;
}
