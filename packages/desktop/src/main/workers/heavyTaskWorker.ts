import { parentPort, workerData } from "node:worker_threads";
import { fetchAccountSummary, type AccountSummary } from "@d2-tools/core/account/summary";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  initializeDefinitionComponent,
  loadDefinitionComponent,
  requiredDefinitionComponents,
  type DefinitionComponentStatus
} from "@d2-tools/services/manifest/definitions";
import {
  clearManifestCache,
  getManifestStatus,
  initializeManifestMetadata,
  loadManifestMetadataCache,
  type ManifestStatus
} from "@d2-tools/services/manifest/cache";
import { loadFreshOAuthToken } from "../ipc/authSession.js";
import type { HeavyTaskInput } from "./heavyTaskRunner.js";

void runWorkerTask(workerData as HeavyTaskInput)
  .then((result) => {
    parentPort?.postMessage({ ok: true, result });
  })
  .catch((error) => {
    parentPort?.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "后台 worker 执行失败"
    });
  });

async function runWorkerTask(input: HeavyTaskInput): Promise<ManifestStatus | AccountSummary> {
  if (input.task === "manifest-update") {
    return runManifestUpdate(input.repair);
  }
  if (input.task === "account-summary") {
    return fetchDesktopAccountSummary();
  }
  throw new Error("未知后台 worker 任务");
}

async function runManifestUpdate(repair = false): Promise<ManifestStatus> {
  const config = loadConfig();
  if (repair) {
    clearManifestCache(config.data.data_dir);
  }
  await initializeManifestMetadata({ config });
  const cache = loadManifestMetadataCache(config.data.data_dir);
  if (!cache) {
    throw new Error("Manifest metadata cache was not created");
  }

  const primaryLanguage = cache.language;
  const primaryTasks = requiredDefinitionComponents.map((component) =>
    initializeDefinitionComponent({
      dataDir: config.data.data_dir,
      language: primaryLanguage,
      metadata: cache.metadata,
      component
    })
  );

  const englishTasks: Promise<DefinitionComponentStatus | null>[] = [];
  if (primaryLanguage.toLowerCase() !== "en") {
    englishTasks.push(
      initializeDefinitionComponent({
        dataDir: config.data.data_dir,
        language: "en",
        metadata: cache.metadata,
        component: "DestinyInventoryItemDefinition",
        writeDefaultCache: false
      }).catch(() => null),
      initializeDefinitionComponent({
        dataDir: config.data.data_dir,
        language: "en",
        metadata: cache.metadata,
        component: "DestinyPlugSetDefinition",
        writeDefaultCache: false
      }).catch(() => null)
    );
  }

  await Promise.all([...primaryTasks, ...englishTasks]);
  return getManifestStatus(config.data.data_dir);
}

async function fetchDesktopAccountSummary(): Promise<AccountSummary> {
  const config = loadConfig();
  const token = await loadFreshOAuthToken(config);
  const itemDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyInventoryItemDefinition"
  );
  const bucketDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyInventoryBucketDefinition"
  );
  const plugSetDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyPlugSetDefinition"
  );
  const loadoutNameDefinitions = loadDefinitionComponent(
    config.data.data_dir,
    "DestinyLoadoutNameDefinition"
  );
  if (!itemDefinitions) {
    throw new Error("请先初始化资料库");
  }

  return fetchAccountSummary({
    config,
    token,
    itemDefinitions,
    bucketDefinitions: bucketDefinitions ?? undefined,
    plugSetDefinitions: plugSetDefinitions ?? undefined,
    loadoutNameDefinitions: loadoutNameDefinitions ?? undefined
  });
}
