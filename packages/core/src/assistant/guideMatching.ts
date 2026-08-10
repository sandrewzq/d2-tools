import type { AccountItemSummary } from "../account/summary.js";
import type {
  BuildGuideMatchResult,
  BuildGuideRequirement,
  GuideMatchedItem,
  GuideWeaponRequirement
} from "./guideSchema.js";

export type MatchBuildGuideToAccountInput = {
  requirement: BuildGuideRequirement;
  items: AccountItemSummary[];
  targetCharacterId?: string;
};

export function matchBuildGuideToAccount(input: MatchBuildGuideToAccountInput): BuildGuideMatchResult {
  const matchedItems: GuideMatchedItem[] = [];
  const alternativeItems: GuideMatchedItem[] = [];
  const missingRequirements: string[] = [];
  const needsConfirmation = [...input.requirement.needs_confirmation];

  for (const exotic of input.requirement.exotic_armor) {
    const matches = findAllByName(input.items, exotic.name, (item) => item.group_key === "armor");
    if (!matches.length) {
      missingRequirements.push(`缺少异域护甲：${exotic.name}`);
    } else if (matches.length === 1) {
      matchedItems.push(toMatchedItem(matches[0]!, "matched", "命中异域护甲要求"));
    } else {
      alternativeItems.push(...matches.map((item) => toMatchedItem(item, "needs_confirmation", "同名异域护甲需要选择具体实例")));
      needsConfirmation.push(`${exotic.name}匹配到 ${matches.length} 个账号实例，需要选择具体实例`);
    }
  }

  for (const weapon of input.requirement.weapons) {
    matchWeaponRequirement(weapon, input.items, matchedItems, alternativeItems, missingRequirements, needsConfirmation);
  }

  const dedupedMatchedItems = dedupeItems(matchedItems);
  const dedupedAlternatives = dedupeItems(alternativeItems);
  const summary = `已匹配 ${dedupedMatchedItems.length} 件装备，识别 ${input.requirement.armor_stats.length} 项聚合护甲目标，缺少 ${missingRequirements.length} 项，需要确认 ${needsConfirmation.length} 项。`;

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

  const namedItems = findAllByName(items, weapon.name, (item) => item.group_key === "weapons");
  if (!namedItems.length) {
    missingRequirements.push(`缺少武器：${weapon.name}`);
    return;
  }

  const evaluated = namedItems.map((item) => ({
    item,
    missingPerks: (weapon.perk_names ?? []).filter((perkName) => !hasPlug(item, perkName))
  }));
  const complete = evaluated.filter((entry) => entry.missingPerks.length === 0);
  const onlyComplete = complete[0];
  if (complete.length === 1 && onlyComplete) {
    matchedItems.push(toMatchedItem(
      onlyComplete.item,
      "matched",
      weapon.perk_names?.length ? "唯一命中武器和 perk 要求" : "唯一命中武器要求"
    ));
    return;
  }
  if (complete.length > 1) {
    alternativeItems.push(...complete.map((entry) => toMatchedItem(
      entry.item,
      "needs_confirmation",
      weapon.perk_names?.length ? "多个实例命中武器和 perk 要求" : "多个同名实例命中武器要求"
    )));
    needsConfirmation.push(`${weapon.name}匹配到 ${complete.length} 个完整账号实例，需要选择具体实例`);
    return;
  }

  alternativeItems.push(...evaluated.map((entry) => toMatchedItem(
    entry.item,
    "partial",
    `缺少 perk：${entry.missingPerks.join("、")}`
  )));
  const missingPerks = [...new Set(evaluated.flatMap((entry) => entry.missingPerks))];
  missingRequirements.push(`${weapon.name} 缺少 perk：${missingPerks.join("、")}`);
}

function findAllByName(
  items: AccountItemSummary[],
  name: string,
  predicate: (item: AccountItemSummary) => boolean
): AccountItemSummary[] {
  const normalizedName = normalize(name);
  return items.filter((item) => predicate(item) && normalize(item.name).includes(normalizedName));
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
    group_key: item.group_key,
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
