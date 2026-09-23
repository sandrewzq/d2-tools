import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  buildSqliteSearchIndex,
  createSqliteSearchIndex
} from "../../dist/gameData/sqliteSearchIndex.js";

const directory = mkdtempSync(join(tmpdir(), "d2-tools-search-index-"));
const sourcePath = join(directory, "world.sqlite");
const indexPath = join(directory, "search.sqlite");
const outdatedIndexPath = join(directory, "outdated-search.sqlite");
createSourceDatabase(sourcePath);
buildSqliteSearchIndex({
  sourceDatabasePath: sourcePath,
  indexDatabasePath: indexPath,
  manifestVersion: "v1",
  language: "en"
});
copyFileSync(indexPath, outdatedIndexPath);
makeOutdatedIndex(outdatedIndexPath);

const index = createSqliteSearchIndex({
  databasePath: indexPath,
  expectedManifestVersion: "v1",
  expectedLanguage: "en"
});
let rejectsOutdatedSchema = false;
let outdatedIndex;
try {
  outdatedIndex = createSqliteSearchIndex({
    databasePath: outdatedIndexPath,
    expectedManifestVersion: "v1",
    expectedLanguage: "en"
  });
} catch {
  rejectsOutdatedSchema = true;
} finally {
  outdatedIndex?.close();
}
try {
  process.stdout.write(JSON.stringify({
    searchHashes: index.search("item", ["Same Gun"], 10),
    cappedSearchHashes: index.search("item", ["Same Gun"], 2),
    exactNameHashes: index.getItemHashesByExactName(["Same Gun"]),
    normalizedExactNameHashes: index.getItemHashesByExactName(["  same gun "]),
    spacedExactNameHashes: index.getItemHashesByExactName(["Compact 02"]),
    punctuatedExactNameHashes: index.getItemHashesByExactName(["compact-02"]),
    spacedSearchHashes: index.search("item", ["Compact 02"], 10),
    missingNameHashes: index.getItemHashesByExactName(["No Such Gun"]),
    duplicateVersionHashes: index.getItemVersionHashes([100], 10),
    canonicalVersionHashes: index.getItemVersionHashes([101], 10),
    separateBucketHashes: index.getItemVersionHashes([300], 10),
    rejectsOutdatedSchema
  }));
} finally {
  index.close();
}

function makeOutdatedIndex(path) {
  const database = new DatabaseSync(path);
  try {
    database.exec("DROP TABLE item_version_relation");
    database.prepare("UPDATE metadata SET value = '2' WHERE key = 'schema_version'").run();
  } finally {
    database.close();
  }
}

function createSourceDatabase(path) {
  const database = new DatabaseSync(path);
  try {
    database.exec(`
      CREATE TABLE DestinyInventoryItemDefinition (
        id INTEGER PRIMARY KEY,
        json TEXT NOT NULL
      );
      CREATE TABLE DestinyPlugSetDefinition (
        id INTEGER PRIMARY KEY,
        json TEXT NOT NULL
      );
      CREATE TABLE DestinySandboxPerkDefinition (
        id INTEGER PRIMARY KEY,
        json TEXT NOT NULL
      );
    `);
    const insertItem = database.prepare(
      "INSERT INTO DestinyInventoryItemDefinition(id, json) VALUES (?, ?)"
    );
    for (const definition of [
      item(100, "releases.1", 10, 1498876634),
      { ...item(101, "releases.1", 20, 1498876634), collectibleHash: 9001 },
      { ...item(200, "releases.2", 30, 1498876634), collectibleHash: 9002 },
      { ...item(300, "releases.3", 40, 3448274439), collectibleHash: 9003 },
      // 官方名把中文与字母数字连写、表格里按页面习惯写 `Compact 02`：这条数据的名字故意不留
      // 空格，用来验证查找侧的规范化名兜底。
      { ...item(400, "releases.4", 50, 1498876634), displayProperties: { name: "Compact02", icon: "/compact.png" } }
    ]) {
      insertItem.run(definition.hash, JSON.stringify(definition));
    }
    database.prepare(
      "INSERT INTO DestinyPlugSetDefinition(id, json) VALUES (?, ?)"
    ).run(1, JSON.stringify({ hash: 1, reusablePlugItems: [] }));
    database.prepare(
      "INSERT INTO DestinySandboxPerkDefinition(id, json) VALUES (?, ?)"
    ).run(2, JSON.stringify({
      hash: 2,
      displayProperties: { name: "Test perk", description: "" }
    }));
  } finally {
    database.close();
  }
}

function item(hash, releaseTrait, index, bucketTypeHash) {
  return {
    hash,
    index,
    itemType: 3,
    classType: 3,
    traitIds: [releaseTrait],
    displayProperties: { name: "Same Gun", icon: "/same.png" },
    inventory: { bucketTypeHash },
    sockets: { socketEntries: [] }
  };
}
