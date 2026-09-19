export type WeeklyFarmingActivityKind = "raid" | "dungeon";

/**
 * 活动级定位键，与 activity-loot 数据集里的 `key` 同一约定（`raid-<活动 hash>` / `dungeon-<活动 hash>`）。
 * 首页要从活动 hash 定位到本周刷取里的对应活动，规则在这里写一次，不各处自行拼字符串。
 */
export function weeklyFarmingActivityKey(kind: WeeklyFarmingActivityKind, activityHash: number): string {
  return `${kind}-${activityHash}`;
}

export type WeeklyFarmingRotationActivity = {
  kind: WeeklyFarmingActivityKind;
  title: string;
  related_hashes?: number[];
  source?: string;
};

export type WeeklyFarmingRequest = {
  reset_at?: string;
  activities: WeeklyFarmingRotationActivity[];
  force?: boolean;
};

export type WeeklyFarmingPatternProgress =
  | {
      status: "not_craftable";
    }
  | {
      status: "in_progress" | "complete";
      record_hash: number;
      progress: number;
      completion_value: number;
      remaining: number;
    }
  | {
      status: "unavailable";
      record_hash?: number;
      reason: "not_returned" | "objective_missing" | "record_hidden" | "entitlement_unowned" | "read_failed";
    };

export type WeeklyFarmingCatalogItem = {
  hash: number;
  name: string;
  icon?: string;
  item_type?: string;
  variant: "normal" | "adept" | "timelost" | "harrowed" | "reprised" | "other";
  drop_scope: "activity" | "encounter" | "final_chest" | "secret_chest" | "challenge";
  source_hash: number;
  source_label: string;
  source_url: string;
  source_license: string;
  verified_at: string;
  pattern: WeeklyFarmingPatternProgress;
};

export type WeeklyFarmingCatalogActivity = {
  key: string;
  kind: WeeklyFarmingActivityKind;
  title: string;
  rotation_source: string;
  related_hashes: number[];
  coverage: "confirmed_activity_source" | "not_covered";
  coverage_note: string;
  items: WeeklyFarmingCatalogItem[];
};

export type WeeklyFarmingCatalogResource = {
  schema: "activity-loot.v1";
  revision: string;
  manifest_version?: string;
  verified_manifest_version: string;
  reset_at?: string;
  fetched_at: string;
  status: "ready" | "partial" | "unavailable";
  activities: WeeklyFarmingCatalogActivity[];
  warnings: string[];
};

export type WeeklyFarmingDecision =
  | "complete_pattern"
  | "worth_farming"
  | "qualified_roll"
  | "satisfied"
  | "information_insufficient";

export type WeeklyFarmingDecisionInput = {
  recommendationCovered: boolean;
  recommendationKnown: boolean;
  hasQualifiedRoll: boolean;
  ownedCount: number;
  pattern: WeeklyFarmingPatternProgress;
};

export function classifyWeeklyFarmingDecision(
  input: WeeklyFarmingDecisionInput
): WeeklyFarmingDecision {
  if (!input.recommendationKnown) return "information_insufficient";

  const patternIncomplete = input.pattern.status === "in_progress";
  const patternComplete = input.pattern.status === "complete";
  if (input.recommendationCovered && patternIncomplete) return "complete_pattern";
  if (input.hasQualifiedRoll && patternComplete) return "satisfied";
  if (input.hasQualifiedRoll) return "qualified_roll";
  if (input.recommendationCovered) return "worth_farming";
  return "information_insufficient";
}

export function weeklyFarmingDecisionRank(decision: WeeklyFarmingDecision): number {
  switch (decision) {
    case "complete_pattern":
      return 0;
    case "worth_farming":
      return 1;
    case "qualified_roll":
      return 2;
    case "satisfied":
      return 3;
    case "information_insufficient":
      return 4;
  }
}
