import { useEffect, useMemo, useState } from "react";
import { api, type BackgroundTaskSnapshot } from "../../api/client";

export function useBackgroundTasks() {
  const [backgroundTasks, setBackgroundTasks] = useState<BackgroundTaskSnapshot[]>([]);
  const activeBackgroundTasks = useMemo(() => (
    backgroundTasks.filter((task) => ["queued", "running", "retrying"].includes(task.status))
  ), [backgroundTasks]);
  const latestBackgroundTask = activeBackgroundTasks[0] ?? backgroundTasks[0] ?? null;

  useEffect(() => {
    let mounted = true;
    void api.getBackgroundTasks()
      .then((tasks) => {
        if (mounted) setBackgroundTasks(tasks);
      })
      .catch(() => {
        if (mounted) setBackgroundTasks([]);
      });

    const unsubscribe = api.onBackgroundTasksChanged((tasks) => {
      setBackgroundTasks(tasks);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {
    backgroundTasks,
    activeBackgroundTasks,
    latestBackgroundTask
  };
}
