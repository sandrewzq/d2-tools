import type { BackgroundTaskSnapshot as SharedBackgroundTaskSnapshot } from "../../shared/backgroundTasks";

export type BackgroundTaskSnapshot = SharedBackgroundTaskSnapshot;

export type BackgroundTaskApi = {
  getBackgroundTasks(): Promise<BackgroundTaskSnapshot[]>;
  onBackgroundTasksChanged(callback: (tasks: BackgroundTaskSnapshot[]) => void): () => void;
};
