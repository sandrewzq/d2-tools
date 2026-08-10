import { ipcMain } from "electron";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import {
  clearDimWishlist,
  loadDimWishlist,
  saveDimWishlist
} from "@d2-tools/services/analysis/wishlistStore";
import { loadConfig } from "@d2-tools/services/config/store";
import { syncEquipmentTargetImports } from "./targets.js";

export function registerWishlistIpcHandlers(): void {
  ipcMain.handle("wishlist:get", () => {
    const config = loadConfig();
    return loadDimWishlist(config.data.data_dir);
  });

  ipcMain.handle("wishlist:save", async (_event, wishlist: DimWishlist) => {
    const config = loadConfig();
    const saved = saveDimWishlist(config.data.data_dir, wishlist);
    await syncEquipmentTargetImports(config.data.data_dir, ["dim_wishlist"]);
    return saved;
  });

  ipcMain.handle("wishlist:clear", async () => {
    const config = loadConfig();
    clearDimWishlist(config.data.data_dir);
    await syncEquipmentTargetImports(config.data.data_dir, ["dim_wishlist"]);
    return null;
  });
}
