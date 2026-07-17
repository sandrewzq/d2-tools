import { ipcMain } from "electron";
import {
  classifyHomeBriefingIpcError,
  encodeDesktopIpcFailure
} from "../../contracts/errors.js";
import { getCoordinatedHomeBriefing } from "../runtime/runtimeCoordinator.js";

export function registerWeeklyIpcHandlers(): void {
  ipcMain.handle("weekly:summary", () => encodeDesktopIpcFailure(
    async () => (await getCoordinatedHomeBriefing()).weekly,
    classifyHomeBriefingIpcError
  ));
}
