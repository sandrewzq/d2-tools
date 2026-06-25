import type { AccountItemSummary } from "../account/summary.js";
import type { ArmorStatKey } from "../loadouts/analysis.js";

export type LocalArmorTargetCondition = {
  stat: ArmorStatKey;
  min: number;
};

export type LocalArmorTargetRule = {
  id: string;
  name: string;
  conditions: LocalArmorTargetCondition[];
};

export type LocalWeaponTargetCondition = {
  perk_hash: number;
  perk_name: string;
};

export type LocalWeaponTargetRule = {
  id: string;
  name: string;
  item_hash: number;
  item_name: string;
  conditions: LocalWeaponTargetCondition[];
};

export type LocalTargetActionPolicy = "notify_only";

export type LocalTargetRules = {
  action_policy: LocalTargetActionPolicy;
  armor: LocalArmorTargetRule[];
  weapons: LocalWeaponTargetRule[];
};

export type LocalTargetMatchResult = {
  matched: boolean;
  labels: string[];
  reasons: string[];
  disclaimer: string;
};

export type LocalTargetSummary = {
  matched_count: number;
  matched_rule_names: string[];
};

export const emptyLocalTargetRules: LocalTargetRules = {
  action_policy: "notify_only",
  armor: [],
  weapons: []
};

const armorStatLabels: Record<ArmorStatKey, string> = {
  health: "生命值",
  melee: "近战",
  grenade: "手雷",
  super: "超能",
  class: "职业",
  weapon: "武器"
};

export function evaluateLocalArmorTargets(
  item: AccountItemSummary,
  rules: LocalTargetRules | LocalArmorTargetRule[] | null | undefined
): LocalTargetMatchResult {
  const armorRules = Array.isArray(rules) ? rules : rules?.armor ?? [];
  if (!armorRules.length || item.group_key !== "armor" || !item.armor_stats) {
    return emptyMatch();
  }

  const stats = item.armor_stats;
  const matchedRules = armorRules.filter((rule) =>
    rule.conditions.length > 0
    && rule.conditions.every((condition) => stats[condition.stat] >= condition.min)
  );

  if (!matchedRules.length) {
    return emptyMatch();
  }

  return {
    matched: true,
    labels: matchedRules.map((rule) => rule.name),
    reasons: matchedRules.map((rule) => `${rule.name}：${formatArmorConditions(rule.conditions)}`),
    disclaimer: "本地目标规则只按你设定的护甲属性最低值匹配，不会自动改动装备。"
  };
}

export function evaluateLocalWeaponTargets(
  item: AccountItemSummary,
  rules: LocalTargetRules | LocalWeaponTargetRule[] | null | undefined
): LocalTargetMatchResult {
  const weaponRules = Array.isArray(rules) ? rules : rules?.weapons ?? [];
  if (!weaponRules.length || item.group_key !== "weapons") {
    return emptyMatch();
  }

  const perkHashes = new Set((item.socket_plugs ?? []).map((plug) => plug.hash));
  const matchedRules = weaponRules.filter((rule) =>
    rule.item_hash === item.hash
    && rule.conditions.length > 0
    && rule.conditions.every((condition) => perkHashes.has(condition.perk_hash))
  );

  if (!matchedRules.length) {
    return emptyMatch();
  }

  return {
    matched: true,
    labels: matchedRules.map((rule) => rule.name),
    reasons: matchedRules.map((rule) => `${rule.name}：${rule.item_name} / ${formatWeaponConditions(rule.conditions)}`),
    disclaimer: "本地目标规则只按你设定的武器和 perk 组合匹配，不会自动改动装备。"
  };
}

export function evaluateLocalTargets(
  item: AccountItemSummary,
  rules: LocalTargetRules | null | undefined
): LocalTargetMatchResult {
  if (item.group_key === "armor") {
    return evaluateLocalArmorTargets(item, rules);
  }
  if (item.group_key === "weapons") {
    return evaluateLocalWeaponTargets(item, rules);
  }
  return emptyMatch();
}

export function summarizeLocalTargetMatches(
  items: AccountItemSummary[],
  rules: LocalTargetRules | null | undefined
): LocalTargetSummary {
  const matchedNames = new Set<string>();
  let matchedCount = 0;

  for (const item of items) {
    const result = evaluateLocalTargets(item, rules);
    if (!result.matched) continue;
    matchedCount += 1;
    for (const label of result.labels) {
      matchedNames.add(label);
    }
  }

  return {
    matched_count: matchedCount,
    matched_rule_names: [...matchedNames]
  };
}

function emptyMatch(): LocalTargetMatchResult {
  return {
    matched: false,
    labels: [],
    reasons: [],
    disclaimer: "本地目标规则只按你设定的护甲属性最低值匹配，不会自动改动装备。"
  };
}

function formatArmorConditions(conditions: LocalArmorTargetCondition[]): string {
  return conditions
    .map((condition) => `${armorStatLabels[condition.stat]} >= ${condition.min}`)
    .join(" / ");
}

function formatWeaponConditions(conditions: LocalWeaponTargetCondition[]): string {
  return conditions.map((condition) => condition.perk_name || `Perk ${condition.perk_hash}`).join(" + ");
}
