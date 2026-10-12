import { parentPort, workerData } from "node:worker_threads";
import { basename } from "node:path";
import type { DefinitionComponentData } from "@d2-tools/core/manifest/definitions";
import type { RecommendationImportProgress } from "@d2-tools/core/community-perks";
import {
  buildWeaponNameEntries, collectWeaponRecommendationDefinitionHashes,
  collectWeaponRecommendationEnglishNames, collectWeaponRecommendationPlugHashes,
  collectWeaponRecommendationPlugSetHashes, previewWeaponRecommendationCsv,
  importWeaponRecommendationCsv,
  type WeaponKnowledgeImportPreview, type WeaponKnowledgeValidationContext
} from "@d2-tools/services/community/weaponRecommendationKnowledge";
import { readRecommendationTableText } from "@d2-tools/services/community/recommendationTableFile";
import { createSqliteDefinitionReader, createCompositeDefinitionReader, createJsonDefinitionReader,
  createSqliteGameDataCatalog } from "@d2-tools/services/gameData/sqlite";
import { loadActiveSqliteManifest } from "@d2-tools/services/manifest/lifecycle";
import type { RecommendationImportTarget } from "@d2-tools/services/community/recommendationDocumentStore";
import type { RecommendationImportWorkerInput } from "../runtime/recommendationImportRuntime.js";

const input = workerData as RecommendationImportWorkerInput & { cancellation: SharedArrayBuffer };
const cancellation = new Int32Array(input.cancellation);
const activation = loadActiveSqliteManifest(input.data_dir, input.manifest_language);
if (!activation || activation.manifestVersion !== input.manifest_version) {
  throw new Error("资料库尚未准备完成或版本已变化，请重新选择文件。");
}
const sqliteReader = createSqliteDefinitionReader({ databasePath: activation.databasePath, cacheSize: 384 });
const reader = activation.supplementDataDir && activation.supplementComponents.length
  ? createCompositeDefinitionReader(sqliteReader, createJsonDefinitionReader({
      getDataDir: () => activation.supplementDataDir!, language: input.manifest_language
    })) : sqliteReader;
const catalog = createSqliteGameDataCatalog({
  databasePath: activation.databasePath, searchIndexPath: activation.searchIndexPath,
  secondarySearchIndexPaths: activation.englishSearchIndexPath ? [activation.englishSearchIndexPath] : [],
  manifestVersion: activation.manifestVersion, language: input.manifest_language, cacheSize: 2000,
  ...(activation.supplementDataDir && activation.supplementComponents.length ? {
    jsonSupplement: { getDataDir: () => activation.supplementDataDir!, language: input.manifest_language }
  } : {})
});

function progress(phase: RecommendationImportProgress["phase"]): void {
  parentPort?.postMessage({ progress: { phase, cancellable: Atomics.load(cancellation, 0) === 0
    && !["saving", "complete", "failed", "cancelled"].includes(phase) } });
}
function close(): void { catalog.close(); reader.close(); parentPort?.close(); }
function failed(error: unknown): void {
  progress("failed");
  parentPort?.postMessage({ error: tableFileError(input.path, error).message });
  close();
}

progress("reading");
void previewStrictWeaponKnowledgeCsv(input.path).then((pending) => {
  progress("preview");
  parentPort?.postMessage({ preview: pending.preview });
  parentPort?.once("message", (target: RecommendationImportTarget) => {
    void (async () => {
      const current = loadActiveSqliteManifest(input.data_dir, input.manifest_language);
      if (current?.activatedAt !== activation.activatedAt || current?.manifestVersion !== input.manifest_version) {
        throw new Error("资料库在预览后已更新，请重新选择文件。");
      }
      progress("preparing");
      const result = await importWeaponRecommendationCsv(
        input.data_dir, input.path, pending.preview.fingerprint, pending.validation, target,
        undefined, { preview: pending.preview, text: readRecommendationTableText(input.path) },
        () => {
          const latest = loadActiveSqliteManifest(input.data_dir, input.manifest_language);
          if (latest?.activatedAt !== activation.activatedAt || latest?.manifestVersion !== input.manifest_version) {
            throw new Error("资料库在准备导入时已更新，请重新选择文件。");
          }
          // 取消与开始事务只有一个能成功；进入写入阶段后禁止终止 Worker。
          if (Atomics.compareExchange(cancellation, 0, 0, 2) !== 0) throw new Error("已取消导入，当前数据未更改。");
          progress("saving");
        }
      );
      Atomics.store(cancellation, 0, 3);
      progress("complete");
      parentPort?.postMessage({ result });
      close();
    })().catch(failed);
  });
}).catch(failed);

function uniqueHashes(values: number[]): number[] { return [...new Set(values)]; }

async function previewStrictWeaponKnowledgeCsv(path: string): Promise<{
  preview: WeaponKnowledgeImportPreview;
  validation: WeaponKnowledgeValidationContext;
}> {
  const manifestVersion = input.manifest_version;
  if (!manifestVersion) throw new Error("资料库尚未准备完成，不能严格校验武器推荐 CSV。");
  // 读表 + 解析整段带上文件名：表头不受支持、格式不对时，用户要能一眼看出是哪个文件（Bug #89）。
  const csvText = withTableFileName(path, () => readRecommendationTableText(path));
  // 定义池 = 文件里写了 ID 的 + 只写名字的那些对应的全部官方版本（见 `collectWeaponRecommendationDefinitionHashes`）。
  progress("definitions");
  const declaredHashes = await withTableFileNameAsync(path, () => (
    collectWeaponRecommendationDefinitionHashes(csvText, catalog)
  ));
  // S3′：身份关系按武器家族取。展开出来的版本也必须在定义池里——校验期的逐 hash 自检、
  // 落库期的候选解析、读取期的展示都读这一份池子，少一层就会把装得上的版本判成装不上。
  const relations = await catalog.getWeaponIdentityRelations({ item_hashes: declaredHashes });
  const definitionHashes = uniqueHashes([
    ...declaredHashes,
    ...relations.map((relation) => relation.item_hash)
  ]);
  const itemDefinitions = reader.getMany(
    "DestinyInventoryItemDefinition",
    definitionHashes
  );
  const plugSetHashes = collectWeaponRecommendationPlugSetHashes(itemDefinitions);
  const plugSetDefinitions = reader.getMany(
    "DestinyPlugSetDefinition",
    plugSetHashes
  );
  const plugHashes = collectWeaponRecommendationPlugHashes(itemDefinitions, plugSetDefinitions);
  const plugDefinitions = reader.getMany(
    "DestinyInventoryItemDefinition",
    plugHashes
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
  progress("validating");
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

