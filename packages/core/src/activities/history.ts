import type { DefinitionComponentData } from "../manifest/definitions.js";
import { activityModeValues, isPveActivityMode, isPvpActivityMode } from "./modes.js";
import { buildActivityReview, type ActivityReview } from "./review.js";
import { summarizeRaidAndDungeonActivities, type RaidDungeonActivityInput, type RaidDungeonSummary } from "./raidSummary.js";
import { summarizeRecentActivities, type RecentActivityInput, type RecentActivitySummary } from "./recent.js";

export type BungieActivityStat = {
  basic?: {
    value?: number;
    displayValue?: string;
  };
};

export type BungieActivityHistoryEntry = {
  period: string;
  activityDetails?: {
    referenceId?: number;
    directorActivityHash?: number;
    instanceId?: string;
    mode?: number;
    modes?: number[];
  };
  values?: Record<string, BungieActivityStat | undefined> & {
    completed?: BungieActivityStat;
    activityDurationSeconds?: BungieActivityStat;
    kills?: BungieActivityStat;
    deaths?: BungieActivityStat;
    assists?: BungieActivityStat;
    efficiency?: BungieActivityStat;
  };
};

export type CharacterActivityHistoryResponse = {
  activities?: BungieActivityHistoryEntry[];
};

export type ActivityHistorySummary = {
  recent: RecentActivitySummary;
  raids: RaidDungeonSummary;
  review: ActivityReview;
  recent_items: Array<{
    activity_name: string;
    mode: "pve" | "pvp" | "other";
    completed: boolean;
    period: string;
  }>;
};

export function summarizeActivityHistory(
  activities: BungieActivityHistoryEntry[],
  activityDefinitions: DefinitionComponentData = {}
): ActivityHistorySummary {
  const sortedActivities = sortActivitiesByPeriod(activities);
  const recentInputs: RecentActivityInput[] = sortedActivities.map((activity) => ({
    mode: classifyActivityMode(activity),
    completed: isCompleted(activity),
    period: activity.period
  }));
  const raidInputs: RaidDungeonActivityInput[] = sortedActivities
    .map((activity) => toRaidDungeonInput(activity, activityDefinitions))
    .filter((activity): activity is RaidDungeonActivityInput => Boolean(activity));

  return {
    recent: summarizeRecentActivities(recentInputs),
    raids: summarizeRaidAndDungeonActivities(raidInputs),
    review: buildActivityReview(sortedActivities, activityDefinitions),
    recent_items: sortedActivities.slice(0, 12).map((activity) => ({
      activity_name: activityName(activity, activityDefinitions),
      mode: classifyActivityMode(activity),
      completed: isCompleted(activity),
      period: activity.period
    }))
  };
}

function toRaidDungeonInput(
  activity: BungieActivityHistoryEntry,
  activityDefinitions: DefinitionComponentData
): RaidDungeonActivityInput | null {
  const type = classifyRaidDungeon(activity);
  if (!type) {
    return null;
  }

  return {
    activity_name: activityName(activity, activityDefinitions),
    activity_type: type,
    completed: isCompleted(activity),
    period: activity.period
  };
}

function classifyActivityMode(activity: BungieActivityHistoryEntry): "pve" | "pvp" | "other" {
  const modes = activityModeValues(activity);
  if (modes.some(isPvpActivityMode)) {
    return "pvp";
  }
  if (modes.some(isPveActivityMode)) {
    return "pve";
  }
  return "other";
}

function classifyRaidDungeon(activity: BungieActivityHistoryEntry): "raid" | "dungeon" | null {
  const modes = activityModeValues(activity);
  if (modes.includes(4)) {
    return "raid";
  }
  if (modes.includes(82)) {
    return "dungeon";
  }
  return null;
}

function isCompleted(activity: BungieActivityHistoryEntry): boolean {
  return Number(activity.values?.completed?.basic?.value ?? 0) > 0;
}

function activityName(
  activity: BungieActivityHistoryEntry,
  activityDefinitions: DefinitionComponentData
): string {
  const referenceId = activity.activityDetails?.referenceId ?? activity.activityDetails?.directorActivityHash;
  const definition = referenceId ? activityDefinitions[String(referenceId)] : undefined;
  return definition?.displayProperties?.name?.trim() || `Activity ${referenceId ?? "Unknown"}`;
}

function sortActivitiesByPeriod(activities: BungieActivityHistoryEntry[]): BungieActivityHistoryEntry[] {
  return [...activities].sort((left, right) => right.period.localeCompare(left.period));
}
