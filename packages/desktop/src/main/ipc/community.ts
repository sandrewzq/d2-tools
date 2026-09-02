import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { app, dialog, ipcMain } from "electron";
import type { DefinitionComponentData, DefinitionRecord } from "@d2-tools/core/manifest/definitions";
import {
  type LocalCommunityRecommendationTable,
  type SavePersonalWeaponKnowledgeInput,
  type SourceOptions,
  type VaultItemMatchInput
} from "@d2-tools/core/community-perks";
import { loadConfig } from "@d2-tools/services/config/store";
import { clearLightggCache } from "@d2-tools/services/community/aiLightggSource";
import {
  clearLocalCommunityRecommendations,
  loadLocalCommunityRecommendations,
  saveLocalCommunityRecommendations
} from "@d2-tools/services/community/localCommunityRecommendations";
import { createDefaultCommunityPerkService } from "@d2-tools/services/community/perkRecommendation";
import {
  createWeaponRecommendationCsvTemplate,
  importWeaponRecommendationCsv,
  previewWeaponRecommendationCsv,
  readWeaponRecommendationKnowledgeStatus,
  syncWeaponRecommendationKnowledge
} from "@d2-tools/services/community/weaponRecommendationKnowledge";
import {
  deletePersonalWeaponKnowledge,
  loadPersonalWeaponKnowledge,
  savePersonalWeaponKnowledge,
  setPersonalWeaponKnowledgeEnabled
} from "@d2-tools/services/community/personalWeaponKnowledge";
import { startBackgroundTask } from "../backgroundTasks.js";
import { getDefinitions } from "../runtime/gameDataRuntime.js";

const weaponKnowledgeSyncs = new Map<string, Promise<unknown>>();
const pendingKnowledgeImports = new Map<string, { path: string; fingerprint: string }>();

export function registerCommunityIpcHandlers(): void {
  ipcMain.handle("community:knowledge:template:export", async () => {
    const config = loadConfig();
    const result = await dialog.showSaveDialog({
      title: "导出武器推荐知识库标准模板",
      defaultPath: join(config.data.data_dir, "武器推荐知识库标准模板.csv"),
      filters: [{ name: "CSV 文件", extensions: ["csv"] }]
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true, message: "已取消导出标准模板。" };
    }
    await writeFile(result.filePath, createWeaponRecommendationCsvTemplate(), "utf8");
    return {
      canceled: false,
      file_path: result.filePath,
      message: "标准模板已导出。请保持 31 列表头和顺序不变，填写后再导入。"
    };
  });

  ipcMain.handle("community:knowledge:import:select", async () => {
    const config = loadConfig();
    const result = await dialog.showOpenDialog({
      title: "选择武器推荐知识库 CSV",
      defaultPath: join(config.data.data_dir, "imports"),
      properties: ["openFile"],
      filters: [{ name: "武器推荐知识库 CSV", extensions: ["csv"] }]
    });
    const path = result.filePaths[0];
    if (result.canceled || !path) return null;

    const preview = previewWeaponRecommendationCsv(readFileSync(path, "utf8"), path);
    const token = randomUUID();
    pendingKnowledgeImports.clear();
    pendingKnowledgeImports.set(token, { path, fingerprint: preview.fingerprint });
    return { token, ...preview };
  });

  ipcMain.handle("community:knowledge:import:confirm", async (_event, token: string) => {
    const pending = pendingKnowledgeImports.get(token);
    if (!pending) throw new Error("武器推荐 CSV 预览已失效，请重新选择文件。");
    pendingKnowledgeImports.delete(token);
    const config = loadConfig();
    const result = await importWeaponRecommendationCsv(
      config.data.data_dir,
      pending.path,
      pending.fingerprint
    );
    weaponKnowledgeSyncs.clear();
    return result;
  });

  ipcMain.handle("community:knowledge:status:get", () => {
    const config = loadConfig();
    return readWeaponRecommendationKnowledgeStatus(config.data.data_dir);
  });

  ipcMain.handle("community:local:get", () => {
    const config = loadConfig();
    return loadLocalCommunityRecommendations(config.data.data_dir);
  });

  ipcMain.handle("community:local:save", (_event, table: LocalCommunityRecommendationTable) => {
    const config = loadConfig();
    return saveLocalCommunityRecommendations(config.data.data_dir, table);
  });

  ipcMain.handle("community:local:clear", () => {
    const config = loadConfig();
    clearLocalCommunityRecommendations(config.data.data_dir);
    return null;
  });

  ipcMain.handle("community:personal:get", (_event, weaponName?: string) => {
    const config = loadConfig();
    return loadPersonalWeaponKnowledge(config.data.data_dir, weaponName);
  });

  ipcMain.handle("community:personal:save", (_event, input: SavePersonalWeaponKnowledgeInput) => {
    const config = loadConfig();
    return savePersonalWeaponKnowledge(config.data.data_dir, input);
  });

  ipcMain.handle("community:personal:set-enabled", (_event, id: string, enabled: boolean) => {
    const config = loadConfig();
    return setPersonalWeaponKnowledgeEnabled(config.data.data_dir, id, enabled);
  });

  ipcMain.handle("community:personal:delete", (_event, id: string) => {
    const config = loadConfig();
    return deletePersonalWeaponKnowledge(config.data.data_dir, id);
  });

  ipcMain.handle("community:recommendations:get", async (_event, item_hash: number, options?: SourceOptions) => {
    const config = loadConfig();
    await ensureWeaponRecommendationKnowledge(config.data.data_dir);
    const service = createDefaultCommunityPerkService(config);
    const definitions = await loadCommunityDefinitions([Number(item_hash)]);

    const merged: SourceOptions = {
      itemDefinitions: options?.itemDefinitions ?? definitions.items,
      plugSetDefinitions: options?.plugSetDefinitions ?? definitions.plugSets,
      englishItemDefinitions: options?.englishItemDefinitions,
      englishPlugSetDefinitions: options?.englishPlugSetDefinitions,
      item_name: options?.item_name
    };

    return service.getRecommendationsWithAllSources(Number(item_hash), merged);
  });

  ipcMain.handle("community:vault:match", async (_event, items: VaultItemMatchInput[]) => {
    const result = matchVaultCommunityItems(items);
    startBackgroundTask({
      type: "community-analysis",
      title: "分析仓库推荐",
      message: "正在匹配内置推荐知识库、DIM Wishlist 和自定义推荐规则。",
      run: async () => {
        await result;
      }
    });

    return result;
  });

  ipcMain.handle("community:lightgg:cache:clear", () => {
    const config = loadConfig();
    clearLightggCache(config.data.data_dir);
    return null;
  });
}

async function matchVaultCommunityItems(items: VaultItemMatchInput[]) {
  const config = loadConfig();
  await ensureWeaponRecommendationKnowledge(config.data.data_dir);
  // 仓库/资料库批量匹配只使用本地来源，避免触发大量 AI 查询。
  const service = createDefaultCommunityPerkService(config);
  const definitions = await loadCommunityDefinitions(items.map((item) => item.hash));

  return service.matchVaultItemInstances(items, {
    itemDefinitions: definitions.items,
    plugSetDefinitions: definitions.plugSets
  });
}

function ensureWeaponRecommendationKnowledge(dataDir: string): Promise<unknown> {
  const csvPath = weaponKnowledgeCsvPath(dataDir);
  const key = `${resolve(dataDir)}\u0000${csvPath}`;
  const existing = weaponKnowledgeSyncs.get(key);
  if (existing) return existing;

  const pending = syncWeaponRecommendationKnowledge(dataDir, csvPath).catch(() => {
    weaponKnowledgeSyncs.delete(key);
    return null;
  });
  weaponKnowledgeSyncs.set(key, pending);
  return pending;
}

function weaponKnowledgeCsvPath(dataDir: string): string {
  const relativeParts = ["攻略", "T20-武器推荐知识库", "武器推荐.csv"];
  const configuredPath = process.env.D2_WEAPON_RECOMMENDATIONS_CSV?.trim();
  const candidates = [
    ...(configuredPath ? [resolve(configuredPath)] : []),
    join(dataDir, "imports", "weapon-recommendations.csv"),
    join(process.resourcesPath, "knowledge", "weapon-recommendations.csv"),
    resolve(app.getAppPath(), "..", "..", ...relativeParts),
    resolve(process.cwd(), "..", "..", ...relativeParts),
    resolve(process.cwd(), ...relativeParts)
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

async function loadCommunityDefinitions(itemHashes: number[]): Promise<{
  items: DefinitionComponentData;
  plugSets: DefinitionComponentData;
}> {
  const rootItems = await getDefinitions(
    "DestinyInventoryItemDefinition",
    itemHashes,
    { projection: "community-match" }
  );
  const itemRecords = Object.values(rootItems) as DefinitionRecord[];
  const socketEntries = itemRecords.flatMap((item) =>
    (item.sockets?.socketEntries ?? []) as Array<{
      singleInitialItemHash?: number;
      reusablePlugItems?: Array<{ plugItemHash?: number }>;
      reusablePlugSetHash?: number;
      randomizedPlugSetHash?: number;
    }>
  );
  const plugSetHashes = socketEntries.flatMap((entry) => [
    ...numberValue(entry.reusablePlugSetHash),
    ...numberValue(entry.randomizedPlugSetHash)
  ]);
  const plugSets = await getDefinitions(
    "DestinyPlugSetDefinition",
    plugSetHashes,
    { projection: "community-match" }
  );
  const directPlugHashes = socketEntries.flatMap((entry) => [
    ...numberValue(entry.singleInitialItemHash),
    ...(entry.reusablePlugItems ?? []).flatMap((plug) => numberValue(plug.plugItemHash))
  ]);
  const plugSetItemHashes = (Object.values(plugSets) as DefinitionRecord[]).flatMap((plugSet) =>
    ((plugSet.reusablePlugItems as Array<{ plugItemHash?: number }> | undefined) ?? [])
      .flatMap((plug) => numberValue(plug.plugItemHash))
  );
  const plugItems = await getDefinitions(
    "DestinyInventoryItemDefinition",
    [...directPlugHashes, ...plugSetItemHashes],
    { projection: "community-match" }
  );

  return {
    items: { ...rootItems, ...plugItems },
    plugSets
  };
}

function numberValue(value: unknown): number[] {
  return typeof value === "number" && Number.isFinite(value) ? [value] : [];
}
