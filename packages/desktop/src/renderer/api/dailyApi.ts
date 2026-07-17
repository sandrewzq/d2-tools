import type { WeeklySummary } from "./weeklyApi.js";

export type DailyApi = {
  getHomeBriefing(): Promise<HomeBriefing>;
  getDailySummary(): Promise<DailySummary>;
};

export type HomeBriefing = {
  fetched_at: string;
  daily: DailySummary;
  weekly: WeeklySummary;
};

export type DailySourceStatus = "ready" | "pending";

export type DailySummarySource = {
  status: DailySourceStatus;
  label: string;
  message: string;
  items?: DailySummaryItem[];
};

export type DailySummaryItem = {
  title: string;
  subtitle?: string;
  description?: string;
  source?: string;
  weeklyActivityKind?: "nightfall" | "rotating_raid" | "rotating_dungeon" | "weekly_bonus" | "special_event" | "public_clue";
  destinationName?: string;
  championTypes?: string[];
  shieldTypes?: string[];
  threatType?: string;
  expertSoloRewards?: string[];
  masterSoloRewards?: string[];
  vendorHash?: number;
  iconUrl?: string;
  icon?: string;
  iconLabel?: string;
  costIconUrl?: string;
  items?: DailySummaryItem[];
};

export type DailySummary = {
  date_label: string;
  daily_reset: {
    label: string;
    next_reset_iso: string;
    time_remaining_label: string;
  };
  weekly_reset: {
    label: string;
    next_reset_iso: string;
    time_remaining_label: string;
  };
  sources: {
    rotations: DailySummarySource;
    vendors: DailySummarySource;
    lost_sector: DailySummarySource;
    weekly_report: DailySummarySource;
  };
  checklist: string[];
  recommendations: string[];
};
