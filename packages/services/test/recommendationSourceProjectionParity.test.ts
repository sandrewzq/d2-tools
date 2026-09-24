import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { DefinitionComponentData } from "@d2-tools/core/manifest/definitions";
import {
  importWeaponRecommendationCsv,
  previewWeaponRecommendationCsv
} from "../src/community/weaponRecommendationKnowledge.js";
import { createDefaultCommunityPerkService } from "../src/community/perkRecommendation.js";
import { saveDimWishlist } from "../src/analysis/wishlistStore.js";
import { loadRecommendationSources } from "../src/community/recommendationDocumentStore.js";
import { readRecommendationManagementSnapshot } from "../src/community/recommendationManagement.js";
import { setRecommendationSourceState } from "../src/community/recommendationOverrides.js";
import type { WeaponKnowledgeSemanticDefinitions } from "../src/community/weaponRecommendationKnowledge.js";

/**
 * L3-2c：**同一份事实、两种编码方式 → 投影必须逐字段相同**。
 *
 * 这是 I1 唯一还没被网住的地方：归约与「武器级推荐」的判断过去散在各个适配器里，
 * 于是同一份事实换一种格式写出来，输出就不一样。两条已证实的分叉：
 *
 * 1. 「每栏任选其一」——DIM 把笛卡尔积**归约**成逐栏候选池，CSV 走 `一格多值`（`特性甲 / 特性乙`）
 *    直接就是逐栏候选。两者**已经收敛**，这条是回归网。
 * 2. 「只点枪管」——DIM 认为它有可核对的栏位要求，CSV 过去用「没点 Perk 1 / Perk 2」判断，
 *    把它算成**武器级推荐**。武器级条数直接进 `matched` / `available`，用户看到的符合度
 *    因此随格式而变。这条是正确的判据该被抽出来的地方。
 *
 * 本文件先红后绿：先钉住「两边必须相同」，再把判据抽到 core 上做一次。
 */

const weaponHash = 5001;
const barrelA = 6005;
const barrelB = 6006;
const perkA = 6001;
const perkB = 6002;
const perkC = 6003;
const perkD = 6004;

/** 一把枪：一栏枪管、两栏特性。两种编码用同一份定义池，格式之外没有第二个变量。 */
const definitions: WeaponKnowledgeSemanticDefinitions = {
  item_definitions: {
    [String(weaponHash)]: {
      hash: weaponHash,
      itemTypeDisplayName: "步枪",
      displayProperties: { name: "测试步枪", description: "test rifle" },
      sockets: {
        socketEntries: [
          { reusablePlugItems: [{ plugItemHash: barrelA }, { plugItemHash: barrelB }] },
          { reusablePlugItems: [{ plugItemHash: perkA }, { plugItemHash: perkB }] },
          { reusablePlugItems: [{ plugItemHash: perkC }, { plugItemHash: perkD }] }
        ]
      }
    }
  },
  plug_definitions: {
    [String(barrelA)]: plugDefinition(barrelA, "枪管甲", "barrel"),
    [String(barrelB)]: plugDefinition(barrelB, "枪管乙", "barrel"),
    [String(perkA)]: plugDefinition(perkA, "特性甲", "frames"),
    [String(perkB)]: plugDefinition(perkB, "特性乙", "frames"),
    [String(perkC)]: plugDefinition(perkC, "特性丙", "frames"),
    [String(perkD)]: plugDefinition(perkD, "特性丁", "frames")
  },
  plug_set_definitions: {}
};

function plugDefinition(hash: number, name: string, category: string) {
  return {
    hash,
    itemTypeDisplayName: category === "barrel" ? "枪管" : "特性",
    plug: { plugCategoryIdentifier: category },
    displayProperties: { name, description: name }
  };
}

const runtimeDefinitions = {
  ...definitions.item_definitions,
  ...definitions.plug_definitions
} as DefinitionComponentData;

const unifiedHeader = "推荐来源,武器,规则名称,用途/分类,枪管/瞄具,弹匣,大师,Perk 1,Perk 2,起源特性,评级,备注";
const playerHeader = "武器,武器ID,英文名称,推荐来源,用途,第一列,第二列,Perk 1,Perk 2,大师,起源特性,评级,备注";

const sourceName = "同源推荐";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "d2-tools-projection-"));
}

function recommendationFor(dir: string) {
  return createDefaultCommunityPerkService({ data: { data_dir: dir } })
    .getRecommendationsWithAllSources(weaponHash, {
      manifest_version: "test-manifest-projection",
      item_name: "测试步枪",
      itemDefinitions: runtimeDefinitions
    });
}

type RecordShape = {
  purposes: string[];
  requirements: Array<{ slot: string; hashes: number[] }>;
};

/**
 * 只保留「事实投影」：来源名、来源 id、署名文案都属于允许不同的部分。
 * 栏位、候选集合与**武器级条数**才是 I1 要求逐字段相同的部分——
 * 后者直接决定消费层的 `matched` / `available`。
 */
function factProjection(recommendation: Awaited<ReturnType<typeof recommendationFor>>) {
  const sortHashes = (left: number, right: number) => left - right;
  const records: RecordShape[] = (recommendation?.source_records ?? [])
    .map((record) => ({
      purposes: [...record.purposes].sort(),
      requirements: record.requirements
        .map((requirement) => ({
          slot: requirement.slot,
          hashes: requirement.candidates.map((candidate) => candidate.hash).sort(sortHashes)
        }))
        .sort((left, right) => (left.slot < right.slot ? -1 : left.slot > right.slot ? 1 : 0))
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return {
    weaponLevelModes: (recommendation?.weapon_level_recommendations ?? [])
      .map((entry) => entry.mode).sort(),
    records
  };
}

async function importCsv(dir: string, text: string): Promise<void> {
  const path = join(dir, "推荐.csv");
  writeFileSync(path, text, "utf8");
  const preview = previewWeaponRecommendationCsv(text, path, definitions);
  // 用 toEqual 而不是 toBe(true)：导入被挡住时要把每一条问题打出来，而不是只说一句 false。
  expect(preview.blocking_issues).toEqual([]);
  await importWeaponRecommendationCsv(dir, path, preview.fingerprint, {
    manifest_version: "test-manifest-projection",
    semantic_definitions: definitions
  }, { name: "CSV 编码", mode: "create" });
}

function importDim(dir: string, wishlist: DimWishlist): void {
  saveDimWishlist(dir, wishlist, { name: "DIM 编码", mode: "create" });
}

/** 管理面用的文档键——「停用整份导入」写的就是它，不依赖测试自己重算哈希。 */
function documentIdOf(dir: string): string {
  const documentId = loadRecommendationSources(dir)[0]?.documentId;
  if (!documentId) throw new Error("夹具没有导入任何文档。");
  return documentId;
}

/** 每个来源各铺开了几条记录——用来给「同一来源共用一个分组」这条断言做非空锚点。 */
function recordsPerSource(records: Array<{ source_id: string }>): number[] {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.source_id, (counts.get(record.source_id) ?? 0) + 1);
  return [...counts.values()];
}

function dimWishlist(perkHashesPerRule: number[][]): DimWishlist {
  return {
    title: sourceName,
    rules: perkHashesPerRule.map((perk_hashes, index) => ({
      rule_stable_id: `dim-${index + 1}`,
      item_hash: weaponHash,
      perk_hashes,
      mode: "pve" as const,
      note: ""
    }))
  };
}

/**
 * 「一个具名来源 = 一行」的可观察形状：分组数、具名来源数、以及有没有哪一行混着两个来源名。
 * 三个都得看——只看分组数，把两个来源并成一行、或把一个来源拆成两行都能骗过去。
 */
function namedSourceRows(
  records: Array<{ source_group_id: string; source_label: string; declared_label?: string }>
) {
  const labelsByGroup = new Map<string, Set<string>>();
  const declaredByGroup = new Map<string, Set<string>>();
  const declaredNames = new Set<string>();
  for (const record of records) {
    // 2026-09-24（原 Bug #107）：对外名统一成导入时起的文档标题，文件里声明的名字退成
    // `declared_label`。区分「几个具名来源」要看这一列。
    const declared = record.declared_label ?? record.source_label;
    declaredNames.add(declared);
    const labels = labelsByGroup.get(record.source_group_id) ?? new Set<string>();
    labels.add(record.source_label);
    labelsByGroup.set(record.source_group_id, labels);
    const declaredLabels = declaredByGroup.get(record.source_group_id) ?? new Set<string>();
    declaredLabels.add(declared);
    declaredByGroup.set(record.source_group_id, declaredLabels);
  }
  return {
    groups: labelsByGroup.size,
    namedSources: new Set(records.map((record) => record.source_label)).size,
    declaredSources: declaredNames.size,
    mixedLabels: [...labelsByGroup.values()].some((labels) => labels.size !== 1),
    mixedDeclaredLabels: [...declaredByGroup.values()].some((labels) => labels.size !== 1)
  };
}

/** 同一份事实的两种编码 → 投影逐字段相同。非空锚点写在里面：两边都空不算通过。 */
async function expectSameProjection(csvText: string, dimRules: number[][]): Promise<void> {
  const csvDir = tempDir();
  await importCsv(csvDir, csvText);
  const csvProjection = factProjection(await recommendationFor(csvDir));

  const dimDir = tempDir();
  importDim(dimDir, dimWishlist(dimRules));
  const dimProjection = factProjection(await recommendationFor(dimDir));

  // 没有这两条，「两边都是空的」也会通过。
  expect(csvProjection.records.length).toBeGreaterThan(0);
  expect(dimProjection.records.length).toBeGreaterThan(0);

  expect({ csv: csvProjection }).toEqual({ csv: dimProjection });
}

describe("L3-2c：同一事实的两种编码，投影必须相同", () => {
  it("每栏任选其一：CSV 的一格多值与 DIM 的展开规则投影逐字段相同", async () => {
    // CSV 表达「每栏任选其一」的方式是**一格多值**。展开写成多行是进不来的：
    // 同一「武器 + 推荐来源」第二次出现，导入期就判阻塞（`该武器身份与来源在文件前文已经存在`）。
    await expectSameProjection([
      unifiedHeader,
      [sourceName, "测试步枪", "两栏各二选一", "PvE", "", "", "", "特性甲 / 特性乙", "特性丙 / 特性丁", "", "S", ""].join(",")
    ].join("\n"), [
      [perkA, perkC], [perkA, perkD], [perkB, perkC], [perkB, perkD]
    ]);
  });

  it("只点枪管：单栏要求也算 Roll 推荐，不能退化成武器级", async () => {
    // 这条用旧版普通玩家模板：统一模板把 Perk 1 / Perk 2 列为必填，写不出「只点枪管」。
    // 但模板不是唯一入口，旧模板与完整数据包同样能进来——判据不能只在模板上成立。
    await expectSameProjection([
      playerHeader,
      ["测试步枪", String(weaponHash), "", sourceName, "PvE", "枪管甲", "", "", "", "", "", "S", ""].join(",")
    ].join("\n"), [
      [barrelA]
    ]);
  });

  it("「有就行」：没有 perk 要求的规则，两种编码都要出事实且投影相同", async () => {
    // Bug #97。愿望单里的异域武器写的就是「有就行」——只有武器、没有 perk 要求。
    // 这类规则过去被 DIM 适配器**整条滤掉**：命中了、来源名字也叫得出来，
    // 但比对结果里没有来源**编号**，于是左边的来源清单数不着它、
    // 按这份来源勾选也筛不出它，而武器自己还标着「符合推荐」。
    // 判据与格式无关：两边都得出事实，「每栏任选其一」的写法差异不改变这一点。
    // CSV 侧用旧版普通玩家模板：统一模板把 Perk 1 / Perk 2 列为必填，写不出「什么都不点」。
    await expectSameProjection([
      playerHeader,
      ["测试步枪", String(weaponHash), "", sourceName, "PvE", "", "", "", "", "", "", "S", ""].join(",")
    ].join("\n"), [
      []
    ]);
  });

  it("「有就行」的规则带出来源编号，命中条数一个不多（非空锚点写在断言里）", async () => {
    // 上一条钉「两种编码相同」，但没有钉住**带的是编号**——投影刻意丢掉了 `source_id`
    // （来源名、编号、署名允许两边不同）。而这次缺的恰恰就是编号，所以单独钉一次。
    const dir = tempDir();
    importDim(dir, dimWishlist([[]]));
    const recommendation = await recommendationFor(dir);

    // 非空锚点：没有这一条，下面「编号存在」会空转通过。
    expect(recommendation?.source_records).toHaveLength(1);
    expect(recommendation?.source_records?.[0]?.source_id).toBeTruthy();
    expect(recommendation?.source_records?.[0]?.requirements).toEqual([]);
    // 契约的不变那一半：修补只是补上「来自哪份来源」，命中条数照旧。
    expect(recommendation?.weapon_level_recommendations).toHaveLength(1);
  });

  it("分组键不携带格式概念，且同一来源的记录共用一个分组（生产者侧断言）", async () => {
    // 判据① 过去只在**消费层**（手搭夹具）断言过分组键，生产者侧没有网：
    // 适配器若把格式前缀写进 `source_group_id`，消费层的夹具察觉不到。
    // 这里直接从两个适配器的真实产出上钉住。
    const csvDir = tempDir();
    await importCsv(csvDir, [
      unifiedHeader,
      [sourceName, "测试步枪", "两栏各二选一", "PvE", "", "", "", "特性甲 / 特性乙", "特性丙 / 特性丁", "", "S", ""].join(",")
    ].join("\n"));

    // DIM 侧特意用**归约不成池**的三条规则：这样同一个来源会铺开成多条记录，
    // 第二条断言（同一来源共用一个分组）才不是空转。归约成池时只剩一条记录，测不到东西。
    const dimDir = tempDir();
    importDim(dimDir, dimWishlist([[perkA, perkC], [perkB, perkD], [perkA, perkB]]));

    const csvRecords = (await recommendationFor(csvDir))?.source_records ?? [];
    const dimRecords = (await recommendationFor(dimDir))?.source_records ?? [];
    // 非空锚点：两边都没有记录时，下面两条断言会空转通过。
    expect(csvRecords.length).toBeGreaterThan(0);
    expect(dimRecords.length).toBeGreaterThan(0);
    // 第二条断言的非空锚点：至少要有一边真的「一个来源 → 多条记录」。
    expect(Math.max(...recordsPerSource(dimRecords))).toBeGreaterThan(1);

    for (const record of [...csvRecords, ...dimRecords]) {
      // 格式概念只允许待在 `source_id` 里；分组键带上格式前缀，消费层的分组就会分叉。
      expect(record.source_group_id).not.toMatch(/^(?:csv|dim):/);
      expect(record.source_group_id.length).toBeGreaterThan(0);
    }

    // 分组键是「来源级」的：同一个来源的多条记录必须落在同一个分组，
    // 否则「同一分组收敛成一行」的消费逻辑会随记录条数抖动。
    for (const records of [csvRecords, dimRecords]) {
      const groupBySource = new Map<string, string>();
      for (const record of records) {
        const previous = groupBySource.get(record.source_id);
        if (previous !== undefined) expect(record.source_group_id).toBe(previous);
        groupBySource.set(record.source_id, record.source_group_id);
      }
    }
  });

  it("分组粒度：一个具名来源 = 一行，两种编码一致（跨格式断言）", async () => {
    // 用户 2026-09-16 拍板：来源列表按**来源名**分多行，不按导入文件合并。
    // 这条钉住粒度本身——上一条只钉「同一来源内部不散」，钉不住「两种格式粒度相同」。
    // 先红过一次：当时 CSV 按实例分组（2 行）、DIM 按文档分组（1 行），同一份存储形状两种表现。
    const csvDir = tempDir();
    await importCsv(csvDir, [
      unifiedHeader,
      ["来源甲", "测试步枪", "甲", "PvE", "", "", "", "特性甲", "特性丙", "", "S", ""].join(","),
      ["来源乙", "测试步枪", "乙", "PvE", "", "", "", "特性乙", "特性丙", "", "S", ""].join(",")
    ].join("\n"));

    // DIM 侧同一份存储形状：一个文档、两个带标题的注释段（= 两个具名来源实例）。
    const dimDir = tempDir();
    importDim(dimDir, {
      title: "DIM 编码",
      source_blocks: [{ id: "b1", title: "来源甲" }, { id: "b2", title: "来源乙" }],
      rules: [
        { rule_stable_id: "dim-a", item_hash: weaponHash, perk_hashes: [perkA, perkC], mode: "pve", note: "", source_block_id: "b1" },
        { rule_stable_id: "dim-b", item_hash: weaponHash, perk_hashes: [perkB, perkC], mode: "pve", note: "", source_block_id: "b2" }
      ]
    });

    const csvRows = namedSourceRows((await recommendationFor(csvDir))?.source_records ?? []);
    const dimRows = namedSourceRows((await recommendationFor(dimDir))?.source_records ?? []);

    // 非空锚点：两边都必须是「两个具名来源」，否则下面比的是两个 0。
    // 对外名（`source_label`）两边都只有导入时起的文档标题一个；分得开这两行的是文件里
    // 声明的名字（`declared_label`）。
    expect(csvRows.namedSources).toBe(1);
    expect(dimRows.namedSources).toBe(1);
    expect(csvRows.declaredSources).toBe(2);
    expect(dimRows.declaredSources).toBe(2);

    // 一个来源实例一行：分组数 = 文件里声明的具名来源数，且每一行只带一个名字。
    expect(csvRows.groups).toBe(2);
    expect(dimRows.groups).toBe(2);
    expect(csvRows.mixedLabels).toBe(false);
    expect(dimRows.mixedLabels).toBe(false);
    expect(csvRows.mixedDeclaredLabels).toBe(false);
    expect(dimRows.mixedDeclaredLabels).toBe(false);
  });

  it("停用整份导入：两种格式都继承到实例，且实例级停用优先于文档级", async () => {
    // 管理面以**导入文档**为单位（停用整份导入写的是文档键），来源事实却按实例投影。
    // 这段继承过去在两个适配器里各写一份，CSV 那份漏了兜底：「停用整份 CSV 导入」点下去毫无反应
    // （实测停用前 2 条、停用后仍是 2 条），DIM 侧正常——典型的按格式分叉。
    const csvDir = tempDir();
    await importCsv(csvDir, [
      unifiedHeader,
      ["来源甲", "测试步枪", "甲", "PvE", "", "", "", "特性甲", "特性丙", "", "S", ""].join(","),
      ["来源乙", "测试步枪", "乙", "PvE", "", "", "", "特性乙", "特性丙", "", "S", ""].join(",")
    ].join("\n"));

    const dimDir = tempDir();
    importDim(dimDir, {
      title: "DIM 编码",
      source_blocks: [{ id: "b1", title: "来源甲" }, { id: "b2", title: "来源乙" }],
      rules: [
        { rule_stable_id: "dim-a", item_hash: weaponHash, perk_hashes: [perkA, perkC], mode: "pve", note: "", source_block_id: "b1" },
        { rule_stable_id: "dim-b", item_hash: weaponHash, perk_hashes: [perkB, perkC], mode: "pve", note: "", source_block_id: "b2" }
      ]
    });

    for (const dir of [csvDir, dimDir]) {
      const records = () => recommendationFor(dir).then((value) => value?.source_records ?? []);
      const sourceIds = [...new Set((await records()).map((record) => record.source_id))];
      expect(sourceIds).toHaveLength(2);

      // 停用整份导入：文档键上的停用必须让该文档下全部实例一起停用。
      setRecommendationSourceState(dir, documentIdOf(dir), "disabled");
      expect(await records()).toHaveLength(0);

      // 实例级停用优先于文档级：单开一个实例，文档仍是停用态也不该被它顶掉。
      setRecommendationSourceState(dir, sourceIds[0]!, "active");
      expect((await records()).map((record) => record.source_id)).toEqual([sourceIds[0]!]);
    }
  });

  it("管理名册的每一行必须认领它下辖的全部事实键", async () => {
    // 管理面一行 = 一次导入（文档键），事实层一条 = 一个具名来源（实例键）。
    // 消费层拿管理面的键去看来源事实，靠的就是名册给出的这份对应关系。
    // 它曾经缺席：名册只给自己的文档键、事实层只给实例键，两边交集为空，
    // 仓库勾选来源后整页变 0 件（Bug #92）。这条就是那次缺的网。
    const csvDir = tempDir();
    await importCsv(csvDir, [
      unifiedHeader,
      ["来源甲", "测试步枪", "甲", "PvE", "", "", "", "特性甲", "特性丙", "", "S", ""].join(","),
      ["来源乙", "测试步枪", "乙", "PvE", "", "", "", "特性乙", "特性丙", "", "S", ""].join(",")
    ].join("\n"));

    const dimDir = tempDir();
    importDim(dimDir, {
      title: "DIM 编码",
      source_blocks: [{ id: "b1", title: "来源甲" }, { id: "b2", title: "来源乙" }],
      rules: [
        { rule_stable_id: "dim-a", item_hash: weaponHash, perk_hashes: [perkA, perkC], mode: "pve", note: "", source_block_id: "b1" },
        { rule_stable_id: "dim-b", item_hash: weaponHash, perk_hashes: [perkB, perkC], mode: "pve", note: "", source_block_id: "b2" }
      ]
    });

    for (const dir of [csvDir, dimDir]) {
      const factKeys = new Set(
        ((await recommendationFor(dir))?.source_records ?? []).map((record) => record.source_group_id)
      );
      const snapshot = readRecommendationManagementSnapshot(dir);
      const claimedKeys = new Set(snapshot.sources.flatMap((source) => source.fact_keys));

      // 非空锚点：两侧都得真有东西，否则下面「全都认领到了」是空转。
      expect(factKeys.size).toBeGreaterThan(0);
      expect(snapshot.sources).toHaveLength(1);
      // 非空转锚点：事实键确实不等于名册行的键，所以「认领」这件事真的发生了。
      expect([...factKeys].some((key) => key !== snapshot.sources[0]!.source_key)).toBe(true);

      for (const factKey of factKeys) expect(claimedKeys.has(factKey)).toBe(true);
    }
  });
});
