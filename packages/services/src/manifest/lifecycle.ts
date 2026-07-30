import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import extract from "extract-zip";
import {
  requiredDefinitionComponents,
  type DefinitionComponentName
} from "@d2-tools/core/manifest/definitions";
import {
  selectManifestLanguagePath,
  type DestinyManifestMetadata
} from "@d2-tools/core/manifest/metadata";
import {
  buildSqliteSearchIndex,
  createSqliteSearchIndex
} from "../gameData/sqliteSearchIndex.js";
import {
  getDefinitionStatus,
  initializeDefinitionComponent
} from "./definitions.js";
import {
  downloadManifestFile,
  findExtractedDatabase,
  isSqliteFile,
  normalizeManifestLanguage,
  removeManifestWorkDirectory,
  safeArchiveName,
  staticContentUrl
} from "./artifacts.js";

export type ManifestLifecyclePhase =
  | "download"
  | "extract"
  | "validate"
  | "index"
  | "activate";

export type SqliteManifestActivation = {
  catalogSchemaVersion: string;
  manifestVersion: string;
  language: string;
  sourcePath: string;
  activatedAt: string;
  databasePath: string;
  searchIndexPath: string;
  englishSearchIndexPath?: string;
  supplementDataDir?: string;
  supplementComponents: DefinitionComponentName[];
  missingSupplementComponents: DefinitionComponentName[];
  rollbackPath?: string;
  databaseSize: number;
  searchIndexSize: number;
  englishSearchIndexSize?: number;
  itemCount: number;
  perkCount: number;
  relationCount: number;
};

export type SyncSqliteManifestOptions = {
  dataDir: string;
  language: string;
  metadata: DestinyManifestMetadata;
  now?: () => Date;
  download?: (url: string, destination: string) => Promise<void>;
  beforeActivate?: () => void | Promise<void>;
  onProgress?: (phase: ManifestLifecyclePhase) => void;
  includeEnglishSearchIndex?: boolean;
};

type StoredSqliteManifestActivation = Omit<
  SqliteManifestActivation,
  | "databasePath"
  | "searchIndexPath"
  | "englishSearchIndexPath"
  | "supplementDataDir"
  | "missingSupplementComponents"
  | "rollbackPath"
> & {
  activationState?: "pending" | "finalized";
};

const activeDirectoryName = "active";
const databaseFileName = "world.sqlite";
const searchIndexFileName = "search.sqlite";
const englishSearchIndexFileName = "search-en.sqlite";
const statusFileName = "status.json";
const supplementDataDirectoryName = "supplement-data";
const catalogSchemaVersion = "3";

export async function syncSqliteManifest(
  options: SyncSqliteManifestOptions
): Promise<SqliteManifestActivation> {
  const language = normalizeManifestLanguage(options.language);
  const sourcePath = selectManifestLanguagePath(options.metadata, language);
  const root = sqliteManifestLanguageDir(options.dataDir, language);
  mkdirSync(root, { recursive: true });
  recoverSqliteManifest(options.dataDir, language);

  const operationId = `${process.pid}-${Date.now()}-${randomUUID()}`;
  const workDir = join(root, `staging-${operationId}`);
  const candidateDir = join(workDir, "candidate");
  const extractDir = join(workDir, "extracted");
  const archivePath = join(workDir, `${safeArchiveName(sourcePath)}.content`);
  const candidateDatabasePath = join(candidateDir, databaseFileName);
  const candidateSearchIndexPath = join(candidateDir, searchIndexFileName);
  const candidateEnglishSearchIndexPath = join(candidateDir, englishSearchIndexFileName);
  const backupDir = join(root, `backup-${operationId}`);
  const activeDir = join(root, activeDirectoryName);
  let activeMovedToBackup = false;

  mkdirSync(candidateDir, { recursive: true });
  mkdirSync(extractDir, { recursive: true });

  try {
    options.onProgress?.("download");
    await (options.download ?? downloadManifestFile)(staticContentUrl(sourcePath), archivePath);

    if (isSqliteFile(archivePath)) {
      renameSync(archivePath, candidateDatabasePath);
    } else {
      options.onProgress?.("extract");
      await extract(archivePath, { dir: extractDir });
      const extractedDatabasePath = findExtractedDatabase(extractDir);
      renameSync(extractedDatabasePath, candidateDatabasePath);
    }

    options.onProgress?.("validate");
    const availableTables = validateSqliteManifest(candidateDatabasePath);
    const supplementComponents = requiredDefinitionComponents.filter(
      (component) => !availableTables.has(component)
    );
    const candidateSupplementDataDir = join(candidateDir, supplementDataDirectoryName);
    for (const component of supplementComponents) {
      await initializeDefinitionComponent({
        dataDir: candidateSupplementDataDir,
        language,
        metadata: options.metadata,
        component
      });
    }

    options.onProgress?.("index");
    const indexResult = buildSqliteSearchIndex({
      sourceDatabasePath: candidateDatabasePath,
      indexDatabasePath: candidateSearchIndexPath,
      manifestVersion: options.metadata.version,
      language
    });
    const hasEnglishSearchIndex = language !== "en"
      && options.includeEnglishSearchIndex !== false
      && Boolean(options.metadata.mobileWorldContentPaths.en)
      ? await prepareSecondaryLanguageIndex({
          metadata: options.metadata,
          workDir,
          candidateIndexPath: candidateEnglishSearchIndexPath,
          reusableIndexPath: join(activeDir, englishSearchIndexFileName),
          manifestVersion: options.metadata.version,
          download: options.download ?? downloadManifestFile
        })
      : false;

    const activatedAt = (options.now ?? (() => new Date()))().toISOString();
    const stored: StoredSqliteManifestActivation = {
      catalogSchemaVersion,
      activationState: "pending",
      manifestVersion: options.metadata.version,
      language,
      sourcePath,
      activatedAt,
      supplementComponents,
      databaseSize: statSync(candidateDatabasePath).size,
      searchIndexSize: statSync(candidateSearchIndexPath).size,
      ...(hasEnglishSearchIndex
        ? { englishSearchIndexSize: statSync(candidateEnglishSearchIndexPath).size }
        : {}),
      ...indexResult
    };
    writeFileSync(
      join(candidateDir, statusFileName),
      `${JSON.stringify(stored, null, 2)}\n`,
      "utf8"
    );

    options.onProgress?.("activate");
    await options.beforeActivate?.();
    if (existsSync(activeDir)) {
      renameSync(activeDir, backupDir);
      activeMovedToBackup = true;
    }
    renameSync(candidateDir, activeDir);
    activeMovedToBackup = false;
      removeManifestWorkDirectory(root, workDir);
    return {
      ...activationFromStored(activeDir, stored),
      ...(existsSync(backupDir) ? { rollbackPath: backupDir } : {})
    };
  } catch (error) {
    if (activeMovedToBackup && !existsSync(activeDir) && existsSync(backupDir)) {
      try {
        renameSync(backupDir, activeDir);
        activeMovedToBackup = false;
      } catch {
        // Recovery is retried by recoverSqliteManifest during the next startup.
      }
    }
    removeManifestWorkDirectory(root, workDir);
    if (!activeMovedToBackup) {
      removeManifestWorkDirectory(root, backupDir);
    }
    throw error;
  }
}

export function loadActiveSqliteManifest(
  dataDir: string,
  language: string
): SqliteManifestActivation | null {
  const activeDir = activeSqliteManifestDir(dataDir, language);
  const statusPath = join(activeDir, statusFileName);
  const databasePath = join(activeDir, databaseFileName);
  const searchIndexPath = join(activeDir, searchIndexFileName);
  const englishSearchIndexPath = join(activeDir, englishSearchIndexFileName);
  if (!existsSync(statusPath) || !existsSync(databasePath) || !existsSync(searchIndexPath)) {
    return null;
  }

  try {
    const stored = JSON.parse(readFileSync(statusPath, "utf8")) as StoredSqliteManifestActivation;
    if (
      !stored.manifestVersion
      || stored.catalogSchemaVersion !== catalogSchemaVersion
      || !Array.isArray(stored.supplementComponents)
      || stored.language !== normalizeManifestLanguage(language)
      || stored.databaseSize !== statSync(databasePath).size
      || stored.searchIndexSize !== statSync(searchIndexPath).size
      || (stored.englishSearchIndexSize !== undefined && (
        !existsSync(englishSearchIndexPath)
        || stored.englishSearchIndexSize !== statSync(englishSearchIndexPath).size
      ))
    ) {
      return null;
    }
    return activationFromStored(activeDir, stored);
  } catch {
    return null;
  }
}

export function recoverSqliteManifest(dataDir: string, language: string): void {
  const root = sqliteManifestLanguageDir(dataDir, language);
  mkdirSync(root, { recursive: true });
  const activeDir = join(root, activeDirectoryName);
  const entries = readdirSync(root, { withFileTypes: true });
  const backups = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("backup-"))
    .map((entry) => join(root, entry.name))
    .sort((left, right) => right.localeCompare(left));

  const activeStored = existsSync(activeDir)
    ? readValidStoredActivation(activeDir, language)
    : null;
  if (activeStored?.activationState === "pending") {
    const backup = takeValidBackup(root, backups, language);
    if (backup) {
      replaceActiveWithBackup(root, activeDir, backup);
    } else {
      writeStoredActivation(activeDir, {
        ...activeStored,
        activationState: "finalized"
      });
    }
  } else if (existsSync(activeDir) && !activeStored) {
    const backup = takeValidBackup(root, backups, language);
    if (backup) {
      replaceActiveWithBackup(root, activeDir, backup);
    } else {
      removeInvalidActiveDirectory(root, activeDir);
    }
  } else if (!existsSync(activeDir)) {
    const backup = takeValidBackup(root, backups, language);
    if (backup) {
      try {
        renameSync(backup, activeDir);
      } catch {
        return;
      }
    }
  }

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name.startsWith("staging-")) {
      removeManifestWorkDirectory(root, join(root, entry.name));
    }
  }
  for (const backup of backups) {
    removeManifestWorkDirectory(root, backup);
  }
}

export function finalizeSqliteManifestActivation(
  dataDir: string,
  language: string,
  activation: SqliteManifestActivation
): void {
  const activeDir = activeSqliteManifestDir(dataDir, language);
  const stored = readValidStoredActivation(activeDir, language);
  if (!stored || stored.manifestVersion !== activation.manifestVersion) {
    throw new Error("Active SQLite Manifest does not match the pending activation");
  }
  writeStoredActivation(activeDir, {
    ...stored,
    activationState: "finalized"
  });
  if (activation.rollbackPath) {
    removeManifestWorkDirectory(sqliteManifestLanguageDir(dataDir, language), activation.rollbackPath);
  }
}

export function rollbackSqliteManifestActivation(
  dataDir: string,
  language: string,
  activation: SqliteManifestActivation
): SqliteManifestActivation | null {
  const root = sqliteManifestLanguageDir(dataDir, language);
  const activeDir = join(root, activeDirectoryName);
  const failedDir = join(root, `failed-${process.pid}-${Date.now()}-${randomUUID()}`);
  if (existsSync(activeDir)) renameSync(activeDir, failedDir);
  try {
    if (activation.rollbackPath && existsSync(activation.rollbackPath)) {
      renameSync(activation.rollbackPath, activeDir);
    }
    removeManifestWorkDirectory(root, failedDir);
    return loadActiveSqliteManifest(dataDir, language);
  } catch (error) {
    if (!existsSync(activeDir) && existsSync(failedDir)) {
      try { renameSync(failedDir, activeDir); } catch { /* recovery retries on startup */ }
    }
    throw error;
  }
}

export function sqliteManifestLanguageDir(dataDir: string, language: string): string {
  return join(dataDir, "manifest", "sqlite", normalizeManifestLanguage(language));
}

export function activeSqliteManifestDir(dataDir: string, language: string): string {
  return join(sqliteManifestLanguageDir(dataDir, language), activeDirectoryName);
}

function activationFromStored(
  activeDir: string,
  stored: StoredSqliteManifestActivation
): SqliteManifestActivation {
  const { activationState: _activationState, ...activation } = stored;
  const supplementDataDir = join(activeDir, supplementDataDirectoryName);
  const missingSupplementComponents = stored.supplementComponents.filter((component) => (
    !getDefinitionStatus(supplementDataDir, component, {
      language: stored.language,
      manifestVersion: stored.manifestVersion
    }).initialized
  ));
  return {
    ...activation,
    databasePath: join(activeDir, databaseFileName),
    searchIndexPath: join(activeDir, searchIndexFileName),
    ...(stored.englishSearchIndexSize !== undefined
      ? { englishSearchIndexPath: join(activeDir, englishSearchIndexFileName) }
      : {}),
    ...(stored.supplementComponents.length ? { supplementDataDir } : {}),
    missingSupplementComponents
  };
}

function readValidStoredActivation(
  directory: string,
  language: string
): StoredSqliteManifestActivation | null {
  const statusPath = join(directory, statusFileName);
  const databasePath = join(directory, databaseFileName);
  const searchIndexPath = join(directory, searchIndexFileName);
  const englishSearchIndexPath = join(directory, englishSearchIndexFileName);
  if (!existsSync(statusPath) || !existsSync(databasePath) || !existsSync(searchIndexPath)) {
    return null;
  }
  try {
    const stored = JSON.parse(readFileSync(statusPath, "utf8")) as StoredSqliteManifestActivation;
    if (
      !stored.manifestVersion
      || stored.catalogSchemaVersion !== catalogSchemaVersion
      || !Array.isArray(stored.supplementComponents)
      || stored.language !== normalizeManifestLanguage(language)
      || (stored.activationState !== undefined
        && stored.activationState !== "pending"
        && stored.activationState !== "finalized")
      || stored.databaseSize !== statSync(databasePath).size
      || stored.searchIndexSize !== statSync(searchIndexPath).size
      || (stored.englishSearchIndexSize !== undefined && (
        !existsSync(englishSearchIndexPath)
        || stored.englishSearchIndexSize !== statSync(englishSearchIndexPath).size
      ))
    ) {
      return null;
    }
    validateActiveSqliteManifest(directory);
    return stored;
  } catch {
    return null;
  }
}

function writeStoredActivation(
  directory: string,
  stored: StoredSqliteManifestActivation
): void {
  const statusPath = join(directory, statusFileName);
  const pendingPath = join(directory, `${statusFileName}.pending`);
  writeFileSync(pendingPath, `${JSON.stringify(stored, null, 2)}\n`, "utf8");
  renameSync(pendingPath, statusPath);
}

function replaceActiveWithBackup(
  root: string,
  activeDir: string,
  backupDir: string
): void {
  const failedDir = join(root, `failed-${process.pid}-${Date.now()}-${randomUUID()}`);
  try {
    if (existsSync(activeDir)) {
      renameSync(activeDir, failedDir);
    }
    renameSync(backupDir, activeDir);
    removeManifestWorkDirectory(root, failedDir);
  } catch {
    if (!existsSync(activeDir) && existsSync(failedDir)) {
      try { renameSync(failedDir, activeDir); } catch { /* retried later */ }
    }
  }
}

function takeValidBackup(
  root: string,
  backups: string[],
  language: string
): string | undefined {
  while (backups.length) {
    const backup = backups.shift()!;
    if (readValidStoredActivation(backup, language)) {
      return backup;
    }
    removeManifestWorkDirectory(root, backup);
  }
  return undefined;
}

function removeInvalidActiveDirectory(root: string, activeDir: string): void {
  const failedDir = join(root, `failed-${process.pid}-${Date.now()}-${randomUUID()}`);
  try {
    renameSync(activeDir, failedDir);
    removeManifestWorkDirectory(root, failedDir);
  } catch {
    if (!existsSync(activeDir) && existsSync(failedDir)) {
      try { renameSync(failedDir, activeDir); } catch { /* retried later */ }
    }
  }
}

async function buildSecondaryLanguageIndex(options: {
  metadata: DestinyManifestMetadata;
  workDir: string;
  candidateIndexPath: string;
  manifestVersion: string;
  download: (url: string, destination: string) => Promise<void>;
}): Promise<ReturnType<typeof buildSqliteSearchIndex>> {
  const sourcePath = selectManifestLanguagePath(options.metadata, "en");
  const archivePath = join(options.workDir, `english-${safeArchiveName(sourcePath)}.content`);
  const extractDir = join(options.workDir, "english-extracted");
  const databasePath = join(options.workDir, "english-world.sqlite");
  mkdirSync(extractDir, { recursive: true });
  await options.download(staticContentUrl(sourcePath), archivePath);
  if (isSqliteFile(archivePath)) {
    renameSync(archivePath, databasePath);
  } else {
    await extract(archivePath, { dir: extractDir });
    renameSync(findExtractedDatabase(extractDir), databasePath);
  }
  validateSqliteManifest(databasePath);
  return buildSqliteSearchIndex({
    sourceDatabasePath: databasePath,
    indexDatabasePath: options.candidateIndexPath,
    manifestVersion: options.manifestVersion,
    language: "en"
  });
}

async function prepareSecondaryLanguageIndex(options: {
  metadata: DestinyManifestMetadata;
  workDir: string;
  candidateIndexPath: string;
  reusableIndexPath: string;
  manifestVersion: string;
  download: (url: string, destination: string) => Promise<void>;
}): Promise<boolean> {
  if (isReusableSearchIndex(options.reusableIndexPath, options.manifestVersion, "en")) {
    copyFileSync(options.reusableIndexPath, options.candidateIndexPath);
    return true;
  }
  await buildSecondaryLanguageIndex(options);
  return true;
}

function isReusableSearchIndex(
  path: string,
  manifestVersion: string,
  language: string
): boolean {
  if (!existsSync(path)) {
    return false;
  }
  try {
    const index = createSqliteSearchIndex({
      databasePath: path,
      expectedManifestVersion: manifestVersion,
      expectedLanguage: language
    });
    index.close();
    return true;
  } catch {
    return false;
  }
}

function validateSqliteManifest(databasePath: string): Set<string> {
  const file = openSync(databasePath, "r");
  try {
    const header = Buffer.alloc(16);
    readSync(file, header, 0, header.length, 0);
    if (header.toString("utf8") !== "SQLite format 3\0") {
      throw new Error("Downloaded Manifest is not a SQLite database");
    }
  } finally {
    closeSync(file);
  }

  const database = new DatabaseSync(databasePath, {
    readOnly: true,
    timeout: 5_000
  });
  try {
    const quickCheck = database.prepare("PRAGMA quick_check").get() as {
      quick_check?: string;
    } | undefined;
    if (quickCheck?.quick_check !== "ok") {
      throw new Error(`SQLite Manifest quick_check failed: ${String(quickCheck?.quick_check)}`);
    }
    const minimumTables = [
      "DestinyInventoryItemDefinition",
      "DestinySandboxPerkDefinition",
      "DestinyPlugSetDefinition"
    ];
    const availableTables = new Set(
      (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>)
        .map((row) => row.name)
    );
    const missing = minimumTables.filter((table) => !availableTables.has(table));
    if (missing.length) {
      throw new Error(`SQLite Manifest is missing required tables: ${missing.join(", ")}`);
    }
    return availableTables;
  } finally {
    database.close();
  }
}

function validateActiveSqliteManifest(activeDir: string): void {
  validateSqliteManifest(join(activeDir, databaseFileName));
  const index = new DatabaseSync(join(activeDir, searchIndexFileName), {
    readOnly: true,
    timeout: 5_000
  });
  try {
    const quickCheck = index.prepare("PRAGMA quick_check").get() as { quick_check?: string } | undefined;
    if (quickCheck?.quick_check !== "ok") {
      throw new Error("Search index quick_check failed");
    }
  } finally {
    index.close();
  }
}
