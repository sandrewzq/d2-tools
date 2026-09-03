import { useState, type Dispatch, type SetStateAction } from "react";
import type { DuplicateItemGroup } from "@d2-tools/core/analysis/duplicates";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { SaveVaultTagInput, VaultTags, VaultTagValue } from "@d2-tools/core/vault/tags";
import {
  buildDuplicateGroupBatchActionCopy,
  buildDuplicateGroupBatchTagPlan,
  buildVaultBatchTagCopy,
  buildVaultBatchTagResultMessage,
  buildVaultBulkMoveResultMessage,
  buildVaultCandidateSelectionMessage,
  buildVaultCleanupActionLabel,
  buildVaultCleanupActionProgressMessage,
  buildVaultCleanupClipboardText,
  buildVaultCleanupClipboardUnavailableMessage,
  buildVaultCleanupCopiedMessage,
  buildVaultCleanupNoTargetMessage,
  buildVaultSelectedBulkMoveNoSelectionMessage,
  buildVaultSelectedBulkMovePrepareMessage,
  selectVaultBatchItems,
  type DuplicateGroupBatchTagMode
} from "@d2-tools/app/vault";

type BatchItemActionResult = {
  success_count: number;
  failed_count: number;
};

export type VaultCleanupActions = {
  characters: Array<{ character_id: string; class_name: string; light?: number }>;
  currentCharacterId?: string;
  currentCharacterLabel?: string;
  onBatchUnlock: (items: AccountItemSummary[], targetCharacterId: string) => Promise<string>;
  onBatchTransferToCharacter: (items: AccountItemSummary[], targetCharacterId: string) => Promise<BatchItemActionResult>;
};

export function useVaultBatchActions(input: {
  selectedItems: AccountItemSummary[];
  vaultActionItems?: AccountItemSummary[];
  cleanupActionItems: AccountItemSummary[];
  filteredItems: AccountItemSummary[];
  tags: VaultTags;
  isCleanupMode: boolean;
  cleanupActions?: VaultCleanupActions;
  cleanupTargetCharacterId: string;
  cleanupTargetCharacterLabel: string;
  cleanupProtectionByItemKey?: Map<string, string[]>;
  setSelectedKeys: Dispatch<SetStateAction<Set<string>>>;
  setIsOrganizing: (value: boolean) => void;
  setIsCleanupMode: (value: boolean) => void;
  onSaveTag: (item: AccountItemSummary, tag: VaultTagValue) => void | Promise<void>;
  onSaveTagBatch: (inputs: SaveVaultTagInput[]) => void | Promise<void>;
}) {
  const [batchMessage, setBatchMessage] = useState("");
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [activeBatchAction, setActiveBatchAction] = useState("");

  function mergeSelectedKeys(keys: string[]) {
    if (!keys.length) {
      setBatchMessage(buildVaultCandidateSelectionMessage({ addedCount: 0, totalCount: 0 }));
      return;
    }

    input.setSelectedKeys((current) => {
      const next = new Set(current);
      for (const key of keys) {
        next.add(key);
      }
      setBatchMessage(buildVaultCandidateSelectionMessage({
        addedCount: keys.length,
        totalCount: next.size
      }));
      return next;
    });
    input.setIsOrganizing(true);
    input.setIsCleanupMode(false);
  }

  async function applyBatchTag(tag: VaultTagValue) {
    const copy = buildVaultBatchTagCopy(tag);
    setIsBatchSaving(true);
    setActiveBatchAction(copy.action);
    setBatchMessage(copy.loading);

    try {
      const protectedItems = tag === "junk"
        ? input.selectedItems.filter((item) => (
            (input.cleanupProtectionByItemKey?.get(item.instance_id ?? `hash:${item.hash}`)?.length ?? 0) > 0
          ))
        : [];
      const writableItems = tag === "junk"
        ? input.selectedItems.filter((item) => !protectedItems.includes(item))
        : input.selectedItems;
      for (const item of writableItems) {
        await input.onSaveTag(item, tag);
      }
      setBatchMessage(protectedItems.length
        ? `已处理 ${writableItems.length} 件；${protectedItems.length} 件受保护，未改为待处理。`
        : buildVaultBatchTagResultMessage(writableItems.length));
      input.setSelectedKeys(new Set());
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "批量标记失败");
    } finally {
      setIsBatchSaving(false);
      setActiveBatchAction("");
    }
  }

  async function runSelectedBulkMove() {
    if (!input.cleanupActions) return;
    const actionableItems = input.vaultActionItems ?? input.selectedItems;
    if (!actionableItems.length) {
      setBatchMessage(buildVaultSelectedBulkMoveNoSelectionMessage());
      return;
    }
    if (!input.cleanupTargetCharacterId) {
      setBatchMessage(buildVaultCleanupNoTargetMessage());
      return;
    }

    setIsBatchSaving(true);
    setActiveBatchAction("批量移动");
    setBatchMessage(buildVaultSelectedBulkMovePrepareMessage(actionableItems.length));

    try {
      const result = await input.cleanupActions.onBatchTransferToCharacter(actionableItems, input.cleanupTargetCharacterId);
      setBatchMessage(buildVaultBulkMoveResultMessage(input.cleanupTargetCharacterLabel, result));
      input.setSelectedKeys(new Set());
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "批量移动失败");
    } finally {
      setIsBatchSaving(false);
      setActiveBatchAction("");
    }
  }

  async function copyCleanupList() {
    const cleanupItems = input.isCleanupMode
      ? input.cleanupActionItems
      : input.selectedItems.length
      ? input.selectedItems
      : selectVaultBatchItems(input.filteredItems, "junk", input.tags);
    try {
      await navigator.clipboard.writeText(buildVaultCleanupClipboardText(cleanupItems, input.tags));
      setBatchMessage(buildVaultCleanupCopiedMessage(cleanupItems.length));
    } catch {
      setBatchMessage(buildVaultCleanupClipboardUnavailableMessage());
    }
  }

  async function runCleanupAction(action: "unlock" | "transfer") {
    if (!input.cleanupActions) return;
    if (!input.cleanupTargetCharacterId) {
      setBatchMessage(buildVaultCleanupNoTargetMessage());
      return;
    }

    setIsBatchSaving(true);
    setActiveBatchAction(buildVaultCleanupActionLabel(action));
    setBatchMessage(buildVaultCleanupActionProgressMessage(action));

    try {
      const message = action === "unlock"
        ? await input.cleanupActions.onBatchUnlock(input.cleanupActionItems, input.cleanupTargetCharacterId)
        : buildVaultBulkMoveResultMessage(
          input.cleanupTargetCharacterLabel,
          await input.cleanupActions.onBatchTransferToCharacter(input.cleanupActionItems, input.cleanupTargetCharacterId)
        );
      setBatchMessage(message);
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "清理操作失败");
    } finally {
      setIsBatchSaving(false);
      setActiveBatchAction("");
    }
  }

  async function applyDuplicateGroupTags(
    group: DuplicateItemGroup,
    mode: DuplicateGroupBatchTagMode,
    keepItemKey = group.items[0]?.item_key ?? ""
  ) {
    setIsBatchSaving(true);
    const copy = buildDuplicateGroupBatchActionCopy(group.name, mode);
    setActiveBatchAction(copy.action);
    setBatchMessage(copy.loading);

    try {
      await input.onSaveTagBatch(buildDuplicateGroupBatchTagPlan(group, mode, keepItemKey));
      setBatchMessage(copy.success);
    } catch (error) {
      setBatchMessage(error instanceof Error ? error.message : "重复组批量标记失败");
    } finally {
      setIsBatchSaving(false);
      setActiveBatchAction("");
    }
  }

  return {
    activeBatchAction,
    applyBatchTag,
    applyDuplicateGroupTags,
    batchMessage,
    copyCleanupList,
    isBatchSaving,
    mergeSelectedKeys,
    runCleanupAction,
    runSelectedBulkMove,
    setBatchMessage,
    setActiveBatchAction
  };
}
