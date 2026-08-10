import type { ArmorStatKey } from "../loadouts/analysis.js";
import type {
  BuildGuideParseResult,
  BuildGuideRequirement,
  GuideArmorStatRequirement,
  GuideWeaponRequirement,
  RequirementConfidence
} from "./guideSchema.js";

const statAliases: Record<string, { stat: ArmorStatKey; mapping: "direct" | "legacy-alias" }> = {
  生命值: { stat: "health", mapping: "direct" },
  health: { stat: "health", mapping: "direct" },
  近战: { stat: "melee", mapping: "direct" },
  melee: { stat: "melee", mapping: "direct" },
  手雷: { stat: "grenade", mapping: "direct" },
  grenade: { stat: "grenade", mapping: "direct" },
  超能: { stat: "super", mapping: "direct" },
  super: { stat: "super", mapping: "direct" },
  职业: { stat: "class", mapping: "direct" },
  class: { stat: "class", mapping: "direct" },
  武器: { stat: "weapon", mapping: "direct" },
  weapon: { stat: "weapon", mapping: "direct" },
  敏捷: { stat: "class", mapping: "legacy-alias" },
  mobility: { stat: "class", mapping: "legacy-alias" },
  韧性: { stat: "health", mapping: "legacy-alias" },
  resilience: { stat: "health", mapping: "legacy-alias" },
  恢复: { stat: "weapon", mapping: "legacy-alias" },
  recovery: { stat: "weapon", mapping: "legacy-alias" },
  纪律: { stat: "grenade", mapping: "legacy-alias" },
  discipline: { stat: "grenade", mapping: "legacy-alias" },
  智慧: { stat: "super", mapping: "legacy-alias" },
  intellect: { stat: "super", mapping: "legacy-alias" },
  力量: { stat: "melee", mapping: "legacy-alias" },
  strength: { stat: "melee", mapping: "legacy-alias" }
};

export function parseBuildGuideFromAiJson(rawText: string, aiText: string): BuildGuideParseResult {
  const warnings: string[] = [];
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(aiText) as Record<string, unknown>;
  } catch {
    return parseBuildGuideFallback(rawText);
  }

  const requirement = emptyRequirement(rawText);
  requirement.class_name = confidentString(parsed.class_name);
  requirement.subclass = confidentString(parsed.subclass);
  requirement.exotic_armor = stringArray(parsed.exotic_armor).map((name) => ({ name, confidence: "high" }));
  requirement.weapons = normalizeWeapons(parsed.weapons, requirement.needs_confirmation);
  requirement.armor_stats = normalizeStats(parsed.armor_stats, warnings, requirement.needs_confirmation);
  requirement.mods = stringArray(parsed.mods).map((name) => ({ name, confidence: "medium" }));
  requirement.aspects = stringArray(parsed.aspects).map((name) => ({ name, confidence: "medium" }));
  requirement.fragments = stringArray(parsed.fragments).map((name) => ({ name, confidence: "medium" }));
  requirement.notes = stringArray(parsed.notes);

  return { requirement, parser: "ai-json", warnings };
}

export function parseBuildGuideFallback(rawText: string): BuildGuideParseResult {
  const requirement = emptyRequirement(rawText);

  applyStructuredGuideFields(rawText, requirement);

  if (!requirement.class_name && /术士|warlock/i.test(rawText)) requirement.class_name = { value: "术士", confidence: "medium" };
  if (!requirement.class_name && /泰坦|titan/i.test(rawText)) requirement.class_name = { value: "泰坦", confidence: "medium" };
  if (!requirement.class_name && /猎人|hunter/i.test(rawText)) requirement.class_name = { value: "猎人", confidence: "medium" };
  if (!requirement.subclass && /虚空|void/i.test(rawText)) requirement.subclass = { value: "虚空", confidence: "medium" };
  if (!requirement.subclass && /电弧|arc/i.test(rawText)) requirement.subclass = { value: "电弧", confidence: "medium" };
  if (!requirement.subclass && /烈日|solar/i.test(rawText)) requirement.subclass = { value: "烈日", confidence: "medium" };
  if (!requirement.subclass && /缚丝|strand/i.test(rawText)) requirement.subclass = { value: "缚丝", confidence: "medium" };
  if (!requirement.subclass && /冰影|stasis/i.test(rawText)) requirement.subclass = { value: "冰影", confidence: "medium" };

  for (const name of ["反转手", "凤凰协议", "星火协议", "加拉诺碎片", "虫神之抚"]) {
    if (rawText.includes(name) && !requirement.exotic_armor.some((entry) => entry.name === name)) {
      requirement.exotic_armor.push({ name, confidence: "medium" });
    }
  }

  for (const name of ["漏斗网", "Funnelweb"]) {
    if (rawText.toLocaleLowerCase().includes(name.toLocaleLowerCase())
      && !requirement.weapons.some((entry) => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      requirement.weapons.push({ name, confidence: "medium", requirement: "specific" });
    }
  }

  for (const [label, alias] of Object.entries(statAliases)) {
    const match = rawText.match(new RegExp(`${label}\\s*(\\d{2,3})`, "i"));
    if (match?.[1]) {
      requirement.armor_stats.push({
        stat: alias.stat,
        source_label: label,
        mapping: alias.mapping,
        minimum: Number(match[1]),
        confidence: "medium"
      });
      if (alias.mapping === "legacy-alias") {
        requirement.needs_confirmation.push(`${label}是旧护甲属性名称，已暂映射为${formatArmorStat(alias.stat)}，需要确认攻略语义`);
      }
    }
  }

  if (/虚空武器|void weapon/i.test(rawText)) {
    requirement.weapons.push({ name: "虚空武器", confidence: "low", requirement: "element" });
    requirement.needs_confirmation.push("虚空武器没有指定具体装备");
  }

  return { requirement, parser: "local-fallback", warnings: ["AI 结构化解析不可用，已使用本地关键词解析。"] };
}

function applyStructuredGuideFields(rawText: string, requirement: BuildGuideRequirement): void {
  for (const line of rawText.split(/\r?\n/)) {
    const match = line.match(/^\s*[-*]?\s*([^:：]{1,24})\s*[:：]\s*(.+?)\s*$/);
    if (!match?.[1] || !match[2]) continue;
    const key = match[1].trim().toLocaleLowerCase("zh-CN");
    const values = splitStructuredValues(match[2]);
    if (!values.length) continue;

    if (/^(职业|class)$/.test(key)) requirement.class_name = { value: values[0]!, confidence: "high" };
    else if (/^(子职业|分支|subclass)$/.test(key)) requirement.subclass = { value: values[0]!, confidence: "high" };
    else if (/^(异域护甲|异域|exotic armor)$/.test(key)) appendNamed(requirement.exotic_armor, values);
    else if (/^(武器|主武器|能量武器|威能武器|weapon|weapons)$/.test(key)) {
      for (const name of values) appendWeapon(requirement.weapons, { name, confidence: "high", requirement: "specific" });
    } else if (/^(模组|mods?)$/.test(key)) appendNamed(requirement.mods, values);
    else if (/^(星相|aspects?)$/.test(key)) appendNamed(requirement.aspects, values);
    else if (/^(碎片|fragments?)$/.test(key)) appendNamed(requirement.fragments, values);
  }
}

function splitStructuredValues(value: string): string[] {
  return value.split(/[、,，;；|]/).map((entry) => entry.trim()).filter(Boolean);
}

function appendNamed(target: Array<{ name: string; confidence: RequirementConfidence }>, values: string[]): void {
  for (const name of values) {
    if (!target.some((entry) => entry.name.toLocaleLowerCase("zh-CN") === name.toLocaleLowerCase("zh-CN"))) {
      target.push({ name, confidence: "high" });
    }
  }
}

function appendWeapon(target: GuideWeaponRequirement[], value: GuideWeaponRequirement): void {
  if (!target.some((entry) => entry.name.toLocaleLowerCase("zh-CN") === value.name.toLocaleLowerCase("zh-CN"))) {
    target.push(value);
  }
}

function emptyRequirement(rawText: string): BuildGuideRequirement {
  return {
    raw_text: rawText,
    exotic_armor: [],
    weapons: [],
    armor_stats: [],
    mods: [],
    aspects: [],
    fragments: [],
    notes: [],
    needs_confirmation: []
  };
}

function confidentString(value: unknown): { value: string; confidence: RequirementConfidence } | undefined {
  return typeof value === "string" && value.trim()
    ? { value: value.trim(), confidence: "high" }
    : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeWeapons(value: unknown, confirmations: string[]): GuideWeaponRequirement[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "string") {
      return [{ name: item.trim(), confidence: "medium", requirement: "specific" } satisfies GuideWeaponRequirement];
    }
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) return [];

    const requirement = record.requirement === "element"
      || record.requirement === "archetype"
      || record.requirement === "role"
      ? record.requirement
      : "specific";
    if (requirement !== "specific") {
      confirmations.push(`${name}没有指定具体装备`);
    }

    const weapon: GuideWeaponRequirement = {
      name,
      requirement,
      confidence: requirement === "specific" ? "high" : "medium",
      perk_names: stringArray(record.perk_names)
    };
    return [weapon];
  });
}

function normalizeStats(
  value: unknown,
  warnings: string[],
  confirmations: string[]
): GuideArmorStatRequirement[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const sourceLabel = typeof record.stat === "string" ? record.stat.trim() : "";
    const alias = statAliases[sourceLabel.toLocaleLowerCase()] ?? statAliases[sourceLabel];
    const minimum = typeof record.minimum === "number" ? record.minimum : Number(record.minimum);
    if (!alias || !Number.isFinite(minimum)) {
      warnings.push("存在无法识别的护甲属性要求。");
      return [];
    }
    if (alias.mapping === "legacy-alias") {
      confirmations.push(`${sourceLabel}是旧护甲属性名称，已暂映射为${formatArmorStat(alias.stat)}，需要确认攻略语义`);
    }
    return [{
      stat: alias.stat,
      source_label: sourceLabel,
      mapping: alias.mapping,
      minimum,
      confidence: "high" as const
    }];
  });
}

function formatArmorStat(stat: ArmorStatKey): string {
  return {
    health: "生命值",
    melee: "近战",
    grenade: "手雷",
    super: "超能",
    class: "职业",
    weapon: "武器"
  }[stat];
}
