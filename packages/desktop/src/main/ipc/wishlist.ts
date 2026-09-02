import { createHash, randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { dialog, ipcMain } from "electron";
import {
  parseDimWishlist,
  type DimWishlist,
  type DimWishlistImportPreview,
  type DimWishlistMode
} from "@d2-tools/core/analysis/wishlistImport";
import {
  clearDimWishlist,
  loadDimWishlist,
  saveDimWishlist
} from "@d2-tools/services/analysis/wishlistStore";
import {
  activateDimWishlistOnlineUpdate,
  previewDimWishlistOnlineUpdate,
  readDimWishlistOnlineStatus
} from "@d2-tools/services/community/dimWishlistUpdates";
import { loadConfig } from "@d2-tools/services/config/store";
import { removeDimWishlistEquipmentTargets } from "./targets.js";

const maximumWishlistBytes = 128 * 1024 * 1024;
const pendingWishlistImports = new Map<string, { path: string; fingerprint: string }>();

export function registerWishlistIpcHandlers(): void {
  ipcMain.handle("wishlist:import:select", async (): Promise<DimWishlistImportPreview | null> => {
    const config = loadConfig();
    const result = await dialog.showOpenDialog({
      title: "选择 DIM Wishlist",
      defaultPath: config.data.data_dir,
      properties: ["openFile"],
      filters: [{ name: "DIM Wishlist", extensions: ["txt", "wishlist"] }]
    });
    const path = result.filePaths[0];
    if (result.canceled || !path) return null;

    const text = await readWishlistFile(path);
    const wishlist = parseDimWishlist(text);
    if (wishlist.rules.length === 0) {
      throw new Error("文件中没有识别到有效的 DIM Wishlist 规则。");
    }
    const fingerprint = fingerprintText(text);
    const token = randomUUID();
    pendingWishlistImports.clear();
    pendingWishlistImports.set(token, { path, fingerprint });
    return buildWishlistPreview(token, path, wishlist, fingerprint);
  });

  ipcMain.handle("wishlist:import:confirm", async (_event, token: string) => {
    const pending = pendingWishlistImports.get(token);
    if (!pending) throw new Error("DIM Wishlist 预览已失效，请重新选择文件。");
    pendingWishlistImports.delete(token);

    const text = await readWishlistFile(pending.path);
    if (fingerprintText(text) !== pending.fingerprint) {
      throw new Error("DIM Wishlist 在预览后发生了变化，请重新选择文件。");
    }
    const wishlist = parseDimWishlist(text);
    if (wishlist.rules.length === 0) {
      throw new Error("文件中没有识别到有效的 DIM Wishlist 规则。");
    }
    const config = loadConfig();
    const saved = saveDimWishlist(config.data.data_dir, wishlist);
    await removeDimWishlistEquipmentTargets(config.data.data_dir).catch(() => undefined);
    return saved;
  });

  ipcMain.handle("wishlist:get", () => {
    const config = loadConfig();
    return loadDimWishlist(config.data.data_dir);
  });

  ipcMain.handle("wishlist:save", async (_event, wishlist: DimWishlist) => {
    const config = loadConfig();
    const saved = saveDimWishlist(config.data.data_dir, wishlist);
    await removeDimWishlistEquipmentTargets(config.data.data_dir).catch(() => undefined);
    return saved;
  });

  ipcMain.handle("wishlist:clear", async () => {
    const config = loadConfig();
    clearDimWishlist(config.data.data_dir);
    await removeDimWishlistEquipmentTargets(config.data.data_dir).catch(() => undefined);
    return null;
  });

  ipcMain.handle("wishlist:online:status", () => {
    const config = loadConfig();
    return readDimWishlistOnlineStatus(config.data.data_dir);
  });

  ipcMain.handle("wishlist:online:check", async () => {
    const config = loadConfig();
    return previewDimWishlistOnlineUpdate(config.data.data_dir);
  });

  ipcMain.handle("wishlist:online:confirm", async (_event, token: string) => {
    const config = loadConfig();
    const result = await activateDimWishlistOnlineUpdate(config.data.data_dir, token);
    await removeDimWishlistEquipmentTargets(config.data.data_dir).catch(() => undefined);
    return result;
  });
}

async function readWishlistFile(path: string): Promise<string> {
  if ((await stat(path)).size > maximumWishlistBytes) {
    throw new Error("DIM Wishlist 文件超过 128 MB，未读取。");
  }
  return readFile(path, "utf8");
}

function fingerprintText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function buildWishlistPreview(
  token: string,
  path: string,
  wishlist: DimWishlist,
  fingerprint: string
): DimWishlistImportPreview {
  const modeCounts: Record<DimWishlistMode, number> = { pve: 0, pvp: 0, general: 0 };
  for (const rule of wishlist.rules) modeCounts[rule.mode] += 1;
  return {
    token,
    file_name: basename(path),
    title: wishlist.title,
    rule_count: wishlist.rules.length,
    weapon_count: new Set(wishlist.rules.map((rule) => rule.item_hash)).size,
    mode_counts: modeCounts,
    authors: [...new Set([
      wishlist.author,
      ...(wishlist.source_blocks ?? []).map((block) => block.author),
      ...wishlist.rules.map((rule) => rule.author)
    ].filter((value): value is string => Boolean(value)))],
    tags: [...new Set([
      ...(wishlist.source_blocks ?? []).flatMap((block) => block.tags ?? []),
      ...wishlist.rules.flatMap((rule) => rule.tags ?? [])
    ])],
    fingerprint
  };
}
