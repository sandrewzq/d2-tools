import type { DefinitionComponentData } from "../manifest/definitions.js";
import type { BungieActivityHistoryEntry } from "./history.js";

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
  duration_label?: string;
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
  82: "dungeon",   // Dungeon
  18: "strike",    // Strike (Nightfall)
  46: "strike",    // Strike (Normal)
  5: "crucible",   // PvP
  63: "gambit",    // Gambit
  73: "seasonal",  // Seasonal
  84: "seasonal",  // Seasonal (Onslaught)
  74: "lost_sector", // Lost Sector (activity mode)
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
  return {
    period: activity.period,
    activity_name: activityName(activity, definitions),
    type: classifyActivityBucket(activity),
    completed: isCompleted(activity),
  };
}

function classifyActivityBucket(activity: BungieActivityHistoryEntry): ActivityTypeBucket {
  const modes = activity.activityDetails?.modes ?? [];
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
