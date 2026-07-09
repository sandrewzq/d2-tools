export type WeeklyApi = {
  getWeeklySummary(): Promise<WeeklySummary>;
};

export type WeeklySourceStatus = "ready" | "pending";

export type WeeklyPriorityKind =
  | "nightfall"
  | "rotating_raid"
  | "rotating_dungeon"
  | "weekly_bonus"
  | "special_event";

export type WeeklySummaryPriority = {
  status: WeeklySourceStatus;
  title: string;
  detail: string;
  evidence?: string;
  source?: string;
};

export type WeeklySummaryItem = {
  title: string;
  subtitle?: string;
  description?: string;
  source?: string;
  weeklyActivityKind?: WeeklyPriorityKind | "public_clue";
};

export type WeeklySummary = {
  weekly_reset: {
    label: string;
    next_reset_iso: string;
    time_remaining_label: string;
  };
  priorities: Record<WeeklyPriorityKind, WeeklySummaryPriority>;
  public_clues: WeeklySummaryItem[];
};
