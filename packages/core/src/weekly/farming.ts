export type WeeklyFarmingActivityKind = "raid" | "dungeon";

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
      status: "in_progress" | "complete";
      record_hash: number;
      progress: number;
      completion_value: number;
      remaining: number;
    }
  | {
      status: "unavailable";
      record_hash?: number;
      /**
       * 缺失原因。`pattern_not_mapped` 是数据集没给这把武器写图样记录，`progress_missing` 是
       * Bungie 返回了记录但没给进度值，`reward_unavailable` 是记录自报奖励不可用。三者都与
       * 「这把武器不可制作」不是一回事，界面上必须分得开（T91 第 6 节）。
       */
      reason:
        | "not_returned"
        | "objective_missing"
        | "record_hidden"
        | "entitlement_unowned"
        | "read_failed"
        | "pattern_not_mapped"
        | "progress_missing"
        | "reward_unavailable";
    };

export type WeeklyFarmingCatalogItem = {
  hash: number;
  name: string;
  icon?: string;
  item_type?: string;
  variant: "normal" | "adept" | "timelost" | "harrowed" | "reprised" | "other";
  /**
   * 掉落定位粒度。数据集只到活动级：生成脚本从 Manifest 的 Collectible 来源推出归属，
   * 拿不到「哪个遭遇战掉哪把」这种受控关系，所以这里只留一个取值。以前并存的
   * `encounter` / `final_chest` / `secret_chest` / `challenge` 四个取值没有任何数据，
   * 界面上的对应分支永远走不到（T91 第 12 节）。
   */
  drop_scope: "activity";
  source_hash: number;
  source_label: string;
  source_url: string;
  source_license: string;
  /**
   * 这份受控掉落关系的生成日期，不是「核对通过」的日期。数据集由
   * `scripts/generate-activity-loot.mjs` 从 Manifest 推出，界面按「数据集生成时间」展示
   * （T91 第 12 节）。
   */
  generated_at: string;
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
