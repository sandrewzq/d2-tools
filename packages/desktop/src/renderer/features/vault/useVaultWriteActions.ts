import {
  api,
  type AccountItemSummary,
  type AccountSummary,
  type BatchItemActionResult,
  type D2Config,
  type ItemActionResult,
  type VaultTags,
  type VaultTagValue
} from "../../api/client";
import { services } from "../../api/services";

type DiagnosticsBridge = {
  setWriteActionsEnabled: (enabled: boolean) => void;
  loadActionLog: () => Promise<void>;
};

export function useVaultWriteActions(input: {
  accountSummary: AccountSummary | null;
  diagnostics: DiagnosticsBridge;
  setVaultTags: (tags: VaultTags) => void;
  setAccountError: (message: string) => void;
  setIsRunningItemAction: (isRunning: boolean) => void;
  setItemActionMessage: (message: string) => void;
  loadAccountSummary: () => Promise<void>;
}) {
  async function saveVaultTag(item: AccountItemSummary, tag: VaultTagValue) {
    const itemKey = item.instance_id ?? `hash:${item.hash}`;
    try {
      input.setVaultTags(await services.localData.saveVaultTag({
        item_key: itemKey,
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
      return "请先选择目标角色。";
    }

    const actionableItems = items.filter((item) => item.instance_id && filterItem(item));
    if (!actionableItems.length) {
      return "没有可执行的装备。可能已经全部解锁，或缺少实例 ID。";
    }
    if (!window.confirm(`确认要${label} ${actionableItems.length} 件可清理装备吗？这个操作不会分解装备。`)) {
      return "已取消操作。";
    }

    input.setIsRunningItemAction(true);
    input.setItemActionMessage("");

    let successCount = 0;
    let failedCount = 0;
    try {
      for (const item of actionableItems) {
        try {
          await run(item);
          successCount += 1;
        } catch {
          failedCount += 1;
        }
      }
      await Promise.all([input.loadAccountSummary(), input.diagnostics.loadActionLog()]);
    } finally {
      input.setIsRunningItemAction(false);
    }

    return failedCount
      ? `${label}完成 ${successCount} 件，失败 ${failedCount} 件。可以在设置页查看操作日志。`
      : `${label}完成 ${successCount} 件。`;
  }

  async function handleVaultCleanupUnlock(items: AccountItemSummary[], targetCharacterId: string): Promise<string> {
    return runVaultCleanupWriteAction(
      "批量解锁",
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
      throw new Error("请先选择目标角色。");
    }

    const actionableItems = items.filter((item) => item.instance_id);
    if (!actionableItems.length) {
      throw new Error("没有可执行的装备。可能缺少实例 ID。");
    }
    if (!window.confirm(`确认要批量转移 ${actionableItems.length} 件仓库装备到目标角色吗？`)) {
      throw new Error("已取消操作。");
    }

    input.setIsRunningItemAction(true);
    input.setItemActionMessage(`正在批量转移 ${actionableItems.length} 件装备...`);

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
      await Promise.all([input.loadAccountSummary(), input.diagnostics.loadActionLog()]);
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
