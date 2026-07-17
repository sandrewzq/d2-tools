import { copyFileSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { requiredDefinitionComponents } from "../../../core/dist/manifest/definitions.js";
import {
  finalizeSqliteManifestActivation,
  loadActiveSqliteManifest,
  recoverSqliteManifest,
  rollbackSqliteManifestActivation,
  syncSqliteManifest
} from "../../dist/manifest/lifecycle.js";
import { createSqliteSearchIndex } from "../../dist/gameData/sqliteSearchIndex.js";

const sqliteComponents = new Set([
  "DestinyInventoryItemDefinition",
  "DestinyPlugSetDefinition",
  "DestinySandboxPerkDefinition"
]);
const supplementComponents = requiredDefinitionComponents.filter(
  (component) => !sqliteComponents.has(component)
);

const scenario = process.argv[2];
const result = await runScenario(scenario);
process.stdout.write(JSON.stringify(result));

async function runScenario(name) {
  switch (name) {
    case "all":
      return {
        "staging-finalize": await stagingFinalizeScenario(),
        rollback: await rollbackScenario(),
        "crash-recovery": await crashRecoveryScenario(),
        "missing-table": await missingTableScenario(),
        "english-index-reuse": await englishIndexReuseScenario()
      };
    case "staging-finalize":
      return stagingFinalizeScenario();
    case "rollback":
      return rollbackScenario();
    case "crash-recovery":
      return crashRecoveryScenario();
    case "missing-table":
      return missingTableScenario();
    case "english-index-reuse":
      return englishIndexReuseScenario();
    default:
      throw new Error(`Unknown lifecycle scenario: ${name}`);
  }
}

async function stagingFinalizeScenario() {
  const context = createContext();
  const fetchedUrls = stubSupplementDownloads();
  const first = await activate(context, "v1", context.firstDatabase);
  let versionBeforeActivation;
  const second = await syncSqliteManifest({
    dataDir: context.dataDir,
    language: "en",
    metadata: createMetadata("v2"),
    download: copyDownload(context.secondDatabase),
    beforeActivate: () => {
      versionBeforeActivation = loadActiveSqliteManifest(context.dataDir, "en")?.manifestVersion;
    }
  });
  const backupExistedBeforeFinalize = existsSync(second.rollbackPath);
  const backupVersion = readStored(second.rollbackPath).manifestVersion;

  finalizeSqliteManifestActivation(context.dataDir, "en", second);

  return {
    supplementCount: first.supplementComponents.length,
    missingSupplementCount: first.missingSupplementComponents.length,
    versionBeforeActivation,
    activeVersion: loadActiveSqliteManifest(context.dataDir, "en")?.manifestVersion,
    backupVersion,
    backupExistedBeforeFinalize,
    backupExistsAfterFinalize: existsSync(second.rollbackPath),
    fetchCount: fetchedUrls.length,
    activationState: readStored(activeDirectory(context.dataDir)).activationState
  };
}

async function rollbackScenario() {
  const context = createContext();
  stubSupplementDownloads();
  await activate(context, "v1", context.firstDatabase);
  const second = await activate(context, "v2", context.secondDatabase);

  const restored = rollbackSqliteManifestActivation(context.dataDir, "en", second);

  return {
    restoredVersion: restored?.manifestVersion,
    activeVersion: loadActiveSqliteManifest(context.dataDir, "en")?.manifestVersion,
    backupExists: existsSync(second.rollbackPath)
  };
}

async function crashRecoveryScenario() {
  const context = createContext();
  stubSupplementDownloads();
  const first = await activate(context, "v1", context.firstDatabase);
  finalizeSqliteManifestActivation(context.dataDir, "en", first);
  const second = await activate(context, "v2", context.secondDatabase);
  const stateBeforeRecovery = readStored(activeDirectory(context.dataDir)).activationState;
  const backupExistedBeforeRecovery = existsSync(second.rollbackPath);

  recoverSqliteManifest(context.dataDir, "en");

  return {
    stateBeforeRecovery,
    backupExistedBeforeRecovery,
    activeVersion: loadActiveSqliteManifest(context.dataDir, "en")?.manifestVersion,
    stateAfterRecovery: readStored(activeDirectory(context.dataDir)).activationState,
    backupExistsAfterRecovery: existsSync(second.rollbackPath)
  };
}

async function missingTableScenario() {
  const context = createContext();
  stubSupplementDownloads();
  await activate(context, "v1", context.firstDatabase);
  let error;
  try {
    await activate(context, "v2", context.invalidDatabase);
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }
  return {
    error,
    activeVersion: loadActiveSqliteManifest(context.dataDir, "en")?.manifestVersion
  };
}

async function englishIndexReuseScenario() {
  const context = createContext();
  stubSupplementDownloads();
  const firstDownloads = [];
  const first = await syncSqliteManifest({
    dataDir: context.dataDir,
    language: "zh-chs",
    metadata: createBilingualMetadata("v1"),
    download: trackedLanguageDownload(
      context.firstDatabase,
      context.secondDatabase,
      firstDownloads
    )
  });
  finalizeSqliteManifestActivation(context.dataDir, "zh-chs", first);

  const secondDownloads = [];
  const second = await syncSqliteManifest({
    dataDir: context.dataDir,
    language: "zh-chs",
    metadata: createBilingualMetadata("v1"),
    download: trackedLanguageDownload(
      context.firstDatabase,
      context.secondDatabase,
      secondDownloads
    )
  });
  const index = createSqliteSearchIndex({
    databasePath: second.englishSearchIndexPath,
    expectedManifestVersion: "v1",
    expectedLanguage: "en"
  });
  let englishSearchHashes;
  try {
    englishSearchHashes = index.search("perk", ["Test perk"], 10);
  } finally {
    index.close();
  }
  const englishIndexExists = existsSync(second.englishSearchIndexPath);
  finalizeSqliteManifestActivation(context.dataDir, "zh-chs", second);

  const disabledDownloads = [];
  const disabled = await syncSqliteManifest({
    dataDir: context.dataDir,
    language: "zh-chs",
    metadata: createBilingualMetadata("v1"),
    download: trackedLanguageDownload(
      context.firstDatabase,
      context.secondDatabase,
      disabledDownloads
    ),
    includeEnglishSearchIndex: false
  });

  return {
    firstDownloadCount: firstDownloads.length,
    secondDownloadCount: secondDownloads.length,
    englishIndexExists,
    englishSearchHashes,
    disabledDownloadCount: disabledDownloads.length,
    disabledEnglishIndex: Boolean(disabled.englishSearchIndexPath)
  };
}

function createContext() {
  const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-lifecycle-"));
  return {
    dataDir,
    firstDatabase: createManifestDatabase(dataDir, "first.sqlite"),
    secondDatabase: createManifestDatabase(dataDir, "second.sqlite"),
    invalidDatabase: createManifestDatabase(
      dataDir,
      "invalid.sqlite",
      "DestinySandboxPerkDefinition"
    )
  };
}

function activate(context, version, databasePath) {
  return syncSqliteManifest({
    dataDir: context.dataDir,
    language: "en",
    metadata: createMetadata(version),
    download: copyDownload(databasePath)
  });
}

function createMetadata(version) {
  return {
    version,
    mobileWorldContentPaths: {
      en: `/common/destiny2_content/sqlite/en/${version}.sqlite`
    },
    jsonWorldComponentContentPaths: {
      en: Object.fromEntries(requiredDefinitionComponents.map((component) => [
        component,
        `/common/destiny2_content/json/en/${component}.json`
      ]))
    }
  };
}

function createBilingualMetadata(version) {
  const metadata = createMetadata(version);
  return {
    ...metadata,
    mobileWorldContentPaths: {
      en: `/common/destiny2_content/sqlite/en/${version}.sqlite`,
      "zh-chs": `/common/destiny2_content/sqlite/zh-chs/${version}.sqlite`
    },
    jsonWorldComponentContentPaths: {
      ...metadata.jsonWorldComponentContentPaths,
      "zh-chs": metadata.jsonWorldComponentContentPaths.en
    }
  };
}

function createManifestDatabase(dataDir, fileName, omittedTable) {
  const path = join(dataDir, fileName);
  const database = new DatabaseSync(path);
  try {
    const definitions = [
      ["DestinyInventoryItemDefinition", {
        hash: 1,
        displayProperties: { name: "Test weapon" },
        itemType: 3,
        sockets: { socketEntries: [] }
      }],
      ["DestinyPlugSetDefinition", { hash: 2, reusablePlugItems: [] }],
      ["DestinySandboxPerkDefinition", {
        hash: 3,
        displayProperties: { name: "Test perk", description: "Test description" }
      }]
    ];
    for (const [component, definition] of definitions) {
      if (component === omittedTable) continue;
      database.exec(`CREATE TABLE "${component}" (id INTEGER PRIMARY KEY, json TEXT NOT NULL)`);
      database.prepare(`INSERT INTO "${component}"(id, json) VALUES (?, ?)`)
        .run(Number(definition.hash), JSON.stringify(definition));
    }
  } finally {
    database.close();
  }
  return path;
}

function copyDownload(sourcePath) {
  return async (_url, destination) => {
    copyFileSync(sourcePath, destination);
  };
}

function trackedLanguageDownload(localPath, englishPath, downloads) {
  return async (url, destination) => {
    downloads.push(url);
    copyFileSync(url.includes("/en/") ? englishPath : localPath, destination);
  };
}

function stubSupplementDownloads() {
  const seenUrls = [];
  globalThis.fetch = async (url) => {
    seenUrls.push(String(url));
    return new Response(JSON.stringify({ "1": { hash: 1 } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
  return seenUrls;
}

function activeDirectory(dataDir) {
  return join(dataDir, "manifest", "sqlite", "en", "active");
}

function readStored(directory) {
  return JSON.parse(readFileSync(join(directory, "status.json"), "utf8"));
}
