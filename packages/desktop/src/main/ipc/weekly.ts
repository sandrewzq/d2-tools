import { ipcMain } from "electron";
import { getCoordinatedHomeBriefing } from "../runtime/runtimeCoordinator.js";

export function registerWeeklyIpcHandlers(): void {
  ipcMain.handle("weekly:summary", async () => (await getCoordinatedHomeBriefing()).weekly);
}
