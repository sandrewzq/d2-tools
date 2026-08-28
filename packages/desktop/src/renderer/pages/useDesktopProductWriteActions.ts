import { useEffect, useState } from "react";
import type { AccountOperationFeedbackView } from "@d2-tools/app/account";
import type {
  AccountWriteVerificationInput,
  AccountSummary,
  AccountItemActionPatch,
  DimWishlist,
  LibraryHistory,
  LoadoutTemplate,
  LocalTargetRules,
  VaultTags
} from "../api/types";
import { api } from "../api/client";
import { useLoadoutActionFeedback } from "../features/loadouts/useLoadoutActionFeedback";
import { useLoadoutTemplateActions } from "../features/loadouts/useLoadoutTemplateActions";
import { useLoadoutWriteActions } from "../features/loadouts/useLoadoutWriteActions";
import { useVaultWriteActions } from "../features/vault/useVaultWriteActions";
import { useItemDetailWorkspace } from "../shared/hooks/useItemDetailWorkspace";
import { useBackgroundTasks } from "../shared/hooks/useBackgroundTasks";
import { confirmPendingAccountEntityPatches } from "../shared/stores/accountEntityStore";

type HighestPowerSyncState = {
  taskId: string;
  operationId: string;
  characterName: string;
  acceptedCount: number;
  failedCount: number;
  itemInstanceIds: string[];
};

type DiagnosticsBridge = {
  aiSettings: { enable_lightgg: boolean };
  loadActionLog: () => Promise<void>;
};

type LoadoutLibraryBridge = {
  reloadTemplates: () => Promise<void>;
  renameTemplate: (template: LoadoutTemplate) => Promise<LoadoutTemplate>;
  deleteTemplate: (id: string) => Promise<LoadoutTemplate[]>;
};

export function useDesktopProductWriteActions(input: {
  accountSummary: AccountSummary | null;
  applyAccountActionPatches: (patches: readonly AccountItemActionPatch[]) => void;
  applyPendingAccountActionPatches: (patches: readonly AccountItemActionPatch[]) => void;
  diagnostics: DiagnosticsBridge;
  importedWishlist: DimWishlist | null;
  itemDetailCacheScopeKey: string;
  loadAccountSummary: () => Promise<void>;
  loadAuthoritativeAccountSummary: () => Promise<AccountSummary | null>;
  readAuthoritativeAccountSummary: () => Promise<AccountSummary | null>;
  applyAuthoritativeAccountSummary: (summary: AccountSummary) => void;
  loadoutLibrary: LoadoutLibraryBridge;
  localTargetRules: LocalTargetRules;
  onRecentHistoryChanged: (history: LibraryHistory) => void;
  setAccountError: (message: string) => void;
  setVaultTags: (tags: VaultTags) => void;
  vaultTags: VaultTags;
}) {
  const [loadoutMessage, setLoadoutMessage] = useState("");
  const [isRunningItemAction, setIsRunningItemAction] = useState(false);
  const [itemActionMessage, setItemActionMessage] = useState("");
  const [accountOperationFeedback, setAccountOperationFeedback] = useState<AccountOperationFeedbackView>();
  const [highestPowerSync, setHighestPowerSync] = useState<HighestPowerSyncState | null>(null);
  const { backgroundTasks } = useBackgroundTasks();
  const loadoutActionFeedback = useLoadoutActionFeedback();

  useEffect(() => {
    if (!highestPowerSync) return;
    const task = backgroundTasks.find((entry) => entry.task_id === highestPowerSync.taskId);
    if (!task) return;

    if (task.status === "success") {
      confirmPendingAccountEntityPatches(highestPowerSync.itemInstanceIds);
      void input.readAuthoritativeAccountSummary()
        .then((summary) => {
          if (summary) input.applyAuthoritativeAccountSummary(summary);
        })
        .catch(() => undefined);
      const message = highestPowerSync.failedCount > 0
        ? `已确认给 ${highestPowerSync.characterName} 装备 ${highestPowerSync.acceptedCount} 件最高光等装备，另有 ${highestPowerSync.failedCount} 件提交失败。`
        : `已确认给 ${highestPowerSync.characterName} 装备 ${highestPowerSync.acceptedCount} 件最高光等装备。`;
      setAccountOperationFeedback({
        tone: highestPowerSync.failedCount > 0 ? "warning" : "success",
        phase: highestPowerSync.failedCount > 0 ? "partial" : "confirmed",
        message
      });
      setItemActionMessage("");
      setHighestPowerSync(null);
      return;
    }

    if (task.status === "failed" || task.status === "blocked") {
      setAccountOperationFeedback({
        tone: "warning",
        phase: "paused",
        itemInstanceIds: highestPowerSync.itemInstanceIds,
        message: task.error ?? "装备请求已成功，但账号确认已暂停；请检查登录和网络状态。"
      });
      setItemActionMessage("");
      return;
    }

    if (["queued", "running", "retrying"].includes(task.status)) {
      const delayed = task.status === "retrying";
      const baseMessage = task.message ?? "装备请求已成功，账号数据同步中。";
      const message = highestPowerSync.failedCount > 0
        ? `${baseMessage} 另有 ${highestPowerSync.failedCount} 件提交失败。`
        : baseMessage;
      setAccountOperationFeedback({
        tone: delayed || highestPowerSync.failedCount > 0 ? "warning" : "pending",
        phase: highestPowerSync.failedCount > 0 ? "partial" : delayed ? "delayed" : "syncing",
        itemInstanceIds: highestPowerSync.itemInstanceIds,
        message
      });
      setItemActionMessage(message);
    }
  }, [backgroundTasks, highestPowerSync]);

  async function startHighestPowerVerification(input: AccountWriteVerificationInput): Promise<void> {
    try {
      const task = await api.startAccountWriteVerification(input);
      setHighestPowerSync({
        taskId: task.task_id,
        operationId: input.operation_id,
        characterName: input.character_name ?? "当前角色",
        acceptedCount: input.accepted_count,
        failedCount: input.failed_count,
        itemInstanceIds: input.expected_equipped_item_ids
      });
    } catch (error) {
      setAccountOperationFeedback({
        tone: "warning",
        phase: "paused",
        itemInstanceIds: input.expected_equipped_item_ids,
        message: `装备请求已成功，但未能启动账号确认：${error instanceof Error ? error.message : "后台任务不可用"}`
      });
    }
  }

  const itemDetail = useItemDetailWorkspace({
    accountSummary: input.accountSummary,
    applyAccountActionPatches: input.applyAccountActionPatches,
    vaultTags: input.vaultTags,
    setVaultTags: input.setVaultTags,
    importedWishlist: input.importedWishlist,
    detailCacheScopeKey: input.itemDetailCacheScopeKey,
    localTargetRules: input.localTargetRules,
    diagnostics: input.diagnostics,
    setAccountError: input.setAccountError,
    setAccountOperationFeedback,
    setIsRunningItemAction,
    setItemActionMessage,
    loadAccountSummary: input.loadAccountSummary,
    readAuthoritativeAccountSummary: input.readAuthoritativeAccountSummary,
    applyAuthoritativeAccountSummary: input.applyAuthoritativeAccountSummary,
    onRecentHistoryChanged: input.onRecentHistoryChanged
  });

  const loadoutTemplateActions = useLoadoutTemplateActions({
    accountSummary: input.accountSummary,
    setLoadoutMessage
  });

  const loadoutWriteActions = useLoadoutWriteActions({
    accountSummary: input.accountSummary,
    applyAccountActionPatches: input.applyAccountActionPatches,
    applyPendingAccountActionPatches: input.applyPendingAccountActionPatches,
    loadoutLibrary: input.loadoutLibrary,
    diagnostics: input.diagnostics,
    loadoutActionFeedback,
    setLoadoutMessage,
    setItemActionMessage,
    setAccountOperationFeedback,
    setIsRunningItemAction,
    startHighestPowerVerification,
    loadAccountSummary: input.loadAccountSummary,
    openItemDetail: itemDetail.openItemDetail
  });

  const vaultWriteActions = useVaultWriteActions({
    accountSummary: input.accountSummary,
    applyAccountActionPatches: input.applyAccountActionPatches,
    diagnostics: input.diagnostics,
    setVaultTags: input.setVaultTags,
    setAccountError: input.setAccountError,
    setIsRunningItemAction,
    setItemActionMessage,
    loadAccountSummary: input.loadAccountSummary
  });

  return {
    accountOperationFeedback,
    itemActionMessage,
    itemDetail,
    isRunningItemAction,
    loadoutActionFeedback,
    loadoutMessage,
    loadoutTemplateActions,
    loadoutWriteActions,
    vaultWriteActions
  };
}
