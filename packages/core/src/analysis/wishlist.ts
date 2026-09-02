import type { AccountItemSummary } from "../account/summary.js";
import { resolveDimWishlistRuleMetadata, type DimWishlist, type DimWishlistRule } from "./wishlistImport.js";

export type WishlistMatchResult = {
  matched: boolean;
  labels: string[];
  reasons: string[];
  disclaimer: string;
};

const pveClearPerks = ["爆破专家", "萤火虫", "伏特弹药", "炽热辉光", "蜻蜓", "连锁反应"];
const pveDamagePerks = ["诱导推销", "斩首武器", "腹背受敌", "目标锁定", "狂暴"];
const pvpPerks = ["测距仪", "首发射击", "杀戮弹匣", "移动目标", "禅意时刻"];

export function evaluateWishlistRoll(
  item: AccountItemSummary,
  wishlist?: DimWishlist | DimWishlistRule[]
): WishlistMatchResult {
  const localDisclaimer = "本地启发式判断，只用于快速筛选，不能替代社区 god roll 结论。";
  const importedMatches = matchImportedWishlistRules(item, wishlist);

  if (item.group_key !== "weapons") {
    return {
      matched: importedMatches.labels.length > 0,
      labels: importedMatches.labels,
      reasons: importedMatches.reasons,
      disclaimer: importedMatches.labels.length
        ? "DIM 愿望单命中基于你导入的本地规则，仅用于辅助整理。"
        : localDisclaimer
    };
  }

  const perkNames = (item.socket_plugs ?? []).map((plug) => plug.name);
  const labels = [...importedMatches.labels];
  const reasons = [...importedMatches.reasons];

  const clearMatches = matchingPerks(perkNames, pveClearPerks);
  if (clearMatches.length >= 2) {
    labels.push("PvE 清怪");
    reasons.push(`命中清怪 perk：${clearMatches.join("、")}`);
  }

  const damageMatches = matchingPerks(perkNames, pveDamagePerks);
  if (clearMatches.length >= 1 && damageMatches.length >= 1) {
    labels.push("PvE 输出");
    reasons.push(`兼具功能和增伤 perk：${[...clearMatches.slice(0, 1), ...damageMatches.slice(0, 1)].join("、")}`);
  }

  const pvpMatches = matchingPerks(perkNames, pvpPerks);
  if (pvpMatches.length >= 2) {
    labels.push("PvP 手感");
    reasons.push(`命中 PvP perk：${pvpMatches.join("、")}`);
  }

  return {
    matched: labels.length > 0,
    labels,
    reasons,
    disclaimer: importedMatches.labels.length
      ? "DIM 愿望单命中基于你导入的本地规则，同时保留本地启发式提示。"
      : localDisclaimer
  };
}

function matchingPerks(perkNames: string[], keywords: string[]): string[] {
  return keywords.filter((keyword) => perkNames.some((perk) => perk.includes(keyword)));
}

function matchImportedWishlistRules(
  item: AccountItemSummary,
  wishlist?: DimWishlist | DimWishlistRule[]
): Pick<WishlistMatchResult, "labels" | "reasons"> {
  const rules = Array.isArray(wishlist)
    ? wishlist
    : wishlist?.rules ?? [];
  const wishlistDocument = Array.isArray(wishlist) ? undefined : wishlist;
  const perkHashes = new Set((item.socket_plugs ?? []).map((plug) => plug.hash));
  const matchedRules = rules.filter((rule) =>
    rule.item_hash === item.hash
    && rule.perk_hashes.every((hash) => perkHashes.has(hash))
  );

  if (!matchedRules.length) {
    return { labels: [], reasons: [] };
  }

  return {
    labels: ["DIM Wishlist", ...new Set(matchedRules.map((rule) => labelForMode(rule.mode)))],
    reasons: matchedRules.map((rule) => {
      const note = wishlistDocument
        ? resolveDimWishlistRuleMetadata(wishlistDocument, rule).note
        : rule.note;
      return note || `命中导入规则：${labelForMode(rule.mode)}`;
    })
  };
}

function labelForMode(mode: DimWishlistRule["mode"]): string {
  if (mode === "pve") return "DIM PVE";
  if (mode === "pvp") return "DIM PVP";
  return "DIM General";
}
