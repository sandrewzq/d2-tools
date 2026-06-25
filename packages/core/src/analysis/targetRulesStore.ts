import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArmorStatKey } from "../loadouts/analysis.js";
import type { LocalArmorTargetRule, LocalTargetActionPolicy, LocalTargetRules, LocalWeaponTargetRule } from "./targets.js";
import { emptyLocalTargetRules } from "./targets.js";

const targetRulesFileName = "target-rules.json";

export function loadLocalTargetRules(dataDir: string): LocalTargetRules {
  const file = targetRulesPath(dataDir);
  if (!existsSync(file)) {
    return emptyLocalTargetRules;
  }

  return sanitizeLocalTargetRules(JSON.parse(readFileSync(file, "utf8")) as Partial<LocalTargetRules>);
}

export function saveLocalTargetRules(dataDir: string, rules: LocalTargetRules): LocalTargetRules {
  const next = sanitizeLocalTargetRules(rules);
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(targetRulesPath(dataDir), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function clearLocalTargetRules(dataDir: string): void {
  rmSync(targetRulesPath(dataDir), { force: true });
}

function sanitizeLocalTargetRules(input: Partial<LocalTargetRules> | undefined): LocalTargetRules {
  const armor = (Array.isArray(input?.armor) ? input.armor : [])
    .map(sanitizeArmorTargetRule)
    .filter((rule): rule is LocalArmorTargetRule => Boolean(rule));
  const weapons = (Array.isArray(input?.weapons) ? input.weapons : [])
    .map(sanitizeWeaponTargetRule)
    .filter((rule): rule is LocalWeaponTargetRule => Boolean(rule));

  return {
    action_policy: sanitizeActionPolicy(input?.action_policy),
    armor,
    weapons
  };
}

function sanitizeActionPolicy(input: unknown): LocalTargetActionPolicy {
  return input === "notify_only" ? "notify_only" : "notify_only";
}

function sanitizeArmorTargetRule(input: Partial<LocalArmorTargetRule> | undefined): LocalArmorTargetRule | null {
  const conditions = (Array.isArray(input?.conditions) ? input.conditions : [])
    .map((condition) => ({
      stat: condition?.stat,
      min: Number(condition?.min)
    }))
    .filter((condition): condition is { stat: ArmorStatKey; min: number } =>
      isArmorStatKey(condition.stat) && Number.isFinite(condition.min)
    )
    .map((condition) => ({
      stat: condition.stat,
      min: Math.max(0, Math.floor(condition.min))
    }));

  if (!conditions.length) {
    return null;
  }

  const name = typeof input?.name === "string" ? input.name.trim() : "";
  return {
    id: stableRuleId(input?.id, name, conditions),
    name: name || formatRuleName(conditions),
    conditions
  };
}

function sanitizeWeaponTargetRule(input: Partial<LocalWeaponTargetRule> | undefined): LocalWeaponTargetRule | null {
  const itemHash = Number(input?.item_hash);
  const itemName = typeof input?.item_name === "string" ? input.item_name.trim() : "";
  const conditions = (Array.isArray(input?.conditions) ? input.conditions : [])
    .map((condition) => ({
      perk_hash: Number(condition?.perk_hash),
      perk_name: typeof condition?.perk_name === "string" ? condition.perk_name.trim() : ""
    }))
    .filter((condition) => Number.isFinite(condition.perk_hash))
    .map((condition) => ({
      perk_hash: condition.perk_hash,
      perk_name: condition.perk_name || `Perk ${condition.perk_hash}`
    }));

  if (!Number.isFinite(itemHash) || !conditions.length) {
    return null;
  }

  const name = typeof input?.name === "string" ? input.name.trim() : "";
  return {
    id: stableWeaponRuleId(input?.id, name, itemHash, conditions),
    name: name || formatWeaponRuleName(itemName, conditions),
    item_hash: itemHash,
    item_name: itemName || `Item ${itemHash}`,
    conditions
  };
}

function stableRuleId(
  id: LocalArmorTargetRule["id"] | undefined,
  name: string,
  conditions: Array<{ stat: ArmorStatKey; min: number }>
): string {
  const normalizedId = typeof id === "string" ? id.trim() : "";
  if (normalizedId) {
    return normalizedId;
  }

  return [
    "armor",
    name || "target",
    ...conditions.map((condition) => `${condition.stat}-${condition.min}`)
  ].join("-")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stableWeaponRuleId(
  id: LocalWeaponTargetRule["id"] | undefined,
  name: string,
  itemHash: number,
  conditions: Array<{ perk_hash: number }>
): string {
  const normalizedId = typeof id === "string" ? id.trim() : "";
  if (normalizedId) {
    return normalizedId;
  }

  return [
    "weapon",
    name || `item-${itemHash}`,
    ...conditions.map((condition) => `perk-${condition.perk_hash}`)
  ].join("-")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatRuleName(conditions: Array<{ stat: ArmorStatKey; min: number }>): string {
  return conditions.map((condition) => `${statLabel(condition.stat)}${condition.min}+`).join(" / ");
}

function formatWeaponRuleName(itemName: string, conditions: Array<{ perk_name: string; perk_hash: number }>): string {
  return [
    itemName || "武器",
    conditions.map((condition) => condition.perk_name || `Perk ${condition.perk_hash}`).join(" + ")
  ].join(" / ");
}

function statLabel(stat: ArmorStatKey): string {
  if (stat === "health") return "生命值";
  if (stat === "melee") return "近战";
  if (stat === "grenade") return "手雷";
  if (stat === "super") return "超能";
  if (stat === "class") return "职业";
  return "武器";
}

function isArmorStatKey(value: unknown): value is ArmorStatKey {
  return value === "health"
    || value === "melee"
    || value === "grenade"
    || value === "super"
    || value === "class"
    || value === "weapon";
}

function targetRulesPath(dataDir: string): string {
  return join(dataDir, targetRulesFileName);
}
