import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  summarizeItemPerks,
  type ItemPlugSummary
} from "@d2-tools/core/items/perks";
import type {
  CommunityPerkSource,
  PerkCombo,
  PerkRef,
  RecommendationRequirementSlot,
  RecommendationSourceRecord,
  SourceOptions,
  WeaponRecommendation
} from "@d2-tools/core/community-perks";
import {
  openRecommendationDatabase,
  recommendationDatabasePath,
  recommendationDatabaseSchemaVersion,
  recommendationMetadataValue
} from "./recommendationDatabase.js";

const requiredCsvHeaders = [
  "页面", "分类", "武器", "评级", "排名", "来源URL", "页面更新时间", "来源位置",
  "图标", "图标图标URL", "属性", "框架", "赛季", "来源", "勇士", "勇士图标URL",
  "弹药生成", "枪管", "弹匣", "大师", "Perk 1", "Perk 2", "起源特性", "注解",
  "护盾", "充能效率", "武器ID", "英文名称", "版本", "推荐来源", "用途"
] as const;
const stableSourceKeys: Record<string, string> = {
  Aegis推荐: "aegis",
  LGpig推荐: "lgpig",
  YXCRALLXY推荐表: "yxcrallxy",
  Sayalarry推荐表: "sayalarry",
  DIM社区愿望单: "dim_voltron"
};
const stableSourceUrls: Record<string, string> = {
  Aegis推荐: "https://docs.google.com/spreadsheets/d/1JM-0SlxVDAi-C6rGVlLxa-J1WGewEeL8Qvq4htWZHhY/edit?gid=346832350#gid=346832350",
  LGpig推荐: "https://destiny2-starside-dea-mods-d1g0j2rile2323f73.webapps.tcloudbase.com/pve-farming/index.html",
  YXCRALLXY推荐表: "https://docs.qq.com/sheet/DYkR5enNIdUt1VFhK?tab=000001&_t=1788087335795&nlc=1",
  Sayalarry推荐表: "https://sa7vp10ytxr.feishu.cn/wiki/W3ySwdahTiNRUJklJNBc0CMPnkb",
  DIM社区愿望单: "https://github.com/48klocs/dim-wish-list-sources"
};

export type WeaponRecommendationKnowledgeStatus = {
  schema_version: number;
  database_path: string;
  source_fingerprint: string;
  imported_at: string;
  recommendation_count: number;
  weapon_count: number;
  source_count: number;
};

export type WeaponKnowledgeImportPreview = {
  file_name: string;
  recommendation_count: number;
  weapon_count: number;
  source_count: number;
  source_labels: string[];
  fingerprint: string;
};

export type WeaponKnowledgeImportResult = WeaponRecommendationKnowledgeStatus & {
  file_name: string;
};

type KnowledgeRecommendation = {
  id: number;
  identity_key: string;
  weapon_name: string;
  normalized_weapon_name: string;
  english_name: string;
  normalized_english_name: string;
  source_id: string;
  source_label: string;
  source_url: string;
  source_default_url: string;
  purpose: Array<"pve" | "pvp" | "general">;
  rating: string;
  ranking: string;
  note: string;
  page_updated_at: string;
  version: string;
  source_location: string;
  item_hashes: number[];
  requirements: Record<RecommendationRequirementSlot, string[]>;
};

type KnowledgeCache = {
  byName: Map<string, KnowledgeRecommendation[]>;
  byItemHash: Map<number, KnowledgeRecommendation[]>;
};

const knowledgeCaches = new Map<string, KnowledgeCache | null>();

/** Returns the only supported column contract for manually maintained knowledge CSV files. */
export function createWeaponRecommendationCsvTemplate(): string {
  return `\uFEFF${requiredCsvHeaders.join(",")}\r\n`;
}

/** Validates a CSV without changing the active SQLite knowledge database. */
export function previewWeaponRecommendationCsv(
  text: string,
  fileName: string
): WeaponKnowledgeImportPreview {
  const rows = parseKnowledgeCsv(text);
  const sourceLabels = [...new Set(rows.map((row) => row["推荐来源"].trim()))].sort((left, right) => (
    left.localeCompare(right, "zh-CN")
  ));
  return {
    file_name: basename(fileName) || "weapon-recommendations.csv",
    recommendation_count: rows.length,
    weapon_count: new Set(rows.map(weaponIdentityKey)).size,
    source_count: sourceLabels.length,
    source_labels: sourceLabels,
    fingerprint: csvFingerprint(text)
  };
}

/**
 * Imports a previously previewed CSV and keeps a managed copy for later application starts.
 * Both the managed file and SQLite replacement are rolled back when the import fails.
 */
export async function importWeaponRecommendationCsv(
  dataDir: string,
  csvPath: string,
  expectedFingerprint: string,
  now = new Date()
): Promise<WeaponKnowledgeImportResult> {
  const csvText = readFileSync(csvPath, "utf8");
  const preview = previewWeaponRecommendationCsv(csvText, csvPath);
  if (preview.fingerprint !== expectedFingerprint) {
    throw new Error("武器推荐 CSV 在预览后发生了变化，请重新选择文件。");
  }

  const managedPath = join(dataDir, "imports", "weapon-recommendations.csv");
  const staged = await stageManagedCsv(managedPath, csvText);
  try {
    const status = await syncWeaponRecommendationKnowledge(dataDir, managedPath, now);
    if (!status) throw new Error("武器推荐 CSV 导入失败。");
    await staged.commit();
    return { ...status, file_name: preview.file_name };
  } catch (error) {
    await staged.rollback();
    throw error;
  }
}

export function readWeaponRecommendationKnowledgeStatus(
  dataDir: string
): WeaponRecommendationKnowledgeStatus | null {
  const path = recommendationDatabasePath(dataDir);
  if (!existsSync(path)) return null;
  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(path, { readOnly: true, timeout: 5_000 });
    return knowledgeStatus(database, path);
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

/**
 * Imports the reviewed CSV into the durable application knowledge database.
 * Re-imports are skipped when the source fingerprint and schema version match.
 */
export async function syncWeaponRecommendationKnowledge(
  dataDir: string,
  csvPath: string,
  now = new Date()
): Promise<WeaponRecommendationKnowledgeStatus | null> {
  if (!existsSync(csvPath)) return null;
  if (!Number.isFinite(now.getTime())) {
    throw new Error("武器推荐知识库导入时间无效。");
  }

  const csvText = readFileSync(csvPath, "utf8");
  const sourceFingerprint = csvFingerprint(csvText);
  const rows = parseKnowledgeCsv(csvText);
  const database = openRecommendationDatabase(dataDir);
  try {
    const currentFingerprint = recommendationMetadataValue(database, "source_fingerprint");
    const currentSchemaVersion = recommendationMetadataValue(database, "schema_version");
    if (
      currentFingerprint === sourceFingerprint
      && currentSchemaVersion === String(recommendationDatabaseSchemaVersion)
    ) {
      return knowledgeStatus(database, recommendationDatabasePath(dataDir));
    }

    replaceKnowledge(database, rows, sourceFingerprint, now.toISOString());
    knowledgeCaches.delete(recommendationDatabasePath(dataDir));
    return knowledgeStatus(database, recommendationDatabasePath(dataDir));
  } finally {
    database.close();
  }
}

/** Creates the built-in name-level recommendation source backed by SQLite. */
export function createWeaponRecommendationKnowledgeSource(dataDir: string): CommunityPerkSource {
  let cache: KnowledgeCache | null | undefined;
  const loadCache = (): KnowledgeCache | null => {
    if (cache !== undefined) return cache;
    const path = recommendationDatabasePath(dataDir);
    if (knowledgeCaches.has(path)) {
      cache = knowledgeCaches.get(path) ?? null;
      return cache;
    }
    cache = loadKnowledgeCache(dataDir);
    knowledgeCaches.set(path, cache);
    return cache;
  };

  return {
    name: "内置武器推荐知识库",
    isAvailable: () => loadCache() !== null,
    async getRecommendations(item_hash: number, options: SourceOptions): Promise<WeaponRecommendation | null> {
      const knowledge = loadCache();
      if (!knowledge) return null;

      const itemDefinition = options.itemDefinitions?.[String(item_hash)];
      const localizedNames = [
        options.item_name,
        itemDefinition?.displayProperties?.name
      ].filter((value): value is string => Boolean(value?.trim()));
      const englishName = options.englishItemDefinitions?.[String(item_hash)]?.displayProperties?.name;
      const matching = selectKnowledgeRecommendations(
        knowledge,
        item_hash,
        localizedNames,
        englishName
      );
      if (matching.length === 0) return null;

      const perkMap = buildWeaponPerkMap(item_hash, options);
      const combos: PerkCombo[] = [];
      const weaponLevelRecommendations: NonNullable<WeaponRecommendation["weapon_level_recommendations"]> = [];
      // DIM Voltron 必须由原生 Wishlist 解析器保留一行一个完整组合。
      // CSV 中的 dim_voltron 行只是阅读汇总，不能把多个组合候选池重新拼成 Roll。
      const matchableRecommendations = matching.filter((recommendation) => recommendation.source_id !== "dim_voltron");
      const sourceRecords = matchableRecommendations.map((recommendation) => buildSourceRecord(recommendation, perkMap));
      const resolvedSourceLabels = new Set(matchableRecommendations.map((recommendation) => recommendation.source_label));
      for (const recommendation of matchableRecommendations) {
        const perk1Names = recommendation.requirements.perk1;
        const perk2Names = recommendation.requirements.perk2;
        if (perk1Names.length === 0 && perk2Names.length === 0) {
          for (const mode of recommendation.purpose) {
            weaponLevelRecommendations.push({
              source: "local_community",
              mode,
              source_label: recommendation.source_label,
              note: recommendationNote(recommendation)
            });
          }
          continue;
        }
        const first = resolveRecommendedPerks(perk1Names, perkMap);
        const second = resolveRecommendedPerks(perk2Names, perkMap);
        if (first.length === 0 || second.length === 0) continue;
        for (const mode of recommendation.purpose) {
          for (const perk1 of first) {
            for (const perk2 of second) {
              combos.push({
                perks: [perk1, perk2],
                source: "local_community",
                mode,
                note: recommendationNote(recommendation)
              });
            }
          }
        }
      }
      if (combos.length === 0 && weaponLevelRecommendations.length === 0 && sourceRecords.length === 0) return null;

      const modes = [
        ...combos.map((combo) => combo.mode),
        ...weaponLevelRecommendations.map((entry) => entry.mode),
        ...sourceRecords.flatMap((record) => record.purposes)
      ];

      return {
        item_hash,
        item_name: itemDefinition?.displayProperties?.name ?? options.item_name ?? matching[0].weapon_name,
        combos: uniqueCombos(combos),
        matched_modes: [...new Set(modes)],
        ...(combos.length ? { individual_perks: uniquePerks(combos) } : {}),
        ...(weaponLevelRecommendations.length ? { weapon_level_recommendations: weaponLevelRecommendations } : {}),
        source_records: sourceRecords,
        sample_size: matchableRecommendations.length,
        source_label: [...resolvedSourceLabels].join(" / "),
        disclaimer: "来自应用内置的本地武器推荐知识库，推荐按官方武器身份汇总，并以当前实例实际 Perk 判断。"
      };
    }
  };
}

function selectKnowledgeRecommendations(
  knowledge: KnowledgeCache,
  itemHash: number,
  localizedNames: string[],
  englishName?: string
): KnowledgeRecommendation[] {
  const exactMatches = knowledge.byItemHash.get(itemHash) ?? [];
  const englishKey = normalizeName(englishName ?? "");
  const localizedKeys = [...new Set(localizedNames.map(normalizeName).filter(Boolean))];
  const candidates = uniqueById([
    ...exactMatches,
    ...(englishKey ? knowledge.byName.get(englishKey) ?? [] : []),
    ...localizedKeys.flatMap((name) => knowledge.byName.get(name) ?? [])
  ]);
  const bySource = new Map<string, KnowledgeRecommendation[]>();
  for (const candidate of candidates) {
    const bucket = bySource.get(candidate.source_id) ?? [];
    bucket.push(candidate);
    bySource.set(candidate.source_id, bucket);
  }

  const selected: KnowledgeRecommendation[] = [];
  for (const sourceCandidates of bySource.values()) {
    const sourceExactMatches = sourceCandidates.filter((candidate) => candidate.item_hashes.includes(itemHash));
    if (sourceExactMatches.length) {
      selected.push(...sourceExactMatches);
      continue;
    }
    if (englishKey) {
      const sourceEnglishMatches = sourceCandidates.filter((candidate) => (
        candidate.normalized_english_name === englishKey
      ));
      if (sourceEnglishMatches.length) {
        selected.push(...sourceEnglishMatches);
        continue;
      }
    }
    // Hash 只用于优先确认身份。旧版、复刻版或高阶版拥有不同 Hash 时，
    // 只要当前来源中的官方中文名称唯一，仍共享同一条武器推荐。
    if (sourceCandidates.length === 1) {
      selected.push(sourceCandidates[0]);
    }
  }
  return uniqueById(selected);
}

function replaceKnowledge(
  database: DatabaseSync,
  rows: Array<Record<string, string>>,
  sourceFingerprint: string,
  importedAt: string
): void {
  const insertSource = database.prepare(`
    INSERT INTO recommendation_sources (source_key, label, source_url)
    VALUES (?, ?, ?)
    ON CONFLICT(source_key) DO UPDATE SET label = excluded.label, source_url = excluded.source_url
  `);
  const selectSource = database.prepare("SELECT id FROM recommendation_sources WHERE source_key = ?");
  const insertRecommendation = database.prepare(`
    INSERT INTO weapon_recommendations (
      identity_key, normalized_weapon_name, weapon_name, normalized_english_name, english_name, source_id,
      page, rating, ranking, category, source_url, page_updated_at, version, source_location,
      icon, icon_url, stats, frame, season, acquisition_source, champion, champion_icon_url,
      ammo_generation, note, shield, charge_efficiency
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);
  const insertItemId = database.prepare(`
    INSERT OR IGNORE INTO weapon_recommendation_item_ids (recommendation_id, item_hash) VALUES (?, ?)
  `);
  const insertPurpose = database.prepare(`
    INSERT OR IGNORE INTO weapon_recommendation_purposes (recommendation_id, purpose) VALUES (?, ?)
  `);
  const insertPerk = database.prepare(`
    INSERT OR IGNORE INTO weapon_recommendation_perks (
      recommendation_id, slot, ordinal, perk_name, normalized_perk_name
    ) VALUES (?, ?, ?, ?, ?)
  `);
  const writeMetadata = database.prepare(`
    INSERT INTO knowledge_metadata (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  database.exec("BEGIN IMMEDIATE;");
  try {
    database.exec(`
      DELETE FROM weapon_recommendation_perks;
      DELETE FROM weapon_recommendation_purposes;
      DELETE FROM weapon_recommendation_item_ids;
      DELETE FROM weapon_recommendations;
      DELETE FROM recommendation_sources;
      DELETE FROM knowledge_metadata
      WHERE key IN ('schema_version', 'source_fingerprint', 'imported_at');
    `);

    for (const row of rows) {
      const weaponName = row["武器"]?.trim();
      const sourceLabel = row["推荐来源"]?.trim();
      if (!weaponName || !sourceLabel) continue;

      const sourceKey = stableSourceKeys[sourceLabel] ?? normalizeName(sourceLabel);
      insertSource.run(
        sourceKey,
        sourceLabel,
        stableSourceUrls[sourceLabel] ?? row["来源URL"]?.trim() ?? ""
      );
      const source = selectSource.get(sourceKey) as { id: number } | undefined;
      if (!source) continue;

      const result = insertRecommendation.run(
        weaponIdentityKey(row),
        normalizeName(weaponName),
        weaponName,
        normalizeName(row["英文名称"] ?? ""),
        row["英文名称"]?.trim() ?? "",
        source.id,
        row["页面"]?.trim() ?? "",
        row["评级"]?.trim() ?? "",
        row["排名"]?.trim() ?? "",
        row["分类"]?.trim() ?? "",
        row["来源URL"]?.trim() ?? "",
        row["页面更新时间"]?.trim() ?? "",
        row["版本"]?.trim() ?? "",
        row["来源位置"]?.trim() ?? "",
        row["图标"]?.trim() ?? "",
        row["图标图标URL"]?.trim() ?? "",
        row["属性"]?.trim() ?? "",
        row["框架"]?.trim() ?? "",
        row["赛季"]?.trim() ?? "",
        row["来源"]?.trim() ?? "",
        row["勇士"]?.trim() ?? "",
        row["勇士图标URL"]?.trim() ?? "",
        row["弹药生成"]?.trim() ?? "",
        row["注解"]?.trim() ?? "",
        row["护盾"]?.trim() ?? "",
        row["充能效率"]?.trim() ?? ""
      );
      const recommendationId = Number(result.lastInsertRowid);

      const itemHashValues = splitValues(row["武器ID"] ?? "");
      const itemHashes = itemHashValues.map(Number);
      if (itemHashes.some((value) => !Number.isInteger(value) || value < 0 || value > 0xffff_ffff)) {
        throw new Error(`武器推荐 CSV 的武器 ID 无效：${weaponName} / ${sourceLabel}`);
      }
      for (const itemHash of itemHashes) {
        insertItemId.run(recommendationId, itemHash);
      }
      for (const purpose of parsePurposes(row["用途"] ?? "")) {
        insertPurpose.run(recommendationId, purpose);
      }
      for (const [slot, field] of [
        ["barrel", "枪管"],
        ["magazine", "弹匣"],
        ["masterwork", "大师"],
        ["perk1", "Perk 1"],
        ["perk2", "Perk 2"],
        ["origin", "起源特性"]
      ] as const) {
        splitValues(row[field] ?? "").forEach((perkName, ordinal) => {
          insertPerk.run(recommendationId, slot, ordinal, perkName, normalizeName(perkName));
        });
      }
    }

    writeMetadata.run("schema_version", String(recommendationDatabaseSchemaVersion));
    writeMetadata.run("source_fingerprint", sourceFingerprint);
    writeMetadata.run("imported_at", importedAt);
    database.exec("COMMIT;");
  } catch (error) {
    try {
      database.exec("ROLLBACK;");
    } catch {
      // 保留原始导入错误。
    }
    throw error;
  }
}

function loadKnowledgeCache(dataDir: string): KnowledgeCache | null {
  const path = recommendationDatabasePath(dataDir);
  if (!existsSync(path)) return null;
  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(path, { readOnly: true, timeout: 5_000 });
    const recommendations = database.prepare(`
      SELECT r.id, r.identity_key, r.weapon_name, r.normalized_weapon_name, r.english_name,
             r.normalized_english_name, s.source_key AS source_id, s.label AS source_label,
             r.source_url, s.source_url AS source_default_url, r.rating, r.ranking, r.note,
             r.page_updated_at, r.version, r.source_location
      FROM weapon_recommendations r
      JOIN recommendation_sources s ON s.id = r.source_id
      ORDER BY r.id
    `).all() as Array<Omit<KnowledgeRecommendation, "purpose" | "requirements" | "item_hashes">>;
    if (recommendations.length === 0) return null;

    const purposes = database.prepare(`
      SELECT recommendation_id, purpose FROM weapon_recommendation_purposes ORDER BY recommendation_id, purpose
    `).all() as Array<{ recommendation_id: number; purpose: "pve" | "pvp" | "general" }>;
    const perks = database.prepare(`
      SELECT recommendation_id, slot, perk_name
      FROM weapon_recommendation_perks
      ORDER BY recommendation_id, slot, ordinal
    `).all() as Array<{
      recommendation_id: number;
      slot: RecommendationRequirementSlot;
      perk_name: string;
    }>;
    const itemIds = database.prepare(`
      SELECT recommendation_id, item_hash
      FROM weapon_recommendation_item_ids
      ORDER BY recommendation_id, item_hash
    `).all() as Array<{ recommendation_id: number; item_hash: number }>;

    const purposesById = groupValues(purposes);
    const requirementsById = groupRequirements(perks);
    const itemHashesById = groupItemHashes(itemIds);
    const byName = new Map<string, KnowledgeRecommendation[]>();
    const byItemHash = new Map<number, KnowledgeRecommendation[]>();
    for (const row of recommendations) {
      const recommendation: KnowledgeRecommendation = {
        ...row,
        purpose: purposesById.get(row.id) ?? ["general"],
        item_hashes: itemHashesById.get(row.id) ?? [],
        requirements: requirementsById.get(row.id) ?? emptyRequirements()
      };
      for (const key of [row.normalized_weapon_name, row.normalized_english_name].filter(Boolean)) {
        const bucket = byName.get(key) ?? [];
        bucket.push(recommendation);
        byName.set(key, bucket);
      }
      for (const itemHash of recommendation.item_hashes) {
        const bucket = byItemHash.get(itemHash) ?? [];
        bucket.push(recommendation);
        byItemHash.set(itemHash, bucket);
      }
    }
    return { byName, byItemHash };
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

function buildWeaponPerkMap(itemHash: number, options: SourceOptions): Map<string, PerkRef[]> {
  const map = new Map<string, PerkRef[]>();
  const itemDefinition = options.itemDefinitions?.[String(itemHash)];
  if (!itemDefinition || !options.itemDefinitions) return map;

  const groups = summarizeItemPerks(itemDefinition, options.itemDefinitions, {
    plugSetDefinitions: options.plugSetDefinitions,
    maxPlugsPerSocket: null
  });
  for (const plug of groups.flatMap((group) => group.plugs)) {
    addPerkReference(map, plug.name, plug);
    const englishName = options.englishItemDefinitions?.[String(plug.hash)]?.displayProperties?.name?.trim();
    if (englishName) addPerkReference(map, englishName, plug, englishName);
  }
  return map;
}

function addPerkReference(
  map: Map<string, PerkRef[]>,
  name: string,
  plug: ItemPlugSummary,
  englishName?: string
): void {
  const key = normalizeName(name);
  if (!key) return;
  const bucket = map.get(key) ?? [];
  if (!bucket.some((entry) => entry.hash === plug.hash)) {
    bucket.push({
      hash: plug.hash,
      name: plug.name,
      ...(englishName ? { englishName } : {}),
      description: plug.description,
      icon: plug.icon
    });
  }
  map.set(key, bucket);
}

function resolveRecommendedPerks(names: string[], map: Map<string, PerkRef[]>): PerkRef[] {
  const resolved = names.flatMap((name) => resolveRecommendedPerkName(name, map));
  return [...new Map(resolved.map((perk) => [perk.hash, perk])).values()];
}

function resolveRecommendedPerkName(name: string, map: Map<string, PerkRef[]>): PerkRef[] {
  const normalized = normalizeName(name);
  const exact = map.get(normalized);
  if (exact?.length) return exact;
  if (!normalized) return [];

  const matchingKeys = [...map.keys()].filter((candidate) => (
    candidate.includes(normalized) || normalized.includes(candidate)
  ));
  return matchingKeys.length === 1 ? map.get(matchingKeys[0]) ?? [] : [];
}

function buildSourceRecord(
  recommendation: KnowledgeRecommendation,
  perkMap: Map<string, PerkRef[]>
): RecommendationSourceRecord {
  const requirements = recommendationSlots.flatMap(({ slot, label }) => {
    const names = recommendation.requirements[slot].filter((name) => !isUnspecifiedRequirementName(name));
    if (names.length === 0) return [];
    const resolvedNames = names.filter((name) => resolveRecommendedPerkName(name, perkMap).length > 0);
    return [{
      slot,
      label,
      // 来源中已经完成清洗的有效要求必须全部进入分母。当前 Hash 的定义池
      // 只负责补充可用 Hash，不能删除其他同名版本提出的 Perk 要求。
      candidate_names: names,
      candidates: resolveRecommendedPerks(names, perkMap),
      unresolved_candidate_names: names.filter((name) => !resolvedNames.includes(name))
    }];
  });
  return {
    source_id: recommendation.source_id,
    source_label: recommendation.source_label,
    source_url: recommendation.source_url || recommendation.source_default_url || undefined,
    purposes: recommendation.purpose,
    ...(recommendation.rating ? { rating: recommendation.rating } : {}),
    ...(recommendation.ranking ? { ranking: recommendation.ranking } : {}),
    ...(recommendation.note ? { note: recommendation.note } : {}),
    ...(recommendation.page_updated_at ? { page_updated_at: recommendation.page_updated_at } : {}),
    ...(recommendation.version ? { version: recommendation.version } : {}),
    ...(recommendation.source_location ? { source_location: recommendation.source_location } : {}),
    requirements
  };
}

function isUnspecifiedRequirementName(value: string): boolean {
  const normalized = normalizeName(value);
  return normalized === "任意"
    || normalized === "不限"
    || normalized === "不限制"
    || normalized === "any";
}

const recommendationSlots: Array<{ slot: RecommendationRequirementSlot; label: string }> = [
  { slot: "barrel", label: "枪管/瞄具" },
  { slot: "magazine", label: "第二列" },
  { slot: "masterwork", label: "大师" },
  { slot: "perk1", label: "Perk 1" },
  { slot: "perk2", label: "Perk 2" },
  { slot: "origin", label: "起源特性" }
];

function recommendationNote(recommendation: KnowledgeRecommendation): string | undefined {
  return [
    `来源 ${recommendation.source_label}`,
    recommendation.rating ? `评级 ${recommendation.rating}` : "",
    recommendation.note
  ]
    .filter(Boolean)
    .join("；") || undefined;
}

function uniqueCombos(combos: PerkCombo[]): PerkCombo[] {
  const seen = new Set<string>();
  return combos.filter((combo) => {
    const key = `${combo.mode}:${combo.perks.map((perk) => perk.hash).join(",")}:${combo.note ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniquePerks(combos: PerkCombo[]): PerkRef[] {
  return [...new Map(combos.flatMap((combo) => combo.perks).map((perk) => [perk.hash, perk])).values()];
}

function uniqueById(values: KnowledgeRecommendation[]): KnowledgeRecommendation[] {
  return [...new Map(values.map((value) => [value.id, value])).values()];
}

function parseKnowledgeCsv(text: string): Array<Record<string, string>> {
  const records = parseCsvRecords(text.replace(/^\uFEFF/, ""));
  const headers = records.shift()?.map((value) => value.trim()) ?? [];
  if (
    headers.length !== requiredCsvHeaders.length
    || requiredCsvHeaders.some((header, index) => headers[index] !== header)
  ) {
    throw new Error(`武器推荐 CSV 表头必须与应用标准模板的 ${requiredCsvHeaders.length} 列完全一致。`);
  }
  const dataRecords = records.filter((record) => record.some((value) => value.trim()));
  const invalidColumnIndex = dataRecords.findIndex((record) => record.length !== headers.length);
  if (invalidColumnIndex >= 0) {
    throw new Error(`武器推荐 CSV 第 ${invalidColumnIndex + 2} 行列数与表头不一致。`);
  }
  const rows = dataRecords
    .map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])));
  if (rows.length === 0) {
    throw new Error("武器推荐 CSV 没有可导入的数据行。");
  }
  if (rows.some((row) => !row["武器"]?.trim() || !row["推荐来源"]?.trim())) {
    throw new Error("武器推荐 CSV 存在缺少武器名称或推荐来源的数据行。");
  }
  const uniqueKeys = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const weaponName = row["武器"].trim();
    const sourceLabel = row["推荐来源"].trim();
    const uniqueKey = `${weaponIdentityKey(row)}\u0000${normalizeName(sourceLabel)}`;
    if (uniqueKeys.has(uniqueKey)) {
      const identityLabel = row["英文名称"]?.trim() || row["武器ID"]?.trim() || weaponName;
      throw new Error(`武器推荐 CSV 第 ${index + 2} 行的武器身份与来源在前文已经存在：${weaponName} / ${identityLabel} / ${sourceLabel}`);
    }
    uniqueKeys.add(uniqueKey);

    const itemHashes = splitValues(row["武器ID"] ?? "").map(Number);
    if (itemHashes.some((value) => !isUnsignedHash(value))) {
      throw new Error(`武器推荐 CSV 第 ${index + 2} 行的武器 ID 无效：${weaponName} / ${sourceLabel}`);
    }
  }
  return rows;
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === "," && !quoted) {
      record.push(value);
      value = "";
      continue;
    }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index++;
      record.push(value);
      records.push(record);
      record = [];
      value = "";
      continue;
    }
    value += character;
  }
  if (quoted) {
    throw new Error("武器推荐 CSV 存在未闭合的引号字段。");
  }
  if (value || record.length) {
    record.push(value);
    records.push(record);
  }
  return records;
}

function parsePurposes(value: string): Array<"pve" | "pvp" | "general"> {
  const normalized = value.toLocaleLowerCase();
  const purposes: Array<"pve" | "pvp" | "general"> = [];
  if (normalized.includes("pve")) purposes.push("pve");
  if (normalized.includes("pvp")) purposes.push("pvp");
  if (normalized.includes("通用") || normalized.includes("general") || purposes.length === 0) purposes.push("general");
  return purposes;
}

function splitValues(value: string): string[] {
  return [...new Set(value.split(/\s+\/\s+|[；;\n]+/).map((part) => part.trim()).filter(Boolean))];
}

function normalizeName(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{Z}\s]+/gu, "");
}

function weaponIdentityKey(row: Record<string, string>): string {
  const englishName = normalizeName(row["英文名称"] ?? "");
  if (englishName) return `en:${englishName}`;
  const itemHashes = splitValues(row["武器ID"] ?? "")
    .map(Number)
    .filter(isUnsignedHash)
    .sort((left, right) => left - right);
  if (itemHashes.length) return `hash:${itemHashes.join("|")}`;
  return `zh:${normalizeName(row["武器"] ?? "")}`;
}

function isUnsignedHash(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function csvFingerprint(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function knowledgeStatus(database: DatabaseSync, path: string): WeaponRecommendationKnowledgeStatus {
  const counts = database.prepare(`
    SELECT
      (SELECT COUNT(*) FROM weapon_recommendations) AS recommendation_count,
      (SELECT COUNT(DISTINCT identity_key) FROM weapon_recommendations) AS weapon_count,
      (SELECT COUNT(*) FROM recommendation_sources) AS source_count
  `).get() as { recommendation_count: number; weapon_count: number; source_count: number };
  return {
    schema_version: recommendationDatabaseSchemaVersion,
    database_path: path,
    source_fingerprint: recommendationMetadataValue(database, "source_fingerprint"),
    imported_at: recommendationMetadataValue(database, "imported_at"),
    recommendation_count: Number(counts.recommendation_count),
    weapon_count: Number(counts.weapon_count),
    source_count: Number(counts.source_count)
  };
}

function groupValues(
  rows: Array<{ recommendation_id: number; purpose: "pve" | "pvp" | "general" }>
): Map<number, Array<"pve" | "pvp" | "general">> {
  const grouped = new Map<number, Array<"pve" | "pvp" | "general">>();
  for (const row of rows) grouped.set(row.recommendation_id, [...(grouped.get(row.recommendation_id) ?? []), row.purpose]);
  return grouped;
}

function groupItemHashes(
  rows: Array<{ recommendation_id: number; item_hash: number }>
): Map<number, number[]> {
  const grouped = new Map<number, number[]>();
  for (const row of rows) {
    grouped.set(row.recommendation_id, [...(grouped.get(row.recommendation_id) ?? []), row.item_hash]);
  }
  return grouped;
}

function groupRequirements(
  rows: Array<{
    recommendation_id: number;
    slot: RecommendationRequirementSlot;
    perk_name: string;
  }>
): Map<number, Record<RecommendationRequirementSlot, string[]>> {
  const grouped = new Map<number, Record<RecommendationRequirementSlot, string[]>>();
  for (const row of rows) {
    const requirements = grouped.get(row.recommendation_id) ?? emptyRequirements();
    requirements[row.slot].push(row.perk_name);
    grouped.set(row.recommendation_id, requirements);
  }
  return grouped;
}

function emptyRequirements(): Record<RecommendationRequirementSlot, string[]> {
  return {
    barrel: [],
    magazine: [],
    masterwork: [],
    perk1: [],
    perk2: [],
    origin: []
  };
}

async function stageManagedCsv(path: string, contents: string): Promise<{
  commit(): Promise<void>;
  rollback(): Promise<void>;
}> {
  await mkdir(dirname(path), { recursive: true });
  const suffix = `${process.pid}-${Date.now()}-${randomUUID()}`;
  const temporaryPath = `${path}.tmp-${suffix}`;
  const backupPath = `${path}.backup-${suffix}`;
  const hadPrevious = existsSync(path);
  await writeFile(temporaryPath, contents, "utf8");
  try {
    if (hadPrevious) await rename(path, backupPath);
    await rename(temporaryPath, path);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    if (hadPrevious && existsSync(backupPath) && !existsSync(path)) {
      await rename(backupPath, path).catch(() => undefined);
    }
    throw error;
  }

  return {
    async commit() {
      await rm(backupPath, { force: true }).catch(() => undefined);
    },
    async rollback() {
      await rm(path, { force: true }).catch(() => undefined);
      if (hadPrevious && existsSync(backupPath)) {
        await rename(backupPath, path);
      }
    }
  };
}
