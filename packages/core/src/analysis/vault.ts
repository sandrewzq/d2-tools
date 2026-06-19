import type { AccountItemSummary, EquipmentGroupKey } from "../account/summary.js";
import type { VaultTags } from "../vault/tags.js";
import { summarizeVaultScores, type VaultScoreSummary } from "./scoring.js";

export type VaultAnalysisInput = {
  items: AccountItemSummary[];
  tags: VaultTags;
};

export type VaultAnalysisItem = {
  item_key: string;
  name: string;
  tier?: string;
  item_type?: string;
  power?: number;
  note?: string;
  plugs: string[];
};

export type VaultAnalysisResult = {
  facts: string[];
  analysis: string[];
  suggestions: string[];
  items: {
    keep: VaultAnalysisItem[];
    review: VaultAnalysisItem[];
    junk: VaultAnalysisItem[];
  };
  scoring: VaultScoreSummary;
};

const groupLabels: Record<EquipmentGroupKey, string> = {
  weapons: "武器",
  armor: "护甲",
  equipment: "其他装备",
  other: "其他"
};

const groupOrder: EquipmentGroupKey[] = ["weapons", "armor", "equipment", "other"];

export function analyzeVault(input: VaultAnalysisInput): VaultAnalysisResult {
  const groupCounts = countGroups(input.items);
  const keep = taggedItems(input, "keep");
  const review = taggedItems(input, "review");
  const junk = taggedItems(input, "junk");
  const taggedCount = keep.length + review.length + junk.length;
  const untaggedCount = input.items.length - taggedCount;
  const rollCount = input.items.filter((item) => item.socket_plugs?.length).length;
  const scoring = summarizeVaultScores(input.items, input.tags);

  return {
    facts: [
      `仓库共 ${input.items.length} 件物品，其中${formatGroupCounts(groupCounts)}。`,
      `本地标记：保留 ${keep.length} 件、关注 ${review.length} 件、可清理 ${junk.length} 件、未标记 ${untaggedCount} 件。`,
      `已读取实际 roll 的物品 ${rollCount} 件。`,
      `本地评分：建议保留 ${scoring.counts.keep} 件、建议复查 ${scoring.counts.review} 件、可清理候选 ${scoring.counts.junk} 件。`
    ],
    analysis: buildAnalysis({ keep, review, junk, untaggedCount }),
    suggestions: buildSuggestions({ review, junk, untaggedCount }),
    items: {
      keep,
      review,
      junk
    },
    scoring
  };
}

function countGroups(items: AccountItemSummary[]): Record<EquipmentGroupKey, number> {
  return groupOrder.reduce<Record<EquipmentGroupKey, number>>((counts, key) => {
    counts[key] = items.filter((item) => item.group_key === key).length;
    return counts;
  }, {
    weapons: 0,
    armor: 0,
    equipment: 0,
    other: 0
  });
}

function formatGroupCounts(counts: Record<EquipmentGroupKey, number>): string {
  return groupOrder.map((key) => `${groupLabels[key]} ${counts[key]} 件`).join("、");
}

function taggedItems(input: VaultAnalysisInput, tag: "keep" | "review" | "junk"): VaultAnalysisItem[] {
  return input.items
    .filter((item) => input.tags.items[itemKey(item)]?.tag === tag)
    .slice(0, 12)
    .map((item) => ({
      item_key: itemKey(item),
      name: item.name,
      tier: item.tier,
      item_type: item.item_type,
      power: item.power,
      note: input.tags.items[itemKey(item)]?.note,
      plugs: (item.socket_plugs ?? []).slice(0, 6).map((plug) => plug.name)
    }));
}

function buildAnalysis(input: {
  keep: VaultAnalysisItem[];
  review: VaultAnalysisItem[];
  junk: VaultAnalysisItem[];
  untaggedCount: number;
}): string[] {
  const lines: string[] = [];
  if (input.keep.length) {
    lines.push(`保留标记集中在 ${formatItemNames(input.keep)}。`);
  }
  if (input.review.length) {
    lines.push(`关注标记集中在 ${formatItemNames(input.review)}，适合后续人工复查。`);
  }
  if (input.junk.length) {
    lines.push(`可清理标记已有 ${input.junk.length} 件，适合在正式删除前再次确认。`);
  }
  if (input.untaggedCount) {
    lines.push(`还有 ${input.untaggedCount} 件未标记，AI 深度分析前建议先补一轮人工判断。`);
  }

  return lines.length ? lines : ["当前仓库还没有足够的本地标记，建议先在仓库页标记几件装备。"];
}

function buildSuggestions(input: {
  review: VaultAnalysisItem[];
  junk: VaultAnalysisItem[];
  untaggedCount: number;
}): string[] {
  const lines: string[] = [];
  if (input.review.length) {
    lines.push(`优先查看“关注”标记的 ${input.review.length} 件装备，确认是否改为保留或可清理。`);
  }
  if (input.junk.length) {
    lines.push(`清理前先复查“可清理”标记，避免误删高光等或稀有 roll。`);
  }
  if (input.untaggedCount) {
    lines.push(`继续给未标记装备补标签，这会让后续 AI 建议更贴近你的习惯。`);
  }

  return lines.length ? lines : ["先读取账号数据并在仓库页添加本地标记。"];
}

function formatItemNames(items: VaultAnalysisItem[]): string {
  return items.slice(0, 4).map((item) => item.name).join("、");
}

function itemKey(item: AccountItemSummary): string {
  return item.instance_id ?? `hash:${item.hash}`;
}
