import { ipcMain } from "electron";
import { getCoordinatedHomeBriefing } from "../runtime/runtimeCoordinator.js";

export function registerDailyIpcHandlers(): void {
  ipcMain.handle("home:briefing", () => getCoordinatedHomeBriefing());
  ipcMain.handle("daily:summary", async () => (await getCoordinatedHomeBriefing()).daily);
}
