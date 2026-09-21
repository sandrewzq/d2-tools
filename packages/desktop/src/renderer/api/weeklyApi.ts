import type {
  WeeklyActivityCharacterState,
  WeeklyIronBannerSummary,
  WeeklyPriorityKind as CoreWeeklyPriorityKind
} from "@d2-tools/core/weekly/summary";

export type WeeklyApi = {
  getWeeklySummary(): Promise<WeeklySummary>;
};

export type WeeklySourceStatus = "ready" | "pending";

/**
 * 直接沿用 core 的键集合，不再另抄一份：抄出来的那份漏了 `activity_challenge`，
 * 结果 2026-09-20 打开「待办」直接白屏（T91 第 8 节）。
 */
export type WeeklyPriorityKind = CoreWeeklyPriorityKind;

export type WeeklySummaryPriority = {
  status: WeeklySourceStatus;
  title: string;
  detail: string;
  evidence?: string;
  source?: string;
  entries?: WeeklyActivityEntry[];
};

export type WeeklySummaryItem = {
  title: string;
  subtitle?: string;
  description?: string;
  source?: string;
  weeklyActivityKind?: WeeklyPriorityKind | "public_clue";
  related_hashes?: number[];
  rewards?: WeeklyActivityReward[];
  characters?: WeeklyActivityCharacterState[];
};

export type WeeklyActivityReward = {
  hash: number;
  name: string;
  icon?: string;
  item_type?: string;
};

export type WeeklyActivityEntry = {
  title: string;
  detail?: string;
  evidence?: string;
  source?: string;
  related_hashes?: number[];
  rewards?: WeeklyActivityReward[];
  characters?: WeeklyActivityCharacterState[];
};

export type WeeklySummary = {
  weekly_reset: {
    label: string;
    next_reset_iso: string;
    time_remaining_label: string;
  };
  priorities: Record<WeeklyPriorityKind, WeeklySummaryPriority>;
  iron_banner: WeeklyIronBannerSummary;
  public_clues: WeeklySummaryItem[];
};
