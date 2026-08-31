import { useEffect, useRef, useState } from "react";
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

type AccountWriteSyncState = {
  taskId: string;
  operationId: string;
  characterName: string;
  acceptedCount: number;
  failedCount: number;
  itemInstanceIds: string[];
  expectedPatches: AccountItemActionPatch[];
  surfaceFeedback: boolean;
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
  applyCommittedAccountActionPatches: (patches: readonly AccountItemActionPatch[]) => void;
  confirmCommittedAccountActionPatches: (patches: readonly AccountItemActionPatch[]) => void;
  diagnostics: DiagnosticsBridge;
  importedWishlist: DimWishlist | null;
  itemDetailCacheScopeKey: string;
  loadAccountSummary: () => Promise<void>;
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
  const [accountWriteSyncs, setAccountWriteSyncs] = useState<AccountWriteSyncState[]>([]);
  const reloadedTerminalTaskIdsRef = useRef(new Set<string>());
  const { backgroundTasks } = useBackgroundTasks();
  const loadoutActionFeedback = useLoadoutActionFeedback();

  useEffect(() => {
    if (!accountWriteSyncs.length) return;
    const resolved = accountWriteSyncs.map((sync) => ({
      sync,
      task: backgroundTasks.find((entry) => entry.task_id === sync.taskId)
    }));
    const succeededAll = resolved.filter((entry) => entry.task?.status === "success");
    for (const entry of succeededAll) {
      input.confirmCommittedAccountActionPatches(entry.sync.expectedPatches);
    }
    const visible = resolved.filter((entry) => entry.sync.surfaceFeedback);
    const succeeded = visible.filter((entry) => entry.task?.status === "success");
    const failed = visible.filter((entry) => entry.task?.status === "failed" || entry.task?.status === "blocked");
    const superseded = visible.filter((entry) => entry.task?.status === "superseded");
    const active = visible.filter((entry) => entry.task && ["queued", "running", "retrying"].includes(entry.task.status));
    const terminalTaskIds = new Set([
      ...resolved.filter((entry) => entry.task && ["success", "failed", "blocked", "superseded"].includes(entry.task.status))
        .map((entry) => entry.sync.taskId)
    ]);
    for (const entry of resolved) {
      if (!entry.task || !terminalTaskIds.has(entry.sync.taskId)) continue;
      if (reloadedTerminalTaskIdsRef.current.has(entry.sync.taskId)) continue;
      reloadedTerminalTaskIdsRef.current.add(entry.sync.taskId);
      // 验证任务结束后必须用真实 Bungie 快照刷新页面。不能只清除本地
      // patch，否则失败或未生效时页面仍可能显示旧的乐观状态。
      void input.loadAccountSummary().catch(() => undefined);
      // 对账结果会追加到操作日志；任务结束后立即拉取，避免设置页继续
      // 只显示“请求已受理”而看不到最终“已确认/不可用”。
      void input.diagnostics.loadActionLog().catch(() => undefined);
    }
    const remainingSyncs = accountWriteSyncs.filter((sync) => !terminalTaskIds.has(sync.taskId));
    const visibleRemainingSyncs = remainingSyncs.filter((sync) => sync.surfaceFeedback);
    const confirmedCount = succeeded.reduce((count, entry) => count + entry.sync.acceptedCount, 0);
    const unconfirmedCount = failed.reduce((count, entry) => count + entry.sync.acceptedCount, 0);
    const supersededCount = superseded.reduce((count, entry) => count + entry.sync.acceptedCount, 0);
    const submissionFailedCount = [...succeeded, ...failed, ...superseded]
      .reduce((count, entry) => count + entry.sync.failedCount, 0);

    const latestSucceeded = succeeded.at(-1);
    const latestFailed = failed.at(-1);
    const latestSuperseded = superseded.at(-1);
    const latestActive = active.at(-1);
    if (latestFailed && !visibleRemainingSyncs.length) {
      setAccountOperationFeedback({
        tone: "warning",
        phase: confirmedCount > 0 ? "partial-confirmed" : "paused",
        itemInstanceIds: confirmedCount > 0
          ? succeeded.flatMap((entry) => entry.sync.itemInstanceIds)
          : failed.flatMap((entry) => entry.sync.itemInstanceIds),
        message: confirmedCount > 0
          ? `已确认 ${confirmedCount} 项变化，另有 ${unconfirmedCount} 项尚未确认${submissionFailedCount ? `，${submissionFailedCount} 项提交失败` : ""}。${latestFailed.task?.error ?? "请检查登录和网络状态。"}`
          : latestFailed.task?.error ?? "写入请求未在游戏内确认，页面已按最新账号状态刷新。"
      });
      setItemActionMessage("");
    } else if (latestSuperseded && !visibleRemainingSyncs.length) {
      setAccountOperationFeedback({
        tone: "warning",
        phase: confirmedCount > 0 ? "partial-confirmed" : "superseded",
        itemInstanceIds: confirmedCount > 0
          ? succeeded.flatMap((entry) => entry.sync.itemInstanceIds)
          : latestSuperseded.sync.itemInstanceIds,
        message: confirmedCount > 0
          ? `已确认 ${confirmedCount} 项变化；另有 ${supersededCount} 项旧确认已被新操作替代，页面未应用旧操作结果。`
          : "旧对账任务已由同范围的新操作替代；页面等待最新操作确认。"
      });
      setItemActionMessage("");
    } else if (latestSucceeded && !visibleRemainingSyncs.length) {
      const characterNames = [...new Set(succeeded.map((entry) => entry.sync.characterName))];
      const characterLabel = characterNames.length === 1 ? `${characterNames[0]}的` : "";
      const message = submissionFailedCount > 0
        ? `已确认${characterLabel}${confirmedCount} 项写入，另有 ${submissionFailedCount} 项提交失败。`
        : `已确认${characterLabel}${confirmedCount} 项写入已在游戏内生效。`;
      setAccountOperationFeedback({
        tone: submissionFailedCount > 0 ? "warning" : "success",
        phase: submissionFailedCount > 0 ? "partial-confirmed" : "confirmed",
        itemInstanceIds: succeeded.flatMap((entry) => entry.sync.itemInstanceIds),
        message
      });
      setItemActionMessage("");
    } else if (latestActive?.task) {
      const { task } = latestActive;
      const activeFailedCount = active.reduce((count, entry) => count + entry.sync.failedCount, 0);
      const delayed = task.status === "retrying";
      const baseMessage = task.message ?? "写入已完成，账号数据正在后台对账。";
      const message = activeFailedCount > 0
        ? `${baseMessage} 另有 ${activeFailedCount} 项提交失败。`
        : baseMessage;
      setAccountOperationFeedback({
        tone: delayed || activeFailedCount > 0 ? "warning" : "pending",
        phase: activeFailedCount > 0 ? "partial" : delayed ? "delayed" : "syncing",
        itemInstanceIds: [...new Set(active.flatMap((entry) => entry.sync.itemInstanceIds))],
        message
      });
      setItemActionMessage(message);
    }
    if (terminalTaskIds.size) {
      setAccountWriteSyncs((current) => current.filter((sync) => !terminalTaskIds.has(sync.taskId)));
    }
  }, [accountWriteSyncs, backgroundTasks]);

  async function startAccountWriteVerification(
    input: AccountWriteVerificationInput,
    options: { surfaceFeedback?: boolean } = {}
  ): Promise<void> {
    try {
      const task = await api.startAccountWriteVerification(input);
      const itemInstanceIds = [...new Set(input.expected_patches.map((patch) => patch.item_instance_id))];
      setAccountWriteSyncs((current) => [...current.filter((entry) => entry.operationId !== input.operation_id), {
        taskId: task.task_id,
        operationId: input.operation_id,
        characterName: input.character_name ?? "当前角色",
        acceptedCount: input.accepted_count,
        failedCount: input.failed_count,
        itemInstanceIds,
        expectedPatches: input.expected_patches,
        surfaceFeedback: options.surfaceFeedback !== false
      }]);
    } catch (error) {
      if (options.surfaceFeedback === false) return;
      const hasEquipPatch = input.expected_patches.some((patch) => patch.kind === "equip");
      setAccountOperationFeedback({
        tone: "warning",
        phase: "paused",
        itemInstanceIds: input.expected_patches.map((patch) => patch.item_instance_id),
        message: hasEquipPatch
          ? `写入请求已受理，但未能启动后台对账；页面保持原账号状态：${error instanceof Error ? error.message : "后台任务不可用"}`
          : `写入已完成且页面已更新，但未能启动后台对账：${error instanceof Error ? error.message : "后台任务不可用"}`
      });
    }
  }

  function clearCompletedWriteFeedback(): void {
    // 手动刷新代表用户要求重新读取权威账号状态。已结束的写入错误
    // 不应继续覆盖刷新结果；仍在进行的同步反馈则保留给后台任务更新。
    setAccountOperationFeedback((current) => current?.tone === "error" ? undefined : current);
    setItemActionMessage("");
    setLoadoutMessage("");
  }

  const itemDetail = useItemDetailWorkspace({
    accountSummary: input.accountSummary,
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
    applyCommittedAccountActionPatches: input.applyCommittedAccountActionPatches,
    startAccountWriteVerification,
    onRecentHistoryChanged: input.onRecentHistoryChanged
  });

  const loadoutTemplateActions = useLoadoutTemplateActions({
    accountSummary: input.accountSummary,
    setLoadoutMessage
  });

  const loadoutWriteActions = useLoadoutWriteActions({
    accountSummary: input.accountSummary,
    loadoutLibrary: input.loadoutLibrary,
    diagnostics: input.diagnostics,
    loadoutActionFeedback,
    setLoadoutMessage,
    setItemActionMessage,
    setAccountOperationFeedback,
    setIsRunningItemAction,
    applyCommittedAccountActionPatches: input.applyCommittedAccountActionPatches,
    startHighestPowerVerification: startAccountWriteVerification,
    loadAccountSummary: input.loadAccountSummary,
    openItemDetail: itemDetail.openItemDetail
  });

  const vaultWriteActions = useVaultWriteActions({
    accountSummary: input.accountSummary,
    diagnostics: input.diagnostics,
    setVaultTags: input.setVaultTags,
    setAccountError: input.setAccountError,
    setIsRunningItemAction,
    setItemActionMessage,
    loadAccountSummary: input.loadAccountSummary,
    applyCommittedAccountActionPatches: input.applyCommittedAccountActionPatches,
    startAccountWriteVerification
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
    vaultWriteActions,
    clearCompletedWriteFeedback
  };
}
