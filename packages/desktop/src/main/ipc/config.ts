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
import { mainTemplate, mainText } from "../i18n/mainCopy.js";

type ConfigBackupResult = {
  ok: true;
  message: string;
  path?: string;
  cache?: CacheStatus;
};

export function registerConfigIpcHandlers(): void {
  ipcMain.handle("config:get", () => loadConfig());

  ipcMain.handle("config:save", (event, config: D2Config) => {
    const previous = loadConfig();
    saveConfig(config);
    const saved = loadConfig();
    if (previous.data.manifest_language !== saved.data.manifest_language) {
      // 资料库语言变了，页面上的装备名、Perk 名和掉落池名字要按新语言重新取一遍。
      // 渲染层有模块级 store（账号快照、资料库状态、简报等）装着上一语言的名字，主进程
      // 里也已经按旧语言建好了账号会话和简报缓存，光重读配置刷不掉它们。这里整窗重载：
      // 渲染层的模块级 store 随之重建，主进程那几处按语言做键，换语言自然不命中（Bug #119）。
      // 等这一轮 IPC 回复发出去再重载，调用方拿得到保存结果。
      setImmediate(() => {
        if (!event.sender.isDestroyed()) event.sender.reload();
      });
    }
    return saved;
  });

  ipcMain.handle("config:open-data-dir", async () => {
    const config = loadConfig();
    await shell.openPath(config.data.data_dir);
  });

  ipcMain.handle("config:export", async (): Promise<ConfigBackupResult> => {
    const config = loadConfig();
    const locale = config.features.interface_locale;
    const backupDir = join(config.data.data_dir, "backups");
    mkdirSync(backupDir, { recursive: true });
    const result = await dialog.showSaveDialog({
      title: mainText(locale, "创建 d2-tools 便携备份"),
      defaultPath: join(backupDir, `d2-tools-backup-${timestampForFileName()}.json`),
      filters: [{ name: mainText(locale, "d2-tools 便携备份"), extensions: ["json"] }]
    });

    if (result.canceled || !result.filePath) {
      return { ok: true, message: mainText(locale, "已取消创建便携备份。") };
    }

    const backup = createPortableBackup({
      dataDir: config.data.data_dir,
      config,
      appVersion: app.getVersion()
    });
    writePortableBackup(result.filePath, backup);
    return {
      ok: true,
      message: mainTemplate(locale, "便携备份已创建：{path}。备份不包含账号令牌、Bungie/AI 密钥、资料库、缓存或日志。", { path: result.filePath }),
      path: result.filePath
    };
  });

  ipcMain.handle("config:import", async (): Promise<ConfigBackupResult> => {
    const config = loadConfig();
    const locale = config.features.interface_locale;
    const result = await dialog.showOpenDialog({
      title: mainText(locale, "恢复 d2-tools 便携备份"),
      defaultPath: config.data.data_dir,
      properties: ["openFile"],
      filters: [{ name: mainText(locale, "d2-tools 备份"), extensions: ["json"] }]
    });

    if (result.canceled || !result.filePaths[0]) {
      return { ok: true, message: mainText(locale, "已取消恢复备份。") };
    }

    const inputPath = result.filePaths[0];
    const backup = parseBackupDocument(readFileSync(inputPath, "utf8"));

    const confirmation = await dialog.showMessageBox({
      type: "warning",
      title: mainText(locale, "恢复便携备份"),
      message: mainTemplate(locale, "将恢复 {count} 组用户数据和本地偏好。", { count: portableBackupFileCount(backup) }),
      detail: mainText(locale, "恢复不会导入或覆盖账号令牌、Bungie/AI 密钥和当前数据目录。现有用户数据会先保存为本机回滚备份。是否继续？"),
      buttons: [mainText(locale, "恢复"), mainText(locale, "取消")],
      defaultId: 1,
      cancelId: 1
    });
    if (confirmation.response !== 0) {
      return { ok: true, message: mainText(locale, "已取消恢复便携备份。") };
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
      message: mainTemplate(locale, "便携备份已恢复：{name}。回滚备份：{path}。请重启应用；目标电脑仍需重新登录并填写所需密钥。", { name: basename(inputPath), path: rollbackPath }),
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
        message: mainText(config.features.interface_locale, "缓存已清理。账号授权、配置、资料库、本地标记和日志已保留。"),
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
