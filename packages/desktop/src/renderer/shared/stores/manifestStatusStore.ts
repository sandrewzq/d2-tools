import { api } from "../../api/client";
import type { BackgroundTaskSnapshot, ManifestStatus } from "../../api/types";
import {
  ensureBackgroundTasksStoreStarted,
  getBackgroundTasksSnapshot,
  subscribeBackgroundTasks
} from "./backgroundTasksStore";

type Listener = () => void;

export type ManifestStatusStoreSnapshot = {
  manifestStatus: ManifestStatus | null;
  manifestStatusError: string;
  isLoadingManifestStatus: boolean;
  isInitializingManifest: boolean;
  manifestTask: BackgroundTaskSnapshot | null;
};

let snapshot: ManifestStatusStoreSnapshot = {
  manifestStatus: null,
  manifestStatusError: "",
  isLoadingManifestStatus: false,
  isInitializingManifest: false,
  manifestTask: null
};
let started = false;
let loadSequence = 0;
const refreshedTaskIds = new Set<string>();
const listeners = new Set<Listener>();

export function getManifestStatusSnapshot(): ManifestStatusStoreSnapshot {
  return snapshot;
}

export function subscribeManifestStatus(listener: Listener): () => void {
  ensureManifestStatusStoreStarted();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ensureManifestStatusStoreStarted(): void {
  if (started) return;
  started = true;
  ensureBackgroundTasksStoreStarted();
  subscribeBackgroundTasks(() => handleBackgroundTasks(getBackgroundTasksSnapshot()));
  handleBackgroundTasks(getBackgroundTasksSnapshot());
  void loadManifestStatus(false);
}

export async function refreshManifestStatus(): Promise<void> {
  return loadManifestStatus(true);
}

export async function initializeManifest(): Promise<void> {
  return updateManifest(false);
}

export async function repairManifest(): Promise<void> {
  return updateManifest(true);
}

function handleBackgroundTasks(tasks: BackgroundTaskSnapshot[]): void {
  const manifestTasks = tasks.filter((task) => (
    ["manifest-version-check", "manifest-update", "manifest-repair"].includes(task.type)
  ));
  const isInitializingManifest = manifestTasks.some((task) => (
    ["manifest-update", "manifest-repair"].includes(task.type)
    && ["queued", "running", "retrying"].includes(task.status)
  ));
  const latestManifestTask = manifestTasks[0];
  const manifestTask = manifestTasks.find((task) => (
    ["manifest-update", "manifest-repair"].includes(task.type)
    && ["queued", "running", "retrying"].includes(task.status)
  )) ?? manifestTasks.find((task) => ["manifest-update", "manifest-repair"].includes(task.type)) ?? null;
  const manifestStatusError = latestManifestTask?.status === "failed"
    ? latestManifestTask.error ?? "资料库后台任务失败"
    : (["queued", "running", "retrying", "success"].includes(latestManifestTask?.status ?? "")
      ? ""
      : snapshot.manifestStatusError);

  setSnapshot({ isInitializingManifest, manifestStatusError, manifestTask });

  const hasActiveUpdate = manifestTasks.some((task) => (
    ["manifest-update", "manifest-repair"].includes(task.type)
    && ["queued", "running", "retrying"].includes(task.status)
  ));
  const completedManifestTask = manifestTasks.find((task) => (
    task.status === "success"
    && !refreshedTaskIds.has(task.task_id)
    && !(task.type === "manifest-version-check" && hasActiveUpdate)
  ));
  if (!completedManifestTask) return;

  refreshedTaskIds.add(completedManifestTask.task_id);
  void loadManifestStatus(false);
}

async function loadManifestStatus(forceCheck: boolean): Promise<void> {
  const sequence = ++loadSequence;
  setSnapshot({ isLoadingManifestStatus: true, manifestStatusError: "" });
  try {
    const manifestStatus = await api.getManifestStatus({ forceCheck });
    if (sequence !== loadSequence) return;
    setSnapshot({ manifestStatus });
  } catch (error) {
    if (sequence !== loadSequence) return;
    setSnapshot({
      manifestStatusError: error instanceof Error ? error.message : "资料库状态读取失败"
    });
  } finally {
    if (sequence === loadSequence) {
      setSnapshot({ isLoadingManifestStatus: false });
    }
  }
}

async function updateManifest(repair: boolean): Promise<void> {
  setSnapshot({ manifestStatusError: "" });
  try {
    await (repair ? api.repairManifest() : api.initializeManifest());
  } catch (error) {
    setSnapshot({
      manifestStatusError: error instanceof Error ? error.message : "资料库更新启动失败"
    });
  }
}

function setSnapshot(patch: Partial<ManifestStatusStoreSnapshot>): void {
  const next = { ...snapshot, ...patch };
  if (
    next.manifestStatus === snapshot.manifestStatus
    && next.manifestStatusError === snapshot.manifestStatusError
    && next.isLoadingManifestStatus === snapshot.isLoadingManifestStatus
    && next.isInitializingManifest === snapshot.isInitializingManifest
    && next.manifestTask === snapshot.manifestTask
  ) {
    return;
  }
  snapshot = next;
  for (const listener of listeners) {
    listener();
  }
}
