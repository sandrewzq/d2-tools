import { ipcMain } from "electron";
import { getHealth } from "@d2-tools/core/health";
import { registerAccountIpcHandlers } from "./ipc/account.js";
import { registerActionIpcHandlers } from "./ipc/actions.js";
import { registerActivitiesIpcHandlers } from "./ipc/activities.js";
import { registerAnalysisIpcHandlers } from "./ipc/analysis.js";
import { registerAuthIpcHandlers } from "./ipc/auth.js";
import { registerCommunityIpcHandlers } from "./ipc/community.js";
import { registerConfigIpcHandlers } from "./ipc/config.js";
import { registerDailyIpcHandlers } from "./ipc/daily.js";
import { registerDiagnosticsIpcHandlers } from "./ipc/diagnostics.js";
import { registerLibraryIpcHandlers } from "./ipc/library.js";
import { registerLoadoutIpcHandlers } from "./ipc/loadouts.js";
import { registerManifestIpcHandlers } from "./ipc/manifest.js";
import { registerStartupIpcHandlers } from "./ipc/startup.js";
import { registerUpdateIpcHandlers } from "./ipc/updates.js";
import { registerVaultIpcHandlers } from "./ipc/vault.js";
import { registerWishlistIpcHandlers } from "./ipc/wishlist.js";

export function registerIpcHandlers(): void {
  ipcMain.handle("health:get", () => getHealth());
  registerConfigIpcHandlers();
  registerAuthIpcHandlers();
  registerStartupIpcHandlers();
  registerAccountIpcHandlers();
  registerManifestIpcHandlers();
  registerLibraryIpcHandlers();
  registerWishlistIpcHandlers();
  registerCommunityIpcHandlers();
  registerVaultIpcHandlers();
  registerAnalysisIpcHandlers();
  registerActionIpcHandlers();
  registerDailyIpcHandlers();
  registerActivitiesIpcHandlers();
  registerDiagnosticsIpcHandlers();
  registerLoadoutIpcHandlers();
  registerUpdateIpcHandlers();
}
