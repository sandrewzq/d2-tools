import type { AccountSummary } from "@d2-tools/core/account/summary";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import type { MissingLoadoutTransferPlan } from "./loadoutTransfer.js";
import { findBestTemplateSourceItem } from "./loadoutSources.js";

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

export function isTemplateItemReadyFromPlan(
  item: LoadoutTemplate["items"][number],
  plan: MissingLoadoutTransferPlan
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
