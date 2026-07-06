import type { DefinitionComponentData } from "../manifest/definitions.js";
import type { BungieActivityHistoryEntry, BungieActivityStat } from "./history.js";
import { activityModeValues } from "./modes.js";

/**
 * Activity review enhancement — better grouping, timeline, and quick-review views.
 *
 * Built on top of the existing activity history data from Bungie's character stats
 * endpoint. Adds activity-type grouping, completion streaks, and "last N" timeline
 * views without requiring PGCR lookups.
 */

export type ActivityTypeBucket = "raid" | "dungeon" | "strike" | "crucible" | "gambit" | "seasonal" | "lost_sector" | "other";

export type ActivityTimelineEntry = {
  period: string;
  activity_name: string;
  type: ActivityTypeBucket;
  completed: boolean;
  status_label: string;
  duration_label?: string;
  key_stats: string[];
};

export type ActivityTypeGroup = {
  type: ActivityTypeBucket;
  label: string;
  total: number;
  completed: number;
  completion_rate: number;
  entries: ActivityTimelineEntry[];
};

export type ActivityReview = {
  total_activities: number;
  completed_count: number;
  completion_rate: number;
  latest_period?: string;
  groups: ActivityTypeGroup[];
  recent_10: ActivityTimelineEntry[];
  completions_in_a_row: number;
};

/** Bungie activity mode → our bucket mapping. */
const MODE_BUCKET_MAP: Record<number, ActivityTypeBucket> = {
  4: "raid",       // Raid
  64: "dungeon",   // Dungeon
  82: "dungeon",   // Dungeon
  3: "strike",     // Strike
  16: "strike",    // Nightfall
  17: "strike",    // Heroic Nightfall
  18: "strike",    // Strike (Nightfall)
  46: "strike",    // Strike (Normal)
  5: "crucible",   // PvP
  10: "crucible",  // Control
  12: "crucible",  // Clash
  19: "crucible",  // Iron Banner
  25: "crucible",  // Mayhem
  31: "crucible",  // Supremacy
  37: "crucible",  // Survival
  38: "crucible",  // Countdown
  39: "crucible",  // Trials of the Nine
  43: "crucible",  // Iron Banner Control
  48: "crucible",  // Rumble
  65: "crucible",  // Team Scorched
  71: "crucible",  // Clash Quickplay
  72: "crucible",  // Clash Competitive
  73: "crucible",  // Control Quickplay
  74: "crucible",  // Control Competitive
  80: "crucible",  // Elimination
  81: "crucible",  // Momentum
  84: "crucible",  // Trials of Osiris
  88: "crucible",  // Rift
  89: "crucible",  // Zone Control
  90: "crucible",  // Iron Banner Rift
  91: "crucible",  // Iron Banner Zone Control
  92: "crucible",  // Relic
  63: "gambit",    // Gambit
  75: "gambit",    // Gambit Prime
  76: "seasonal",  // Reckoning
  77: "seasonal",  // Menagerie
  78: "seasonal",  // Vex Offensive
  79: "seasonal",  // Nightmare Hunt
  83: "seasonal",  // Sundial
  85: "seasonal",  // Dares
  86: "seasonal",  // Offensive
  87: "lost_sector", // Lost Sector
};

const BUCKET_LABELS: Record<ActivityTypeBucket, string> = {
  raid: "突袭",
  dungeon: "地牢",
  strike: "打击",
  crucible: "熔炉竞技场",
  gambit: "智谋",
  seasonal: "赛季活动",
  lost_sector: "遗失区域",
  other: "其他",
};

/**
 * Build a comprehensive activity review from character activity history.
 */
export function buildActivityReview(
  activities: BungieActivityHistoryEntry[],
  activityDefinitions: DefinitionComponentData = {}
): ActivityReview {
  const timeline = activities.map((a) => toTimelineEntry(a, activityDefinitions));
  const groups = groupByType(timeline);

  const total = activities.length;
  const completedCount = timeline.filter((e) => e.completed).length;

  return {
    total_activities: total,
    completed_count: completedCount,
    completion_rate: total > 0 ? Math.round((completedCount / total) * 100) : 0,
    latest_period: timeline[0]?.period,
    groups,
    recent_10: timeline.slice(0, 10),
    completions_in_a_row: countCompletionsInARow(timeline),
  };
}

function toTimelineEntry(
  activity: BungieActivityHistoryEntry,
  definitions: DefinitionComponentData
): ActivityTimelineEntry {
  const completed = isCompleted(activity);
  return {
    period: activity.period,
    activity_name: activityName(activity, definitions),
    type: classifyActivityBucket(activity),
    completed,
    status_label: completed ? "已完成" : "未完成",
    duration_label: activityDurationLabel(activity),
    key_stats: activityKeyStats(activity),
  };
}

function classifyActivityBucket(activity: BungieActivityHistoryEntry): ActivityTypeBucket {
  const modes = activityModeValues(activity);
  for (const mode of modes) {
    const bucket = MODE_BUCKET_MAP[mode];
    if (bucket) return bucket;
  }
  return "other";
}

function activityName(
  activity: BungieActivityHistoryEntry,
  definitions: DefinitionComponentData
): string {
  const referenceId =
    activity.activityDetails?.referenceId ??
    activity.activityDetails?.directorActivityHash;
  if (!referenceId) return "未知活动";

  const def = definitions[String(referenceId)];
  return def?.displayProperties?.name?.trim() || `Activity ${referenceId}`;
}

function isCompleted(activity: BungieActivityHistoryEntry): boolean {
  return Number(activity.values?.completed?.basic?.value ?? 0) > 0;
}

function activityDurationLabel(activity: BungieActivityHistoryEntry): string | undefined {
  const stat = activity.values?.activityDurationSeconds?.basic;
  if (stat?.displayValue) {
    return stat.displayValue;
  }
  const seconds = Number(stat?.value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return undefined;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

function activityKeyStats(activity: BungieActivityHistoryEntry): string[] {
  return [
    formatActivityStat("击杀", activity.values?.kills),
    formatActivityStat("死亡", activity.values?.deaths),
    formatActivityStat("助攻", activity.values?.assists),
    formatActivityStat("效率", activity.values?.efficiency),
  ].filter(Boolean) as string[];
}

function formatActivityStat(
  label: string,
  stat: BungieActivityStat | undefined
): string | undefined {
  const basic = stat?.basic;
  const value = basic?.displayValue ?? basic?.value;
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return `${label} ${value}`;
}

function groupByType(entries: ActivityTimelineEntry[]): ActivityTypeGroup[] {
  const groupMap = new Map<ActivityTypeBucket, ActivityTimelineEntry[]>();

  for (const entry of entries) {
    const list = groupMap.get(entry.type) ?? [];
    list.push(entry);
    groupMap.set(entry.type, list);
  }

  const groups: ActivityTypeGroup[] = [];
  for (const [type, list] of groupMap) {
    const completed = list.filter((e) => e.completed).length;
    groups.push({
      type,
      label: BUCKET_LABELS[type],
      total: list.length,
      completed,
      completion_rate: list.length > 0 ? Math.round((completed / list.length) * 100) : 0,
      entries: list.slice(0, 5),
    });
  }

  return groups.sort((a, b) => b.total - a.total);
}

function countCompletionsInARow(entries: ActivityTimelineEntry[]): number {
  let streak = 0;
  for (const entry of entries) {
    if (entry.completed) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}
