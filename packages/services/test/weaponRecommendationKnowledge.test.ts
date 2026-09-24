import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import {
  exportWeaponRecommendationPlayerCsv,
  importWeaponRecommendationCsv,
  collectWeaponRecommendationDefinitionHashes,
  previewWeaponRecommendationCsv,
  readWeaponRecommendationKnowledgeStatus
} from "../src/community/weaponRecommendationKnowledge.js";
import { createDefaultCommunityPerkService } from "../src/community/perkRecommendation.js";
import {
  clearImportedRecommendationRules,
  readRecommendationManagementSnapshot,
  updateRecommendationManagedSource
} from "../src/community/recommendationManagement.js";
import {
  listRecommendationDocuments,
  loadRecommendationSources,
  type RecommendationImportTarget
} from "../src/community/recommendationDocumentStore.js";
import { saveDimWishlist } from "../src/analysis/wishlistStore.js";
import type {
  WeaponKnowledgeSemanticDefinitions,
  WeaponKnowledgeValidationContext
} from "../src/community/weaponRecommendationKnowledge.js";
import type { DefinitionComponentData } from "@d2-tools/core/manifest/definitions";

/**
 * 人工推荐 CSV 链路的回归网（T56 Layer 3 的 L3-0，S3′-2 → S7 一次切换后改写）。
 *
 * 迁移前这条链路**零测试覆盖**：解析、写库、运行时投影、管理面投影、回导全都没有断言。
 * 这里断言的是**契约**（来源、栏位、候选、用途、身份动作），不是实现细节（表名、SQL）。
 *
 * 一次切换后 CSV 与 DIM 同住三级模型，读取走 `csvRecommendationSource` 适配器，
 * 所以「读取」一律经 `createDefaultCommunityPerkService` 组装后的服务——测试不该
 * 假设库里只有一种格式。
 */

const weaponHash = 1001;
const voltShotPlug = 2001;
const rapidHitPlug = 2002;

/**
 * 语义定义替身：一把武器 + 两个特性。形状抄自 `core/test/communityPerks.test.ts`
 * 的既有夹具（`itemTypeDisplayName: "特性"` + `plugCategoryIdentifier: "frames"`），
 * 这是让 `classifyWeaponRollSocket` 把插件判成 perk1 / perk2 的最小结构。
 */
const semanticDefinitions: WeaponKnowledgeSemanticDefinitions = {
  item_definitions: {
    [String(weaponHash)]: {
      hash: weaponHash,
      itemTypeDisplayName: "步枪",
      displayProperties: { name: "测试步枪", description: "test rifle" },
      sockets: {
        socketEntries: [
          { reusablePlugItems: [{ plugItemHash: voltShotPlug }] },
          { reusablePlugItems: [{ plugItemHash: rapidHitPlug }] }
        ]
      }
    }
  },
  plug_definitions: {
    [String(voltShotPlug)]: {
      hash: voltShotPlug,
      itemTypeDisplayName: "特性",
      plug: { plugCategoryIdentifier: "frames" },
      displayProperties: { name: "伏特弹", description: "中文 perk" }
    },
    [String(rapidHitPlug)]: {
      hash: rapidHitPlug,
      itemTypeDisplayName: "特性",
      plug: { plugCategoryIdentifier: "frames" },
      displayProperties: { name: "快速命中", description: "中文 perk" }
    }
  },
  plug_set_definitions: {}
};

const validation: WeaponKnowledgeValidationContext = {
  manifest_version: "test-manifest-1",
  semantic_definitions: semanticDefinitions
};

/**
 * 大师杰作专用夹具：官方定义里的名字带前缀（「大师杰作：精确弹药」），玩家写的是去掉前缀的别名。
 * 单开一份是为了让下面那条 S2 用例不改变其它用例共用的定义池。
 */
const masterworkWeaponHash = 3001;
const masterworkPlug = 3002;
const masterworkBarrelPlug = 3003;
const masterworkDefinitions: WeaponKnowledgeSemanticDefinitions = {
  item_definitions: {
    [String(masterworkWeaponHash)]: {
      hash: masterworkWeaponHash,
      itemTypeDisplayName: "步枪",
      displayProperties: { name: "大师测试步枪", description: "masterwork fixture" },
      sockets: {
        socketEntries: [
          { reusablePlugItems: [{ plugItemHash: voltShotPlug }] },
          { reusablePlugItems: [{ plugItemHash: rapidHitPlug }] },
          { reusablePlugItems: [{ plugItemHash: masterworkPlug }] },
          { reusablePlugItems: [{ plugItemHash: masterworkBarrelPlug }] }
        ]
      }
    }
  },
  plug_definitions: {
    ...semanticDefinitions.plug_definitions,
    [String(masterworkPlug)]: {
      hash: masterworkPlug,
      itemTypeDisplayName: "大师杰作",
      plug: { plugCategoryIdentifier: "v400.plugs.weapons.masterworks" },
      displayProperties: { name: "大师杰作：精确弹药", description: "带前缀的官方名" }
    },
    [String(masterworkBarrelPlug)]: {
      hash: masterworkBarrelPlug,
      itemTypeDisplayName: "枪管",
      plug: { plugCategoryIdentifier: "v400.plugs.weapons.barrels" },
      displayProperties: { name: "精密枪管", description: "只在枪管栏位成立的名字" }
    }
  },
  plug_set_definitions: {}
};

const masterworkRuntimeDefinitions = {
  ...masterworkDefinitions.item_definitions,
  ...masterworkDefinitions.plug_definitions
} as DefinitionComponentData;

/**
 * 运行时投影用同一张扁平定义表查武器与 Perk，所以这里把两份定义合起来——
 * 真实调用方（推荐 Worker）传的也是合并后的表。
 */
const runtimeDefinitions = {
  ...semanticDefinitions.item_definitions,
  ...semanticDefinitions.plug_definitions
} as DefinitionComponentData;

// 统一中文模板：首列固定「推荐来源」，来源名允许自定义。
const unifiedHeader = "推荐来源,武器,规则名称,用途/分类,枪管/瞄具,弹匣,大师,Perk 1,Perk 2,起源特性,评级,备注";

const importName = "我的推荐";

/** 导入身份 = 用户给的名字 + 新建 / 覆盖；界面必须两者都收（D5）。 */
function target(mode: RecommendationImportTarget["mode"], name = importName): RecommendationImportTarget {
  return { name, mode };
}

/**
 * 「没有要求」两侧现在共用一张判定表（S2）：从前导入期只认 任意 / 无 / none / n/a / -，
 * 读取期认的是 任意 / 不限 / 不限制 / any——写「不限制」的行会被导入期判为阻塞，
 * 读取期却会把它静默过滤掉。
 */
function unifiedRow(
  source: string,
  ruleName: string,
  purpose: string,
  perk1: string,
  perk2: string,
  rating: string,
  note = ""
): string {
  return [source, "测试步枪", ruleName, purpose, "", "", "", perk1, perk2, "", rating, note].join(",");
}

function writeCsv(text: string): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), "d2-tools-curated-"));
  const path = join(dir, "推荐.csv");
  writeFileSync(path, text, "utf8");
  return { dir, path };
}

/** 读取一律经服务组装：库里可能同时住着两种格式，测试不该自己挑适配器。 */
function recommendationFor(dir: string, itemHash: number, itemName: string, itemDefinitions = runtimeDefinitions) {
  return createDefaultCommunityPerkService({ data: { data_dir: dir } })
    .getRecommendationsWithAllSources(itemHash, {
      manifest_version: validation.manifest_version,
      item_name: itemName,
      itemDefinitions
    });
}

async function importCsv(
  dir: string,
  path: string,
  text: string,
  mode: RecommendationImportTarget["mode"] = "create",
  definitions: WeaponKnowledgeSemanticDefinitions = semanticDefinitions
) {
  const preview = previewWeaponRecommendationCsv(text, path, definitions);
  const result = await importWeaponRecommendationCsv(
    dir, path, preview.fingerprint,
    { manifest_version: validation.manifest_version, semantic_definitions: definitions },
    target(mode)
  );
  return { preview, result };
}

const twoSourceCsv = [
  unifiedHeader,
  unifiedRow("示例推荐表A", "清怪首选", "PvE", "伏特弹", "快速命中", "S", "清怪手感最好"),
  unifiedRow("示例推荐表B", "PvP手感", "PvP", "伏特弹", "快速命中", "A")
].join("\n");

describe("curated recommendation CSV pipeline", () => {
  it("previews a unified template as two named sources inside one import", () => {
    const preview = previewWeaponRecommendationCsv(twoSourceCsv, "推荐.csv", semanticDefinitions);

    expect(preview.importable_recommendation_count).toBe(2);
    expect(preview.weapon_count).toBe(1);
    expect(preview.source_count).toBe(2);
    expect([...preview.source_labels].sort()).toEqual(["示例推荐表A", "示例推荐表B"]);
    expect(preview.blocking_issue_count).toBe(0);
    expect(preview.skipped_row_count).toBe(0);
  });

  it("imports the preview into the three-tier store and derives the status from it", async () => {
    const { dir, path } = writeCsv(twoSourceCsv);
    const { result } = await importCsv(dir, path, twoSourceCsv);

    expect(result.recommendation_count).toBe(2);
    expect(result.weapon_count).toBe(1);
    expect(result.source_count).toBe(2);
    expect(result.imported_row_count).toBe(2);

    // 状态完全由三级模型派生——没有任何托管文件或元数据键参与。
    const status = readWeaponRecommendationKnowledgeStatus(dir);
    expect(status?.recommendation_count).toBe(2);
    expect(status?.source_count).toBe(2);
  });

  it("round-trips the imported rows back out as a player CSV", async () => {
    const { dir, path } = writeCsv(twoSourceCsv);
    await importCsv(dir, path, twoSourceCsv);

    // 库里只存 Hash，导出必须由调用方传入定义池把名字反解出来（DD4）。
    const exported = exportWeaponRecommendationPlayerCsv(dir, runtimeDefinitions);
    expect(exported).toContain("测试步枪");
    expect(exported).toContain("示例推荐表A");
    expect(exported).toContain("示例推荐表B");
    expect(exported).toContain("伏特弹");
  });

  it("projects each imported rule into a slot-scoped source record", async () => {
    const { dir, path } = writeCsv(twoSourceCsv);
    await importCsv(dir, path, twoSourceCsv);

    const recommendation = await recommendationFor(dir, weaponHash, "测试步枪");
    expect(recommendation).not.toBeNull();
    const records = recommendation?.source_records ?? [];
    expect(records).toHaveLength(2);
    // 契约：来源对外名是用户给这次导入起的名字（文档标题），与来源清单、仓库筛选读的是同一个身份；
    // 文件里声明的名字（「推荐来源」列值）降为副标题，一个实例保留一个。
    expect(records.map((record) => record.source_label)).toEqual([importName, importName]);
    expect(records.map((record) => record.declared_label).sort()).toEqual(["示例推荐表A", "示例推荐表B"]);
    // 契约：CSV 的栏位是导入期固化的真实栏位，不是读取期猜出来的假槽位。
    for (const record of records) {
      expect(record.requirements.map((requirement) => requirement.slot)).toEqual(["perk1", "perk2"]);
      expect(record.requirements[0].candidates.map((candidate) => candidate.hash)).toEqual([voltShotPlug]);
      expect(record.requirements[1].candidates.map((candidate) => candidate.hash)).toEqual([rapidHitPlug]);
    }
    // 用途跟着来源走，不跟着数组下标走：按实例身份取，不把记录顺序当契约。
    const purposesByLabel = new Map(records.map((record) => [record.declared_label, record.purposes]));
    expect(purposesByLabel.get("示例推荐表A")).toContain("pve");
    expect(purposesByLabel.get("示例推荐表B")).toContain("pvp");
    // 契约：过了导入期校验的要求必须解析出候选。只在名称上通过、候选为空的「假要求」
    // 会进分母却不贡献任何 hash，两侧键集一旦分叉就会冒出来——这里把它钉死。
    for (const requirement of records.flatMap((record) => record.requirements)) {
      expect(requirement.candidate_names.length).toBeGreaterThan(0);
      expect(requirement.candidates.length).toBeGreaterThan(0);
    }
  });

  it("lists the imported 导入文档 on the management surface as one managed source", async () => {
    const { dir, path } = writeCsv(twoSourceCsv);
    await importCsv(dir, path, twoSourceCsv);

    const snapshot = readRecommendationManagementSnapshot(dir);
    // 可管理来源是**导入文档**（用户命名的那个），文件内部的「推荐来源」列只是文档下的实例——
    // 这与 DIM 侧「一份导入 = 一个可管理来源」完全同构，不是两种粒度。
    expect(snapshot.sources.map((entry) => entry.label)).toEqual([importName]);
    expect(snapshot.sources[0]?.rule_count).toBe(2);
    expect(loadRecommendationSources(dir, "csv").map((source) => source.label).sort())
      .toEqual(["示例推荐表A", "示例推荐表B"]);
    // 「清空导入的推荐规则」这个动作的对象摘要也由存储派生，不是硬编码。
    expect(snapshot.clear_rule_imports).toEqual({ configured: true, source_count: 1, rule_count: 2 });
  });

  it("treats 不限制 / 不限 / any as 「no requirement」 at import time, not as a blocker", async () => {
    // 「不限制」写在**枪管**：这是六个严格栏位之一，导入期会拿它去核对官方名。
    // S2 之前 `requirementValues` 不认「不限制」，于是它被当成一个真实的官方名核对、
    // 判为阻塞；读取期却又会静默过滤掉它。两侧口径相反，写它的用户直接拒导。
    // （Perk 1 / Perk 2 另有「统一推荐模板必填核心栏位」的规则，不受本表影响。）
    const csv = [
      unifiedHeader,
      [
        "示例推荐表A", "测试步枪", "清怪首选", "PvE", "不限制", "不限", "任意",
        "伏特弹", "快速命中", "any", "S", ""
      ].join(",")
    ].join("\n");
    const preview = previewWeaponRecommendationCsv(csv, "推荐.csv", semanticDefinitions);

    // S2 之前这里是 4 条阻塞（枪管 / 弹匣 / 大师 / 起源特性 各一条）。
    expect(preview.blocking_issue_count).toBe(0);
    expect(preview.importable_recommendation_count).toBe(1);

    const { dir, path } = writeCsv(csv);
    await importCsv(dir, path, csv);
    const recommendation = await recommendationFor(dir, weaponHash, "测试步枪");

    // 契约：声明了「没要求」的栏位不出现在投影里，而不是变成一条候选为空的假要求。
    const requirements = recommendation?.source_records?.[0]?.requirements ?? [];
    expect(requirements.map((entry) => entry.slot)).toEqual(["perk1", "perk2"]);
    expect(requirements[0]?.candidates.map((candidate) => candidate.hash)).toEqual([voltShotPlug]);
    expect(requirements[1]?.candidates.map((candidate) => candidate.hash)).toEqual([rapidHitPlug]);
  });

  it("resolves 大师 through the same 栏位 index that validated it", async () => {
    // S2 之前校验与投影各走一遍遍历：校验只把**别名**（去掉「大师杰作：」前缀）放进键集，
    // 投影才会归并别名。于是写全名的行在导入期被「无法精确确认」拦掉，写别名的行才过；
    // 而同一个名字在投影里是否解析得出，又是另一套逻辑说了算。两侧本可以对同一栏位
    // 给出不同答案。现在两侧共用 `buildSlotPerkIndex`，两种写法落进同一个桶。
    const csv = [
      unifiedHeader,
      [
        "示例推荐表A", "大师测试步枪", "精确弹药流", "PvE", "", "", "大师杰作：精确弹药",
        "伏特弹", "快速命中", "", "S", ""
      ].join(",")
    ].join("\n");
    const preview = previewWeaponRecommendationCsv(csv, "推荐.csv", masterworkDefinitions);

    // S2 之前这里是 1 条阻塞：大师栏位无法在官方栏位中精确确认。
    expect(preview.blocking_issues).toEqual([]);
    expect(preview.blocking_issue_count).toBe(0);
    expect(preview.importable_recommendation_count).toBe(1);

    const { dir, path } = writeCsv(csv);
    await importCsv(dir, path, csv, "create", masterworkDefinitions);
    const recommendation = await recommendationFor(
      dir, masterworkWeaponHash, "大师测试步枪", masterworkRuntimeDefinitions
    );

    // 契约：校验放行的名字，投影必须解析得出候选——两侧同源，不再有「过了校验却没有候选」的假要求。
    const requirements = recommendation?.source_records?.[0]?.requirements ?? [];
    expect(requirements.map((entry) => entry.slot)).toEqual(["masterwork", "perk1", "perk2"]);
    expect(requirements[0]?.candidate_names).toEqual(["大师杰作：精确弹药"]);
    expect(requirements[0]?.candidates.map((candidate) => candidate.hash)).toEqual([masterworkPlug]);

    // 别名写法解析到同一个 hash：全名与别名是同一个桶的两种写法。
    const aliasedCsv = [
      unifiedHeader,
      [
        "示例推荐表A", "大师测试步枪", "精确弹药流", "PvE", "", "", "精确弹药",
        "伏特弹", "快速命中", "", "S", ""
      ].join(",")
    ].join("\n");
    const aliasDir = writeCsv(aliasedCsv);
    await importCsv(aliasDir.dir, aliasDir.path, aliasedCsv, "create", masterworkDefinitions);
    const aliasRecommendation = await recommendationFor(
      aliasDir.dir, masterworkWeaponHash, "大师测试步枪", masterworkRuntimeDefinitions
    );
    expect(aliasRecommendation?.source_records?.[0]?.requirements[0]?.candidates.map((c) => c.hash))
      .toEqual([masterworkPlug]);
  });

  it("keeps the 栏位 index slot-scoped: an official name from another column is still blocked", () => {
    // 索引按栏位分桶，不是一张跨栏位的并集。「精密枪管」是这把武器**枪管**栏位的官方名，
    // 写在 Perk 1 里必须仍然被判阻塞——否则 CSV 适配器会把不同栏位做笛卡尔积。
    const csv = [
      unifiedHeader,
      [
        "示例推荐表A", "大师测试步枪", "精确弹药流", "PvE", "", "", "",
        "精密枪管", "快速命中", "", "S", ""
      ].join(",")
    ].join("\n");
    const preview = previewWeaponRecommendationCsv(csv, "推荐.csv", masterworkDefinitions);

    expect(preview.importable_recommendation_count).toBe(0);
    expect(preview.blocking_issues.map((issue) => [issue.field, issue.value])).toEqual([["Perk 1", "精密枪管"]]);
    expect(preview.blocking_issues[0]?.message).toContain("枪管");
  });

  it("blocks a row whose perk name is not an official perk of the weapon", () => {
    const csv = [
      unifiedHeader,
      unifiedRow("示例推荐表A", "清怪首选", "PvE", "伏特弹", "并不存在的特性", "S")
    ].join("\n");
    const preview = previewWeaponRecommendationCsv(csv, "推荐.csv", semanticDefinitions);

    // 导入期就把无法核对的 Perk 名拦掉，所以 CSV 这条链路上不会出现「解析不出的候选」；
    // 读取侧的候选名一律来自 `candidate_names`（唯一通道）。
    expect(preview.blocking_issue_count).toBe(1);
    expect(preview.importable_recommendation_count).toBe(0);
    expect(preview.blocking_issues[0]?.field).toBe("Perk 2");
  });

  it("rejects an import whose only rows were blocked", async () => {
    const csv = [
      unifiedHeader,
      unifiedRow("示例推荐表A", "清怪首选", "PvE", "伏特弹", "并不存在的特性", "S")
    ].join("\n");
    const { dir, path } = writeCsv(csv);
    const preview = previewWeaponRecommendationCsv(csv, path, semanticDefinitions);

    await expect(
      importWeaponRecommendationCsv(dir, path, preview.fingerprint, validation, target("create"))
    ).rejects.toThrow(/没有可导入的有效记录/u);
  });
});

describe("import identity: 命名 + 新建 / 覆盖（D5）", () => {
  it("rejects a 新建 that collides with an existing name, and accepts 覆盖 on it", async () => {
    const { dir, path } = writeCsv(twoSourceCsv);
    await importCsv(dir, path, twoSourceCsv, "create");

    // 同名新建必须被判冲突——身份是名字，不是内容指纹（指纹改了就是一个新来源的旧行为已废除）。
    await expect(
      importWeaponRecommendationCsv(dir, path, previewWeaponRecommendationCsv(twoSourceCsv, path, semanticDefinitions).fingerprint,
        validation, target("create"))
    ).rejects.toThrow(/已存在名为/u);

    // 覆盖未命中同样要报错，且文案要告诉用户改用另一个动作。
    const other = writeCsv(twoSourceCsv);
    await expect(
      importWeaponRecommendationCsv(other.dir, other.path,
        previewWeaponRecommendationCsv(twoSourceCsv, other.path, semanticDefinitions).fingerprint,
        validation, target("overwrite"))
    ).rejects.toThrow(/请改为新建/u);

    // 空名字一律拒绝：不存在「默认名字」这条路径。
    await expect(
      importWeaponRecommendationCsv(dir, path,
        previewWeaponRecommendationCsv(twoSourceCsv, path, semanticDefinitions).fingerprint,
        validation, { name: "  ", mode: "create" })
    ).rejects.toThrow(/必须命名/u);
  });

  it("overwrites by deleting everything the document owned, then writing the new content", async () => {
    const { dir, path } = writeCsv(twoSourceCsv);
    await importCsv(dir, path, twoSourceCsv, "create");
    const before = listRecommendationDocuments(dir)[0];
    expect(before?.sourceCount).toBe(2);
    expect(before?.ruleCount).toBe(2);

    // 覆盖成一份只剩一个来源的文件：旧的两个来源实例必须整份消失，不是被标记为 removed。
    const singleSourceCsv = [
      unifiedHeader,
      unifiedRow("示例推荐表", "新口径", "PvE", "伏特弹", "快速命中", "S")
    ].join("\n");
    const overwritePath = join(dir, "覆盖.csv");
    writeFileSync(overwritePath, singleSourceCsv, "utf8");
    await importCsv(dir, overwritePath, singleSourceCsv, "overwrite");

    const snapshot = readRecommendationManagementSnapshot(dir);
    // 覆盖跑完时来源状态由存储决定，不能留下「被移除的差量」——差量合并正是被废除的旧语义。
    expect(snapshot.removed_rules).toEqual([]);
    expect(snapshot.clear_rule_imports).toEqual({ configured: true, source_count: 1, rule_count: 1 });
    expect(loadRecommendationSources(dir, "csv").map((source) => source.label)).toEqual(["示例推荐表"]);

    const documents = listRecommendationDocuments(dir);
    expect(documents).toHaveLength(1);
    expect(documents[0]?.name).toBe(importName);
    expect(documents[0]?.sourceCount).toBe(1);
    expect(documents[0]?.ruleCount).toBe(1);
  });

  it("clears only the imported CSV rules and leaves 愿望单 documents untouched", async () => {
    const { dir, path } = writeCsv(twoSourceCsv);
    await importCsv(dir, path, twoSourceCsv, "create");
    const wishlist: DimWishlist = {
      title: "我的愿望单",
      rules: [{ rule_stable_id: "dim-1", item_hash: weaponHash, perk_hashes: [voltShotPlug], mode: "pve", note: "" }]
    };
    saveDimWishlist(dir, wishlist, { name: "我的愿望单", mode: "create" });

    expect([...listRecommendationDocuments(dir)].map((document) => document.kinds).flat().sort())
      .toEqual(["csv", "dim"]);

    const snapshot = clearImportedRecommendationRules(dir);
    expect(snapshot.clear_rule_imports).toEqual({ configured: false, source_count: 0, rule_count: 0 });
    // 只清 CSV：愿望单文档与它派生的匹配事实必须原样留着。
    expect(loadRecommendationSources(dir, "csv")).toEqual([]);
    expect(loadRecommendationSources(dir, "dim")).toHaveLength(1);
    expect(snapshot.sources.map((entry) => entry.label)).toEqual(["我的愿望单"]);
    expect(listRecommendationDocuments(dir).map((document) => document.name)).toEqual(["我的愿望单"]);
  });

  /**
   * Bug #100：导入区的「移除全部来源」按钮删掉之后，清掉一整份导入只剩逐份删除这条路。
   * 这条用例钉住它不是空话：来源管理面的一行按下「删除」，那一份导入（文档 + 实例 + 规则）
   * 必须整个消失，另一份格式的导入原样留着——不然删掉那个按钮就等于把唯一的出口一起删了。
   */
  it("removes a whole 愿望单 import through the per-document 删除 path", async () => {
    const { dir, path } = writeCsv(twoSourceCsv);
    await importCsv(dir, path, twoSourceCsv, "create");
    saveDimWishlist(dir, {
      title: "我的愿望单",
      rules: [{ rule_stable_id: "dim-1", item_hash: weaponHash, perk_hashes: [voltShotPlug], mode: "pve", note: "" }]
    }, { name: "我的愿望单", mode: "create" });
    expect([...listRecommendationDocuments(dir)].map((document) => document.kinds).flat().sort())
      .toEqual(["csv", "dim"]);

    const wishlistSource = readRecommendationManagementSnapshot(dir).sources
      .find((entry) => entry.label === "我的愿望单");
    if (!wishlistSource) throw new Error("管理面没有列出这份愿望单导入");

    updateRecommendationManagedSource(dir, wishlistSource.source_key, "removed");

    expect(loadRecommendationSources(dir, "dim")).toEqual([]);
    // 另一份导入不受牵连。
    expect(loadRecommendationSources(dir, "csv")).toHaveLength(2);
    expect(listRecommendationDocuments(dir).map((document) => document.name)).not.toContain("我的愿望单");
  });
});

/**
 * 人工表格只写武器名的行，定义池必须覆盖这个名字的**全部**官方版本（T56）：搜索那条路有上限、
 * 又按同一把武器的代表版本折叠过，单靠它会把本来写对的行判成异常。
 */
describe("definition pool for curated tables", () => {
  const playerHeader = "武器,武器ID,英文名称,推荐来源,用途,第一列,第二列,Perk 1,Perk 2,大师,起源特性,评级,备注";

  function playerRow(weapon: string, itemId: string): string {
    return [weapon, itemId, "", "示例推荐表A", "", "", "", "", "", "", "", "", ""].join(",");
  }

  /** 搜索只做模糊那一份的证明（`6001`），同名全集另算（`5001` / `5002`，后者是被折叠掉的版本）。 */
  function createLookup() {
    const searchedQueries: string[] = [];
    const exactNameCalls: string[][] = [];
    return {
      searchedQueries,
      exactNameCalls,
      lookup: {
        async searchItems(input: { query: string; limit?: number }) {
          searchedQueries.push(input.query);
          return input.query === "同名武器" ? [{ hash: 6001 }] : [];
        },
        async getItemHashesByExactName(input: { names: string[] }) {
          exactNameCalls.push(input.names);
          return input.names.includes("同名武器") ? [5001, 5002] : [];
        }
      }
    };
  }

  it("adds search hits and every same-name version on top of the ids written in the file", async () => {
    const csv = [playerHeader, playerRow("定位步枪", "1001"), playerRow("同名武器", "")].join("\n");
    const { lookup, searchedQueries, exactNameCalls } = createLookup();

    const hashes = await collectWeaponRecommendationDefinitionHashes(csv, lookup);

    // 文件里写的 ID 照收；只写名字的行由「搜索命中 ∪ 同名全部版本」补齐，谁也不吃掉谁。
    expect(hashes).toEqual([1001, 6001, 5001, 5002]);
    expect(searchedQueries).toEqual(["同名武器"]);
    expect(exactNameCalls).toEqual([["同名武器"]]);
  });

  it("resolves a name-only row even when search finds nothing for it", async () => {
    const csv = [playerHeader, playerRow("同名武器", "")].join("\n");
    const { lookup } = createLookup();

    const hashes = await collectWeaponRecommendationDefinitionHashes(csv, {
      searchItems: async () => [],
      getItemHashesByExactName: lookup.getItemHashesByExactName
    });

    expect(hashes).toEqual([5001, 5002]);
  });

  it("asks nothing when every row carries an item id", async () => {
    const csv = [playerHeader, playerRow("定位步枪", "1001")].join("\n");
    const { lookup, searchedQueries, exactNameCalls } = createLookup();

    const hashes = await collectWeaponRecommendationDefinitionHashes(csv, lookup);

    expect(hashes).toEqual([1001]);
    expect(searchedQueries).toEqual([]);
    expect(exactNameCalls).toEqual([]);
  });
});
