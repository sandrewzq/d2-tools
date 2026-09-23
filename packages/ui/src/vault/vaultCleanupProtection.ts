import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type {
  RecommendationCardSourceSummary,
  RecommendationCardSummary
} from "@d2-tools/core/community-perks";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import { getVaultCommunityInstanceKey } from "../recommendationMatchView.js";
import type { VaultCopy } from "../i18n/types.js";
import { vaultText } from "./vaultCopy.js";

export function buildVaultCleanupProtectionIndex(input: {
  copy: VaultCopy;
  items: AccountItemSummary[];
  tags: VaultTags;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  recommendationCardSummary?: ReadonlyMap<string, RecommendationCardSummary>;
  recommendationReady?: boolean;
}): Map<string, string[]> {
  const weapons = input.items.filter((item) => item.group_key === "weapons");
  const sameName = new Map<string, AccountItemSummary[]>();
  for (const item of weapons) {
    const key = normalizeName(item.name);
    sameName.set(key, [...(sameName.get(key) ?? []), item]);
  }
  const result = new Map<string, string[]>();
  for (const item of input.items) {
    const key = getVaultCommunityInstanceKey(item);
    const localTag = input.tags.items[key]?.tag;
    const isWeapon = item.group_key === "weapons";
    const match = isWeapon ? input.recommendationCardSummary?.get(key) : undefined;
    const nameGroup = isWeapon ? sameName.get(normalizeName(item.name)) ?? [] : [];
    const sameFingerprintCount = isWeapon && item.weapon_roll?.fingerprint
      ? nameGroup.filter((candidate) => candidate.weapon_roll?.fingerprint === item.weapon_roll?.fingerprint).length
      : 0;
    const sourceStates = match?.sources ?? [];
    const hasPositiveRecommendation = sourceStates.some((source) => (
      source.state === "full" || source.state === "core"
    ));
    const hasWeaponOnlyRecommendation = sourceStates.some((source) => source.state === "weapon_only");
    const hasUncheckableRecommendation = sourceStates.some((source) => source.state === "uncheckable");
    const hasRecommendationConflict = recommendationPurposesConflict(sourceStates);
    const reasons = [
      item.locked ? vaultText(input.copy, "已锁定") : "",
      item.instance_id && input.highlightedItemKeys?.instanceIds.has(item.instance_id) ? vaultText(input.copy, "配装实例") : "",
      localTag === "keep" ? vaultText(input.copy, "玩家手动保留") : "",
      !item.name.trim() || /^Hash\s+\d+$/i.test(item.name.trim()) ? vaultText(input.copy, "官方名称未解析") : "",
      !item.instance_id ? vaultText(input.copy, "缺少实例 ID") : "",
      isWeapon && hasIncompleteRelevantWeaponRoll(item) ? vaultText(input.copy, "Roll 数据不完整") : "",
      isWeapon && input.recommendationReady === false ? vaultText(input.copy, "推荐核对尚未完成") : "",
      isWeapon && (!match || match.coverage !== "covered") ? vaultText(input.copy, "推荐库未覆盖") : "",
      hasPositiveRecommendation ? vaultText(input.copy, "明确推荐符合") : "",
      hasWeaponOnlyRecommendation ? vaultText(input.copy, "来源只推荐武器，需人工选择实例") : "",
      hasUncheckableRecommendation ? vaultText(input.copy, "推荐数据无法安全核对") : "",
      nameGroup.length > 1 && sameFingerprintCount === 1 ? vaultText(input.copy, "同名组独特 Roll") : "",
      hasRecommendationConflict ? vaultText(input.copy, "推荐来源存在冲突") : ""
    ].filter(Boolean);
    result.set(key, [...new Set(reasons)]);
  }
  return result;
}

function recommendationPurposesConflict(
  sources: RecommendationCardSourceSummary[]
): boolean {
  const positiveCurated = sources
    .filter((source) => source.state === "full" || source.state === "core")
    .flatMap((source) => source.purposes);
  const negativeCurated = sources
    .filter((source) => source.state === "key_missing" || source.state === "not_matched")
    .flatMap((source) => source.purposes);
  return hasOverlappingPurposePair(positiveCurated, negativeCurated);
}

function hasOverlappingPurposePair(
  left: Array<"pve" | "pvp" | "general">,
  right: Array<"pve" | "pvp" | "general">
): boolean {
  if (!left.length || !right.length) return false;
  if (left.includes("general") || right.includes("general")) return true;
  return left.some((purpose) => right.includes(purpose));
}

function hasIncompleteRelevantWeaponRoll(item: AccountItemSummary): boolean {
  const roll = item.weapon_roll;
  if (!roll) return true;
  if (roll.incomplete_reasons.some((reason) => reason !== "unclassified_socket")) return true;
  return roll.sockets.some((socket) => socket.slot !== "other" && !socket.complete);
}

function normalizeName(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{Z}\s]+/gu, "");
}
