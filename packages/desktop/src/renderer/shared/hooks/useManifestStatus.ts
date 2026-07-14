import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type { ManifestStatus } from "../../api/types";

export function useManifestStatus() {
  const [manifestStatus, setManifestStatus] = useState<ManifestStatus | null>(null);
  const [manifestStatusError, setManifestStatusError] = useState("");
  const [isLoadingManifestStatus, setIsLoadingManifestStatus] = useState(false);
  const [isInitializingManifest, setIsInitializingManifest] = useState(false);
  const refreshedTaskIds = useRef(new Set<string>());

  useEffect(() => {
    void loadManifestStatus(false);
    void api.getBackgroundTasks().then(handleBackgroundTasks).catch(() => undefined);

    return api.onBackgroundTasksChanged(handleBackgroundTasks);
  }, []);

  function handleBackgroundTasks(tasks: Awaited<ReturnType<typeof api.getBackgroundTasks>>) {
    const manifestTasks = tasks.filter((task) => (
      ["manifest-version-check", "manifest-update", "manifest-repair"].includes(task.type)
    ));
    setIsInitializingManifest(manifestTasks.some((task) => (
      ["manifest-update", "manifest-repair"].includes(task.type)
      && ["queued", "running", "retrying"].includes(task.status)
    )));

    const latestManifestTask = manifestTasks[0];
    if (latestManifestTask?.status === "failed") {
      setManifestStatusError(latestManifestTask.error ?? "资料库后台任务失败");
    } else if (latestManifestTask && ["queued", "running", "retrying", "success"].includes(latestManifestTask.status)) {
      setManifestStatusError("");
    }

    const hasActiveUpdate = manifestTasks.some((task) => (
      ["manifest-update", "manifest-repair"].includes(task.type)
      && ["queued", "running", "retrying"].includes(task.status)
    ));
    const completedManifestTask = manifestTasks.find((task) => (
      task.status === "success"
      && !refreshedTaskIds.current.has(task.task_id)
      && !(task.type === "manifest-version-check" && hasActiveUpdate)
    ));
    if (!completedManifestTask) {
      return;
    }

    refreshedTaskIds.current.add(completedManifestTask.task_id);
    void loadManifestStatus(false);
  }

  async function loadManifestStatus(forceCheck: boolean) {
    setIsLoadingManifestStatus(true);
    setManifestStatusError("");
    try {
      setManifestStatus(await api.getManifestStatus({ forceCheck }));
    } catch (error) {
      setManifestStatusError(error instanceof Error ? error.message : "资料库状态读取失败");
    } finally {
      setIsLoadingManifestStatus(false);
    }
  }

  async function refreshManifestStatus() {
    return loadManifestStatus(true);
  }

  async function initializeManifest() {
    return updateManifest(false);
  }

  async function repairManifest() {
    return updateManifest(true);
  }

  async function updateManifest(repair: boolean) {
    setManifestStatusError("");
    try {
      await (repair ? api.repairManifest() : api.initializeManifest());
    } catch (error) {
      setManifestStatusError(error instanceof Error ? error.message : "资料库更新启动失败");
    }
  }

  return {
    initializeManifest,
    repairManifest,
    isInitializingManifest,
    isLoadingManifestStatus,
    manifestStatus,
    manifestStatusError,
    refreshManifestStatus
  };
}
