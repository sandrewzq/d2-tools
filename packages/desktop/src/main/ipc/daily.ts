import { ipcMain } from "electron";
import {
  classifyHomeBriefingIpcError,
  encodeDesktopIpcFailure
} from "../../contracts/errors.js";
import {
  getCoordinatedHomeBriefing,
  refreshCoordinatedHomeBriefing
} from "../runtime/runtimeCoordinator.js";

export function registerDailyIpcHandlers(): void {
  ipcMain.handle("home:briefing", (_event, options?: { force?: boolean }) => encodeDesktopIpcFailure(
    () => getCoordinatedHomeBriefing(options),
    classifyHomeBriefingIpcError
  ));
  ipcMain.handle("home:briefing:refresh", () => encodeDesktopIpcFailure(
    refreshCoordinatedHomeBriefing,
    classifyHomeBriefingIpcError
  ));
  ipcMain.handle("daily:summary", () => encodeDesktopIpcFailure(
    async () => (await getCoordinatedHomeBriefing()).daily,
    classifyHomeBriefingIpcError
  ));
}
