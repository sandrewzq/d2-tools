import { useMemo, useSyncExternalStore } from "react";
import {
  getBackgroundTasksSnapshot,
  subscribeBackgroundTasks
} from "../stores/backgroundTasksStore";

export function useBackgroundTasks() {
  const backgroundTasks = useSyncExternalStore(
    subscribeBackgroundTasks,
    getBackgroundTasksSnapshot,
    getBackgroundTasksSnapshot
  );
  const activeBackgroundTasks = useMemo(() => (
    backgroundTasks.filter((task) => ["queued", "running", "retrying"].includes(task.status))
  ), [backgroundTasks]);
  const latestBackgroundTask = activeBackgroundTasks[0] ?? backgroundTasks[0] ?? null;

  return {
    backgroundTasks,
    activeBackgroundTasks,
    latestBackgroundTask
  };
}
