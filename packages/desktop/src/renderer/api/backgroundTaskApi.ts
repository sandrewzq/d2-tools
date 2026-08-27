import type { BackgroundTaskSnapshot as SharedBackgroundTaskSnapshot } from "../../shared/backgroundTasks";
import type {
  AssetCacheTaskCompletion,
  AssetCacheTaskInput
} from "../../shared/backgroundTasks";

export type BackgroundTaskSnapshot = SharedBackgroundTaskSnapshot;

export type BackgroundTaskApi = {
  getBackgroundTasks(): Promise<BackgroundTaskSnapshot[]>;
  onBackgroundTasksChanged(callback: (tasks: BackgroundTaskSnapshot[]) => void): () => void;
  queueAssetCacheTask(input: AssetCacheTaskInput): Promise<BackgroundTaskSnapshot>;
  completeAssetCacheTask(input: AssetCacheTaskCompletion): Promise<{ ok: boolean }>;
};
