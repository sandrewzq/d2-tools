import { fetchBungieJson } from "../bungie/client.js";
import type { D2Config } from "../config/schema.js";
import type { DefinitionComponentData } from "../manifest/definitions.js";
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

export async function fetchCharacterActivityHistory(options: {
  config: D2Config;
  membershipType: number;
  membershipId: string;
  characterId: string;
  count?: number;
  accessToken?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<CharacterActivityHistoryResponse> {
  const count = options.count ?? 20;
  return fetchBungieJson<CharacterActivityHistoryResponse>(
    `/Destiny2/${options.membershipType}/Account/${options.membershipId}/Character/${options.characterId}/Stats/Activities/?count=${count}`,
    {
      apiKey: options.config.bungie.api_key,
      accessToken: options.accessToken,
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl
    }
  );
}

export function summarizeActivityHistory(
  activities: BungieActivityHistoryEntry[],
  activityDefinitions: DefinitionComponentData = {}
): ActivityHistorySummary {
  const recentInputs: RecentActivityInput[] = activities.map((activity) => ({
    mode: classifyActivityMode(activity),
    completed: isCompleted(activity),
    period: activity.period
  }));
  const raidInputs: RaidDungeonActivityInput[] = activities
    .map((activity) => toRaidDungeonInput(activity, activityDefinitions))
    .filter((activity): activity is RaidDungeonActivityInput => Boolean(activity));

  return {
    recent: summarizeRecentActivities(recentInputs),
    raids: summarizeRaidAndDungeonActivities(raidInputs),
    review: buildActivityReview(activities, activityDefinitions),
    recent_items: activities.slice(0, 12).map((activity) => ({
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
  const modes = activity.activityDetails?.modes ?? [];
  if (modes.includes(5)) {
    return "pvp";
  }
  if (modes.includes(7) || modes.includes(4) || modes.includes(82)) {
    return "pve";
  }
  return "other";
}

function classifyRaidDungeon(activity: BungieActivityHistoryEntry): "raid" | "dungeon" | null {
  const modes = activity.activityDetails?.modes ?? [];
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
