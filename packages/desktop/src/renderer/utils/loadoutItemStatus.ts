import type { AccountSummary } from "../api/client";

export type LoadoutStatusSourceItem = {
  source_kind: "equipped" | "inventory" | "vault" | "postmaster";
  source_character_id?: string;
};

export type LoadoutItemStatus = {
  key:
  | "equipped"
  | "current-inventory"
  | "vault"
  | "other-character-inventory"
  | "other-character-equipped"
  | "postmaster"
  | "not-found";
  badge_label: string;
  badge_tone: "ready" | "info" | "warning" | "blocked";
  summary_key:
  | "equipped"
  | "current-inventory"
  | "vault"
  | "other-character"
  | "postmaster"
  | "not-found";
  summary_label: string;
  location_label: string;
  guidance_label?: string;
  guidance_hint?: string;
};

type LoadoutItemStatusSummaryKey = LoadoutItemStatus["summary_key"];

const summaryOrder: LoadoutItemStatusSummaryKey[] = [
  "equipped",
  "current-inventory",
  "vault",
  "other-character",
  "postmaster",
  "not-found"
];

const summaryLabels: Record<LoadoutItemStatusSummaryKey, string> = {
  equipped: "已装备",
  "current-inventory": "背包待穿",
  vault: "仓库",
  "other-character": "跨角色",
  postmaster: "邮政官",
  "not-found": "未找到"
};

export function buildLoadoutItemStatus(input: {
  isReady: boolean;
  sourceItem: LoadoutStatusSourceItem | null;
  targetCharacterId: string;
  accountSummary: AccountSummary | null;
}): LoadoutItemStatus {
  if (input.isReady) {
    return {
      key: "equipped",
      badge_label: "已装备",
      badge_tone: "ready",
      summary_key: "equipped",
      summary_label: summaryLabels.equipped,
      location_label: "当前角色已装备"
    };
  }

  if (!input.sourceItem) {
    return {
      key: "not-found",
      badge_label: "未找到",
      badge_tone: "blocked",
      summary_key: "not-found",
      summary_label: summaryLabels["not-found"],
      location_label: "未找到",
      guidance_label: "账号内未找到来源",
      guidance_hint: "这件装备可能已经分解，或者当前已不在本账号可读取的数据里。"
    };
  }

  const { sourceItem } = input;
  const isTargetCharacter = Boolean(
    sourceItem.source_character_id && sourceItem.source_character_id === input.targetCharacterId
  );
  const characterLabel = sourceItem.source_character_id
    ? input.accountSummary?.characters.find((character) => character.character_id === sourceItem.source_character_id)?.class_name
      ?? "其他角色"
    : "其他角色";

  if (sourceItem.source_kind === "vault") {
    return {
      key: "vault",
      badge_label: "仓库待取",
      badge_tone: "info",
      summary_key: "vault",
      summary_label: summaryLabels.vault,
      location_label: "仓库",
      guidance_label: "可自动补齐",
      guidance_hint: "执行补齐时会直接从仓库转入目标角色，并在最后自动装备。"
    };
  }

  if (sourceItem.source_kind === "postmaster") {
    return {
      key: "postmaster",
      badge_label: "邮政官",
      badge_tone: "warning",
      summary_key: "postmaster",
      summary_label: summaryLabels.postmaster,
      location_label: isTargetCharacter ? "当前角色邮政官" : `${characterLabel}邮政官`,
      guidance_label: "可自动补齐",
      guidance_hint: isTargetCharacter
        ? "执行补齐时会先从当前角色邮政官取回，再自动装备。"
        : "执行补齐时会先从邮政官取回，再经仓库转入目标角色。"
    };
  }

  if (sourceItem.source_kind === "inventory" && isTargetCharacter) {
    return {
      key: "current-inventory",
      badge_label: "背包待穿",
      badge_tone: "info",
      summary_key: "current-inventory",
      summary_label: summaryLabels["current-inventory"],
      location_label: "当前角色背包",
      guidance_label: "已在当前角色背包",
      guidance_hint: "这件已经在当前角色背包里，直接手动装备即可。"
    };
  }

  if (sourceItem.source_kind === "inventory") {
    return {
      key: "other-character-inventory",
      badge_label: "他角背包",
      badge_tone: "warning",
      summary_key: "other-character",
      summary_label: summaryLabels["other-character"],
      location_label: `${characterLabel}背包`,
      guidance_label: "可自动补齐",
      guidance_hint: "执行补齐时会先转回仓库，再转入目标角色并自动装备。"
    };
  }

  return {
    key: "other-character-equipped",
    badge_label: "他角已穿",
    badge_tone: "warning",
    summary_key: "other-character",
    summary_label: summaryLabels["other-character"],
    location_label: isTargetCharacter ? "当前角色已装备" : `${characterLabel}已装备`,
    guidance_label: "需检查来源角色",
    guidance_hint: "如果来源角色同槽位有替代品，补齐时会先换下这件装备再继续转移。"
  };
}

export function summarizeLoadoutItemStatuses(statuses: LoadoutItemStatus[]): Array<{
  key: LoadoutItemStatusSummaryKey;
  label: string;
  count: number;
}> {
  const counts = new Map<LoadoutItemStatusSummaryKey, number>();
  for (const status of statuses) {
    counts.set(status.summary_key, (counts.get(status.summary_key) ?? 0) + 1);
  }

  return summaryOrder
    .filter((key) => (counts.get(key) ?? 0) > 0)
    .map((key) => ({
      key,
      label: summaryLabels[key],
      count: counts.get(key) ?? 0
    }));
}
