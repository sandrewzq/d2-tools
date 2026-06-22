import type { LoadoutTemplate } from "../../api/client";
import type { AccountItemSummary, AccountSummary } from "../../api/client";
import type { buildMissingLoadoutTransferPlan } from "../../utils/loadoutTransfer";
import type { analyzeLoadoutTemplate } from "@d2-tools/core/loadouts/analysis";

export type LoadoutCompareRow = {
  slot: string;
  left: LoadoutCompareCell;
  right: LoadoutCompareCell;
  changed: boolean;
};

export type LoadoutCompareCell = {
  name: string;
  frame: string;
  perks: string[];
};

export type LoadoutSourceItem = AccountItemSummary & {
  source_character_id?: string;
  source_kind: "equipped" | "inventory" | "vault" | "postmaster";
  source_label?: string;
  is_vault_item?: boolean;
  is_postmaster_item?: boolean;
};

export function buildLoadoutCompareRows(primary: LoadoutTemplate, secondary: LoadoutTemplate): LoadoutCompareRow[] {
  const primaryItems = new Map(primary.items.map((item) => [loadoutCompareSlotKey(item), item]));
  const secondaryItems = new Map(secondary.items.map((item) => [loadoutCompareSlotKey(item), item]));
  const slots = Array.from(new Set([...primaryItems.keys(), ...secondaryItems.keys()]));

  return slots.map((slot) => {
    const leftItem = primaryItems.get(slot);
    const rightItem = secondaryItems.get(slot);
    const left = formatLoadoutCompareItem(leftItem);
    const right = formatLoadoutCompareItem(rightItem);
    return {
      slot,
      left,
      right,
      changed: left.name !== right.name
        || left.frame !== right.frame
        || formatLoadoutComparePerks(left.perks) !== formatLoadoutComparePerks(right.perks)
    };
  });
}

export function formatLoadoutComparePerks(perks: string[]): string {
  return perks.length ? perks.join(" / ") : "无";
}

export function buildMissingLoadoutItemsText(
  template: LoadoutTemplate,
  missingItems: LoadoutTemplate["items"],
  summary: AccountSummary | null
): string {
  return [
    `d2-tools 缺失清单：${template.name}`,
    `职业：${template.class_name}`,
    `缺失数量：${missingItems.length}`,
    "",
    ...missingItems.map((item, index) => [
      `${index + 1}. ${item.name}`,
      `   来源：${findTemplateItemSourceLabel(item, summary, template.character_id)}`,
      `   槽位：${item.bucket_name ?? "未标注"}`,
      `   框架：${item.weapon_frame_name ?? "未标注"}`,
      `   Perk：${formatLoadoutComparePerks(item.perk_names?.slice(0, 2) ?? [])}`
    ].join("\n")),
    "",
    "说明：这只是本地缺失清单，不会执行 Bungie 写操作。"
  ].join("\n");
}

export function isTemplateItemReady(
  item: LoadoutTemplate["items"][number],
  analysis: ReturnType<typeof analyzeLoadoutTemplate> | null
): boolean {
  if (!analysis) {
    return false;
  }

  return analysis.equipped.some((equippedItem) => {
    if (item.instance_id && equippedItem.instance_id) {
      return item.instance_id === equippedItem.instance_id;
    }

    return equippedItem.hash === item.hash
      && equippedItem.bucket_name === item.bucket_name;
  });
}

export function getMissingLoadoutActionableCount(
  plan: ReturnType<typeof buildMissingLoadoutTransferPlan>
): number {
  return new Set(
    plan.steps
      .filter((step) => step.phase !== "equip-swap")
      .flatMap((step) => step.items.map((entry) => entry.item_id))
  ).size;
}

export function isTemplateItemReadyFromPlan(
  item: LoadoutTemplate["items"][number],
  plan: ReturnType<typeof buildMissingLoadoutTransferPlan>
): boolean {
  if (plan.blocked.some((entry) => isMatchingTemplateItem(item, entry.item))) {
    return false;
  }

  return !plan.steps.some((step) =>
    step.phase !== "equip-swap"
    && step.items.some((entry) => isMatchingTemplateItemIdentity(item, entry.item_id, entry.item_reference_hash, entry.bucket_name))
  );
}

export function isMatchingTemplateItem(
  left: Pick<LoadoutTemplate["items"][number], "hash" | "instance_id" | "bucket_name">,
  right: Pick<LoadoutTemplate["items"][number], "hash" | "instance_id" | "bucket_name">
): boolean {
  if (left.instance_id && right.instance_id) {
    return left.instance_id === right.instance_id;
  }

  return left.hash === right.hash
    && left.bucket_name === right.bucket_name;
}

export function findBestTemplateSourceItem(
  item: LoadoutTemplate["items"][number],
  summary: AccountSummary | null,
  templateCharacterId?: string
): LoadoutSourceItem | null {
  if (!summary) {
    return null;
  }

  const candidates = getAllKnownAccountItemsWithSource(summary)
    .filter((candidate) => isTemplateSourceMatch(item, candidate))
    .sort((left, right) => scoreTemplateSourceCandidate(right, item, templateCharacterId)
      - scoreTemplateSourceCandidate(left, item, templateCharacterId));

  return candidates[0] ?? null;
}

export function getAllKnownAccountItemsWithSource(summary: AccountSummary): LoadoutSourceItem[] {
  const characterItems = summary.characters.flatMap((character) => [
    ...character.equipped_items.map((item) => ({
      ...item,
      source_character_id: character.character_id,
      source_kind: "equipped" as const,
      source_label: "已装备"
    })),
    ...character.inventory_items.map((item) => ({
      ...item,
      source_character_id: character.character_id,
      source_kind: "inventory" as const,
      source_label: "背包"
    })),
    ...character.postmaster_items.map((item) => ({
      ...item,
      source_character_id: character.character_id,
      is_postmaster_item: true,
      source_kind: "postmaster" as const,
      source_label: "邮政官"
    }))
  ]);

  return [
    ...summary.vault.items.map((item) => ({
      ...item,
      is_vault_item: true,
      source_kind: "vault" as const,
      source_label: "仓库"
    })),
    ...characterItems
  ];
}

function loadoutCompareSlotKey(item: LoadoutTemplate["items"][number]): string {
  return item.bucket_name || item.name;
}

function formatLoadoutCompareItem(item: LoadoutTemplate["items"][number] | undefined): LoadoutCompareCell {
  if (!item) {
    return {
      name: "未配置",
      frame: "未配置",
      perks: []
    };
  }

  return {
    name: item.name,
    frame: item.weapon_frame_name || "未标注",
    perks: item.perk_names?.slice(0, 2) ?? []
  };
}

function findTemplateItemSourceLabel(
  item: LoadoutTemplate["items"][number],
  summary: AccountSummary | null,
  templateCharacterId?: string
): string {
  const matchedItem = findBestTemplateSourceItem(item, summary, templateCharacterId);
  if (!matchedItem) {
    return "未找到";
  }

  const isCurrentCharacter = Boolean(templateCharacterId && matchedItem.source_character_id === templateCharacterId);
  const characterLabel = summary?.characters.find((character) => character.character_id === matchedItem.source_character_id)?.class_name
    ?? "其他角色";

  if (matchedItem.source_kind === "vault") {
    return "仓库";
  }

  if (matchedItem.source_kind === "postmaster") {
    return isCurrentCharacter ? "当前角色邮政官" : `${characterLabel}邮政官`;
  }

  if (matchedItem.source_kind === "equipped") {
    return isCurrentCharacter ? "当前角色已装备" : `${characterLabel}已装备`;
  }

  return isCurrentCharacter ? "当前角色背包" : `${characterLabel}背包`;
}

function isMatchingTemplateItemIdentity(
  item: Pick<LoadoutTemplate["items"][number], "hash" | "instance_id" | "bucket_name">,
  itemId: string,
  itemHash?: number,
  bucketName?: string
): boolean {
  if (item.instance_id) {
    return item.instance_id === itemId;
  }

  return item.hash === itemHash
    && item.bucket_name === bucketName;
}

function isTemplateSourceMatch(
  item: LoadoutTemplate["items"][number],
  candidate: LoadoutSourceItem
): boolean {
  if (item.instance_id && candidate.instance_id) {
    return item.instance_id === candidate.instance_id;
  }

  return candidate.hash === item.hash
    && (!item.bucket_name || candidate.bucket_name === item.bucket_name);
}

function scoreTemplateSourceCandidate(
  candidate: LoadoutSourceItem,
  item: LoadoutTemplate["items"][number],
  templateCharacterId?: string
): number {
  let score = 0;

  if (item.instance_id && candidate.instance_id && item.instance_id === candidate.instance_id) {
    score += 100;
  } else if (candidate.hash === item.hash && candidate.bucket_name === item.bucket_name) {
    score += 20;
  } else if (candidate.hash === item.hash) {
    score += 10;
  }

  if (templateCharacterId && candidate.source_character_id === templateCharacterId) {
    score += 8;
  }

  const sourceScores: Record<LoadoutSourceItem["source_kind"], number> = {
    equipped: 4,
    inventory: 3,
    vault: 2,
    postmaster: 1
  };

  return score + sourceScores[candidate.source_kind];
}
