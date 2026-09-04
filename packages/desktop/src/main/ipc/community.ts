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
  type VaultCommunityMatchResult,
  type VaultItemInstanceMatchInfo,
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
  collectWeaponRecommendationItemHashes,
  collectWeaponRecommendationPlugHashes,
  collectWeaponRecommendationPlugSetHashes,
  createWeaponRecommendationCsvTemplate,
  importWeaponRecommendationCsv,
  previewWeaponRecommendationCsv,
  readWeaponRecommendationKnowledgeStatus,
  syncWeaponRecommendationKnowledge,
  type WeaponKnowledgeImportPreview
} from "@d2-tools/services/community/weaponRecommendationKnowledge";
import {
  buildVaultRecommendationMatchRevision,
  createVaultWeaponRollFingerprint,
  partitionVaultRecommendationMatchCache,
  saveVaultRecommendationMatchCache,
  type VaultRecommendationMatchCacheContext,
  type VaultRecommendationMatchCachePartition
} from "@d2-tools/services/community/vaultRecommendationMatchCache";
import {
  deletePersonalWeaponKnowledge,
  loadPersonalWeaponKnowledge,
  savePersonalWeaponKnowledge,
  setPersonalWeaponKnowledgeEnabled
} from "@d2-tools/services/community/personalWeaponKnowledge";
import { startBackgroundTask } from "../backgroundTasks.js";
import { getDefinitions } from "../runtime/gameDataRuntime.js";
import { loadDimWishlist } from "@d2-tools/services/analysis/wishlistStore";
import { loadManifestVersionCheckCache } from "@d2-tools/services/manifest/cache";
import { classifyCommunityIpcError, encodeDesktopIpcFailure } from "../../contracts/errors.js";
import { getDesktopManifestStatus } from "./manifest.js";

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

    const preview = await previewStrictWeaponKnowledgeCsv(path);
    pendingKnowledgeImports.clear();
    if (preview.blocking_issue_count > 0) return preview;
    const token = randomUUID();
    pendingKnowledgeImports.set(token, { path, fingerprint: preview.fingerprint });
    return { ...preview, token };
  });

  ipcMain.handle("community:knowledge:import:confirm", async (_event, token: string) => {
    const pending = pendingKnowledgeImports.get(token);
    if (!pending) throw new Error("武器推荐 CSV 预览已失效，请重新选择文件。");
    pendingKnowledgeImports.delete(token);
    const verifiedPreview = await previewStrictWeaponKnowledgeCsv(pending.path);
    if (verifiedPreview.fingerprint !== pending.fingerprint) {
      throw new Error("武器推荐 CSV 在预览后发生了变化，请重新选择文件。");
    }
    if (verifiedPreview.blocking_issue_count > 0) {
      throw new Error(formatKnowledgeImportIssue(verifiedPreview));
    }
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
    const dimPerkHashes = dimRulePerkHashes(config.data.data_dir, [Number(item_hash)]);
    const definitions = await loadCommunityDefinitions([Number(item_hash)], dimPerkHashes);

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
    return encodeDesktopIpcFailure(() => {
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
    }, classifyCommunityIpcError);
  });

  ipcMain.handle("community:lightgg:cache:clear", () => {
    const config = loadConfig();
    clearLightggCache(config.data.data_dir);
    return null;
  });
}

async function previewStrictWeaponKnowledgeCsv(path: string): Promise<WeaponKnowledgeImportPreview> {
  const csvText = readFileSync(path, "utf8");
  const itemHashes = collectWeaponRecommendationItemHashes(csvText);
  const itemDefinitions = await getDefinitions(
    "DestinyInventoryItemDefinition",
    itemHashes,
    { projection: "community-match" }
  );
  const plugSetHashes = collectWeaponRecommendationPlugSetHashes(itemDefinitions);
  const plugSetDefinitions = await getDefinitions(
    "DestinyPlugSetDefinition",
    plugSetHashes,
    { projection: "community-match" }
  );
  const plugHashes = collectWeaponRecommendationPlugHashes(itemDefinitions, plugSetDefinitions);
  const plugDefinitions = await getDefinitions(
    "DestinyInventoryItemDefinition",
    plugHashes,
    { projection: "community-match" }
  );
  return previewWeaponRecommendationCsv(csvText, path, {
    item_definitions: itemDefinitions,
    plug_set_definitions: plugSetDefinitions,
    plug_definitions: plugDefinitions
  });
}

function formatKnowledgeImportIssue(preview: WeaponKnowledgeImportPreview): string {
  const issue = preview.blocking_issues[0];
  if (!issue) return "武器推荐 CSV 存在无法通过官方资料校验的内容。";
  return `武器推荐 CSV 有 ${preview.blocking_issue_count} 条异常，不能导入。第 ${issue.row_number} 行“${issue.weapon_name}”的${issue.field}“${issue.value}”：${issue.message}`;
}

async function matchVaultCommunityItems(items: VaultItemMatchInput[]): Promise<VaultCommunityMatchResult> {
  const config = loadConfig();
  const manifestStatus = getDesktopManifestStatus();
  const versionCheck = loadManifestVersionCheckCache(config.data.data_dir);
  if (!manifestStatus.initialized || manifestStatus.missing_required_components?.length) {
    return {
      matches: [],
      issues: [{
        code: "manifest_unavailable",
        severity: "blocking",
        message: "资料库尚未准备完成，暂时不能精确核对武器插槽。"
      }],
      ...(manifestStatus.version ? { manifest_version: manifestStatus.version } : {})
    };
  }
  const manifestOutdated = Boolean(
    versionCheck?.needs_update
    || (versionCheck?.latest_version && versionCheck.latest_version !== manifestStatus.version)
  );
  if (manifestOutdated) {
    return {
      matches: [],
      issues: [{
        code: "manifest_outdated",
        severity: "blocking",
        message: "资料库存在新版本；更新后才能按当前官方插槽精确核对。"
      }],
      ...(manifestStatus.version ? { manifest_version: manifestStatus.version } : {})
    };
  }
  await ensureWeaponRecommendationKnowledge(config.data.data_dir);
  const knowledgeStatus = readWeaponRecommendationKnowledgeStatus(config.data.data_dir);
  const knowledgeAvailable = Boolean(
    knowledgeStatus
    && knowledgeStatus.recommendation_count > 0
    && knowledgeStatus.source_fingerprint
  );
  const issues = knowledgeAvailable ? [] : [{
    code: "recommendation_unavailable" as const,
    severity: "warning" as const,
    message: "中文推荐知识库当前不可用；仍会继续核对 DIM 和本机自定义推荐。"
  }];
  const cacheContext = buildVaultMatchCacheContext(
    config.data.data_dir,
    manifestStatus.version ?? "",
    manifestStatus.language ?? "",
    knowledgeStatus?.source_fingerprint ?? ""
  );
  const cachePartition = readVaultMatchCache(config.data.data_dir, items, cacheContext);
  const matchesByIndex = new Map(cachePartition.cached_by_index);
  if (cachePartition.missing.length) {
    // 仓库/资料库批量匹配只使用本地来源，避免触发大量 AI 查询。
    const service = createDefaultCommunityPerkService(config);
    const missingItems = cachePartition.missing.map((entry) => entry.item);
    const itemHashes = missingItems.map((item) => item.hash);
    const definitions = await loadCommunityDefinitions(
      itemHashes,
      dimRulePerkHashes(config.data.data_dir, itemHashes)
    );
    const freshMatches = await service.matchVaultItemInstances(missingItems, {
      itemDefinitions: definitions.items,
      plugSetDefinitions: definitions.plugSets
    });
    cachePartition.missing.forEach((entry, index) => {
      const match = freshMatches[index];
      if (match) matchesByIndex.set(entry.index, match);
    });
    try {
      saveVaultRecommendationMatchCache(
        config.data.data_dir,
        cachePartition.missing.flatMap((entry, index) => {
          const match = freshMatches[index];
          return match ? [{ item: entry.item, roll_fingerprint: entry.roll_fingerprint, match }] : [];
        }),
        cacheContext
      );
    } catch {
      // 派生缓存不可用时继续返回本次实时核对结果。
    }
  }
  const matches = items.flatMap((_item, index) => {
    const match = matchesByIndex.get(index);
    return match ? [match] : [];
  });
  return {
    matches,
    issues,
    ...(manifestStatus.version ? { manifest_version: manifestStatus.version } : {}),
    ...(knowledgeStatus?.source_fingerprint
      ? { recommendation_revision: knowledgeStatus.source_fingerprint }
      : {}),
    ...(knowledgeStatus ? { recommendation_schema_version: knowledgeStatus.schema_version } : {})
  };
}

function buildVaultMatchCacheContext(
  dataDir: string,
  manifestVersion: string,
  manifestLanguage: string,
  curatedRevision: string
): VaultRecommendationMatchCacheContext {
  let recommendationRevision = curatedRevision;
  try {
    recommendationRevision = buildVaultRecommendationMatchRevision(dataDir, curatedRevision);
  } catch {
    // 推荐库不可读时仍使用当前已知 revision，缓存只作为优化。
  }
  return {
    manifest_version: manifestVersion,
    manifest_language: manifestLanguage,
    recommendation_revision: recommendationRevision
  };
}

function readVaultMatchCache(
  dataDir: string,
  items: VaultItemMatchInput[],
  context: VaultRecommendationMatchCacheContext
): VaultRecommendationMatchCachePartition {
  try {
    return partitionVaultRecommendationMatchCache(dataDir, items, context);
  } catch {
    return {
      cached_by_index: new Map<number, VaultItemInstanceMatchInfo>(),
      missing: items.map((item, index) => ({
        index,
        item,
        roll_fingerprint: createVaultWeaponRollFingerprint(item)
      }))
    };
  }
}

function ensureWeaponRecommendationKnowledge(dataDir: string): Promise<unknown> {
  const csvPath = weaponKnowledgeCsvPath(dataDir);
  const key = `${resolve(dataDir)}\u0000${csvPath}`;
  const existing = weaponKnowledgeSyncs.get(key);
  if (existing) return existing;

  const pending = previewStrictWeaponKnowledgeCsv(csvPath).then((preview) => {
    if (preview.blocking_issue_count > 0) {
      throw new Error(formatKnowledgeImportIssue(preview));
    }
    return syncWeaponRecommendationKnowledge(dataDir, csvPath);
  }).catch(() => {
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

async function loadCommunityDefinitions(itemHashes: number[], extraPlugHashes: number[] = []): Promise<{
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
    [...directPlugHashes, ...plugSetItemHashes, ...extraPlugHashes],
    { projection: "community-match" }
  );

  return {
    items: { ...rootItems, ...plugItems },
    plugSets
  };
}

function dimRulePerkHashes(dataDir: string, itemHashes: number[]): number[] {
  try {
    const wanted = new Set(itemHashes);
    return [...new Set((loadDimWishlist(dataDir)?.rules ?? [])
      .filter((rule) => wanted.has(rule.item_hash))
      .flatMap((rule) => rule.perk_hashes))];
  } catch {
    return [];
  }
}

function numberValue(value: unknown): number[] {
  return typeof value === "number" && Number.isFinite(value) ? [value] : [];
}
