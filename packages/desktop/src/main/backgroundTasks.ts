import { BrowserWindow } from "electron";
import {
  createBackgroundTaskStore,
  type BackgroundTaskSnapshot,
  type StartBackgroundTaskInput
} from "../shared/backgroundTasks.js";

export const backgroundTasksChannel = "background-tasks:changed";

const backgroundTaskStore = createBackgroundTaskStore({
  onSnapshotChanged: broadcastBackgroundTasks
});

export function startBackgroundTask(input: StartBackgroundTaskInput): BackgroundTaskSnapshot {
  return backgroundTaskStore.startTask(input);
}

export function listBackgroundTasks(): BackgroundTaskSnapshot[] {
  return backgroundTaskStore.listTasks();
}

function broadcastBackgroundTasks(snapshots: BackgroundTaskSnapshot[]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) {
      continue;
    }
    window.webContents.send(backgroundTasksChannel, snapshots);
  }
}
