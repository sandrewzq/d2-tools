import type { AccountItemSummary } from "../account/summary.js";

export type WishlistMatchResult = {
  matched: boolean;
  labels: string[];
  reasons: string[];
  disclaimer: string;
};

const pveClearPerks = ["爆破专家", "萤火虫", "伏特弹药", "炽热辉光", "蜻蜓", "连锁反应"];
const pveDamagePerks = ["诱导推销", "斩首武器", "腹背受敌", "目标锁定", "狂暴"];
const pvpPerks = ["测距仪", "首发射击", "杀戮弹匣", "移动目标", "禅意时刻"];

export function evaluateWishlistRoll(item: AccountItemSummary): WishlistMatchResult {
  const disclaimer = "本地启发式判断，只用于快速筛选，不能替代社区 god roll 结论。";
  if (item.group_key !== "weapons") {
    return { matched: false, labels: [], reasons: [], disclaimer };
  }

  const perkNames = item.socket_plugs.map((plug) => plug.name);
  const labels: string[] = [];
  const reasons: string[] = [];

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
    disclaimer
  };
}

function matchingPerks(perkNames: string[], keywords: string[]): string[] {
  return keywords.filter((keyword) => perkNames.some((perk) => perk.includes(keyword)));
}
