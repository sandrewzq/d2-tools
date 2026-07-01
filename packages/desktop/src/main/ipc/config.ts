import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { dialog, ipcMain, shell } from "electron";
import type { D2Config } from "@d2-tools/core/config/schema";
import { loadConfig, saveConfig } from "@d2-tools/core/config/store";

type ConfigBackupResult = {
  ok: true;
  message: string;
  path?: string;
};

type PartialD2Config = {
  bungie?: Partial<D2Config["bungie"]>;
  data?: Partial<D2Config["data"]>;
  ai?: Partial<D2Config["ai"]>;
  features?: Partial<D2Config["features"]>;
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

  ipcMain.handle("config:export", (): ConfigBackupResult => {
    const config = loadConfig();
    const backupDir = join(config.data.data_dir, "backups");
    mkdirSync(backupDir, { recursive: true });
    const backupPath = join(backupDir, `config-backup-${timestampForFileName()}.json`);
    writeFileSync(backupPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    return {
      ok: true,
      message: `配置已导出：${backupPath}`,
      path: backupPath
    };
  });

  ipcMain.handle("config:import", async (): Promise<ConfigBackupResult> => {
    const config = loadConfig();
    const result = await dialog.showOpenDialog({
      title: "导入 d2-tools 配置",
      defaultPath: config.data.data_dir,
      properties: ["openFile"],
      filters: [{ name: "JSON 配置", extensions: ["json"] }]
    });

    if (result.canceled || !result.filePaths[0]) {
      return { ok: true, message: "已取消导入配置。" };
    }

    const inputPath = result.filePaths[0];
    const imported = JSON.parse(readFileSync(inputPath, "utf8")) as PartialD2Config;
    saveConfig(mergeImportedConfig(config, imported));
    return {
      ok: true,
      message: `配置已导入：${basename(inputPath)}。重启应用后所有设置会按新配置生效。`,
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

function mergeImportedConfig(current: D2Config, imported: PartialD2Config): D2Config {
  return {
    ...current,
    bungie: {
      ...current.bungie,
      ...imported.bungie
    },
    data: {
      ...current.data,
      ...imported.data,
      data_dir: current.data.data_dir
    },
    ai: {
      ...current.ai,
      ...imported.ai
    },
    features: {
      ...current.features,
      ...imported.features
    }
  };
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
