export type RecentActivityInput = {
  mode: "pve" | "pvp" | "other";
  completed: boolean;
  period: string;
};

export type RecentActivityBucket = {
  total: number;
  completed: number;
};

export type RecentActivitySummary = {
  total: number;
  latest_period?: string;
  pve: RecentActivityBucket;
  pvp: RecentActivityBucket;
  other: RecentActivityBucket;
};

export function summarizeRecentActivities(activities: RecentActivityInput[]): RecentActivitySummary {
  const summary: RecentActivitySummary = {
    total: activities.length,
    latest_period: latestPeriod(activities),
    pve: emptyBucket(),
    pvp: emptyBucket(),
    other: emptyBucket()
  };

  for (const activity of activities) {
    const bucket = summary[activity.mode];
    bucket.total += 1;
    if (activity.completed) {
      bucket.completed += 1;
    }
  }

  return summary;
}

function emptyBucket(): RecentActivityBucket {
  return { total: 0, completed: 0 };
}

function latestPeriod(activities: RecentActivityInput[]): string | undefined {
  return activities
    .map((activity) => activity.period)
    .filter(Boolean)
    .sort()
    .at(-1);
}
