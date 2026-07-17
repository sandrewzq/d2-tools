import { api } from "../../api/client";
import type { AccountItemActionPatch, AccountItemSummary, AccountSummary, BatchItemActionResult, D2Config, ItemActionResult, VaultTags, VaultTagValue } from "../../api/types";
import { services } from "../../api/services";
import {
  buildVaultBatchTransferConfirmText,
  buildVaultBatchTransferProgressMessage,
  buildVaultCleanupActionLabel,
  buildVaultCleanupNoTargetMessage,
  buildVaultCleanupWriteConfirmText,
  buildVaultCleanupWriteResultMessage,
  getVaultActionItemKey,
  selectVaultActionableItems
} from "../../shared/domain/vault/vaultCleanup";

type DiagnosticsBridge = {
  setWriteActionsEnabled: (enabled: boolean) => void;
  loadActionLog: () => Promise<void>;
};

export function useVaultWriteActions(input: {
  accountSummary: AccountSummary | null;
  applyAccountActionPatches: (patches: readonly AccountItemActionPatch[]) => void;
  diagnostics: DiagnosticsBridge;
  setVaultTags: (tags: VaultTags) => void;
  setAccountError: (message: string) => void;
  setIsRunningItemAction: (isRunning: boolean) => void;
  setItemActionMessage: (message: string) => void;
  loadAccountSummary: () => Promise<void>;
}) {
  async function saveVaultTag(item: AccountItemSummary, tag: VaultTagValue) {
    try {
      input.setVaultTags(await services.localData.saveVaultTag({
        item_key: getVaultActionItemKey(item),
        tag
      }));
    } catch (error) {
      input.setAccountError(error instanceof Error ? error.message : "本地标记保存失败");
    }
  }

  async function saveVaultTagsBatch(inputs: Array<{ item_key: string; tag: VaultTagValue }>) {
    try {
      input.setVaultTags(await services.localData.saveVaultTagsBatch(inputs));
    } catch (error) {
      input.setAccountError(error instanceof Error ? error.message : "批量标记保存失败");
      throw error;
    }
  }

  async function runVaultCleanupWriteAction(
    label: string,
    items: AccountItemSummary[],
    targetCharacterId: string,
    run: (item: AccountItemSummary) => Promise<ItemActionResult>,
    filterItem: (item: AccountItemSummary) => boolean = () => true
  ): Promise<string> {
    if (!input.accountSummary) {
      return "请先读取账号数据。";
    }

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      input.diagnostics.setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      return error instanceof Error ? error.message : "读取写操作配置失败";
    }

    if (!latestConfig.features.write_actions_enabled) {
      return "d2-tools 本地写操作开关未开启。请到左侧“设置”页开启后再执行。";
    }
    if (!targetCharacterId) {
      return buildVaultCleanupNoTargetMessage();
    }

    const actionableItems = selectVaultActionableItems(items, filterItem);
    if (!actionableItems.length) {
      return "没有可执行的装备。可能已经全部解锁，或缺少实例 ID。";
    }
    if (!window.confirm(buildVaultCleanupWriteConfirmText(label, actionableItems.length))) {
      return "已取消操作。";
    }

    input.setIsRunningItemAction(true);
    input.setItemActionMessage("");

    let successCount = 0;
    let failedCount = 0;
    const accountPatches: AccountItemActionPatch[] = [];
    try {
      for (const item of actionableItems) {
        try {
          const result = await run(item);
          if (result.account_patch) accountPatches.push(result.account_patch);
          successCount += 1;
        } catch {
          failedCount += 1;
        }
      }
      input.applyAccountActionPatches(accountPatches);
      if (successCount > accountPatches.length) {
        void input.loadAccountSummary().catch((error) => {
          input.setAccountError(error instanceof Error ? error.message : "操作完成，但刷新账号数据失败");
        });
      }
      void input.diagnostics.loadActionLog().catch(() => undefined);
    } finally {
      input.setIsRunningItemAction(false);
    }

    return buildVaultCleanupWriteResultMessage({ label, successCount, failedCount });
  }

  async function handleVaultCleanupUnlock(items: AccountItemSummary[], targetCharacterId: string): Promise<string> {
    return runVaultCleanupWriteAction(
      buildVaultCleanupActionLabel("unlock"),
      items,
      targetCharacterId,
      (item) => api.setItemLockState({
        membership_type: input.accountSummary?.membership_type ?? 0,
        character_id: targetCharacterId,
        item_id: item.instance_id ?? "",
        item_name: item.name,
        state: false
      }),
      (item) => item.locked === true
    );
  }

  async function handleVaultCleanupTransfer(items: AccountItemSummary[], targetCharacterId: string): Promise<BatchItemActionResult> {
    return runVaultBatchTransfer(items, targetCharacterId);
  }

  async function runVaultBatchTransfer(items: AccountItemSummary[], targetCharacterId: string): Promise<BatchItemActionResult> {
    if (!input.accountSummary) {
      throw new Error("请先读取账号数据。");
    }

    let latestConfig: D2Config;
    try {
      latestConfig = await api.getConfig();
      input.diagnostics.setWriteActionsEnabled(latestConfig.features.write_actions_enabled);
    } catch (error) {
      throw error instanceof Error ? error : new Error("读取写操作配置失败");
    }

    if (!latestConfig.features.write_actions_enabled) {
      throw new Error("d2-tools 本地写操作开关未开启。请到左侧“设置”页开启后再执行。");
    }
    if (!targetCharacterId) {
      throw new Error(buildVaultCleanupNoTargetMessage());
    }

    const actionableItems = selectVaultActionableItems(items);
    if (!actionableItems.length) {
      throw new Error("没有可执行的装备。可能缺少实例 ID。");
    }
    if (!window.confirm(buildVaultBatchTransferConfirmText(actionableItems.length))) {
      throw new Error("已取消操作。");
    }

    input.setIsRunningItemAction(true);
    input.setItemActionMessage(buildVaultBatchTransferProgressMessage(actionableItems.length));

    try {
      const result = await api.batchTransferItems({
        membership_type: input.accountSummary.membership_type,
        character_id: targetCharacterId,
        items: actionableItems.map((item) => ({
          membership_type: input.accountSummary?.membership_type ?? 0,
          character_id: targetCharacterId,
          item_id: item.instance_id ?? "",
          item_reference_hash: item.hash,
          item_name: item.name,
          transfer_to_vault: false
        }))
      });
      input.applyAccountActionPatches(result.account_patches);
      if (result.success_count > result.account_patches.length) {
        void input.loadAccountSummary().catch((error) => {
          input.setAccountError(error instanceof Error ? error.message : "操作完成，但刷新账号数据失败");
        });
      }
      void input.diagnostics.loadActionLog().catch(() => undefined);
      return result;
    } catch (error) {
      throw error instanceof Error ? error : new Error("批量转移失败");
    } finally {
      input.setIsRunningItemAction(false);
      input.setItemActionMessage("");
    }
  }

  return {
    saveVaultTag,
    saveVaultTagsBatch,
    handleVaultCleanupUnlock,
    handleVaultCleanupTransfer
  };
}
