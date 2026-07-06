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
  lightLevel?: number;
  championTypes?: string[];
  burns?: string[];
};

export type LostSectorResult = {
  items: DailySummaryItem[];
  source: "manifest-rotation";
  total_known_sectors: number;
};

/** Hash for "Lost Sector" activity type in DestinyActivityDefinition. */
const LOST_SECTOR_ACTIVITY_TYPE_HASH = 2724706103;

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
  const found = new Map<number, LostSectorEntry>();

  for (const [hashStr, def] of Object.entries(activityDefinitions)) {
    const hash = Number(hashStr);
    if (!Number.isFinite(hash)) continue;

    const name = def.displayProperties?.name?.trim();
    if (!name) continue;

    const isMatch =
      isLostSectorByType(def) || isLostSectorByName(name);

    if (!isMatch) continue;

    if (found.has(hash)) continue;
    found.set(hash, {
      hash,
      name,
      description: def.displayProperties?.description?.trim(),
      lightLevel: readLightLevel(def),
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
  now: Date = new Date()
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
    items: dailyWorldSectors.map((sector) => ({
      title: `遗失区域：${sector.name}`,
      subtitle: sector.lightLevel
        ? `推荐光等 ${sector.lightLevel} · 世界遗失区域`
        : "世界遗失区域",
      description: sector.description,
      source: "Manifest 世界遗失区域",
    })),
    source: "manifest-rotation",
    message: `从 Manifest 共 ${all.length} 个遗失区域中读取，今日展示 ${dailyWorldSectors.length} 个世界遗失区域。`,
  };
}

function isLostSectorByType(def: DefinitionRecord): boolean {
  const typeHash = def.activityTypeHash as number | undefined;
  return typeHash === LOST_SECTOR_ACTIVITY_TYPE_HASH;
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
