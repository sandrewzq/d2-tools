import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import type { DailySummaryItem } from "./summary.js";

/**
 * Build lost sector data from Manifest activity definitions + daily rotation calculation.
 *
 * Falls back from the public milestones API (which doesn't return lost sectors —
 * see Bug #5) to Manifest static data with a deterministic daily rotation schedule.
 */

export type LostSectorEntry = {
  hash: number;
  name: string;
  description?: string;
  destinationName?: string;
  destinationHash?: number;
  lightLevel?: number;
  championTypes?: string[];
  burns?: string[];
  activities?: DefinitionRecord[];
};

export type LostSectorResult = {
  items: DailySummaryItem[];
  source: "manifest-rotation";
  total_known_sectors: number;
};

export type LostSectorBuildOptions = {
  destinations?: DefinitionComponentData | null;
  places?: DefinitionComponentData | null;
  items?: DefinitionComponentData | null;
  modifiers?: DefinitionComponentData | null;
};

/** Current hash and mode type for "Lost Sector" activities in DestinyActivityDefinition. */
const LOST_SECTOR_ACTIVITY_TYPE_HASH = 103143560;
const LOST_SECTOR_ACTIVITY_MODE_TYPE = 87;

/** Known lost sector name keywords in English and Chinese. */
const LOST_SECTOR_NAME_MARKERS = ["lost sector", "遗失区域"];
const WORLD_LOST_SECTOR_DAILY_LIMIT = 9;

/**
 * Extract lost sector activities from Manifest.
 *
 * Uses a two-pass approach:
 * 1. Match by activityTypeHash for exact type match
 * 2. Fall back to name keyword matching for Chinese-localized definitions
 */
export function findLostSectorActivities(
  activityDefinitions: DefinitionComponentData
): LostSectorEntry[] {
  const found = new Map<string, LostSectorEntry>();

  for (const [hashStr, def] of Object.entries(activityDefinitions)) {
    const hash = Number(hashStr);
    if (!Number.isFinite(hash)) continue;

    const name = readableLostSectorName(def);
    if (!name) continue;

    const isMatch =
      isLostSectorByType(def) || isLostSectorByName(name);

    if (!isMatch) continue;

    const key = name.toLocaleLowerCase();
    const existing = found.get(key);
    if (existing) {
      existing.activities = [...(existing.activities ?? []), def];
      continue;
    }
    found.set(key, {
      hash,
      name,
      description: def.displayProperties?.description?.trim(),
      destinationHash: readNumber(def.destinationHash),
      lightLevel: readLightLevel(def),
      activities: [def],
    });
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

/**
 * Build the full lost_sector source data for DailyLiveData.
 *
 * Returns a readable world lost sector list. Official daily availability should
 * come from Bungie character activities when available; Manifest fallback keeps
 * the homepage useful without pretending the old data model is a single sector.
 */
export function buildLostSectorData(
  activityDefinitions: DefinitionComponentData,
  now: Date = new Date(),
  options: LostSectorBuildOptions = {}
): { items: DailySummaryItem[]; source: string; message: string } {
  const all = findLostSectorActivities(activityDefinitions);

  if (!all.length) {
    return {
      items: [],
      source: "manifest-rotation",
      message: "Manifest 中未找到遗失区域定义，请检查 Manifest 是否已初始化。",
    };
  }

  const dailyWorldSectors = all.slice(0, WORLD_LOST_SECTOR_DAILY_LIMIT);

  return {
    items: dailyWorldSectors.map((sector) => buildLostSectorSummaryItem(sector, options)),
    source: "manifest-rotation",
    message: `从 Manifest 共 ${all.length} 个遗失区域中读取，今日展示 ${dailyWorldSectors.length} 个世界遗失区域。`,
  };
}

function buildLostSectorSummaryItem(
  sector: LostSectorEntry,
  options: LostSectorBuildOptions
): DailySummaryItem {
  if (!hasStructuredDefinitions(options)) {
    return {
      title: sector.name,
      description: sector.description,
    };
  }

  const activities = sector.activities ?? [];
  const modifierRecords = activities.flatMap((activity) => readActivityModifiers(activity, options.modifiers));
  const expertActivity = activities.find((activity) => readDifficultyLabel(activity, options.modifiers) === "专家");
  const masterActivity = activities.find((activity) => readDifficultyLabel(activity, options.modifiers) === "大师");

  return {
    title: sector.name,
    destinationName: readDestinationName(sector, activities, options),
    championTypes: extractChampionTypes(modifierRecords),
    shieldTypes: extractShieldTypes(modifierRecords),
    threatType: extractThreatType(modifierRecords),
    expertSoloRewards: readSoloRewards(expertActivity, options.items),
    masterSoloRewards: readSoloRewards(masterActivity, options.items)
  };
}

function hasStructuredDefinitions(options: LostSectorBuildOptions): boolean {
  return Boolean(options.destinations || options.places || options.modifiers);
}

function readActivityModifiers(
  activity: DefinitionRecord,
  modifierDefinitions: DefinitionComponentData | null | undefined
): DefinitionRecord[] {
  const modifiers = activity.modifiers as Array<{ activityModifierHash?: number }> | undefined;
  return (modifiers ?? [])
    .map((modifier) => definitionRecord(modifierDefinitions, modifier.activityModifierHash))
    .filter((modifier): modifier is DefinitionRecord => Boolean(modifier));
}

function readDifficultyLabel(
  activity: DefinitionRecord,
  modifierDefinitions: DefinitionComponentData | null | undefined
): "专家" | "大师" | undefined {
  const name = [
    activity.displayProperties?.name,
    activity.originalDisplayProperties?.name,
    ...readActivityModifiers(activity, modifierDefinitions).map((modifier) => modifier.displayProperties?.name)
  ].filter(Boolean).join(" ");
  if (/大师/.test(name)) return "大师";
  if (/专家/.test(name)) return "专家";
  return undefined;
}

function readDestinationName(
  sector: LostSectorEntry,
  activities: DefinitionRecord[],
  options: LostSectorBuildOptions
): string | undefined {
  const destinationHash = sector.destinationHash ?? activities.map((activity) => readNumber(activity.destinationHash)).find(Boolean);
  const destinationName = definitionRecord(options.destinations, destinationHash)?.displayProperties?.name?.trim();
  if (destinationName) return destinationName;
  const placeHash = activities.map((activity) => readNumber(activity.placeHash)).find(Boolean);
  return definitionRecord(options.places, placeHash)?.displayProperties?.name?.trim();
}

function readSoloRewards(
  activity: DefinitionRecord | undefined,
  itemDefinitions: DefinitionComponentData | null | undefined
): string[] | undefined {
  const rewards = activity?.rewards as Array<{ rewardItems?: Array<{ itemHash?: number }> }> | undefined;
  const names = (rewards ?? [])
    .flatMap((reward) => reward.rewardItems ?? [])
    .map((rewardItem) => definitionRecord(itemDefinitions, rewardItem.itemHash)?.displayProperties?.name?.trim())
    .filter((name): name is string => Boolean(name))
    .filter((name) => /^如若单人\s*-\s*/.test(name))
    .map((name) => name.replace(/^如若单人\s*-\s*/, "").trim())
    .filter(Boolean);
  return names.length ? uniqueInOrder(names) : undefined;
}

function extractChampionTypes(modifiers: DefinitionRecord[]): string[] | undefined {
  const text = modifierText(modifiers.filter((modifier) =>
    (modifier.displayProperties?.name ?? "").includes("勇士")
  ));
  return pickElements(text, ["屏障", "过载", "势不可挡"]);
}

function extractShieldTypes(modifiers: DefinitionRecord[]): string[] | undefined {
  const text = modifierText(modifiers.filter((modifier) =>
    (modifier.displayProperties?.name ?? "").includes("护盾")
  ));
  return pickElements(text, ["电弧", "烈日", "虚空", "冰影", "缚丝"]);
}

function extractThreatType(modifiers: DefinitionRecord[]): string | undefined {
  const threat = modifiers
    .map((modifier) => modifier.displayProperties?.name?.trim() ?? "")
    .find((name) => /威胁/.test(name));
  return pickElements(threat ?? "", ["电弧", "烈日", "虚空", "冰影", "缚丝"])?.[0];
}

function modifierText(modifiers: DefinitionRecord[]): string {
  return modifiers
    .flatMap((modifier) => [modifier.displayProperties?.name, modifier.displayProperties?.description])
    .filter(Boolean)
    .join(" ");
}

function pickElements(text: string, values: string[]): string[] | undefined {
  const found = values.filter((value) => text.includes(value));
  return found.length ? found : undefined;
}

function definitionRecord(
  definitions: DefinitionComponentData | null | undefined,
  hash: number | undefined
): DefinitionRecord | undefined {
  if (hash === undefined) return undefined;
  return definitions?.[String(hash)];
}

function uniqueInOrder(values: string[]): string[] {
  return [...new Set(values)];
}

function isLostSectorByType(def: DefinitionRecord): boolean {
  const typeHash = def.activityTypeHash as number | undefined;
  const modeTypes = def.activityModeTypes as number[] | undefined;
  const directModeType = def.directActivityModeType as number | undefined;
  return typeHash === LOST_SECTOR_ACTIVITY_TYPE_HASH
    || directModeType === LOST_SECTOR_ACTIVITY_MODE_TYPE
    || Boolean(modeTypes?.includes(LOST_SECTOR_ACTIVITY_MODE_TYPE));
}

function isLostSectorByName(name: string): boolean {
  const lower = name.toLowerCase();
  return LOST_SECTOR_NAME_MARKERS.some((marker) =>
    lower.includes(marker)
  );
}

function readLightLevel(def: DefinitionRecord): number | undefined {
  const ll = def.activityLightLevel as number | undefined;
  if (typeof ll === "number" && ll > 0) return ll;
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readableLostSectorName(def: DefinitionRecord): string | undefined {
  const originalName = def.originalDisplayProperties?.name?.trim();
  const displayName = def.displayProperties?.name?.trim();
  const name = originalName && !isQuestionMarkPlaceholder(originalName) ? originalName : displayName;
  return stripLostSectorDifficulty(name);
}

function isQuestionMarkPlaceholder(value: string): boolean {
  return /^\?+$/.test(value);
}

function stripLostSectorDifficulty(name: string | undefined): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;

  return trimmed.replace(
    /\s*[:：]\s*(专家|大师|传说|英雄|得心应手|expert|master|legend|hero)\s*$/i,
    ""
  ).trim();
}
