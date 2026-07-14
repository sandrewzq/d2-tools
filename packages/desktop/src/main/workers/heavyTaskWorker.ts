import { parentPort, workerData } from "node:worker_threads";
import { existsSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fetchAccountSummary, type AccountSummary } from "@d2-tools/core/account/summary";
import { loadConfig } from "@d2-tools/services/config/store";
import {
  initializeDefinitionComponent,
  loadDefinitionComponent,
  requiredDefinitionComponents,
  type DefinitionComponentStatus
} from "@d2-tools/services/manifest/definitions";
import {
  getManifestStatus,
  initializeManifestMetadata,
  loadManifestMetadataCache,
  manifestDir,
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
  const stagingDataDir = mkdtempSync(join(config.data.data_dir, "manifest-staging-"));
  const stagingConfig = {
    ...config,
    data: {
      ...config.data,
      data_dir: stagingDataDir
    }
  };

  try {
    await initializeManifestMetadata({ config: stagingConfig });
    const cache = loadManifestMetadataCache(stagingDataDir);
    if (!cache) {
      throw new Error("Manifest metadata cache was not created");
    }

    const primaryLanguage = cache.language;
    const primaryTasks = requiredDefinitionComponents.map((component) =>
      initializeDefinitionComponent({
        dataDir: stagingDataDir,
        language: primaryLanguage,
        metadata: cache.metadata,
        component
      })
    );

    const englishTasks: Promise<DefinitionComponentStatus | null>[] = [];
    if (primaryLanguage.toLowerCase() !== "en") {
      englishTasks.push(
        initializeDefinitionComponent({
          dataDir: stagingDataDir,
          language: "en",
          metadata: cache.metadata,
          component: "DestinyInventoryItemDefinition",
          writeDefaultCache: false
        }).catch(() => null),
        initializeDefinitionComponent({
          dataDir: stagingDataDir,
          language: "en",
          metadata: cache.metadata,
          component: "DestinyPlugSetDefinition",
          writeDefaultCache: false
        }).catch(() => null)
      );
    }

    await Promise.all([...primaryTasks, ...englishTasks]);
    replaceManifestCache(config.data.data_dir, stagingDataDir, repair);
    return getManifestStatus(config.data.data_dir);
  } finally {
    rmSync(stagingDataDir, { recursive: true, force: true });
  }
}

function replaceManifestCache(dataDir: string, stagingDataDir: string, repair: boolean): void {
  const targetDir = manifestDir(dataDir);
  const sourceDir = manifestDir(stagingDataDir);
  const backupDir = join(dataDir, `manifest-backup-${Date.now()}`);
  const hadExistingManifest = existsSync(targetDir);

  if (!existsSync(sourceDir)) {
    throw new Error("Manifest staging cache was not created");
  }

  if (hadExistingManifest) {
    renameSync(targetDir, backupDir);
  }

  try {
    renameSync(sourceDir, targetDir);
    if (hadExistingManifest || repair) {
      rmSync(backupDir, { recursive: true, force: true });
    }
  } catch (error) {
    if (hadExistingManifest && !existsSync(targetDir) && existsSync(backupDir)) {
      renameSync(backupDir, targetDir);
    }
    throw error;
  }
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
