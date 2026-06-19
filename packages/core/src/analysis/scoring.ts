import type { EquipmentGroupKey } from "../account/summary.js";
import type { VaultTags } from "../vault/tags.js";

export type VaultScoreGrade = "keep" | "review" | "junk";

export type ScorableVaultItem = {
  hash: number;
  instance_id?: string;
  name: string;
  tier?: string;
  group_key: EquipmentGroupKey;
  locked?: boolean;
  socket_plugs?: unknown[];
};

export type VaultItemScore = {
  item_key: string;
  name: string;
  score: number;
  grade: VaultScoreGrade;
  reasons: string[];
  warnings: string[];
};

export type VaultScoreSummary = {
  counts: Record<VaultScoreGrade, number>;
  top_keep: VaultItemScore[];
  top_review: VaultItemScore[];
  top_junk: VaultItemScore[];
};

export function scoreVaultItem(item: ScorableVaultItem, tags: VaultTags): VaultItemScore {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 45;
  const tag = tags.items[itemKey(item)]?.tag;

  if (tag === "keep") {
    score += 35;
    reasons.push("本地标记为保留");
  } else if (tag === "review") {
    score += 10;
    reasons.push("本地标记为关注");
  } else if (tag === "junk") {
    score -= 35;
    reasons.push("本地标记为可清理");
  } else {
    warnings.push("未做本地标记，建议人工复查");
  }

  const tier = item.tier?.toLocaleLowerCase();
  if (tier === "exotic") {
    score += 18;
    reasons.push("异域装备");
  } else if (tier === "legendary") {
    score += item.group_key === "weapons" ? 10 : 6;
    reasons.push(item.group_key === "weapons" ? "传说武器" : "传说装备");
  }

  if (item.locked) {
    score += 14;
    reasons.push("已锁定");
  }

  if (item.socket_plugs?.length) {
    score += item.group_key === "weapons" ? 12 : 6;
    reasons.push("已读取实际 roll");
  }

  if (item.group_key === "weapons") {
    score += 6;
    reasons.push("武器栏物品");
  } else if (item.group_key === "armor") {
    score += 4;
    reasons.push("护甲栏物品");
  } else if (item.group_key === "equipment" && tier !== "exotic") {
    score -= 8;
    reasons.push("外观或载具类装备");
  } else if (item.group_key === "other") {
    score -= 6;
    warnings.push("分类信息不足");
  }

  const normalizedScore = clamp(score, 0, 100);
  return {
    item_key: itemKey(item),
    name: item.name,
    score: normalizedScore,
    grade: gradeForScore(normalizedScore),
    reasons: reasons.length ? reasons : ["暂无明显保留或清理依据"],
    warnings
  };
}

export function summarizeVaultScores(items: ScorableVaultItem[], tags: VaultTags): VaultScoreSummary {
  const scores = items.map((item) => scoreVaultItem(item, tags));
  return {
    counts: {
      keep: scores.filter((item) => item.grade === "keep").length,
      review: scores.filter((item) => item.grade === "review").length,
      junk: scores.filter((item) => item.grade === "junk").length
    },
    top_keep: scores.filter((item) => item.grade === "keep").sort(compareHighScore).slice(0, 8),
    top_review: scores.filter((item) => item.grade === "review").sort(compareHighScore).slice(0, 8),
    top_junk: scores.filter((item) => item.grade === "junk").sort(compareLowScore).slice(0, 8)
  };
}

function gradeForScore(score: number): VaultScoreGrade {
  if (score >= 75) {
    return "keep";
  }
  if (score <= 34) {
    return "junk";
  }
  return "review";
}

function itemKey(item: ScorableVaultItem): string {
  return item.instance_id ?? `hash:${item.hash}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function compareHighScore(left: VaultItemScore, right: VaultItemScore): number {
  return right.score - left.score || left.name.localeCompare(right.name, "zh-Hans-CN");
}

function compareLowScore(left: VaultItemScore, right: VaultItemScore): number {
  return left.score - right.score || left.name.localeCompare(right.name, "zh-Hans-CN");
}
