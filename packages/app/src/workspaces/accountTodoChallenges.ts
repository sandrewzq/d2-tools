import type {
  WeeklyActivityEntry,
  WeeklyPriorityKind,
  WeeklySummary
} from "@d2-tools/core/weekly/summary";
import { weeklyFarmingActivityKey } from "@d2-tools/core/weekly/farming";

/**
 * 待办清单里的活动挑战行。
 *
 * 这个模块以前产出的是「提光路线」——一条按推荐优先级排好序的路线。T91 之后清单不比较
 * 不同行动之间的价值：挑战和任务、赏金进同一张清单，排序交给清单自己的统一比较器。
 * 这里只做两件事：把 Bungie 返回的挑战读成行，以及回答「官方奖励名里有没有等级占位词」。
 */

export type AccountChallengeStatus = "available" | "completed" | "unavailable" | "unknown";

export type AccountTodoChallenge = {
  key: string;
  activityName: string;
  activityTypeLabel: string;
  /** 活动 Hash，清单排序第三维用它。游戏没返回就空着。 */
  activityHash?: number;
  /** 官方返回的挑战奖励名原文，行正面直接显示。没有就留空，不补猜。 */
  rewardLabel: string;
  /** 奖励名里带等级占位词。二级「提光」按它收行，不据此推断提升幅度。 */
  isPower: boolean;
  status: AccountChallengeStatus;
  progressLabel?: string;
  /** 对应「本周刷取」里的活动键；突袭和地牢有，日落没有。 */
  activityKey?: string;
  sourceLabel: string;
};

/**
 * 提光判据：官方原文里带没带等级占位词。只看游戏返回的原文，不看光等数字，也不看活动名。
 *
 * 两处原文都可能带：奖励物品的名字（`强力装备` / `Pinnacle Gear`），或奖励物品的装备阶级
 * （`装备阶级5`）。突袭的周常挑战奖励叫「突袭装备」、地牢的叫「强力装备」，名字对不上，
 * 但都是同一档 `装备阶级5`——只按名字匹配会把突袭整档漏掉（2026-09-21 对真实账号核对）。
 */
const powerRewardPattern = /^(?:巅峰装备|高阶装备|强力装备|Pinnacle Gear|Powerful Gear)(?:\s|$)/i;
const powerTierPattern = /装备阶级\s*\d+|gear tier\s*\d+/i;

/** 本周轮换挑战：日落、突袭、地牢各自一类，其余活动统一进 `activity_challenge`。 */
const challengeKinds = [
  "nightfall",
  "rotating_raid",
  "rotating_dungeon",
  "activity_challenge"
] as const satisfies readonly WeeklyPriorityKind[];
type ChallengeKind = (typeof challengeKinds)[number];

const activityTypeLabels: Record<ChallengeKind, string> = {
  nightfall: "日落挑战",
  rotating_raid: "周常突袭",
  rotating_dungeon: "周常地牢",
  activity_challenge: "活动挑战"
};

/** 只有突袭和地牢进「本周刷取」的掉落池；日落没有可刷的固定掉落表。 */
const farmingKinds: Partial<Record<ChallengeKind, "raid" | "dungeon">> = {
  rotating_raid: "raid",
  rotating_dungeon: "dungeon"
};

export function buildAccountTodoChallenges(input: {
  characterId: string;
  weeklySummary: WeeklySummary | null;
}): AccountTodoChallenge[] {
  if (!input.weeklySummary) return [];

  return challengeKinds.flatMap((kind) => {
    // 摘要可能来自旧版本写下的首页缓存，键比当前类型少。缺哪个来源就当作没有挑战，
    // 不能让整页跟着一个不存在的键一起塌掉（T91 第 8 节）。
    const priority = input.weeklySummary!.priorities[kind];
    return (priority?.entries ?? []).map((entry, index) => (
      buildChallengeRow({
        characterId: input.characterId,
        entry,
        kind,
        index
      })
    ));
  });
}

function buildChallengeRow(input: {
  characterId: string;
  entry: WeeklyActivityEntry;
  kind: ChallengeKind;
  index: number;
}): AccountTodoChallenge {
  const characterState = input.entry.characters?.find((state) => state.character_id === input.characterId);
  const challenge = characterState?.challenge;
  const status: AccountChallengeStatus = !characterState
    ? "unknown"
    : challenge
      ? challenge.complete ? "completed" : "available"
      : "unavailable";
  const activityHash = input.entry.related_hashes?.[0];
  const farmingKind = farmingKinds[input.kind];

  return {
    key: `${input.kind}-${activityHash ?? input.index}-${input.characterId}`,
    activityName: input.entry.title,
    activityTypeLabel: input.entry.activity_kind ?? activityTypeLabels[input.kind],
    ...(typeof activityHash === "number" ? { activityHash } : {}),
    rewardLabel: officialRewardLabel(input.entry),
    isPower: isPowerChallenge(input.entry),
    status,
    ...(challenge?.progress_label ? { progressLabel: challenge.progress_label } : {}),
    ...(farmingKind && typeof activityHash === "number"
      ? { activityKey: weeklyFarmingActivityKey(farmingKind, activityHash) }
      : {}),
    sourceLabel: input.entry.source ?? input.entry.evidence ?? "Bungie CharacterActivities"
  };
}

export function isPowerChallenge(entry: WeeklyActivityEntry): boolean {
  return (entry.rewards ?? []).some((reward) => (
    powerRewardPattern.test(reward.name.trim())
    || powerTierPattern.test((reward.item_type ?? "").trim())
  ));
}

/** 行正面显示的官方奖励名原文，最多两条；一条都没有就返回空串。 */
function officialRewardLabel(entry: WeeklyActivityEntry): string {
  const names = (entry.rewards ?? [])
    .map((reward) => reward.name.trim())
    .filter(Boolean);
  return names.slice(0, 2).join(" / ");
}
