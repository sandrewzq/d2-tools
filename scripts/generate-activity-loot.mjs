#!/usr/bin/env node
/**
 * T74：从本机 Manifest 推导「突袭 / 地牢 → 武器掉落关系」，生成 activity-loot 数据集。
 *
 * 用法：
 *   node scripts/generate-activity-loot.mjs --sqlite <world.sqlite 路径> [--report]
 *
 * Manifest 路径（macOS）：~/Library/Application Support/d2-tools/manifest/sqlite/<语言>/active/world.sqlite
 * 同目录的 status.json 提供 manifestVersion。
 *
 * 只读 Manifest；写的目标是 packages/services/src/community/activityLoot.ts 里
 * `#region activity-loot-dataset` 标记之间的内容。标记外的手工代码不动。
 *
 * 关系真源是 Collectible 的 sourceString / sourceHash：从来源串里抽出「名字槽」，
 * 与活动定义名求相等（不是包含），再取该 source 下的武器桶条目。详见
 * docs/work/backlog/T74-rotation-loot-pool-coverage.md。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";

const REGION_START = "// #region activity-loot-dataset";
const REGION_END = "// #endregion activity-loot-dataset";

const RAID_TYPE = 2043403989;
const DUNGEON_TYPE = 608898761;
const PATTERN_RECORD_TYPE = "武器模式"; // 图样 record 的 recordTypeName
/**
 * 署名只写真实来源：关系由本脚本从 Bungie Manifest 的 Collectible
 * sourceString / sourceHash 推出，脚本本身就是出处。不要在这里挂 DIM 之类的
 * 第三方链接——脚本没有读过它们的数据，挂上去会把「参考过」写成事实（T91 第 12 节）。
 */
const generatorScriptUrl = "https://github.com/sandrewzq/d2-tools/blob/main/scripts/generate-activity-loot.mjs";
const sourceLicense = "Bungie Manifest";
const DIFFICULTY_PREFIX = /^(大师|专家|传说|普通|标准|巅峰|史诗|竞赛|探索者|永恒|最后通牒)/;
const QUOTE = "[“”\"']";

/**
 * 源串形状 → 名字槽。兜底模式必须最后，否则会先吃掉整句。
 * 覆盖实测到的全部写法：来源：“X”突袭 / 来源：地牢“X” / 来源：X突袭。/ 由突袭“X”获得。
 */
const SOURCE_PATTERNS = [
  new RegExp(`^地牢${QUOTE}?(.+?)${QUOTE}?。?$`),
  new RegExp(`^突袭${QUOTE}?(.+?)${QUOTE}?。?$`),
  new RegExp(`^${QUOTE}(.+?)${QUOTE}(突袭|地牢)*。?$`),
  /^(.+?)(突袭|地牢)(巢穴)?。?$/,
  new RegExp(`^自${QUOTE}?(.+?)${QUOTE}?(突袭|地牢)取得。?$`),
  new RegExp(`^由突袭${QUOTE}?(.+?)${QUOTE}?获得。?$`),
  new RegExp(`^在${QUOTE}?(.+?)${QUOTE}?突袭中获得。?$`),
  new RegExp(`^完成${QUOTE}?(.+?)${QUOTE}?地牢。?$`),
  /^(.+?)。?$/
];

/**
 * 人工覆盖表。自动推导只收「名字槽与活动名完全相等」的源；
 * 剩下的边界只能人工判，规则是**宁缺毋猜**：拿不准就排除，不留误导性内容。
 */
const EXCLUDED_ACTIVITIES = new Map([
  // 众神殿的掉落是其他突袭武器的再投放，且自身有 7 个难度条目、无唯一活动 Hash。
  ["众神殿", "掉落为其他活动的再投放，且无唯一活动 Hash"]
]);

/** 名称后缀 → 变体。带后缀的条目不入库（社区掉落表按武器计一次），只留基础版本。 */
const VARIANT_SUFFIXES = new Map([
  ["专家", "adept"],
  ["失时", "timelost"],
  ["痛苦", "harrowed"],
  ["巴洛克", "reprised"]
]);

/**
 * 逐武器的人工变体标注。推不出「是不是复刻武器」，而数据集里已有该标注，
 * 生成时按 Hash 保留，避免回退成 normal。
 */
const ITEM_VARIANT_OVERRIDES = new Map([
  // 贪婪之握：四把都是初代复刻武器。
  [1518956169, "reprised"],
  [1648948519, "reprised"],
  [386864872, "reprised"],
  [944708986, "reprised"]
]);

/** 自校验：数据集已有的 4 条必须逐条复现，否则说明推导链或 Manifest 变了。 */
const EXPECTED = [
  { key: "raid-1441982566", activity_hash: 1441982566, source_hash: 1007078046, items: 7, first_item: 999767358 },
  { key: "raid-1541433876", activity_hash: 1541433876, source_hash: 2700267533, items: 7 },
  { key: "dungeon-4078656646", activity_hash: 4078656646, source_hash: 675740011, items: 4 },
  { key: "dungeon-2004855007", activity_hash: 2004855007, source_hash: 613435025, items: 5 }
];

const args = parseArguments(process.argv.slice(2));
const databasePath = args.sqlite;
if (!databasePath) {
  console.error("用法：node scripts/generate-activity-loot.mjs --sqlite <world.sqlite 路径> [--report]");
  console.error("示例：node scripts/generate-activity-loot.mjs --sqlite \"$HOME/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/world.sqlite\"");
  process.exit(1);
}

const outputPath = resolve(import.meta.dirname, "..", "packages", "services", "src", "community", "activityLoot.ts");
const database = new DatabaseSync(databasePath, { readOnly: true });
const manifestVersion = readManifestVersion(databasePath);
const activities = deriveActivities(loadPreviousHashes(outputPath));
const report = renderReport(activities);

if (args.report) {
  console.log(report);
  console.log(`\n活动 ${activities.length} 个，条目 ${activities.reduce((sum, a) => sum + a.items.length, 0)} 条；未写文件。`);
  process.exit(0);
}

writeDataset(outputPath, activities);
console.log(report);
console.log(`\n已写入 ${outputPath}：活动 ${activities.length} 个，条目 ${activities.reduce((sum, a) => sum + a.items.length, 0)} 条。`);

// ---------------------------------------------------------------- 推导

function deriveActivities(previousHashes) {
  const activityByName = loadRaidAndDungeonActivities(previousHashes);
  const sources = loadCollectibleSources();
  const patternRecords = loadPatternRecords();

  const groups = new Map();
  const skipped = [];

  for (const [sourceHash, source] of sources) {
    const slot = extractNameSlot(source.text);
    if (!slot) continue;
    const key = normalizeName(slot);
    const activity = activityByName.get(key);
    if (!activity) continue;

    if (EXCLUDED_ACTIVITIES.has(key)) {
      skipped.push({ sourceHash, text: source.text, why: EXCLUDED_ACTIVITIES.get(key) });
      continue;
    }

    const weapons = [...source.itemHashes].map(readWeapon).filter(Boolean);
    const base = [];
    for (const weapon of weapons) {
      if (baseVariantOf(weapon.name)) continue; // 带（专家）这类后缀的版本不入库
      base.push(weapon);
    }
    if (!base.length) {
      skipped.push({ sourceHash, text: source.text, why: "没有基础武器" });
      continue;
    }

    const group = groups.get(key) ?? { activity, sourceHash, source, items: new Map() };
    for (const weapon of base) group.items.set(weapon.hash, weapon);
    groups.set(key, group);
  }

  const derived = [...groups.values()]
    .map((group) => ({
      key: activityKey(group.activity.kind, group.activity.base.hash),
      activity_hash: group.activity.base.hash,
      activity_kind: group.activity.kind,
      names: [group.activity.baseName],
      source_hash: group.sourceHash,
      source_label: `Bungie Collectible：${group.source.text.replace(/\n/g, " ")}`,
      source_url: "generatorScriptUrl",
      source_license: "sourceLicense",
      evidence_note: `当前 Manifest sourceHash ${group.sourceHash}；仅确认活动级来源。`,
      items: [...group.items.values()]
        .sort((a, b) => a.hash - b.hash)
        .map((weapon) => ({
          item_hash: weapon.hash,
          item_variant: ITEM_VARIANT_OVERRIDES.get(weapon.hash) ?? "normal",
          drop_scope: "activity",
          pattern_record_hash: patternRecords.get(normalizeName(weapon.name))
        }))
    }))
    .sort((a, b) => (
      a.activity_kind === b.activity_kind
        ? a.activity_hash - b.activity_hash
        : a.activity_kind.localeCompare(b.activity_kind)
    ));

  verifyExpected(derived);
  if (skipped.length) {
    console.log(`排除未入库的 source ${skipped.length} 个：`);
    for (const entry of skipped) console.log(`  ${entry.sourceHash}  ${entry.why}  ${entry.text.replace(/\n/g, " ")}`);
    console.log("");
  }
  return derived;
}

function loadRaidAndDungeonActivities(previousHashes) {
  const byName = new Map();
  for (const row of database.prepare(
    `select (id & 4294967295) as hash,
            json_extract(json,'$.displayProperties.name') as name,
            json_extract(json,'$.activityTypeHash') as type
     from DestinyActivityDefinition
     where json_extract(json,'$.activityTypeHash') in (?, ?)`
  ).all(RAID_TYPE, DUNGEON_TYPE)) {
    const name = String(row.name ?? "");
    const key = normalizeName(name);
    if (key.length < 2) continue;
    const entry = byName.get(key) ?? {
      kind: row.type === RAID_TYPE ? "raid" : "dungeon",
      variants: []
    };
    entry.variants.push({ hash: unsigned(row.hash), name });
    byName.set(key, entry);
  }
  for (const [key, entry] of byName) {
    // 实测：角色周挑战下发的是「标准 / 普通」难度条目（本机缓存里 8 个轮换活动 7 个「标准」、1 个「普通」），
    // 所以优先取这两个，其次无后缀，最后任意一条。
    // 同名条目在 Manifest 里常有重复（如「救赎的边缘: 标准」有 940375169 与 1541433876 两条），
    // 因此先沿用当前数据集已记录的 Hash：那是被真实轮换验证过的值，也让重复生成保持稳定。
    entry.base = entry.variants.find((variant) => variant.hash === previousHashes.get(key))
      ?? entry.variants.slice().sort((a, b) => (
        baseRank(a.name) - baseRank(b.name) || a.name.length - b.name.length || a.hash - b.hash
      ))[0];
    entry.baseName = stripDifficulty(entry.base.name);
  }
  return byName;
}

function baseRank(name) {
  if (/[:：]\s*标准$/.test(name)) return 0;
  if (/[:：]\s*普通$/.test(name)) return 1;
  if (!/[:：]/.test(name)) return 2;
  return 3;
}

function loadCollectibleSources() {
  const sources = new Map();
  for (const row of database.prepare(
    `select (json_extract(json,'$.sourceHash') & 4294967295) as source_hash,
            json_extract(json,'$.sourceString') as text,
            (json_extract(json,'$.itemHash') & 4294967295) as item_hash
     from DestinyCollectibleDefinition`
  ).all()) {
    if (!row.source_hash || !row.text) continue;
    const entry = sources.get(row.source_hash) ?? { text: String(row.text).normalize("NFKC"), itemHashes: new Set() };
    if (row.item_hash) entry.itemHashes.add(unsigned(row.item_hash));
    sources.set(row.source_hash, entry);
  }
  return sources;
}

/** 图样 record 的 displayProperties.name 就是武器名，183 条里无同名冲突。 */
function loadPatternRecords() {
  const records = new Map();
  for (const row of database.prepare(
    `select (id & 4294967295) as hash,
            json_extract(json,'$.displayProperties.name') as name
     from DestinyRecordDefinition
     where json_extract(json,'$.recordTypeName') = ?`
  ).all(PATTERN_RECORD_TYPE)) {
    const key = normalizeName(row.name);
    if (key) records.set(key, unsigned(row.hash));
  }
  return records;
}

function readWeapon(hash) {
  const row = database.prepare(
    `select json_extract(json,'$.itemType') as type,
            json_extract(json,'$.displayProperties.name') as name
     from DestinyInventoryItemDefinition
     where (id & 4294967295) = ?`
  ).get(hash);
  if (!row || row.type !== 3) return null;
  return { hash, name: String(row.name ?? "") };
}

/** 名字以（专家）这类后缀结尾时返回该变体，否则返回 null。 */
function baseVariantOf(name) {
  const matched = /[（(]([^）)]+)[）)]$/.exec(name);
  if (!matched) return null;
  return VARIANT_SUFFIXES.get(matched[1]) ?? "other";
}

// ---------------------------------------------------------------- 文本

function extractNameSlot(text) {
  const value = String(text ?? "")
    .normalize("NFKC")
    .replace(/\n/g, "")
    .replace(/^来源[:：]/, "")
    .trim();
  for (const pattern of SOURCE_PATTERNS) {
    const matched = pattern.exec(value);
    if (matched?.[1]?.trim()) return matched[1].trim();
  }
  return null;
}

function stripDifficulty(value) {
  return String(value ?? "").split(/[:：]/)[0].replace(/[（(][^）)]*[）)]/g, "").trim();
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[（(][^）)]*[）)]/g, "")
    .split(/[:：]/)[0]
    .replace(/[：:·'’“”"\-—，,、。\s]/g, "")
    .replace(DIFFICULTY_PREFIX, "")
    .toLowerCase();
}

function unsigned(value) {
  return Number(value) >>> 0;
}

function activityKey(kind, hash) {
  return `${kind}-${hash}`;
}

/**
 * 读当前数据集已记录的「活动名 → 活动 Hash」。同名活动在 Manifest 里可能有多个条目，
 * 已记录的那个是经真实轮换验证过的，优先沿用。
 */
function loadPreviousHashes(outputPath) {
  const previous = new Map();
  let source;
  try {
    source = readFileSync(outputPath, "utf8");
  } catch {
    return previous;
  }
  const start = source.indexOf(REGION_START);
  const end = source.indexOf(REGION_END);
  if (start < 0 || end < 0) return previous;
  const block = source.slice(start, end);
  for (const match of block.matchAll(/activity_hash: (\d+),[\s\S]{0,200}?names: \[([^\]]+)\]/g)) {
    const name = /"([^"]+)"/.exec(match[2])?.[1];
    if (name) previous.set(normalizeName(name), Number(match[1]));
  }
  return previous;
}

function readManifestVersion(databasePath) {  try {
    const status = JSON.parse(readFileSync(join(dirname(databasePath), "status.json"), "utf8"));
    if (typeof status.manifestVersion === "string" && status.manifestVersion) return status.manifestVersion;
  } catch {
    // status.json 缺失或损坏时退回占位值，由调用方人工核对
  }
  return "unknown";
}

function verifyExpected(derived) {
  const problems = [];
  // 结构自校验覆盖全量，不只是 EXPECTED 里那 4 个活动（T91 第 12 节）。下面几组检查都
  // 不需要猜，任何一条不过都说明推导或 Manifest 版本出了问题，直接拒绝写文件。
  const seenKeys = new Set();
  for (const activity of derived) {
    if (seenKeys.has(activity.key)) problems.push(`${activity.key} 重复出现`);
    seenKeys.add(activity.key);
    if (!activity.activity_hash) problems.push(`${activity.key} 活动 Hash 为空`);
    if (!activity.source_hash) problems.push(`${activity.key} source Hash 为空`);
    if (!activity.items.length) problems.push(`${activity.key} 没有任何武器条目`);
    const seenItems = new Set();
    for (const item of activity.items) {
      if (seenItems.has(item.item_hash)) problems.push(`${activity.key} 重复登记武器 ${item.item_hash}`);
      seenItems.add(item.item_hash);
    }
  }
  // item_hash 必须能在当前 Manifest 里解析成一把武器；解析不到说明数据集记的武器
  // 和 Manifest 版本已经对不上，界面会照着一条不存在的定义渲染。
  for (const activity of derived) {
    for (const item of activity.items) {
      if (!readWeapon(item.item_hash)) {
        problems.push(`${activity.key} 的 ${item.item_hash} 不是当前 Manifest 里的武器`);
      }
    }
  }
  // 图样映射是按武器名建的反查表。两把武器同名时会一起命中同一条 record，同一个
  // pattern_record_hash 就挂到了两把武器上，这里必须报出来而不是静默接受。
  const patternOwners = new Map();
  for (const activity of derived) {
    for (const item of activity.items) {
      if (item.pattern_record_hash === undefined) continue;
      const owner = patternOwners.get(item.pattern_record_hash);
      if (owner !== undefined && owner !== item.item_hash) {
        problems.push(`图样 record ${item.pattern_record_hash} 同时挂在武器 ${owner} 和 ${item.item_hash} 上`);
      }
      patternOwners.set(item.pattern_record_hash, item.item_hash);
    }
  }
  for (const expected of EXPECTED) {
    const found = derived.find((activity) => activity.key === expected.key);
    if (!found) {
      problems.push(`${expected.key} 未推导出来`);
      continue;
    }
    if (found.activity_hash !== expected.activity_hash) problems.push(`${expected.key} 活动 Hash 变了：${found.activity_hash}`);
    if (found.source_hash !== expected.source_hash) problems.push(`${expected.key} source Hash 变了：${found.source_hash}`);
    if (found.items.length !== expected.items) problems.push(`${expected.key} 条目数变了：${found.items.length}，期望 ${expected.items}`);
    if (expected.first_item && !found.items.some((item) => item.item_hash === expected.first_item)) {
      problems.push(`${expected.key} 缺少条目 ${expected.first_item}`);
    }
  }
  if (problems.length) {
    const derivedKeys = derived.map((activity) => `${activity.key}(${activity.names[0]})`).join("、");
    throw new Error(`自校验失败，未写文件：\n- ${problems.join("\n- ")}\n实际推导：${derivedKeys}`);
  }
}

function parseArguments(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--sqlite") {
      parsed.sqlite = resolve(argv[index + 1]);
      index += 1;
    } else if (argv[index] === "--report") {
      parsed.report = true;
    }
  }
  return parsed;
}

function renderReport(activities) {
  const lines = [`Manifest ${manifestVersion}`, `活动 ${activities.length} 个`, ""];
  for (const activity of activities) {
    lines.push(`【${activity.names[0]}】 ${activity.activity_kind}  hash ${activity.activity_hash}  武器 ${activity.items.length} 项`);
    lines.push(`    ${activity.source_label}`);
    const withoutPattern = activity.items.filter((item) => item.pattern_record_hash === undefined).length;
    lines.push(`    图样 record：${activity.items.length - withoutPattern}/${activity.items.length} 命中`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------- 写盘

function writeDataset(outputPath, activities) {
  const source = readFileSync(outputPath, "utf8");
  const start = source.indexOf(REGION_START);
  const end = source.indexOf(REGION_END);
  if (start < 0 || end < 0 || end < start) {
    throw new Error(`找不到生成区标记 ${REGION_START} / ${REGION_END}：${outputPath}`);
  }
  const today = new Date().toISOString().slice(0, 10);
  const block = [
    REGION_START,
    "// 本区由 scripts/generate-activity-loot.mjs 生成，手工改动会在下次生成时被覆盖。",
    `const datasetRevision = "${today}.1";`,
    `const datasetGeneratedAt = "${today}";`,
    "",
    "export const activityLootDatasetV1: ActivityLootDatasetV1 = {",
    '  schema: "activity-loot.v1",',
    "  revision: datasetRevision,",
    `  manifest_version: ${JSON.stringify(manifestVersion)},`,
    "  activities: [",
    activities.map(renderActivity).join(",\n"),
    "  ]",
    "};",
    REGION_END
  ].join("\n");
  writeFileSync(outputPath, `${source.slice(0, start)}${block}${source.slice(end + REGION_END.length)}`, "utf8");
}

function renderActivity(activity) {
  const items = activity.items.map((item) => {
    const pattern = item.pattern_record_hash === undefined ? "" : `, pattern_record_hash: ${item.pattern_record_hash}`;
    return `        { item_hash: ${item.item_hash}, item_variant: "${item.item_variant}", drop_scope: "${item.drop_scope}"${pattern} }`;
  }).join(",\n");
  return [
    "    {",
    `      key: ${JSON.stringify(activity.key)},`,
    `      activity_hash: ${activity.activity_hash},`,
    `      activity_kind: ${JSON.stringify(activity.activity_kind)},`,
    `      names: [${JSON.stringify(activity.names[0])}],`,
    `      source_hash: ${activity.source_hash},`,
    `      source_label: ${JSON.stringify(activity.source_label)},`,
    `      source_url: ${activity.source_url},`,
    `      source_license: ${activity.source_license},`,
    `      evidence_note: ${JSON.stringify(activity.evidence_note)},`,
    "      generated_at: datasetGeneratedAt,",
    "      items: [",
    items,
    "      ]",
    "    }"
  ].join("\n");
}
