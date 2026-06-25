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
 * Calculate which lost sector(s) are active today based on daily rotation.
 *
 * The rotation uses a fixed daily index: floor(days since epoch / 1) % poolSize.
 * This is intentionally simple — Destiny 2's actual rotation follows a seasonal
 * pool, but the daily index gives a correct daily result when the pool is stable.
 */
export function getTodaysLostSectorIndex(
  poolSize: number,
  now: Date = new Date()
): number {
  if (poolSize <= 0) return -1;
  const dailyResetHourUtc = 17;
  const today = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    dailyResetHourUtc,
    0,
    0,
    0
  ));
  // Use days since epoch as the rotation seed
  const epochDays = Math.floor(today.getTime() / (24 * 60 * 60 * 1000));
  return epochDays % poolSize;
}

/**
 * Build the full lost_sector source data for DailyLiveData.
 *
 * Returns the daily active lost sector + context about the manifest pool.
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

  const index = getTodaysLostSectorIndex(all.length, now);
  const today = all[index];

  if (!today) {
    return {
      items: [],
      source: "manifest-rotation",
      message: `遗失区域轮换计算出错：共 ${all.length} 个，今日索引 ${index} 无效。`,
    };
  }

  const item: DailySummaryItem = {
    title: `遗失区域：${today.name}`,
    subtitle: today.lightLevel
      ? `推荐光等 ${today.lightLevel} · 每日轮换 (${all.length} 选 1)`
      : `每日轮换 (${all.length} 选 1)`,
    description: today.description,
    source: "Manifest 轮换推算",
  };

  return {
    items: [item],
    source: "manifest-rotation",
    message: `从 Manifest 共 ${all.length} 个遗失区域中推算今日轮换。`,
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
