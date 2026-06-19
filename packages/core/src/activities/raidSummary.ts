export type RaidDungeonActivityInput = {
  activity_name: string;
  activity_type: "raid" | "dungeon";
  completed: boolean;
  period: string;
};

export type RaidDungeonSummaryEntry = {
  activity_name: string;
  activity_type: "raid" | "dungeon";
  completions: number;
  attempts: number;
  last_completed_at?: string;
};

export type RaidDungeonSummary = {
  entries: RaidDungeonSummaryEntry[];
};

export function summarizeRaidAndDungeonActivities(activities: RaidDungeonActivityInput[]): RaidDungeonSummary {
  const entries = new Map<string, RaidDungeonSummaryEntry>();

  for (const activity of activities) {
    const key = `${activity.activity_type}:${activity.activity_name}`;
    const entry = entries.get(key) ?? {
      activity_name: activity.activity_name,
      activity_type: activity.activity_type,
      completions: 0,
      attempts: 0
    };
    entry.attempts += 1;
    if (activity.completed) {
      entry.completions += 1;
      entry.last_completed_at = latest(entry.last_completed_at, activity.period);
    }
    entries.set(key, entry);
  }

  return {
    entries: [...entries.values()].sort((left, right) => left.activity_name.localeCompare(right.activity_name, "zh-Hans-CN"))
  };
}

function latest(left: string | undefined, right: string): string {
  if (!left || right > left) {
    return right;
  }
  return left;
}
