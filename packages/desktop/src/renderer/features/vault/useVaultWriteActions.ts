import { api } from "../../api/client";
import type { AccountItemActionPatch, AccountItemSummary, AccountSummary, AccountWriteVerificationInput, BatchItemActionResult, ItemActionResult, VaultTags, VaultTagValue } from "../../api/types";
import { services } from "../../api/services";
import {
  buildVaultBatchTransferProgressMessage,
  buildVaultCleanupActionLabel,
  buildVaultCleanupNoTargetMessage,
  buildVaultCleanupWriteResultMessage,
  getVaultActionItemKey,
  selectVaultActionableItems
} from "../../shared/domain/vault/vaultCleanup";

type DiagnosticsBridge = {
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
  applyCommittedAccountActionPatches: (patches: readonly AccountItemActionPatch[]) => void;
  startAccountWriteVerification: (
    input: AccountWriteVerificationInput,
    options?: { surfaceFeedback?: boolean }
  ) => Promise<void>;
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
      return "请先同步装备数据。";
    }
    const account = input.accountSummary;

    if (!targetCharacterId) {
      return buildVaultCleanupNoTargetMessage();
    }

    const actionableItems = selectVaultActionableItems(items, filterItem);
    if (!actionableItems.length) {
      return "没有可执行的装备。可能已经全部解锁，或缺少实例 ID。";
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
      if (accountPatches.length) {
        input.applyCommittedAccountActionPatches(accountPatches);
        void input.startAccountWriteVerification(createVaultVerificationInput({
          account,
          characterId: targetCharacterId,
          patches: accountPatches,
          failedCount
        }), { surfaceFeedback: false });
      }
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

  async function handleVaultItemLock(item: AccountItemSummary, targetCharacterId: string): Promise<string> {
    if (!input.accountSummary) {
      throw new Error("请先同步装备数据。");
    }
    if (!targetCharacterId) {
      throw new Error(buildVaultCleanupNoTargetMessage());
    }
    if (!item.instance_id) {
      throw new Error("这件装备缺少实例 ID，无法加锁。");
    }
    if (item.locked) return "这件装备已经锁定。";

    const account = input.accountSummary;
    input.setIsRunningItemAction(true);
    input.setItemActionMessage(`正在加锁：${item.name}`);
    try {
      const result = await api.setItemLockState({
        membership_type: account.membership_type,
        character_id: targetCharacterId,
        item_id: item.instance_id,
        item_name: item.name,
        state: true
      });
      if (result.account_patch) {
        input.applyCommittedAccountActionPatches([result.account_patch]);
        void input.startAccountWriteVerification(createVaultVerificationInput({
          account,
          characterId: targetCharacterId,
          patches: [result.account_patch],
          failedCount: 0
        }), { surfaceFeedback: false });
      } else {
        void input.loadAccountSummary().catch((error) => {
          input.setAccountError(error instanceof Error ? error.message : "加锁已受理，但刷新账号数据失败");
        });
      }
      void input.diagnostics.loadActionLog().catch(() => undefined);
      return result.message || `已提交加锁：${item.name}`;
    } finally {
      input.setIsRunningItemAction(false);
      input.setItemActionMessage("");
    }
  }

  async function handleVaultCleanupTransfer(items: AccountItemSummary[], targetCharacterId: string): Promise<BatchItemActionResult> {
    return runVaultBatchTransfer(items, targetCharacterId);
  }

  async function runVaultBatchTransfer(items: AccountItemSummary[], targetCharacterId: string): Promise<BatchItemActionResult> {
    if (!input.accountSummary) {
      throw new Error("请先同步装备数据。");
    }
    const account = input.accountSummary;

    if (!targetCharacterId) {
      throw new Error(buildVaultCleanupNoTargetMessage());
    }

    const actionableItems = selectVaultActionableItems(items);
    if (!actionableItems.length) {
      throw new Error("没有可执行的装备。可能缺少实例 ID。");
    }
    input.setIsRunningItemAction(true);
    input.setItemActionMessage(buildVaultBatchTransferProgressMessage(actionableItems.length));

    try {
      const result = await api.batchTransferItems({
        membership_type: account.membership_type,
        character_id: targetCharacterId,
        items: actionableItems.map((item) => ({
          membership_type: account.membership_type,
          character_id: targetCharacterId,
          item_id: item.instance_id ?? "",
          item_reference_hash: item.hash,
          item_name: item.name,
          transfer_to_vault: false
        }))
      });
      if (result.account_patches.length) {
        input.applyCommittedAccountActionPatches(result.account_patches);
        void input.startAccountWriteVerification(createVaultVerificationInput({
          account,
          characterId: targetCharacterId,
          patches: result.account_patches,
          failedCount: result.failed_count
        }), { surfaceFeedback: false });
      }
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
    handleVaultItemLock,
    handleVaultCleanupUnlock,
    handleVaultCleanupTransfer
  };
}

function createVaultVerificationInput(input: {
  account: AccountSummary;
  characterId: string;
  patches: AccountItemActionPatch[];
  failedCount: number;
}): AccountWriteVerificationInput {
  return {
    operation_id: createVaultOperationId(),
    membership_type: input.account.membership_type,
    destiny_membership_id: input.account.destiny_membership_id,
    character_id: input.characterId,
    character_name: input.account.characters.find((character) => character.character_id === input.characterId)?.class_name,
    baseline_profile_minted_at: input.account.profile_minted_at,
    expected_patches: input.patches,
    accepted_count: input.patches.length,
    failed_count: input.failedCount
  };
}

function createVaultOperationId(): string {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `vault-write-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
