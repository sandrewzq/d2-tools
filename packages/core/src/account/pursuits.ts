import { nextDailyResetDate, nextWeeklyResetDate } from "../daily/summary.js";
import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";
import type { AccountItemSummary, AccountSummary, DestinyProfileResponse } from "./summary.js";

export type AccountPursuitCompletionState =
  | "in_progress"
  | "completed_pending_action"
  | "completed_confirmed"
  | "expired"
  | "unknown";

/**
 * 时限桶。只按 Bungie 返回的到期时间字段判定，不看名称，也不看 itemTypeDisplayName。
 *
 * `long` 是「有到期时间，但过了下一个每周重置」——赛季挑战这类。它和 `weekly` 一起进
 * 二级的「周常」段，行上按 T91 第 4.4 节标「限时」。
 *
 * 已知边界：每周重置那一刻同时是当日日重置，所以到期时间正好落在每周重置上的项目
 * 分不出是日常还是周常。这里按 `daily` 处理（宁可让玩家早点看到，也不要漏掉一个日常），
 * 不用名称判定来消歧。
 */
export type AccountPursuitTimeFrame = "timeless" | "daily" | "weekly" | "long";

export type AccountPursuit = {
  id: string;
  kind: "quest" | "bounty" | "seasonal" | "milestone" | "unknown";
  name: string;
  icon?: string;
  character_id: string;
  /** Bungie 返回的角色顺序，排序第 4 维用它，不用 character_id 比大小。 */
  character_index: number;
  class_name: string;
  type_label: string;
  tracked: boolean;
  completion_state: AccountPursuitCompletionState;
  time_frame: AccountPursuitTimeFrame;
  progress_label?: string;
  progress_percent?: number;
  /** Bungie 返回的可堆叠数量。未返回时留空，不补 1（T91 第 12 节）。 */
  quantity?: number;
  expiration_date?: string;
  reward_hashes: number[];
  quest_step?: { step: number; total: number };
  source: "inventory_item" | "character_milestone" | "record";
  source_hash?: number;
  item_hash?: number;
  observed_at?: string;
};

export type AccountPursuitSummary = {
  items: AccountPursuit[];
  total_count: number;
  pending_count: number;
  expiring_count: number;
  tracked_count: number;
  data_state: "confirmed" | "partial";
  observed_at?: string;
  /**
   * 这次快照用的重置边界。分桶、计数和行上的「还有多久」都从这一刻算，
   * 渲染侧直接复用，不再用渲染时的 Date.now() 重算一份。
   */
  daily_reset_iso?: string;
  weekly_reset_iso?: string;
};

export function buildAccountPursuitSummary(
  account: Pick<AccountSummary, "characters" | "profile_minted_at"> | null,
  now = Date.now()
): AccountPursuitSummary {
  if (!account) {
    return {
      items: [],
      total_count: 0,
      pending_count: 0,
      expiring_count: 0,
      tracked_count: 0,
      data_state: "partial"
    };
  }

  const observedAt = account.profile_minted_at;
  const boundaries = resetBoundaries(now);
  const items = account.characters.flatMap((character, characterIndex) => {
    // 同一角色里两条都没有实例 ID 的同 hash 项，只按 `${characterId}:${hash}` 会撞键，
    // 界面上的 `pursuit:${id}` key 也跟着重复。这里对重复项追加出现序号，让键唯一，
    // 不重复的项仍拿到原来的 id（T91 第 12 节）。
    const occurrences = new Map<string, number>();
    return [...character.equipped_items, ...character.inventory_items, ...character.postmaster_items]
      .filter((item) => Boolean(item.pursuit))
      .map((item) => {
        const baseId = `${character.character_id}:${item.instance_id ?? item.hash}`;
        const seen = occurrences.get(baseId) ?? 0;
        occurrences.set(baseId, seen + 1);
        return toPursuit(
          item,
          character.character_id,
          characterIndex,
          character.class_name,
          observedAt,
          now,
          boundaries,
          seen === 0 ? baseId : `${baseId}#${seen}`
        );
      });
  });
  const sorted = items.sort((left, right) => comparePursuits(left, right));
  return {
    items: sorted,
    total_count: sorted.length,
    pending_count: sorted.filter((item) => item.completion_state === "completed_pending_action").length,
    expiring_count: sorted.filter((item) => isExpiring(item, now)).length,
    tracked_count: sorted.filter(isActiveTracked).length,
    // This helper only sees task-like inventory items from the equipment
    // snapshot. Milestones and seasonal records are confirmed by the full
    // pursuit resource builder below.
    data_state: "partial",
    ...(observedAt ? { observed_at: observedAt } : {}),
    ...resetBoundaryFields(boundaries)
  };
}

/** 将 CharacterProgressions（202）中的角色里程碑任务合并到摘要。 */
export function buildAccountPursuitSummaryFromProfile(input: {
  account: Pick<AccountSummary, "characters" | "profile_minted_at">;
  profile: DestinyProfileResponse;
  itemDefinitions?: DefinitionComponentData;
  recordDefinitions?: DefinitionComponentData;
  presentationNodeDefinitions?: DefinitionComponentData;
  seasonalChallengesPresentationNodeHash?: number;
  now?: number;
}): AccountPursuitSummary {
  const now = input.now ?? Date.now();
  const boundaries = resetBoundaries(now);
  const profileObservedAt = normalizeTimestamp(input.profile.responseMintedTimestamp);
  /**
   * 背包任务物品来自装备快照（组件 201 / 205 / 301），角色里程碑和赛季记录来自这次
   * 任务读取（组件 202 / 900）。两次读取时间可能不同，`observed_at` 记的是**任务读取**
   * 的时刻，也就是里程碑和记录那一半的版本；快照那一半比它旧，不会更新（T91 第 12 节）。
   * 这里不再为快照单开一个时间字段：界面只承诺一个数据时间，多报一个只会让玩家
   * 以为两者永远一致。
   */
  const base = buildAccountPursuitSummary({
    ...input.account,
    profile_minted_at: profileObservedAt ?? input.account.profile_minted_at
  }, now);
  const inventoryQuestKeys = new Set(base.items.flatMap((item) => (
    item.item_hash ? [`${item.character_id}:${item.item_hash}`] : []
  )));
  // `data_state` 要看这次到底有没有东西没读到：定义查不到、状态没返回、记录条目缺失都会让
  // 结果少一块，此时报 confirmed 就是在替缺失的数据背书（T91 第 12 节）。
  let milestoneDefinitionsComplete = true;
  let milestoneStatusesComplete = true;
  let recordGaps = false;
  const milestoneItems = Object.entries(input.profile.characterProgressions?.data ?? {}).flatMap(([characterId, progression]) => {
    const characterIndex = input.account.characters.findIndex((entry) => entry.character_id === characterId);
    const character = characterIndex >= 0 ? input.account.characters[characterIndex] : undefined;
    if (!character) return [];
    return Object.entries(progression.milestones ?? {}).flatMap(([milestoneHashValue, milestone]) => {
      const milestoneHash = Number(milestoneHashValue);
      return (milestone.availableQuests ?? []).flatMap((quest) => {
        if (typeof quest.questItemHash !== "number") return [];
        const id = `${characterId}:milestone:${milestoneHash}:${quest.questItemHash}`;
        if (inventoryQuestKeys.has(`${characterId}:${quest.questItemHash}`)) return [];
        const definition = input.itemDefinitions?.[String(quest.questItemHash)] as DefinitionRecord | undefined;
        const status = quest.status;
        if (!definition) milestoneDefinitionsComplete = false;
        if (!status) milestoneStatusesComplete = false;
        const objectives = status?.stepObjectives ?? [];
        // 到期时间统一归一化成 ISO。归一化后 `deriveTimeFrame`、`expired` 判定和渲染侧
        // 拿到的是同一个时刻，不再让三种写法各自 Date.parse 一次（T91 第 12 节）。
        const expirationDate = normalizeTimestamp(milestone.endDate);
        const expired = Boolean(
          expirationDate
          && Date.parse(expirationDate) <= now
          && !(status?.completed && definition?.inventory?.suppressExpirationWhenObjectivesComplete)
        );
        const completionState: AccountPursuitCompletionState = expired
          ? "expired"
          : status?.redeemed
            ? "completed_confirmed"
            : status?.completed
              ? "completed_pending_action"
              : objectives.length || status?.started
                ? "in_progress"
                : "unknown";
        const progress = summarizeObjectiveProgress(objectives);
        return [{
          id,
          kind: "milestone" as const,
          name: definition?.displayProperties?.name?.trim() || `任务 ${quest.questItemHash}`,
          icon: normalizeAssetUrl(definition?.displayProperties?.icon),
          character_id: characterId,
          character_index: characterIndex,
          class_name: character.class_name,
          type_label: definition?.itemTypeDisplayName?.trim() || "角色目标",
          tracked: status?.tracked === true,
          completion_state: completionState,
          time_frame: deriveTimeFrame(expirationDate, boundaries),
          ...(progress ?? {}),
          ...(expirationDate ? { expiration_date: expirationDate } : {}),
          reward_hashes: [],
          source: "character_milestone" as const,
          source_hash: milestoneHash,
          item_hash: quest.questItemHash,
          ...(base.observed_at ? { observed_at: base.observed_at } : {})
        } satisfies AccountPursuit];
      });
    });
  });
  const items = [...base.items, ...milestoneItems]
    .sort((left, right) => comparePursuits(left, right));
  const seasonalRecords = collectPresentationNodeRecordHashes(
    input.seasonalChallengesPresentationNodeHash,
    input.presentationNodeDefinitions
  );
  const trackedRecordHash = input.profile.profileRecords?.data?.trackedRecordHash;
  const recordItems = [...seasonalRecords.hashes].flatMap((recordHash) => {
    const progress = input.profile.profileRecords?.data?.records?.[String(recordHash)];
    const definition = input.recordDefinitions?.[String(recordHash)] as DefinitionRecord | undefined;
    if (!progress || !definition) {
      recordGaps = true;
      return [];
    }
    if (((progress.state ?? 0) & 16) === 16) return [];
    const state = progress.state ?? 0;
    const redeemed = (state & 1) === 1;
    const objectivesIncomplete = (state & 4) === 4;
    // 与里程碑同一条口径：到期时间归一化成 ISO 再参与分桶与展示（T91 第 12 节）。
    const expirationDate = normalizeTimestamp(definition.expirationInfo?.expirationDate);
    const expired = Boolean(expirationDate && Date.parse(expirationDate) <= now && !redeemed);
    const completionState: AccountPursuitCompletionState = expired
      ? "expired"
      : redeemed
        ? "completed_confirmed"
        : !objectivesIncomplete
          ? "completed_pending_action"
          : (progress.objectives?.length ? "in_progress" : "unknown");
    const objectiveProgress = summarizeObjectiveProgress(progress.objectives ?? []);
    return [{
      id: `account:record:${recordHash}`,
      kind: "seasonal" as const,
      name: definition.displayProperties?.name?.trim() || `赛季挑战 ${recordHash}`,
      icon: normalizeAssetUrl(definition.displayProperties?.icon),
      character_id: "account",
      // 账号级记录不属于任何角色，排在所有角色之后。
      character_index: input.account.characters.length,
      class_name: "账号",
      type_label: definition.recordTypeName?.trim() || "赛季挑战",
      tracked: trackedRecordHash === recordHash,
      completion_state: completionState,
      time_frame: deriveTimeFrame(expirationDate, boundaries),
      ...(objectiveProgress ?? {}),
      ...(expirationDate ? { expiration_date: expirationDate } : {}),
      reward_hashes: (definition.rewardItems ?? []).flatMap((reward) => (
        typeof reward.itemHash === "number" ? [reward.itemHash] : []
      )),
      source: "record" as const,
      source_hash: recordHash,
      ...(base.observed_at ? { observed_at: base.observed_at } : {})
    } satisfies AccountPursuit];
  });
  const allItems = [...items, ...recordItems]
    .sort((left, right) => comparePursuits(left, right));
  return {
    items: allItems,
    total_count: allItems.length,
    pending_count: allItems.filter((item) => item.completion_state === "completed_pending_action").length,
    expiring_count: allItems.filter((item) => isExpiring(item, now)).length,
    tracked_count: allItems.filter(isActiveTracked).length,
    data_state: input.profile.characterProgressions?.data
      && input.profile.profileRecords?.data?.records
      && input.seasonalChallengesPresentationNodeHash
      && seasonalRecords.complete
      && milestoneDefinitionsComplete
      && milestoneStatusesComplete
      && !recordGaps
      ? "confirmed"
      : "partial",
    ...(base.observed_at ? { observed_at: base.observed_at } : {}),
    ...resetBoundaryFields(boundaries)
  };
}

function collectPresentationNodeRecordHashes(
  rootHash: number | undefined,
  definitions: DefinitionComponentData | undefined
): { hashes: Set<number>; complete: boolean } {
  const hashes = new Set<number>();
  if (!rootHash || !definitions) return { hashes, complete: false };
  const pending = [rootHash];
  const visited = new Set<number>();
  let complete = true;
  while (pending.length) {
    const hash = pending.pop()!;
    if (visited.has(hash)) continue;
    visited.add(hash);
    const definition = definitions[String(hash)] as DefinitionRecord | undefined;
    if (!definition) {
      complete = false;
      continue;
    }
    for (const child of definition.children?.presentationNodes ?? []) {
      if (typeof child.presentationNodeHash === "number") pending.push(child.presentationNodeHash);
    }
    for (const child of definition.children?.records ?? []) {
      if (typeof child.recordHash === "number") hashes.add(child.recordHash);
    }
  }
  return { hashes, complete };
}

function toPursuit(
  item: AccountItemSummary,
  characterId: string,
  characterIndex: number,
  className: string,
  observedAt: string | undefined,
  now: number,
  boundaries: ResetBoundaries,
  id: string
): AccountPursuit {
  const pursuit = item.pursuit!;
  const objectives = item.item_objectives?.filter((objective) => objective.visible !== false) ?? [];
  const progressPercent = objectives.length
    ? Math.round(objectives.reduce((sum, objective) => {
        if (objective.completion_value <= 0) return sum + Number(objective.complete);
        return sum + Math.min(1, Math.max(0, (objective.progress ?? 0) / objective.completion_value));
      }, 0) / objectives.length * 100)
    : undefined;
  const first = objectives[0];
  const expiration = pursuit.expiration_date;
  const expired = Boolean(
    expiration
    && Date.parse(expiration) <= now
    && !(pursuit.complete && pursuit.suppress_expiration_when_complete)
  );
  // 背包里的任务物品只在这个状态集里取值。它没有 `completed_confirmed`：已领取 / 已兑换的
  // 赏金和任务步骤会直接从背包里消失，不会留下一条「已确认完成」的记录，Bungie 也没给这类
  // 物品等价的 redeemed 标志位。目标全完成时玩家确实还有一步要做（领取或进入下一步），
  // `completed_pending_action` 就是这里的准确状态，不凭空补一个确认分支（T91 第 12 节）。
  const completionState: AccountPursuitCompletionState = expired
    ? "expired"
    : pursuit.complete
      ? "completed_pending_action"
      : objectives.length || pursuit.quest_step
        ? "in_progress"
        : "unknown";
  return {
    id,
    kind: pursuit.kind,
    name: item.name,
    icon: item.icon,
    character_id: characterId,
    character_index: characterIndex,
    class_name: className,
    type_label: item.item_type ?? item.bucket_name ?? "任务",
    tracked: pursuit.tracked,
    completion_state: completionState,
    time_frame: deriveTimeFrame(expiration, boundaries),
    ...(first ? { progress_label: `${first.progress ?? 0}/${first.completion_value}` } : {}),
    ...(progressPercent !== undefined ? { progress_percent: progressPercent } : {}),
    ...(typeof item.quantity === "number" ? { quantity: item.quantity } : {}),
    ...(expiration ? { expiration_date: expiration } : {}),
    reward_hashes: pursuit.reward_hashes ?? [],
    ...(pursuit.quest_step ? { quest_step: pursuit.quest_step } : {}),
    source: "inventory_item",
    item_hash: item.hash,
    ...(observedAt ? { observed_at: observedAt } : {})
  };
}

type ResetBoundaries = { daily: number; weekly: number };

function resetBoundaries(now: number): ResetBoundaries {
  const at = new Date(now);
  return {
    daily: nextDailyResetDate(at).getTime(),
    weekly: nextWeeklyResetDate(at).getTime()
  };
}

function resetBoundaryFields(
  boundaries: ResetBoundaries
): Pick<AccountPursuitSummary, "daily_reset_iso" | "weekly_reset_iso"> {
  return {
    daily_reset_iso: new Date(boundaries.daily).toISOString(),
    weekly_reset_iso: new Date(boundaries.weekly).toISOString()
  };
}

function deriveTimeFrame(
  expirationDate: string | undefined,
  boundaries: ResetBoundaries
): AccountPursuitTimeFrame {
  if (!expirationDate) return "timeless";
  const expiry = Date.parse(expirationDate);
  if (!Number.isFinite(expiry)) return "timeless";
  if (expiry <= boundaries.daily) return "daily";
  if (expiry <= boundaries.weekly) return "weekly";
  return "long";
}

/**
 * T91 第 5 节的桶内排序，第 1 维：可执行 → 待处理 → 已完成 / 当前不可用 → 无法确认。
 * 完成状态是桶内顺序，不再是分桶依据。
 */
export function pursuitActionabilityRank(item: AccountPursuit): number {
  if (item.completion_state === "in_progress") return 0;
  if (item.completion_state === "completed_pending_action") return 1;
  if (item.completion_state === "expired" || item.completion_state === "completed_confirmed") return 2;
  return 3;
}

/** 稳定身份的字符串兜底比较。不用 localeCompare——它跟运行环境的语言走，两台机器可能不一致。 */
export function compareStableString(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function comparePursuits(left: AccountPursuit, right: AccountPursuit): number {
  const leftExpiry = left.expiration_date ? Date.parse(left.expiration_date) : Number.POSITIVE_INFINITY;
  const rightExpiry = right.expiration_date ? Date.parse(right.expiration_date) : Number.POSITIVE_INFINITY;
  return pursuitActionabilityRank(left) - pursuitActionabilityRank(right)
    // 第 2 维：有到期时间的排在无到期时间的前面，按时间升序。
    || leftExpiry - rightExpiry
    // 第 3 维：稳定身份，Hash 按无符号数值升序，没有 Hash 的退回 id。
    || (left.source_hash ?? left.item_hash ?? Number.MAX_SAFE_INTEGER)
      - (right.source_hash ?? right.item_hash ?? Number.MAX_SAFE_INTEGER)
    || compareStableString(left.id, right.id)
    // 第 4 维：Bungie 返回的角色顺序。
    || left.character_index - right.character_index;
}

/**
 * 「即将到期」的窗口。T91 第 5 节没有为它定义新的界面语义，`expiring_count` 目前也没有
 * 消费方，所以只把原来写在表达式里的 24 小时收成常量，口径不变；以后要调窗口，改这里一处
 * （T91 第 12 节）。
 */
const expiringWindowMs = 24 * 60 * 60 * 1000;

function isExpiring(item: AccountPursuit, now: number): boolean {
  if (!item.expiration_date) return false;
  const remaining = Date.parse(item.expiration_date) - now;
  return remaining >= 0 && remaining <= expiringWindowMs;
}

function isActiveTracked(item: AccountPursuit): boolean {
  return item.tracked
    && item.completion_state !== "expired"
    && item.completion_state !== "completed_confirmed";
}

function summarizeObjectiveProgress(
  objectives: Array<{ progress?: number; completionValue: number; complete: boolean; visible: boolean }>
): Pick<AccountPursuit, "progress_label" | "progress_percent"> | undefined {
  const visible = objectives.filter((objective) => objective.visible !== false);
  if (!visible.length) return undefined;
  const percent = Math.round(visible.reduce((sum, objective) => {
    if (objective.completionValue <= 0) return sum + Number(objective.complete);
    return sum + Math.min(1, Math.max(0, (objective.progress ?? 0) / objective.completionValue));
  }, 0) / visible.length * 100);
  const first = visible[0]!;
  return { progress_label: `${first.progress ?? 0}/${first.completionValue}`, progress_percent: percent };
}

function normalizeAssetUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `https://www.bungie.net${path}`;
}

function normalizeTimestamp(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}
