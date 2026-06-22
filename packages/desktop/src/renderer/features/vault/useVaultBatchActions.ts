import { useState, type Dispatch, type SetStateAction } from "react";
import type { DuplicateItemGroup } from "@d2-tools/core/analysis/duplicates";
import type {
  AccountItemSummary,
  BatchItemActionResult,
  SaveVaultTagInput,
  VaultTags,
  VaultTagValue
} from "../../api/client";
import {
  buildDuplicateGroupBatchTagPlan,
  buildVaultCleanupLocatorText,
  buildVaultCleanupText,
  type DuplicateGroupBatchTagMode
} from "./vaultCleanup";
import { selectVaultBatchItems } from "./vaultSelection";

export type VaultCleanupActions = {
  characters: Array<{ character_id: string; class_name: string; light?: number }>;
  currentCharacterId?: string;
  currentCharacterLabel?: string;
  writeActionsEnabled: boolean;
  onBatchUnlock: (items: AccountItemSummary[], targetCharacterId: string) => Promise<string>;
  onBatchTransferToCharacter: (items: AccountItemSummary[], targetCharacterId: string) => Promise<BatchItemActionResult>;
};

export function buildVaultBulkMoveResultMessage(
  targetCharacterLabel: string,
  result: BatchItemActionResult
): string {
  const targetLabel = targetCharacterLabel || "目标角色";
  if (!result.failed_count) {
    return `已转移到${targetLabel}：共 ${result.success_count} 件。`;
  }

  return `已转移到${targetLabel}：成功 ${result.success_count} 件，失败 ${result.failed_count} 件。可到设置 -> 操作日志查看失败详情。`;
}

export function useVaultBatchActions(input: {
  selectedItems: AccountItemSummary[];
  cleanupActionItems: AccountItemSummary[];
  filteredItems: AccountItemSummary[];
  tags: VaultTags;
  isCleanupMode: boolean;
  cleanupActions?: VaultCleanupActions;
  cleanupTargetCharacterId: string;
  cleanupTargetCharacterLabel: string;
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
      setBatchMessage("这一组没有可加入的候选。");
      return;
    }

    input.setSelectedKeys((current) => {
      const next = new Set(current);
      for (const key of keys) {
        next.add(key);
      }
      setBatchMessage(`已加入 ${keys.length} 件候选，当前共 ${next.size} 件。`);
      return next;
    });
    input.setIsOrganizing(true);
    input.setIsCleanupMode(false);
  }

  async function applyBatchTag(tag: VaultTagValue) {
    setIsBatchSaving(true);
    setActiveBatchAction(tag === "review" ? "批量关注" : tag === "junk" ? "批量可清理" : "批量清除");
    setBatchMessage(tag === "review" ? "正在批量标记为关注..." : tag === "junk" ? "正在批量标记为可清理..." : "正在批量清除本地标记...");

    try {
      for (const item of input.selectedItems) {
        await input.onSaveTag(item, tag);
      }
      setBatchMessage(`已处理 ${input.selectedItems.length} 件装备。`);
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
    if (!input.selectedItems.length) {
      setBatchMessage("请先选择要移动的装备。");
      return;
    }
    if (!input.cleanupTargetCharacterId) {
      setBatchMessage("请先选择目标角色。");
      return;
    }

    setIsBatchSaving(true);
    setActiveBatchAction("批量移动");
    setBatchMessage(`正在准备移动 ${input.selectedItems.length} 件装备...`);

    try {
      const result = await input.cleanupActions.onBatchTransferToCharacter(input.selectedItems, input.cleanupTargetCharacterId);
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
    const text = buildVaultCleanupText(cleanupItems, input.tags);
    try {
      await navigator.clipboard.writeText(`${text}\n\n${buildVaultCleanupLocatorText(cleanupItems, input.tags)}`);
      setBatchMessage(`已复制 ${cleanupItems.length} 件装备的清理清单。`);
    } catch {
      setBatchMessage("剪贴板不可用，请稍后重试。");
    }
  }

  async function runCleanupAction(action: "unlock" | "transfer") {
    if (!input.cleanupActions) return;
    if (!input.cleanupTargetCharacterId) {
      setBatchMessage("请先选择目标角色。");
      return;
    }

    setIsBatchSaving(true);
    setActiveBatchAction(action === "unlock" ? "批量解锁" : "转移到角色背包");
    setBatchMessage(action === "unlock" ? "正在批量解锁..." : "正在转移到角色背包...");

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
    setActiveBatchAction(
      mode === "keep-best-review-rest"
        ? "重复组标记为关注"
        : mode === "keep-best-junk-rest"
          ? "重复组标记为可清理"
          : "清除重复组标记"
    );
    setBatchMessage(
      mode === "keep-best-review-rest"
        ? `正在处理 ${group.name}，保留选中件，其余标记为关注...`
        : mode === "keep-best-junk-rest"
          ? `正在处理 ${group.name}，保留选中件，其余标记为可清理...`
          : `正在清除 ${group.name} 这组装备的本地标记...`
    );

    try {
      await input.onSaveTagBatch(buildDuplicateGroupBatchTagPlan(group, mode, keepItemKey));
      const message = mode === "keep-best-review-rest"
        ? `已处理 ${group.name}，保留选中件，其余标记为关注`
        : mode === "keep-best-junk-rest"
          ? `已处理 ${group.name}，保留选中件，其余标记为可清理`
          : `已清除 ${group.name} 这组装备的本地标记`;
      setBatchMessage(message);
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
