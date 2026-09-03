import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { VaultItemInstanceMatchInfo } from "@d2-tools/core/community-perks";
import type { VaultTags } from "@d2-tools/core/vault/tags";
import type { LoadoutTemplateLookup } from "@d2-tools/app/loadouts";
import { getVaultCommunityInstanceKey } from "./vaultRecommendationMatch.js";

export function buildVaultCleanupProtectionIndex(input: {
  items: AccountItemSummary[];
  tags: VaultTags;
  highlightedItemKeys?: LoadoutTemplateLookup | null;
  communityInstanceMatch?: Map<string, VaultItemInstanceMatchInfo>;
}): Map<string, string[]> {
  const weapons = input.items.filter((item) => item.group_key === "weapons");
  const sameName = new Map<string, AccountItemSummary[]>();
  for (const item of weapons) {
    const key = normalizeName(item.name);
    sameName.set(key, [...(sameName.get(key) ?? []), item]);
  }
  const result = new Map<string, string[]>();
  for (const item of weapons) {
    const key = getVaultCommunityInstanceKey(item);
    const localTag = input.tags.items[key]?.tag;
    const match = input.communityInstanceMatch?.get(key);
    const nameGroup = sameName.get(normalizeName(item.name)) ?? [];
    const sameFingerprintCount = item.weapon_roll?.fingerprint
      ? nameGroup.filter((candidate) => candidate.weapon_roll?.fingerprint === item.weapon_roll?.fingerprint).length
      : 0;
    const sourceStates = match?.source_matches ?? [];
    const hasPositiveSource = sourceStates.some((source) => (
      source.state === "weapon_only"
      || source.matched_requirement_count > 0
    )) || Boolean(
      match?.dim_wishlist
      && (match.dim_wishlist.matched_combo_count > 0 || match.dim_wishlist.partial_combo_count > 0)
    );
    const hasNegativeSource = sourceStates.some((source) => (
      source.requirement_count > 0
      && source.matched_requirement_count === 0
      && sourceUncheckableRequirementCount(source) === 0
    )) || Boolean(
      match?.dim_wishlist
      && match.dim_wishlist.combo_count > 0
      && match.dim_wishlist.matched_combo_count === 0
      && match.dim_wishlist.partial_combo_count === 0
      && match.dim_wishlist.uncheckable_combo_count === 0
    );
    const reasons = [
      item.locked ? "已锁定" : "",
      item.instance_id && input.highlightedItemKeys?.instanceIds.has(item.instance_id) ? "配装实例" : "",
      localTag === "keep" ? "玩家手动保留" : "",
      !item.name.trim() || /^Hash\s+\d+$/i.test(item.name.trim()) ? "官方名称未解析" : "",
      !item.instance_id ? "缺少实例 ID" : "",
      hasIncompleteRelevantWeaponRoll(item) ? "Roll 数据不完整" : "",
      !match || match.coverage !== "covered" ? "推荐库未覆盖" : "",
      nameGroup.length > 1 && sameFingerprintCount === 1 ? "同名组独特 Roll" : "",
      hasPositiveSource && hasNegativeSource ? "推荐来源存在冲突" : ""
    ].filter(Boolean);
    result.set(key, [...new Set(reasons)]);
  }
  return result;
}

function sourceUncheckableRequirementCount(
  source: NonNullable<VaultItemInstanceMatchInfo["source_matches"]>[number]
): number {
  return source.uncheckable_requirement_count
    ?? source.slots.filter((slot) => slot.state === "uncheckable").length;
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
