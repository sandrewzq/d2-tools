import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { dialog, ipcMain } from "electron";
import type { DefinitionComponentData, DefinitionRecord } from "@d2-tools/core/manifest/definitions";
import {
  type SavePersonalWeaponKnowledgeInput,
  type SourceOptions,
  type VaultCommunityMatchOptions,
  type WeaponIdentityRelation,
  type VaultItemMatchInput
} from "@d2-tools/core/community-perks";
import { loadConfig } from "@d2-tools/services/config/store";
import { createDefaultCommunityPerkService } from "@d2-tools/services/community/perkRecommendation";
import {
  buildWeaponNameEntries,
  collectCsvRecommendationItemHashes,
  collectWeaponRecommendationDefinitionHashes,
  collectWeaponRecommendationEnglishNames,
  collectWeaponRecommendationPlugHashes,
  collectWeaponRecommendationPlugSetHashes,
  createWeaponRecommendationCsvTemplate,
  createWeaponRecommendationEnglishCsvTemplate,
  exportWeaponRecommendationPlayerCsv,
  importWeaponRecommendationCsv,
  previewWeaponRecommendationCsv,
  readWeaponRecommendationKnowledgeStatus,
  type WeaponKnowledgeImportPreview,
  type WeaponKnowledgeValidationContext
} from "@d2-tools/services/community/weaponRecommendationKnowledge";
import { readRecommendationTableText } from "@d2-tools/services/community/recommendationTableFile";
import {
  clearImportedRecommendationRules,
  listRecommendationManagedRules,
  readRecommendationManagementSnapshot,
  recommendationSourceItemHashes,
  recommendationSourceItemHashesBySource,
  updateRecommendationManagedRule,
  updateRecommendationManagedSource,
  type RecommendationManagedRule,
  type RecommendationManagementSnapshot
} from "@d2-tools/services/community/recommendationManagement";
import {
  hasActiveRecommendationRules,
  recommendationDocumentRevision,
  relatedRecommendationItemHashes,
  type RecommendationImportTarget
} from "@d2-tools/services/community/recommendationDocumentStore";
import {
  advanceVaultRecommendationMatchCacheRevision,
  buildVaultRecommendationMatchRevision
} from "@d2-tools/services/community/vaultRecommendationMatchCache";
import {
  deletePersonalWeaponKnowledge,
  loadPersonalWeaponKnowledge,
  savePersonalWeaponKnowledge,
  setPersonalWeaponKnowledgeEnabled
} from "@d2-tools/services/community/personalWeaponKnowledge";
import { startBackgroundTask } from "../backgroundTasks.js";
import { getDefinitions, getGameDataCatalog } from "../runtime/gameDataRuntime.js";
import { loadDimWishlist } from "@d2-tools/services/analysis/wishlistStore";
import { loadManifestVersionCheckCache } from "@d2-tools/services/manifest/cache";
import { loadOAuthToken } from "@d2-tools/services/oauth/tokenStore";
import { classifyCommunityIpcError, encodeDesktopIpcFailure } from "../../contracts/errors.js";
import { getDesktopManifestStatus } from "./manifest.js";
import { getAccountSnapshot } from "../runtime/accountSession.js";
import { countAccountItemHashes, type AccountItemHashCounts } from "@d2-tools/core/account/summary";
import { removeDimWishlistEquipmentTargets } from "./targets.js";
import { matchVaultRecommendationsInWorker } from "../runtime/recommendationRuntime.js";

const pendingKnowledgeImports = new Map<string, { path: string; fingerprint: string }>();
let recommendationManagementInFlight: Promise<RecommendationManagementSnapshot> | null = null;

export function registerCommunityIpcHandlers(): void {
  ipcMain.handle("community:knowledge:template:export", async (_event, language: "zh" | "en" = "zh") => {
    const config = loadConfig();
    const isEnglish = language === "en";
    const result = await dialog.showSaveDialog({
      title: isEnglish ? "导出英文武器推荐模板" : "导出中文武器推荐模板",
      defaultPath: join(config.data.data_dir, isEnglish ? "weapon-recommendation-template-en.csv" : "武器推荐模板.csv"),
      filters: [{ name: "CSV 文件", extensions: ["csv"] }]
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true, message: "已取消导出推荐模板。" };
    }
    await writeFile(
      result.filePath,
      isEnglish ? createWeaponRecommendationEnglishCsvTemplate() : createWeaponRecommendationCsvTemplate(),
      "utf8"
    );
    return {
      canceled: false,
      file_path: result.filePath,
      message: isEnglish
        ? "英文推荐模板已导出。表头自带填写说明，表头下面那行是示例数据（导入时自动跳过）：照它把 Weapon、Perk、Rating 等列改成你自己的推荐，官方身份与资料库字段由应用自动补齐。"
        : "中文推荐模板已导出。表头自带填写说明，表头下面那行是示例数据（导入时自动跳过）：照它把武器、Perk、评级等列改成你自己的推荐，官方身份与资料库字段由应用自动补齐。"
    };
  });

  ipcMain.handle("community:knowledge:player:export", async () => {
    const config = loadConfig();
    const result = await dialog.showSaveDialog({
      title: "导出可编辑武器推荐",
      defaultPath: join(config.data.data_dir, "武器推荐-可编辑.csv"),
      filters: [{ name: "CSV 文件", extensions: ["csv"] }]
    });
    if (result.canceled || !result.filePath) {
      return { canceled: true, message: "已取消导出可编辑武器推荐。" };
    }
    // 库里存的是 Hash，导出要写回官方名：先按规则声明的武器身份取定义池，
    // 再让导出函数反解名字（DD4）。不新开网络路径。
    const definitions = await loadCommunityDefinitions(
      collectCsvRecommendationItemHashes(config.data.data_dir)
    );
    await writeFile(
      result.filePath,
      exportWeaponRecommendationPlayerCsv(config.data.data_dir, definitions.items),
      "utf8"
    );
    return {
      canceled: false,
      file_path: result.filePath,
      message: "可编辑武器推荐已导出。系统字段未包含在文件中，重新导入时会自动补齐。"
    };
  });

  ipcMain.handle("community:knowledge:import:select", async () => {
    const config = loadConfig();
    const result = await dialog.showOpenDialog({
      title: "选择人工推荐表格",
      defaultPath: join(config.data.data_dir, "imports"),
      properties: ["openFile"],
      // 旧版二进制 .xls 也列出来：让它可选中、然后给出「请另存为 .xlsx 或 CSV」的明确提示，
      // 比在选择器里选不到、用户自己猜要友好。
      filters: [{ name: "推荐表格", extensions: ["csv", "xlsx", "xlsm", "xls"] }]
    });
    const path = result.filePaths[0];
    if (result.canceled || !path) return null;

    const strictPreview = await previewStrictWeaponKnowledgeCsv(path);
    const preview = strictPreview.preview;
    pendingKnowledgeImports.clear();
    if (preview.importable_recommendation_count === 0) return preview;
    const token = randomUUID();
    pendingKnowledgeImports.set(token, { path, fingerprint: preview.fingerprint });
    return { ...preview, token };
  });

  ipcMain.handle("community:knowledge:import:confirm", async (_event, token: string, target: RecommendationImportTarget) => {
    const pending = pendingKnowledgeImports.get(token);
    if (!pending) throw new Error("武器推荐 CSV 预览已失效，请重新选择文件。");
    pendingKnowledgeImports.delete(token);
    const verified = await previewStrictWeaponKnowledgeCsv(pending.path);
    const verifiedPreview = verified.preview;
    if (verifiedPreview.fingerprint !== pending.fingerprint) {
      throw new Error("武器推荐 CSV 在预览后发生了变化，请重新选择文件。");
    }
    if (verifiedPreview.importable_recommendation_count === 0) {
      throw new Error(formatKnowledgeImportIssue(verifiedPreview));
    }
    const config = loadConfig();
    // 导入身份 = 用户给的名字 + 新建 / 覆盖；没有默认名字，也不存在默认路径。
    const result = await importWeaponRecommendationCsv(
      config.data.data_dir,
      pending.path,
      pending.fingerprint,
      verified.validation,
      { name: target?.name ?? "", mode: target?.mode ?? "create" }
    );
    return result;
  });

  ipcMain.handle("community:knowledge:status:get", () => {
    const config = loadConfig();
    return readWeaponRecommendationKnowledgeStatus(config.data.data_dir);
  });

  ipcMain.handle("community:management:get", async () => {
    const config = loadConfig();
    if (recommendationManagementInFlight) return recommendationManagementInFlight;
    const request = enrichRecommendationManagement(
      config.data.data_dir,
      readRecommendationManagementSnapshot(config.data.data_dir)
    );
    recommendationManagementInFlight = request;
    try {
      return await request;
    } finally {
      if (recommendationManagementInFlight === request) recommendationManagementInFlight = null;
    }
  });

  ipcMain.handle("community:management:rules", async (_event, sourceKey: string, query?: string) => {
    const config = loadConfig();
    return hydrateRecommendationManagedRules(
      listRecommendationManagedRules(config.data.data_dir, sourceKey, query)
    );
  });

  ipcMain.handle("community:management:source:set", async (_event, sourceKey: string, state: "active" | "disabled" | "removed") => {
    const config = loadConfig();
    const affectedWeaponHashes = recommendationSourceItemHashes(config.data.data_dir, sourceKey);
    const snapshot = updateRecommendationManagedSource(config.data.data_dir, sourceKey, state);
    // 只有导入文档托管的来源会派生出愿望单装备目标；由服务判断，这里不认来源键的写法。
    if (snapshot.stored_source_changed && state === "removed") {
      await removeDimWishlistEquipmentTargets(config.data.data_dir).catch(() => undefined);
    }
    advanceRecommendationMatchCacheRevision(config.data.data_dir, affectedWeaponHashes);
    return enrichRecommendationManagement(config.data.data_dir, {
      ...snapshot,
      affected_weapon_hashes: affectedWeaponHashes
    });
  });

  ipcMain.handle("community:management:rule:set", async (_event, input: {
    source_key: string;
    rule_stable_id: string;
    state: "active" | "removed";
    reason?: string;
    source_revision?: string;
  }) => {
    const config = loadConfig();
    const affectedWeaponHashes = listRecommendationManagedRules(config.data.data_dir, input.source_key)
      .find((rule) => rule.rule_stable_id === input.rule_stable_id)
      ?.weapon_hashes ?? [];
    const snapshot = updateRecommendationManagedRule(config.data.data_dir, input);
    advanceRecommendationMatchCacheRevision(config.data.data_dir, affectedWeaponHashes);
    return enrichRecommendationManagement(config.data.data_dir, {
      ...snapshot,
      affected_weapon_hashes: affectedWeaponHashes
    });
  });

  ipcMain.handle("community:management:rule-imports:clear", async () => {
    const config = loadConfig();
    // 受影响范围取全部来源的声明武器——超集只让缓存多失效一点，不影响正确性。
    const affectedWeaponHashes = uniqueHashes([
      ...recommendationSourceItemHashesBySource(
        config.data.data_dir,
        readRecommendationManagementSnapshot(config.data.data_dir).sources.map((source) => source.source_key)
      ).values()
    ].flatMap((hashes) => hashes));
    const snapshot = clearImportedRecommendationRules(config.data.data_dir);
    advanceRecommendationMatchCacheRevision(config.data.data_dir, affectedWeaponHashes);
    return enrichRecommendationManagement(config.data.data_dir, {
      ...snapshot,
      affected_weapon_hashes: affectedWeaponHashes
    });
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
    const service = createDefaultCommunityPerkService(config);
    const itemHash = Number(item_hash);
    // 定义预取的范围：这把武器命中了的规则还声明了哪些武器。身份是导入期算好的，
    // 读取期只问存储一次，不做名称 / 发布组 / 变体的重新推导。
    const relatedItemHashes = relatedRecommendationItemHashes(config.data.data_dir, [itemHash]);
    const dimPerkHashes = dimRulePerkHashes(config.data.data_dir, [itemHash]);
    const definitions = await loadCommunityDefinitions(
      uniqueHashes([itemHash, ...relatedItemHashes]),
      dimPerkHashes
    );

    const merged: SourceOptions = {
      manifest_version: getDesktopManifestStatus().version,
      itemDefinitions: { ...definitions.items, ...options?.itemDefinitions },
      plugSetDefinitions: { ...definitions.plugSets, ...options?.plugSetDefinitions },
      englishItemDefinitions: options?.englishItemDefinitions,
      englishPlugSetDefinitions: options?.englishPlugSetDefinitions,
      item_name: options?.item_name
    };

    return service.getRecommendationsWithAllSources(itemHash, merged);
  });

  ipcMain.handle("community:vault:match", async (
    _event,
    items: VaultItemMatchInput[],
    options?: VaultCommunityMatchOptions
  ) => {
    return encodeDesktopIpcFailure(() => {
      const result = matchVaultCommunityItems(items, options);
      if (options?.include_evidence === false) {
        startBackgroundTask({
          type: "community-analysis",
          title: "分析仓库推荐",
          message: "正在匹配内置推荐知识库、DIM Wishlist 和自定义推荐规则。",
          run: async () => {
            await result;
          }
        });
      }
      return result;
    }, classifyCommunityIpcError);
  });

  ipcMain.handle("community:vault:evidence:get", async (_event, item: VaultItemMatchInput) => {
    return encodeDesktopIpcFailure(async () => {
      const result = await matchVaultCommunityItems([item]);
      return result.matches[0] ?? null;
    }, classifyCommunityIpcError);
  });

}

async function previewStrictWeaponKnowledgeCsv(path: string): Promise<{
  preview: WeaponKnowledgeImportPreview;
  validation: WeaponKnowledgeValidationContext;
}> {
  const manifestVersion = getDesktopManifestStatus().version?.trim() ?? "";
  if (!manifestVersion) throw new Error("资料库尚未准备完成，不能严格校验武器推荐 CSV。");
  // 读表 + 解析整段带上文件名：表头不受支持、格式不对时，用户要能一眼看出是哪个文件（Bug #89）。
  const csvText = withTableFileName(path, () => readRecommendationTableText(path));
  // 定义池 = 文件里写了 ID 的 + 只写名字的那些对应的全部官方版本（见 `collectWeaponRecommendationDefinitionHashes`）。
  const declaredHashes = await withTableFileNameAsync(path, () => (
    collectWeaponRecommendationDefinitionHashes(csvText, getGameDataCatalog())
  ));
  // S3′：身份关系按武器家族取。展开出来的版本也必须在定义池里——校验期的逐 hash 自检、
  // 落库期的候选解析、读取期的展示都读这一份池子，少一层就会把装得上的版本判成装不上。
  const relations = await loadWeaponIdentityRelations(declaredHashes);
  const definitionHashes = uniqueHashes([
    ...declaredHashes,
    ...relations.map((relation) => relation.item_hash)
  ]);
  const itemDefinitions = await getDefinitions(
    "DestinyInventoryItemDefinition",
    definitionHashes,
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
  const semanticDefinitions = {
    item_definitions: itemDefinitions,
    plug_set_definitions: plugSetDefinitions,
    plug_definitions: plugDefinitions,
    english_item_definitions: await loadEnglishItemDefinitions(csvText)
  };
  // 预览与落库读同一份身份上下文：名称表由**已装的武器定义**现建，与 `csvRecommendationInstances`
  // 里的 `recommendationIdentityExpansion` 完全同源。英文名池一并传进去：名称表里有了英文名键，
  // 「有英文名就按英文名匹配」才成立（③）。
  const identity = {
    relations,
    nameEntries: buildWeaponNameEntries(itemDefinitions, semanticDefinitions.english_item_definitions)
  };
  return {
    preview: withTableFileName(path, () => (
      previewWeaponRecommendationCsv(csvText, path, semanticDefinitions, identity)
    )),
    validation: {
      manifest_version: manifestVersion,
      semantic_definitions: semanticDefinitions,
      // S3′：导入期要把每行的武器身份展开成完整 hash 集，需要资料库里的身份关系。
      // 取的是整个武器家族（含同发布组的专家版 / 失时版）。
      weaponIdentityRelations: relations
    }
  };
}

/**
 * 英文名池：资料库不以英文存整份物品定义，只能拿文件里写过的英文名去**英文搜索索引**反查
 * （`search-en.sqlite`；`getItemHashesByExactName` 已并集中英两套索引），再拼一份只带名字的定义池。
 *
 * 只装文件里出现过的名字：③ 的判据只问「这个英文名指向哪些官方装备」，不需要英文清单。
 * 文件里一个英文名都没有时返回 `undefined`——英文判据整体不启用，`resolveOfficialWeaponDefinitions`
 * 退回中文名一条路，与从前一致（见 `WeaponKnowledgeSemanticDefinitions.english_item_definitions`）。
 */
async function loadEnglishItemDefinitions(
  csvText: string
): Promise<DefinitionComponentData | undefined> {
  const names = collectWeaponRecommendationEnglishNames(csvText);
  if (!names.length) return undefined;
  const catalog = getGameDataCatalog();
  const definitions: DefinitionComponentData = {};
  for (const name of names) {
    const hashes = await catalog.getItemHashesByExactName({ names: [name] });
    for (const hash of hashes) {
      const key = String(hash);
      // 一个 hash 只记一次，先写进来的名字留着：池子只用来核对行里的英文名，多记名字没有意义。
      if (definitions[key]) continue;
      definitions[key] = { hash, displayProperties: { name } };
    }
  }
  return definitions;
}

/**
 * 读表失败的文案带上文件名：从「表头不受支持」这类错误里看不出是哪个文件出的问题，
 * 用户手上可能同时有几份导出的表格（Bug #89）。
 */
function withTableFileName<T>(path: string, run: () => T): T {
  try {
    return run();
  } catch (error) {
    throw tableFileError(path, error);
  }
}

/** 同上，给定义池装载这类**异步**步骤用：解析表头同样发生在里面，解析失败也要带文件名。 */
async function withTableFileNameAsync<T>(path: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw tableFileError(path, error);
  }
}

function tableFileError(path: string, error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  return new Error(`文件「${basename(path)}」：${message}`);
}

function formatKnowledgeImportIssue(preview: WeaponKnowledgeImportPreview): string {
  const issue = preview.blocking_issues[0];
  if (!issue) return "武器推荐 CSV 存在无法通过官方资料校验的内容。";
  return `武器推荐 CSV 没有可导入的有效记录。第 ${issue.row_number} 行“${issue.weapon_name}”的${issue.field}“${issue.value}”：${issue.message}`;
}

async function matchVaultCommunityItems(
  items: VaultItemMatchInput[],
  options: VaultCommunityMatchOptions = {}
) {
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
  // 可用性只问一件事：有没有可参与判定的事实。是哪份文件、哪种格式导入的，与「能不能用」无关。
  // 严格校验发生在导入期，过了才写得进来，所以这里不再有「已导入但未复核」这种中间状态。
  const issues = hasActiveRecommendationRules(config.data.data_dir) ? [] : [{
    code: "recommendation_unavailable" as const,
    severity: "warning" as const,
    message: "尚未导入任何推荐来源；仍会继续核对本机愿望单与自定义推荐。"
  }];
  const result = await matchVaultRecommendationsInWorker({
    data_dir: config.data.data_dir,
    account_key: loadOAuthToken(config.data.data_dir)?.membership_id?.trim() ?? "",
    manifest_version: manifestStatus.version ?? "",
    manifest_language: manifestStatus.language ?? config.data.manifest_language,
    recommendation_revision: safeRecommendationDocumentRevision(config.data.data_dir),
    items,
    include_evidence: options.include_evidence !== false
  });
  return { ...result, issues };
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

/**
 * 导入期才有身份推导：人工 CSV 与愿望单文本两条导入链都用它把武器身份展开成 hash 集。
 * 读取期（`community:recommendations:get` / 仓库匹配）不再调用——身份已经在导入期定死。
 */
export async function loadWeaponIdentityRelations(itemHashes: number[]): Promise<WeaponIdentityRelation[]> {
  if (!itemHashes.length) return [];
  try {
    return await getGameDataCatalog().getWeaponIdentityRelations({
      item_hashes: uniqueHashes(itemHashes)
    });
  } catch {
    // 旧索引或关系读取异常时保留精确 Hash 行为，不退回模糊名称合并。
    return [];
  }
}

/**
 * 这把武器命中了的愿望单规则各自写了哪些插件 hash——给定义池补的一批。
 *
 * 命中判定走规则的**覆盖集**（`item_hashes`，导入期家族全展开的产物，缺省时按 `[item_hash]` 理解），
 * 与 `dimWishlistSource` 建「武器 → 规则」索引时同一套判据。只按 `rule.item_hash` 过滤的话，
 * 「规则写在同族另一把枪上、展开到这把枪」的插件就进不了定义池，规则里写到、而这把枪自己的插槽池里
 * 没有的插件会只剩 hash，没有名字和图标。
 *
 * 与 `recommendationWorker.ts` 的同名函数一致；两份各自在自己的模块图里，改动要成对。
 */
function dimRulePerkHashes(dataDir: string, itemHashes: number[]): number[] {
  try {
    const wanted = new Set(itemHashes);
    return [...new Set((loadDimWishlist(dataDir)?.rules ?? [])
      .filter((rule) => (rule.item_hashes?.length ? rule.item_hashes : [rule.item_hash])
        .some((hash) => wanted.has(hash)))
      .flatMap((rule) => rule.perk_hashes))];
  } catch {
    return [];
  }
}

function numberValue(value: unknown): number[] {
  return typeof value === "number" && Number.isFinite(value) ? [value] : [];
}

function uniqueHashes(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value >= 0 && value <= 4_294_967_295))];
}

export function advanceRecommendationMatchCacheRevision(dataDir: string, affectedWeaponHashes: readonly number[]): void {
  try {
    advanceVaultRecommendationMatchCacheRevision(
      dataDir,
      buildVaultRecommendationMatchRevision(dataDir),
      affectedWeaponHashes
    );
  } catch {
    // 派生缓存失效失败不影响来源操作；下一次核对会按 revision 自动重建。
  }
}

function safeRecommendationDocumentRevision(dataDir: string): string {
  try {
    return recommendationDocumentRevision(dataDir);
  } catch {
    // 推荐库暂不可读时给空键：worker 会自己再算一次，算不出来就按当前值核对。
    return "";
  }
}

async function enrichRecommendationManagement(
  dataDir: string,
  snapshot: RecommendationManagementSnapshot
): Promise<RecommendationManagementSnapshot> {
  const counts = await loadCachedAccountItemCounts();
  const sourceHashes = recommendationSourceItemHashesBySource(
    dataDir,
    snapshot.sources.map((source) => source.source_key)
  );
  return {
    ...snapshot,
    removed_rules: await hydrateRecommendationManagedRules(snapshot.removed_rules, counts.account),
    sources: snapshot.sources.map((source) => {
      // 两个范围一次算出来、一起落到同一行上：界面上它们是并排的两句话，
      // 分开算迟早会有一处漏加角色侧，而对不上的那一天只会被读成程序算错了。
      let affectedInstanceCount = 0;
      let vaultInstanceCount = 0;
      try {
        for (const itemHash of sourceHashes.get(source.source_key) ?? []) {
          affectedInstanceCount += counts.account.get(itemHash) ?? 0;
          vaultInstanceCount += counts.vault.get(itemHash) ?? 0;
        }
      } catch {
        // 数据源已经移除或暂时不可读时按 0 展示，不阻断其他来源。
      }
      return {
        ...source,
        affected_instance_count: affectedInstanceCount,
        vault_instance_count: vaultInstanceCount
      };
    })
  };
}

async function hydrateRecommendationManagedRules(
  rules: RecommendationManagedRule[],
  accountCountByHash?: ReadonlyMap<number, number>
): Promise<RecommendationManagedRule[]> {
  const instanceCounts = accountCountByHash ?? (await loadCachedAccountItemCounts()).account;
  const hashes = new Set<number>();
  for (const rule of rules) {
    rule.weapon_hashes.forEach((hash) => hashes.add(hash));
    for (const requirement of rule.requirements) {
      for (const name of requirement.names) {
        const hash = exactUnsignedHash(name);
        if (hash !== null) hashes.add(hash);
      }
    }
  }
  if (!hashes.size) {
    return rules.map((rule) => ({ ...rule, affected_instance_count: 0 }));
  }

  let definitions: DefinitionComponentData = {};
  try {
    definitions = await getDefinitions(
      "DestinyInventoryItemDefinition",
      hashes,
      { projection: "community-match" }
    );
  } catch {
    // Definition 读取失败时仍返回规则与影响数量，名称保留原始 Hash 文案。
  }
  const displayName = (hash: number): string => (
    (definitions[String(hash)] as DefinitionRecord | undefined)?.displayProperties?.name?.trim()
    || String(hash)
  );
  return rules.map((rule) => ({
    ...rule,
    affected_instance_count: rule.weapon_hashes.reduce((count, hash) => count + (instanceCounts.get(hash) ?? 0), 0),
    weapon_name: rule.weapon_hashes[0] !== undefined
      ? displayName(rule.weapon_hashes[0])
      : rule.weapon_name,
    requirements: rule.requirements.map((requirement) => ({
      ...requirement,
      names: requirement.names.map((name) => {
        const hash = exactUnsignedHash(name);
        return hash === null ? name : displayName(hash);
      })
    }))
  }));
}

async function loadCachedAccountItemCounts(): Promise<AccountItemHashCounts> {
  const empty: AccountItemHashCounts = { vault: new Map(), account: new Map() };
  try {
    const account = await getAccountSnapshot("cached");
    // 两个范围由同一次遍历一起算出来（全账号 = 仓库 + 角色侧），不在这里各数一遍。
    return countAccountItemHashes(account);
  } catch {
    // 来源管理仍可离线使用；账号影响数量只是辅助信息。
    return empty;
  }
}

function exactUnsignedHash(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const hash = Number(value);
  return Number.isInteger(hash) && hash >= 0 && hash <= 0xffff_ffff ? hash : null;
}
