import { useState, type Dispatch, type SetStateAction } from "react";
import type { AccountItemSummary } from "@d2-tools/core/account/summary";
import type { SaveVaultTagInput, VaultTagValue } from "@d2-tools/core/vault/tags";
import {
  buildVaultBatchTagCopy,
  buildVaultBatchTagResultMessage,
  buildVaultBulkMoveResultMessage,
  buildVaultCleanupActionLabel,
  buildVaultCleanupActionProgressMessage,
  buildVaultCleanupNoTargetMessage,
  buildVaultSelectedBulkMoveNoSelectionMessage,
  buildVaultSelectedBulkMovePrepareMessage,
  getVaultSelectionItemKey
} from "@d2-tools/app/vault";
import type { VaultCopy } from "../i18n/types.js";
import { vaultActionMessageText, vaultTemplate, vaultText } from "./vaultCopy.js";

export type BatchItemActionResult = {
  success_count: number;
  failed_count: number;
  message?: string;
  failure_messages?: string[];
};

/**
 * 批量反馈同时带着它是「做完了」还是「出错了」。
 *
 * 原来只有一句话，色调由界面拿 `includes("失败")` 反推——英文界面里
 * 这句话不再含「失败」两个字，反推必定失手；而且「失败」碰巧出现在武器名或角色名里时
 * 也会把一条正常回执染成红色。写这句话的地方本来就知道是哪一种，那就直接带上。
 */
export type VaultBatchMessage = {
  text: string;
  tone: "ready" | "error";
};

export type VaultCleanupActions = {
  characters: Array<{ character_id: string; class_name: string; light?: number }>;
  currentCharacterId?: string;
  currentCharacterLabel?: string;
  onLockItem: (item: AccountItemSummary, targetCharacterId: string, state?: boolean) => Promise<string>;
  onBatchUnlock: (items: AccountItemSummary[], targetCharacterId: string) => Promise<string>;
  onBatchTransferToCharacter: (items: AccountItemSummary[], targetCharacterId: string) => Promise<BatchItemActionResult>;
};

export function useVaultBatchActions(input: {
  copy: VaultCopy;
  selectedItems: AccountItemSummary[];
  vaultActionItems?: AccountItemSummary[];
  cleanupActionItems: AccountItemSummary[];
  cleanupActions?: VaultCleanupActions;
  cleanupTargetCharacterId: string;
  cleanupTargetCharacterLabel: string;
  cleanupProtectionByItemKey?: Map<string, string[]>;
  setSelectedKeys: Dispatch<SetStateAction<Set<string>>>;
  onSaveTagBatch: (inputs: SaveVaultTagInput[]) => void | Promise<void>;
}) {
  const [batchMessage, setBatchMessage] = useState<VaultBatchMessage | null>(null);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [activeBatchAction, setActiveBatchAction] = useState("");

  /** 「还在做」的提示按正常色走，只有真出错才红。 */
  function report(text: string, tone: VaultBatchMessage["tone"] = "ready") {
    setBatchMessage({ text, tone });
  }

  async function applyBatchTag(tag: VaultTagValue) {
    const tagCopy = buildVaultBatchTagCopy(tag);
    setIsBatchSaving(true);
    setActiveBatchAction(vaultActionMessageText(input.copy, tagCopy.action));
    report(vaultActionMessageText(input.copy, tagCopy.loading));

    try {
      const protectedItems = tag === "junk"
        ? input.selectedItems.filter((item) => (
            (input.cleanupProtectionByItemKey?.get(item.instance_id ?? `hash:${item.hash}`)?.length ?? 0) > 0
          ))
        : [];
      const writableItems = tag === "junk"
        ? input.selectedItems.filter((item) => !protectedItems.includes(item))
        : input.selectedItems;
      if (writableItems.length) {
        await input.onSaveTagBatch(writableItems.map((item) => ({
          item_key: getVaultSelectionItemKey(item),
          tag
        })));
      }
      report(protectedItems.length
        ? vaultTemplate(input.copy, "已处理 {done} 件；{protected} 件受保护，未改为清理。", {
            done: writableItems.length,
            protected: protectedItems.length
          })
        : vaultActionMessageText(input.copy, buildVaultBatchTagResultMessage(writableItems.length)));
      input.setSelectedKeys(new Set());
    } catch (error) {
      report(error instanceof Error ? error.message : vaultText(input.copy, "批量标记失败"), "error");
    } finally {
      setIsBatchSaving(false);
      setActiveBatchAction("");
    }
  }

  async function runSelectedBulkMove() {
    if (!input.cleanupActions) return;
    const actionableItems = input.vaultActionItems ?? input.selectedItems;
    if (!actionableItems.length) {
      report(vaultActionMessageText(input.copy, buildVaultSelectedBulkMoveNoSelectionMessage()), "error");
      return;
    }
    if (!input.cleanupTargetCharacterId) {
      report(vaultActionMessageText(input.copy, buildVaultCleanupNoTargetMessage()), "error");
      return;
    }

    setIsBatchSaving(true);
    setActiveBatchAction(vaultText(input.copy, "批量移动"));
    report(vaultActionMessageText(input.copy, buildVaultSelectedBulkMovePrepareMessage(actionableItems.length)));

    try {
      const result = await input.cleanupActions.onBatchTransferToCharacter(actionableItems, input.cleanupTargetCharacterId);
      report(vaultActionMessageText(input.copy, buildVaultBulkMoveResultMessage(input.cleanupTargetCharacterLabel, result)), result.failed_count ? "error" : "ready");
      input.setSelectedKeys(new Set());
    } catch (error) {
      report(error instanceof Error ? error.message : vaultText(input.copy, "批量移动失败"), "error");
    } finally {
      setIsBatchSaving(false);
      setActiveBatchAction("");
    }
  }

  async function runCleanupAction(action: "unlock" | "transfer") {
    if (!input.cleanupActions) return;
    if (!input.cleanupTargetCharacterId) {
      report(vaultActionMessageText(input.copy, buildVaultCleanupNoTargetMessage()), "error");
      return;
    }

    setIsBatchSaving(true);
    setActiveBatchAction(vaultActionMessageText(input.copy, buildVaultCleanupActionLabel(action)));
    report(vaultActionMessageText(input.copy, buildVaultCleanupActionProgressMessage(action)));

    try {
      if (action === "unlock") {
        report(await input.cleanupActions.onBatchUnlock(input.cleanupActionItems, input.cleanupTargetCharacterId));
      } else {
        const result = await input.cleanupActions.onBatchTransferToCharacter(input.cleanupActionItems, input.cleanupTargetCharacterId);
        report(vaultActionMessageText(input.copy, buildVaultBulkMoveResultMessage(input.cleanupTargetCharacterLabel, result)), result.failed_count ? "error" : "ready");
      }
    } catch (error) {
      report(error instanceof Error ? error.message : vaultText(input.copy, "清理操作失败"), "error");
    } finally {
      setIsBatchSaving(false);
      setActiveBatchAction("");
    }
  }

  return {
    activeBatchAction,
    applyBatchTag,
    batchMessage,
    isBatchSaving,
    runCleanupAction,
    runSelectedBulkMove,
    setBatchMessage,
    setActiveBatchAction
  };
}
