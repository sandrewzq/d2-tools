import { ipcMain } from "electron";
import { listBackgroundTasks } from "../backgroundTasks.js";

export function registerBackgroundTaskIpcHandlers(): void {
  ipcMain.handle("background-tasks:list", () => listBackgroundTasks());
}
