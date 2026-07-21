import { ipcMain } from "electron";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import {
  clearDimWishlist,
  loadDimWishlist,
  saveDimWishlist
} from "@d2-tools/services/analysis/wishlistStore";
import { loadConfig } from "@d2-tools/services/config/store";

export function registerWishlistIpcHandlers(): void {
  ipcMain.handle("wishlist:get", () => {
    const config = loadConfig();
    return loadDimWishlist(config.data.data_dir);
  });

  ipcMain.handle("wishlist:save", (_event, wishlist: DimWishlist) => {
    const config = loadConfig();
    return saveDimWishlist(config.data.data_dir, wishlist);
  });

  ipcMain.handle("wishlist:clear", () => {
    const config = loadConfig();
    clearDimWishlist(config.data.data_dir);
    return null;
  });
}
