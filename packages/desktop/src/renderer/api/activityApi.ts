export type ActivityApi = {
  getActivitySummary(input: ActivitySummaryInput): Promise<ActivityHistorySummary>;
};

export type ActivitySummaryInput = {
  membership_type: number;
  membership_id: string;
  character_ids: string[];
};

export type ActivityHistorySummary = {
  recent: {
    total: number;
    latest_period?: string;
    pve: { total: number; completed: number };
    pvp: { total: number; completed: number };
    other: { total: number; completed: number };
  };
  raids: {
    entries: Array<{
      activity_name: string;
      activity_type: "raid" | "dungeon";
      completions: number;
      attempts: number;
      last_completed_at?: string;
    }>;
  };
  recent_items: Array<{
    activity_name: string;
    mode: "pve" | "pvp" | "other";
    completed: boolean;
    period: string;
  }>;
};
