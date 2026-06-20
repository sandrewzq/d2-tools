import type { AccountItemSummary, AccountSummary, LoadoutTemplate } from "../api/client";

export type MissingLoadoutTransferReason =
  | "not-found"
  | "missing-instance-id"
  | "already-on-target-character"
  | "other-character-equipped"
  | "postmaster";

export type MissingLoadoutTransferItem = {
  item_id: string;
  item_reference_hash: number;
  item_name: string;
  bucket_name?: string;
  source_kind: "equipped" | "inventory" | "vault" | "postmaster";
  source_character_id?: string;
};

export type MissingLoadoutEquipSwapItem = {
  item_id: string;
  item_reference_hash?: number;
  item_name: string;
  bucket_name?: string;
};

export type MissingLoadoutTransferStep =
  | {
    phase: "equip-swap";
    character_id: string;
    items: MissingLoadoutEquipSwapItem[];
  }
  | {
    phase: "equip-target";
    character_id: string;
    items: MissingLoadoutEquipSwapItem[];
  }
  | {
    phase: "pull-postmaster";
    character_id: string;
    items: MissingLoadoutTransferItem[];
  }
  | {
    phase: "to-vault" | "to-character";
    character_id: string;
    transfer_to_vault: boolean;
    items: MissingLoadoutTransferItem[];
  };

type TransferSourceKind = MissingLoadoutTransferItem["source_kind"];

type StagedTransferSourceItem = SourceItem & {
  source_kind: TransferSourceKind;
};

export type MissingLoadoutTransferPlan = {
  steps: MissingLoadoutTransferStep[];
  transferable_count: number;
  already_on_character_count: number;
  blocked: Array<{
    item: LoadoutTemplate["items"][number];
    reason: Exclude<MissingLoadoutTransferReason, "already-on-target-character">;
  }>;
};

export type MissingLoadoutBlockedDescription = {
  label: string;
  hint: string;
};

type SourceItem = AccountItemSummary & {
  source_kind: "equipped" | "inventory" | "vault" | "postmaster";
  source_character_id?: string;
};

export function buildMissingLoadoutTransferPlan(input: {
  template: LoadoutTemplate;
  missingItems: LoadoutTemplate["items"];
  accountSummary: AccountSummary;
}): MissingLoadoutTransferPlan {
  const steps: MissingLoadoutTransferStep[] = [];
  const blocked: MissingLoadoutTransferPlan["blocked"] = [];
  let alreadyOnCharacterCount = 0;

  const sourceItems = collectSourceItems(input.accountSummary);
  const stagedEquipSwaps = new Map<string, MissingLoadoutEquipSwapItem[]>();
  const stagedPostmasterPulls = new Map<string, MissingLoadoutTransferItem[]>();
  const stagedVaultMoves = new Map<string, MissingLoadoutTransferItem[]>();
  const directToCharacter: MissingLoadoutTransferItem[] = [];
  const directEquipTarget = new Map<string, MissingLoadoutEquipSwapItem>();

  for (const item of input.missingItems) {
    const matched = findBestSourceItem(item, sourceItems, input.template.character_id);
    if (!matched) {
      blocked.push({ item, reason: "not-found" });
      continue;
    }
    if (!matched.instance_id) {
      blocked.push({ item, reason: "missing-instance-id" });
      continue;
    }

    const transferItem: MissingLoadoutTransferItem = {
      item_id: matched.instance_id,
      item_reference_hash: matched.hash,
      item_name: matched.name,
      bucket_name: matched.bucket_name,
      source_kind: matched.source_kind,
      source_character_id: matched.source_character_id
    };
    const equipTargetItem: MissingLoadoutEquipSwapItem = {
      item_id: matched.instance_id,
      item_reference_hash: matched.hash,
      item_name: matched.name,
      bucket_name: matched.bucket_name
    };

    if (matched.source_kind === "vault") {
      directToCharacter.push(transferItem);
      directEquipTarget.set(equipTargetItem.item_id, equipTargetItem);
      continue;
    }

    if (matched.source_kind === "postmaster") {
      const stagedPulls = stagedPostmasterPulls.get(matched.source_character_id ?? "");
      if (stagedPulls) {
        stagedPulls.push(transferItem);
      } else {
        stagedPostmasterPulls.set(matched.source_character_id ?? "", [transferItem]);
      }

      if (matched.source_character_id === input.template.character_id) {
        directEquipTarget.set(equipTargetItem.item_id, equipTargetItem);
        continue;
      }
    }

    if (matched.source_character_id === input.template.character_id) {
      if (matched.source_kind === "equipped") {
        continue;
      }
      alreadyOnCharacterCount += 1;
      directEquipTarget.set(equipTargetItem.item_id, equipTargetItem);
      continue;
    }

    if (matched.source_kind === "equipped") {
      const replacement = findReplacementInventoryItem(matched, input.accountSummary);
      if (!replacement?.instance_id || !matched.source_character_id) {
        blocked.push({ item, reason: "other-character-equipped" });
        continue;
      }

      const stagedEquips = stagedEquipSwaps.get(matched.source_character_id);
      const replacementEquipItem: MissingLoadoutEquipSwapItem = {
        item_id: replacement.instance_id,
        item_reference_hash: replacement.hash,
        item_name: replacement.name,
        bucket_name: replacement.bucket_name
      };
      if (stagedEquips) {
        stagedEquips.push(replacementEquipItem);
      } else {
        stagedEquipSwaps.set(matched.source_character_id, [replacementEquipItem]);
      }
    }

    const stagedItems = stagedVaultMoves.get(matched.source_character_id ?? "");
    if (stagedItems) {
      stagedItems.push(transferItem);
    } else {
      stagedVaultMoves.set(matched.source_character_id ?? "", [transferItem]);
    }
    directToCharacter.push(transferItem);
    directEquipTarget.set(equipTargetItem.item_id, equipTargetItem);
  }

  for (const [characterId, items] of stagedEquipSwaps.entries()) {
    if (!characterId || !items.length) {
      continue;
    }
    steps.push({
      phase: "equip-swap",
      character_id: characterId,
      items
    });
  }

  for (const [characterId, items] of stagedPostmasterPulls.entries()) {
    if (!characterId || !items.length) {
      continue;
    }
    steps.push({
      phase: "pull-postmaster",
      character_id: characterId,
      items
    });
  }

  for (const [characterId, items] of stagedVaultMoves.entries()) {
    if (!characterId || !items.length) {
      continue;
    }
    steps.push({
      phase: "to-vault",
      character_id: characterId,
      transfer_to_vault: true,
      items
    });
  }

  if (directToCharacter.length) {
    steps.push({
      phase: "to-character",
      character_id: input.template.character_id,
      transfer_to_vault: false,
      items: directToCharacter
    });
  }

  if (directEquipTarget.size) {
    steps.push({
      phase: "equip-target",
      character_id: input.template.character_id,
      items: Array.from(directEquipTarget.values())
    });
  }

  return {
    steps,
    transferable_count: directToCharacter.length,
    already_on_character_count: alreadyOnCharacterCount,
    blocked
  };
}

export function describeMissingLoadoutBlockedReason(
  reason: MissingLoadoutTransferPlan["blocked"][number]["reason"]
): MissingLoadoutBlockedDescription {
  switch (reason) {
    case "other-character-equipped":
      return {
        label: "其他角色已装备",
        hint: "先去对应角色卸下这件装备，再回来补齐。"
      };
    case "postmaster":
      return {
        label: "还在邮政官",
        hint: "先把物品取回角色背包，再执行补齐。"
      };
    case "missing-instance-id":
      return {
        label: "缺少实例数据",
        hint: "这件物品当前无法精确定位，刷新账号数据后再试。"
      };
    case "not-found":
    default:
      return {
        label: "未找到来源",
        hint: "账号里暂时找不到这件装备，可能已经分解或在别的角色上变化了。"
      };
  }
}

function collectSourceItems(summary: AccountSummary): SourceItem[] {
  return [
    ...summary.vault.items.map((item) => ({
      ...item,
      source_kind: "vault" as const
    })),
    ...summary.characters.flatMap((character) => [
      ...character.equipped_items.map((item) => ({
        ...item,
        source_kind: "equipped" as const,
        source_character_id: character.character_id
      })),
      ...character.inventory_items.map((item) => ({
        ...item,
        source_kind: "inventory" as const,
        source_character_id: character.character_id
      })),
      ...character.postmaster_items.map((item) => ({
        ...item,
        source_kind: "postmaster" as const,
        source_character_id: character.character_id
      }))
    ])
  ];
}

function findReplacementInventoryItem(
  matched: StagedTransferSourceItem,
  summary: AccountSummary
): AccountItemSummary | null {
  if (!matched.source_character_id) {
    return null;
  }

  const sourceCharacter = summary.characters.find((character) => character.character_id === matched.source_character_id);
  if (!sourceCharacter) {
    return null;
  }

  const candidates = sourceCharacter.inventory_items
    .filter((candidate) => candidate.instance_id && candidate.instance_id !== matched.instance_id)
    .filter((candidate) => isSameBucket(candidate, matched))
    .sort((left, right) => compareReplacementInventoryItems(left, right));

  return candidates[0] ?? null;
}

function findBestSourceItem(
  item: LoadoutTemplate["items"][number],
  sourceItems: SourceItem[],
  targetCharacterId: string
): SourceItem | null {
  const candidates = sourceItems
    .filter((candidate) => isTemplateMatch(item, candidate))
    .sort((left, right) => scoreSourceItem(right, item, targetCharacterId) - scoreSourceItem(left, item, targetCharacterId));

  return candidates[0] ?? null;
}

function isTemplateMatch(
  item: LoadoutTemplate["items"][number],
  candidate: Pick<SourceItem, "hash" | "instance_id" | "bucket_name">
): boolean {
  if (item.instance_id && candidate.instance_id) {
    return item.instance_id === candidate.instance_id;
  }

  return item.hash === candidate.hash
    && (!item.bucket_name || item.bucket_name === candidate.bucket_name);
}

function scoreSourceItem(
  candidate: SourceItem,
  item: LoadoutTemplate["items"][number],
  targetCharacterId: string
): number {
  let score = 0;

  if (item.instance_id && candidate.instance_id && item.instance_id === candidate.instance_id) {
    score += 100;
  } else if (item.hash === candidate.hash && item.bucket_name === candidate.bucket_name) {
    score += 20;
  } else if (item.hash === candidate.hash) {
    score += 10;
  }

  if (candidate.source_character_id === targetCharacterId) {
    score += 25;
  }

  const sourceScores: Record<SourceItem["source_kind"], number> = {
    inventory: 6,
    vault: 5,
    equipped: 4,
    postmaster: 1
  };

  return score + sourceScores[candidate.source_kind];
}

function isSameBucket(
  left: Pick<AccountItemSummary, "bucket_hash" | "bucket_name">,
  right: Pick<AccountItemSummary, "bucket_hash" | "bucket_name">
): boolean {
  if (left.bucket_hash && right.bucket_hash) {
    return left.bucket_hash === right.bucket_hash;
  }

  return left.bucket_name === right.bucket_name;
}

function compareReplacementInventoryItems(left: AccountItemSummary, right: AccountItemSummary): number {
  return (right.power ?? 0) - (left.power ?? 0)
    || left.name.localeCompare(right.name, "zh-Hans-CN")
    || (left.instance_id ?? "").localeCompare(right.instance_id ?? "");
}
