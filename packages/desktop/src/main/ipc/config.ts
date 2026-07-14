import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { app, dialog, ipcMain, shell } from "electron";
import type { D2Config } from "@d2-tools/core/config/schema";
import { loadConfig, saveConfig } from "@d2-tools/services/config/store";
import {
  createPortableBackup,
  mergePortableConfig,
  parseBackupDocument,
  portableBackupFileCount,
  restorePortableBackup,
  writePortableBackup
} from "./configBackup.js";

type ConfigBackupResult = {
  ok: true;
  message: string;
  path?: string;
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
    const parsed = parseBackupDocument(readFileSync(inputPath, "utf8"));
    if (parsed.kind === "legacy-config") {
      const confirmation = await dialog.showMessageBox({
        type: "warning",
        title: "导入旧版配置备份",
        message: "这个文件只包含旧版配置，不能恢复愿望单、标签或配装模板。",
        detail: "为避免泄露或误覆盖，文件中的账号令牌、Bungie 密钥和 AI 密钥不会导入。是否继续？",
        buttons: ["继续导入", "取消"],
        defaultId: 1,
        cancelId: 1
      });
      if (confirmation.response !== 0) {
        return { ok: true, message: "已取消导入旧版配置。" };
      }

      saveConfig(mergePortableConfig(config, parsed.config));
      return {
        ok: true,
        message: `旧版配置已导入：${basename(inputPath)}。账号令牌和密钥未导入，重启应用后生效。`,
        path: inputPath
      };
    }

    const confirmation = await dialog.showMessageBox({
      type: "warning",
      title: "恢复便携备份",
      message: `将恢复 ${portableBackupFileCount(parsed.backup)} 组用户数据和本地偏好。`,
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
      backup: parsed.backup,
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

  ipcMain.handle("config:clear-cache", (): ConfigBackupResult => {
    const config = loadConfig();
    const dataDir = resolve(config.data.data_dir);
    const cacheDir = resolve(dataDir, "cache");
    if (!cacheDir.startsWith(`${dataDir}\\`) && cacheDir !== join(dataDir, "cache")) {
      throw new Error("缓存目录不在当前数据目录内，已取消清理。");
    }

    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true });
    }

    return {
      ok: true,
      message: "缓存已清理。账号授权、配置、资料库、本地标记和日志已保留。"
    };
  });
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
