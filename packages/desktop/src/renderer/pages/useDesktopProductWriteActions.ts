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
  startedAtMs: number;
  characterName: string;
  acceptedCount: number;
  failedCount: number;
  itemInstanceIds: string[];
  expectedPatches: AccountItemActionPatch[];
  surfaceFeedback: boolean;
};

// 后台对账目前最多等待 750ms + 2s + 5s + 10s + 20s，另加有限次
// Profile 请求时间。留出缓冲后，Renderer 不应再无限保留“确认中”。
const ACCOUNT_WRITE_SYNC_UI_TIMEOUT_MS = 75_000;

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
  recommendationRevision?: string;
  loadAccountSummary: () => Promise<void>;
  loadoutLibrary: LoadoutLibraryBridge;
  localTargetRules: LocalTargetRules;
  cleanupProtectionByItemKey?: ReadonlyMap<string, readonly string[]>;
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
  const accountWriteSyncsRef = useRef<AccountWriteSyncState[]>([]);
  const writeSyncTimeoutsRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const { backgroundTasks } = useBackgroundTasks();
  const loadoutActionFeedback = useLoadoutActionFeedback();

  accountWriteSyncsRef.current = accountWriteSyncs;

  useEffect(() => {
    const currentTaskIds = new Set(accountWriteSyncs.map((sync) => sync.taskId));
    for (const [taskId, timer] of writeSyncTimeoutsRef.current) {
      if (!currentTaskIds.has(taskId)) {
        clearTimeout(timer);
        writeSyncTimeoutsRef.current.delete(taskId);
      }
    }

    for (const sync of accountWriteSyncs) {
      if (writeSyncTimeoutsRef.current.has(sync.taskId)) continue;
      const remainingMs = Math.max(
        0,
        ACCOUNT_WRITE_SYNC_UI_TIMEOUT_MS - (Date.now() - sync.startedAtMs)
      );
      const timer = setTimeout(() => {
        writeSyncTimeoutsRef.current.delete(sync.taskId);
        const currentSyncs = accountWriteSyncsRef.current;
        const stillPending = currentSyncs.some((entry) => entry.taskId === sync.taskId);
        if (!stillPending) return;

        const hasNewerSameItemSync = currentSyncs.some((entry) => (
          entry.taskId !== sync.taskId
          && entry.startedAtMs > sync.startedAtMs
          && entry.itemInstanceIds.some((instanceId) => sync.itemInstanceIds.includes(instanceId))
        ));
        if (!hasNewerSameItemSync) {
          setAccountOperationFeedback((current) => {
            if (!current || !current.itemInstanceIds?.some((instanceId) => sync.itemInstanceIds.includes(instanceId))) {
              return current;
            }
            return {
              tone: "warning",
              phase: "paused",
              itemInstanceIds: sync.itemInstanceIds,
              message: "后台确认任务未及时返回，已刷新账号状态；请以当前页面显示的装备位置为准。"
            };
          });
          setItemActionMessage("");
        }
        // 即使后台任务的终态事件丢失，也先把页面从“确认中”释放出来。
        // 账号刷新失败时保留当前缓存，不再让状态无限等待。
        input.confirmCommittedAccountActionPatches(sync.expectedPatches);
        void input.loadAccountSummary().catch(() => undefined);
        void input.diagnostics.loadActionLog().catch(() => undefined);
        setAccountWriteSyncs((current) => current.filter((entry) => entry.taskId !== sync.taskId));
      }, remainingMs);
      writeSyncTimeoutsRef.current.set(sync.taskId, timer);
    }

    return () => undefined;
  }, [accountWriteSyncs]);

  useEffect(() => () => {
    for (const timer of writeSyncTimeoutsRef.current.values()) clearTimeout(timer);
    writeSyncTimeoutsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!accountWriteSyncs.length) return;
    const resolved = accountWriteSyncs.map((sync) => ({
      sync,
      task: backgroundTasks.find((entry) => entry.task_id === sync.taskId)
    }));
    const completedAll = resolved.filter((entry) => entry.task
      && ["success", "failed", "blocked"].includes(entry.task.status));
    for (const entry of completedAll) {
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
    const hiddenTerminal = resolved.filter((entry) => (
      !entry.sync.surfaceFeedback
      && entry.task
      && terminalTaskIds.has(entry.sync.taskId)
    ));
    const latestHiddenTerminal = hiddenTerminal.at(-1);
    if (latestHiddenTerminal?.task) {
      const { sync, task } = latestHiddenTerminal;
      const hasNewerSameItemSync = accountWriteSyncs.some((entry) => (
        entry.taskId !== sync.taskId
        && entry.startedAtMs > sync.startedAtMs
        && entry.itemInstanceIds.some((instanceId) => sync.itemInstanceIds.includes(instanceId))
      ));
      if (!hasNewerSameItemSync) {
        setAccountOperationFeedback((current) => {
          if (!current?.itemInstanceIds?.some((instanceId) => sync.itemInstanceIds.includes(instanceId))) {
            return current;
          }
          if (task.status === "success") {
            return {
              tone: sync.failedCount > 0 ? "warning" : "success",
              phase: sync.failedCount > 0 ? "partial-confirmed" : "confirmed",
              itemInstanceIds: sync.itemInstanceIds,
              message: sync.failedCount > 0
                ? `已确认 ${sync.acceptedCount} 项变化，另有 ${sync.failedCount} 项提交失败。`
                : `已确认 ${sync.acceptedCount} 项变化已在游戏内生效。`
            };
          }
          if (task.status === "superseded") {
            return {
              tone: "warning",
              phase: "superseded",
              itemInstanceIds: sync.itemInstanceIds,
              message: "旧对账任务已由同范围的新操作替代；页面等待最新操作确认。"
            };
          }
          return {
            tone: "warning",
            phase: "paused",
            itemInstanceIds: sync.itemInstanceIds,
            message: task.error ?? "写入请求未在游戏内确认，页面已按最新账号状态刷新。"
          };
        });
        setItemActionMessage("");
      }
    }
    for (const entry of resolved) {
      if (!entry.task || !terminalTaskIds.has(entry.sync.taskId)) continue;
      if (reloadedTerminalTaskIdsRef.current.has(entry.sync.taskId)) continue;
      reloadedTerminalTaskIdsRef.current.add(entry.sync.taskId);
      // 验证任务结束后必须用真实 Bungie 快照刷新页面。Pending 只记录
      // 预期目标；最终账号事实始终以本次权威 Profile 为准。
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
    verificationInput: AccountWriteVerificationInput,
    options: { surfaceFeedback?: boolean } = {}
  ): Promise<void> {
    const itemInstanceIds = [...new Set(verificationInput.expected_patches.map((patch) => patch.item_instance_id))];
    try {
      const task = await api.startAccountWriteVerification(verificationInput);
      setAccountWriteSyncs((current) => [...current.filter((entry) => entry.operationId !== verificationInput.operation_id), {
        taskId: task.task_id,
        operationId: verificationInput.operation_id,
        startedAtMs: Date.parse(task.started_at ?? "") || Date.now(),
        characterName: verificationInput.character_name ?? "当前角色",
        acceptedCount: verificationInput.accepted_count,
        failedCount: verificationInput.failed_count,
        itemInstanceIds,
        expectedPatches: verificationInput.expected_patches,
        surfaceFeedback: options.surfaceFeedback !== false
      }]);
    } catch (error) {
      const message = `写入请求已受理，但未能启动后台对账；页面保持服务器最后确认的账号状态：${error instanceof Error ? error.message : "后台任务不可用"}`;
      input.confirmCommittedAccountActionPatches(verificationInput.expected_patches);
      if (options.surfaceFeedback === false) {
        setAccountOperationFeedback((current) => {
          if (!current?.itemInstanceIds?.some((instanceId) => itemInstanceIds.includes(instanceId))) {
            return current;
          }
          return {
            tone: "warning",
            phase: "paused",
            itemInstanceIds,
            message
          };
        });
      } else {
        setAccountOperationFeedback({
          tone: "warning",
          phase: "paused",
          itemInstanceIds,
          message
        });
      }
      setItemActionMessage("");
      void input.loadAccountSummary().catch(() => undefined);
      void input.diagnostics.loadActionLog().catch(() => undefined);
    }
  }

  function clearCompletedWriteFeedback(): void {
    // 手动刷新代表用户要求重新读取权威账号状态。已结束的写入错误
    // 不应继续覆盖刷新结果；仍在进行的同步反馈则保留给后台任务更新。
    setAccountOperationFeedback((current) => {
      if (!current) return current;
      return current.phase && [
        "confirmed",
        "partial-confirmed",
        "failed",
        "paused",
        "superseded"
      ].includes(current.phase)
        ? undefined
        : current;
    });
    setItemActionMessage("");
    setLoadoutMessage("");
  }

  const itemDetail = useItemDetailWorkspace({
    accountSummary: input.accountSummary,
    vaultTags: input.vaultTags,
    setVaultTags: input.setVaultTags,
    importedWishlist: input.importedWishlist,
    cleanupProtectionByItemKey: input.cleanupProtectionByItemKey,
    detailCacheScopeKey: input.itemDetailCacheScopeKey,
    recommendationRevision: input.recommendationRevision,
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
