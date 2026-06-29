import type { AccountItemSummary } from "../account/summary.js";
import type {
  BuildGuideMatchResult,
  BuildGuideRequirement,
  GuideArmorStatRequirement,
  GuideMatchedItem,
  GuideWeaponRequirement
} from "./guideSchema.js";

export type MatchBuildGuideToAccountInput = {
  requirement: BuildGuideRequirement;
  items: AccountItemSummary[];
  targetCharacterId?: string;
};

const armorStatToAccountKey: Record<GuideArmorStatRequirement["stat"], keyof NonNullable<AccountItemSummary["armor_stats"]>> = {
  mobility: "class",
  resilience: "health",
  recovery: "weapon",
  discipline: "grenade",
  intellect: "super",
  strength: "melee"
};

export function matchBuildGuideToAccount(input: MatchBuildGuideToAccountInput): BuildGuideMatchResult {
  const matchedItems: GuideMatchedItem[] = [];
  const alternativeItems: GuideMatchedItem[] = [];
  const missingRequirements: string[] = [];
  const needsConfirmation = [...input.requirement.needs_confirmation];

  for (const exotic of input.requirement.exotic_armor) {
    const matched = findByName(input.items, exotic.name, (item) => item.group_key === "armor");
    if (matched) {
      matchedItems.push(toMatchedItem(matched, "matched", "命中异域护甲要求"));
    } else {
      missingRequirements.push(`缺少异域护甲：${exotic.name}`);
    }
  }

  for (const weapon of input.requirement.weapons) {
    matchWeaponRequirement(weapon, input.items, matchedItems, alternativeItems, missingRequirements, needsConfirmation);
  }

  for (const stat of input.requirement.armor_stats) {
    const accountStatKey = armorStatToAccountKey[stat.stat];
    const matched = input.items.find((item) => item.group_key === "armor" && (item.armor_stats?.[accountStatKey] ?? 0) >= stat.minimum);
    if (matched) {
      matchedItems.push(toMatchedItem(matched, "matched", `满足 ${formatStat(stat.stat)} ${stat.minimum}`));
    } else {
      missingRequirements.push(`缺少 ${formatStat(stat.stat)} ${stat.minimum} 的护甲`);
    }
  }

  const dedupedMatchedItems = dedupeItems(matchedItems);
  const dedupedAlternatives = dedupeItems(alternativeItems);
  const summary = `已满足 ${dedupedMatchedItems.length} 项，缺少 ${missingRequirements.length} 项，需要确认 ${needsConfirmation.length} 项。`;

  return {
    requirement: input.requirement,
    matched_items: dedupedMatchedItems,
    missing_requirements: [...new Set(missingRequirements)],
    alternative_items: dedupedAlternatives,
    needs_confirmation: [...new Set(needsConfirmation)],
    summary
  };
}

function matchWeaponRequirement(
  weapon: GuideWeaponRequirement,
  items: AccountItemSummary[],
  matchedItems: GuideMatchedItem[],
  alternativeItems: GuideMatchedItem[],
  missingRequirements: string[],
  needsConfirmation: string[]
): void {
  if (weapon.requirement !== "specific") {
    const alternatives = findWeaponAlternatives(items, weapon.name);
    alternativeItems.push(...alternatives.map((item) => toMatchedItem(item, "needs_confirmation", `可能满足 ${weapon.name}`)));
    if (!alternatives.length) {
      missingRequirements.push(`缺少可确认的武器要求：${weapon.name}`);
    }
    needsConfirmation.push(`${weapon.name}没有指定具体装备`);
    return;
  }

  const matched = findByName(items, weapon.name, (item) => item.group_key === "weapons");
  if (!matched) {
    missingRequirements.push(`缺少武器：${weapon.name}`);
    return;
  }

  const missingPerks = (weapon.perk_names ?? []).filter((perkName) => !hasPlug(matched, perkName));
  if (missingPerks.length) {
    alternativeItems.push(toMatchedItem(matched, "partial", `缺少 perk：${missingPerks.join("、")}`));
    missingRequirements.push(`${weapon.name} 缺少 perk：${missingPerks.join("、")}`);
    return;
  }

  matchedItems.push(toMatchedItem(matched, "matched", weapon.perk_names?.length ? "命中武器和 perk 要求" : "命中武器要求"));
}

function findByName(
  items: AccountItemSummary[],
  name: string,
  predicate: (item: AccountItemSummary) => boolean
): AccountItemSummary | undefined {
  const normalizedName = normalize(name);
  return items.find((item) => predicate(item) && normalize(item.name).includes(normalizedName));
}

function findWeaponAlternatives(items: AccountItemSummary[], name: string): AccountItemSummary[] {
  const normalizedName = normalize(name);
  const elementHint = normalizedName.replace(/武器|weapon/g, "");
  return items
    .filter((item) => item.group_key === "weapons")
    .filter((item) => normalize(`${item.name} ${item.item_type ?? ""}`).includes(elementHint))
    .slice(0, 5);
}

function hasPlug(item: AccountItemSummary, plugName: string): boolean {
  const normalizedPlugName = normalize(plugName);
  return item.socket_plugs.some((plug) => normalize(plug.name).includes(normalizedPlugName));
}

function toMatchedItem(item: AccountItemSummary, status: GuideMatchedItem["status"], reason: string): GuideMatchedItem {
  return {
    hash: item.hash,
    instance_id: item.instance_id,
    name: item.name,
    bucket_name: item.bucket_name,
    item_type: item.item_type,
    status,
    reason
  };
}

function dedupeItems(items: GuideMatchedItem[]): GuideMatchedItem[] {
  const seen = new Set<string>();
  const result: GuideMatchedItem[] = [];
  for (const item of items) {
    const key = item.instance_id ?? String(item.hash);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function formatStat(stat: GuideArmorStatRequirement["stat"]): string {
  const labels: Record<GuideArmorStatRequirement["stat"], string> = {
    mobility: "敏捷",
    resilience: "韧性",
    recovery: "恢复",
    discipline: "纪律",
    intellect: "智慧",
    strength: "力量"
  };
  return labels[stat];
}
