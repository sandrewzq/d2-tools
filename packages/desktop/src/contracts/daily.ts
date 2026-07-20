import type {
  DailySourceStatus,
  DailySummary,
  DailySummaryItem,
  DailySummarySource
} from "@d2-tools/core/daily/summary";
import type { WeeklySummary } from "@d2-tools/core/weekly/summary";

export type DailyApi = {
  getHomeBriefing(options?: { force?: boolean }): Promise<HomeBriefing>;
  getDailySummary(): Promise<DailySummary>;
};

export type HomeBriefing = {
  fetched_at: string;
  daily: DailySummary;
  weekly: WeeklySummary;
};

export type {
  DailySourceStatus,
  DailySummary,
  DailySummaryItem,
  DailySummarySource,
  WeeklySummary
};
