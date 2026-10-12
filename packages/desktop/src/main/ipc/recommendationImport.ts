import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { dialog, ipcMain } from "electron";
import { loadConfig } from "@d2-tools/services/config/store";
import type { RecommendationImportTarget } from "@d2-tools/services/community/recommendationDocumentStore";
import { RecommendationImportSession } from "../runtime/recommendationImportRuntime.js";
import { getDesktopManifestStatus } from "./manifest.js";

export function registerRecommendationImportIpcHandlers(): void {
  const sessions = new Map<number, {
    token: string;
    confirming?: boolean;
    configKey: string;
    session: RecommendationImportSession;
    dispose: () => void;
  }>();
  const selecting = new Set<number>();
  const configKey = () => {
    const config = loadConfig();
    return JSON.stringify([config.data.data_dir, config.data.manifest_language, getDesktopManifestStatus().version]);
  };
  const remove = (id: number) => {
    sessions.get(id)?.dispose();
    sessions.delete(id);
  };

  ipcMain.handle("community:knowledge:import:select", async ({ sender }) => {
    if (selecting.has(sender.id)) throw new Error("文件选择窗口已打开。");
    const previous = sessions.get(sender.id);
    if (previous && !previous.session.cancel()) throw new Error("正在保存推荐，请稍候。");
    remove(sender.id);
    selecting.add(sender.id);
    try {
      const config = loadConfig();
      const result = await dialog.showOpenDialog({
        title: "选择人工推荐表格", defaultPath: join(config.data.data_dir, "imports"),
        properties: ["openFile"], filters: [{ name: "推荐表格", extensions: ["csv", "xlsx", "xlsm", "xls"] }]
      });
      const path = result.filePaths[0];
      if (result.canceled || !path || sender.isDestroyed()) return null;
      const token = randomUUID();
      const session = new RecommendationImportSession({
        path, data_dir: config.data.data_dir, manifest_language: config.data.manifest_language,
        manifest_version: getDesktopManifestStatus().version?.trim() ?? ""
      }, (progress) => {
        if (!sender.isDestroyed()) sender.send("community:knowledge:import:progress", progress);
      });
      const destroyed = () => { session.cancel(); remove(sender.id); };
      sender.once("destroyed", destroyed);
      sessions.set(sender.id, { token, session, configKey: configKey(), dispose: () => sender.removeListener("destroyed", destroyed) });
      try {
        const preview = await session.preview;
        if (!preview.importable_recommendation_count) {
          session.cancel();
          remove(sender.id);
          return preview;
        }
        return { ...preview, token };
      } catch (error) {
        if (sessions.get(sender.id)?.session === session) remove(sender.id);
        throw error;
      }
    } finally {
      selecting.delete(sender.id);
    }
  });

  ipcMain.handle("community:knowledge:import:confirm", async ({ sender }, token: string, target: RecommendationImportTarget) => {
    const pending = sessions.get(sender.id);
    if (!pending || pending.token !== token) throw new Error("推荐预览已失效，请重新选择文件。");
    if (pending.confirming) throw new Error("正在导入，请稍候。");
    if (pending.configKey !== configKey()) {
      if (pending.session.cancel()) remove(sender.id);
      throw new Error("资料库或数据目录已变化，请重新选择文件。");
    }
    pending.confirming = true;
    try {
      return await pending.session.confirm({ name: target?.name ?? "", mode: target?.mode ?? "create" });
    } finally {
      if (sessions.get(sender.id) === pending) remove(sender.id);
    }
  });

  ipcMain.handle("community:knowledge:import:cancel", ({ sender }) => {
    const pending = sessions.get(sender.id);
    if (!pending) return true;
    const cancelled = pending.session.cancel();
    if (cancelled) remove(sender.id);
    return cancelled;
  });
}
