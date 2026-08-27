import { mkdirSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { app, dialog, ipcMain, shell } from "electron";
import type { D2Config } from "@d2-tools/core/config/schema";
import { loadConfig, saveConfig } from "@d2-tools/services/config/store";
import {
  createPortableBackup,
  parseBackupDocument,
  portableBackupFileCount,
  restorePortableBackup,
  writePortableBackup
} from "./configBackup.js";
import {
  clearCache,
  inspectCache,
  type CacheDomain,
  type CacheStatus
} from "@d2-tools/services/cache/maintenance";
import { resetAccountSession } from "../runtime/accountSession.js";
import { resetAccountCacheMetrics } from "@d2-tools/services/account/cacheMetrics";

type ConfigBackupResult = {
  ok: true;
  message: string;
  path?: string;
  cache?: CacheStatus;
};

export function registerConfigIpcHandlers(): void {
  ipcMain.handle("config:get", () => loadConfig());

  ipcMain.handle("config:save", (_event, config: D2Config) => {
    saveConfig(config);
    return loadConfig();
  });

  ipcMain.handle("config:open-data-dir", async () => {
    const config = loadConfig();
    await shell.openPath(config.data.data_dir);
  });

  ipcMain.handle("config:export", async (): Promise<ConfigBackupResult> => {
    const config = loadConfig();
    const backupDir = join(config.data.data_dir, "backups");
    mkdirSync(backupDir, { recursive: true });
    const result = await dialog.showSaveDialog({
      title: "创建 d2-tools 便携备份",
      defaultPath: join(backupDir, `d2-tools-backup-${timestampForFileName()}.json`),
      filters: [{ name: "d2-tools 便携备份", extensions: ["json"] }]
    });

    if (result.canceled || !result.filePath) {
      return { ok: true, message: "已取消创建便携备份。" };
    }

    const backup = createPortableBackup({
      dataDir: config.data.data_dir,
      config,
      appVersion: app.getVersion()
    });
    writePortableBackup(result.filePath, backup);
    return {
      ok: true,
      message: `便携备份已创建：${result.filePath}。备份不包含账号令牌、Bungie/AI 密钥、资料库、缓存或日志。`,
      path: result.filePath
    };
  });

  ipcMain.handle("config:import", async (): Promise<ConfigBackupResult> => {
    const config = loadConfig();
    const result = await dialog.showOpenDialog({
      title: "恢复 d2-tools 便携备份",
      defaultPath: config.data.data_dir,
      properties: ["openFile"],
      filters: [{ name: "d2-tools 备份", extensions: ["json"] }]
    });

    if (result.canceled || !result.filePaths[0]) {
      return { ok: true, message: "已取消恢复备份。" };
    }

    const inputPath = result.filePaths[0];
    const backup = parseBackupDocument(readFileSync(inputPath, "utf8"));

    const confirmation = await dialog.showMessageBox({
      type: "warning",
      title: "恢复便携备份",
      message: `将恢复 ${portableBackupFileCount(backup)} 组用户数据和本地偏好。`,
      detail: "恢复不会导入或覆盖账号令牌、Bungie/AI 密钥和当前数据目录。现有用户数据会先保存为本机回滚备份。是否继续？",
      buttons: ["恢复", "取消"],
      defaultId: 1,
      cancelId: 1
    });
    if (confirmation.response !== 0) {
      return { ok: true, message: "已取消恢复便携备份。" };
    }

    const rollbackPath = join(
      config.data.data_dir,
      "backups",
      `restore-rollback-${timestampForFileName()}.json`
    );
    const rollback = createPortableBackup({
      dataDir: config.data.data_dir,
      config,
      appVersion: app.getVersion()
    });
    writePortableBackup(rollbackPath, rollback);

    restorePortableBackup({
      dataDir: config.data.data_dir,
      currentConfig: config,
      backup,
      rollback,
      rollbackPath,
      saveConfig
    });

    return {
      ok: true,
      message: `便携备份已恢复：${basename(inputPath)}。回滚备份：${rollbackPath}。请重启应用；目标电脑仍需重新登录并填写所需密钥。`,
      path: inputPath
    };
  });

  ipcMain.handle("config:cache-status", (): CacheStatus => {
    const config = loadConfig();
    return inspectCache(config.data.data_dir);
  });

  ipcMain.handle(
    "config:clear-cache",
    async (_event, domains?: readonly CacheDomain[]): Promise<ConfigBackupResult> => {
      const config = loadConfig();
      const dataDir = resolve(config.data.data_dir);
      const cacheDir = resolve(dataDir, "cache");
      const relativeCachePath = relative(dataDir, cacheDir);
      if (!relativeCachePath || relativeCachePath.startsWith("..") || isAbsolute(relativeCachePath)) {
        throw new Error("缓存目录不在当前数据目录内，已取消清理。");
      }

      const result = await clearCache(dataDir, domains);
      // Drop process-local snapshot/repository state as well. Otherwise a page
      // could continue displaying data that has just been removed on disk.
      resetAccountSession();
      resetAccountCacheMetrics();

      return {
        ok: true,
        message: "缓存已清理。账号授权、配置、资料库、本地标记和日志已保留。",
        cache: result.status
      };
    }
  );
}

function timestampForFileName(): string {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}${value("month")}${value("day")}-${value("hour")}${value("minute")}${value("second")}`;
}
