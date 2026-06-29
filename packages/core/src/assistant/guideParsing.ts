import type {
  BuildGuideParseResult,
  BuildGuideRequirement,
  GuideArmorStatRequirement,
  GuideWeaponRequirement,
  RequirementConfidence
} from "./guideSchema.js";

const statAliases: Record<string, GuideArmorStatRequirement["stat"]> = {
  敏捷: "mobility",
  mobility: "mobility",
  韧性: "resilience",
  resilience: "resilience",
  恢复: "recovery",
  recovery: "recovery",
  纪律: "discipline",
  discipline: "discipline",
  智慧: "intellect",
  intellect: "intellect",
  力量: "strength",
  strength: "strength"
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
  requirement.armor_stats = normalizeStats(parsed.armor_stats, warnings);
  requirement.mods = stringArray(parsed.mods).map((name) => ({ name, confidence: "medium" }));
  requirement.aspects = stringArray(parsed.aspects).map((name) => ({ name, confidence: "medium" }));
  requirement.fragments = stringArray(parsed.fragments).map((name) => ({ name, confidence: "medium" }));
  requirement.notes = stringArray(parsed.notes);

  return { requirement, parser: "ai-json", warnings };
}

export function parseBuildGuideFallback(rawText: string): BuildGuideParseResult {
  const requirement = emptyRequirement(rawText);

  if (/术士|warlock/i.test(rawText)) requirement.class_name = { value: "术士", confidence: "medium" };
  if (/泰坦|titan/i.test(rawText)) requirement.class_name = { value: "泰坦", confidence: "medium" };
  if (/猎人|hunter/i.test(rawText)) requirement.class_name = { value: "猎人", confidence: "medium" };
  if (/虚空|void/i.test(rawText)) requirement.subclass = { value: "虚空", confidence: "medium" };
  if (/电弧|arc/i.test(rawText)) requirement.subclass = { value: "电弧", confidence: "medium" };
  if (/烈日|solar/i.test(rawText)) requirement.subclass = { value: "烈日", confidence: "medium" };
  if (/缚丝|strand/i.test(rawText)) requirement.subclass = { value: "缚丝", confidence: "medium" };
  if (/冰影|stasis/i.test(rawText)) requirement.subclass = { value: "冰影", confidence: "medium" };

  for (const name of ["反转手", "凤凰协议", "星火协议", "加拉诺碎片", "虫神之抚"]) {
    if (rawText.includes(name)) {
      requirement.exotic_armor.push({ name, confidence: "medium" });
    }
  }

  for (const name of ["漏斗网", "Funnelweb"]) {
    if (rawText.toLocaleLowerCase().includes(name.toLocaleLowerCase())) {
      requirement.weapons.push({ name, confidence: "medium", requirement: "specific" });
    }
  }

  for (const [label, stat] of Object.entries(statAliases)) {
    const match = rawText.match(new RegExp(`${label}\\s*(\\d{2,3})`, "i"));
    if (match?.[1]) {
      requirement.armor_stats.push({ stat, minimum: Number(match[1]), confidence: "medium" });
    }
  }

  if (/虚空武器|void weapon/i.test(rawText)) {
    requirement.weapons.push({ name: "虚空武器", confidence: "low", requirement: "element" });
    requirement.needs_confirmation.push("虚空武器没有指定具体装备");
  }

  return { requirement, parser: "local-fallback", warnings: ["AI 结构化解析不可用，已使用本地关键词解析。"] };
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

function normalizeStats(value: unknown, warnings: string[]): GuideArmorStatRequirement[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const statKey = typeof record.stat === "string" ? statAliases[record.stat] : undefined;
    const minimum = typeof record.minimum === "number" ? record.minimum : Number(record.minimum);
    if (!statKey || !Number.isFinite(minimum)) {
      warnings.push("存在无法识别的护甲属性要求。");
      return [];
    }

    return [{ stat: statKey, minimum, confidence: "high" as const }];
  });
}
