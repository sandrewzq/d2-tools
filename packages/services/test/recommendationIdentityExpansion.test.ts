import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { WeaponIdentityRelation } from "@d2-tools/core/community-perks";
import type { DefinitionComponentData } from "@d2-tools/core/manifest/definitions";
import {
  buildWeaponNameEntries,
  expandRecommendationItemHashes,
  importWeaponRecommendationCsv,
  previewWeaponRecommendationCsv
} from "../src/community/weaponRecommendationKnowledge.js";
import { createDefaultCommunityPerkService } from "../src/community/perkRecommendation.js";
import type {
  WeaponKnowledgeSemanticDefinitions,
  WeaponKnowledgeValidationContext
} from "../src/community/weaponRecommendationKnowledge.js";

/**
 * S3′-0：**身份展开的对拍网**。
 *
 * 从前「这条规则适用于哪些武器」是在读取期算的（`collectKnowledgeCandidates` +
 * `selectKnowledgeRecommendations` 的三级匹配：精确 hash + 发布组 → 发布组 + 变体 → 仅名称）。
 * S3′ 把这件事挪到导入期，读取期只做 `itemHashes.includes(hash)`。
 *
 * **口径（2026-09-16 用户拍板）：按行逐条展开，不保留读取期的「同来源精确优先」。**
 * 旧读取期还有一个跨行的动作：同一来源里只要有行精确写了这把武器的 hash，其它靠「同款不同版本」
 * 沾上来的行就整条不显示。那条压制会**少显示**用户的推荐（应用端出错），所以不搬：
 * 一行写了普通版的 ID，它对专家版 / 失时版同样适用，就该照常出现——用户自己会再确认。
 *
 * **可见性必须是对称的（用户 2026-09-16 原话：「普通版 + 专家版 + 失时版 三个 id
 * 都要看到普通版 + 专家版 + 失时版三种，不仅仅是普通版能看到」）。**
 * 换句话说：一条规则的展开集里有几个版本，这几个版本的开页就都要看得到它，没有主次之分——
 * 不能只有普通版页面能看到、专家版 / 失时版页面看不到。下面 R1（只写普通版的 ID，靠发布组放大）
 * 与 R3（只写名字）各钉一遍「三个版本页面都看得到」，`multiIdIdentityFixtures` 再从多 ID 一侧钉。
 *
 * 因此本网的断言是两条，而不再是「逐条等价」：
 *
 *   1. 每条规则的展开集 === 夹具按身份直接推出的期望集（下面三条分支都要被命中）；
 *   2. **旧读取期选中的规则集 ⊆ 展开集**——新口径只可能多显示，绝不可能少显示。
 *
 * 两处**已知且预期**的差异在最后一个用例里逐条钉死：专家版与失时版会多出同来源的通用行。
 * 真实数据（2379 行 / 1630 把武器）上这个差异是：11 把带变体后缀的武器各 +1 条，无一变少。
 *
 * 三条分支都要有夹具命中：发布组归约（同名历史复刻只认最新发布组）、变体约束（专家 / 失时）、
 * 以及只写武器名（没有武器 ID）的那一条——它先按官方名补出基础集，再走与显式 hash **完全相同**
 * 的归约与放大。最后这一条是本网抓到过的真实缺陷：补完名字后若不归约，只写名字的规则会漏掉
 * 同发布组的其它版本。
 *
 * 这些夹具刻意只用**契约**（规则写了什么身份、目标能匹配到哪些规则），不碰任何表名或 SQL：
 * S3′-2 把存储换成三级模型后，本文件必须原样继续有效——它正是那次换血的安全绳。
 */

const baseWeapon = 4001;
const adeptWeapon = 4002;
const timelostWeapon = 4003;
const oldPrintWeapon = 4004;
const unrelatedWeapon = 4005;
const voltShotPlug = 2001;
const rapidHitPlug = 2002;

const groupA = "group-a";
const groupB = "group-b";
const groupC = "group-c";

/** 全部武器共用两个特性插槽，让统一模板的 Perk 1 / Perk 2 必填栏位成立。 */
function weaponDefinition(hash: number, name: string) {
  return {
    hash,
    itemTypeDisplayName: "步枪",
    displayProperties: { name, description: name },
    sockets: {
      socketEntries: [
        { reusablePlugItems: [{ plugItemHash: voltShotPlug }] },
        { reusablePlugItems: [{ plugItemHash: rapidHitPlug }] }
      ]
    }
  };
}

const definitions: WeaponKnowledgeSemanticDefinitions = {
  item_definitions: {
    [String(baseWeapon)]: weaponDefinition(baseWeapon, "测试步枪"),
    [String(adeptWeapon)]: weaponDefinition(adeptWeapon, "测试步枪（专家）"),
    [String(timelostWeapon)]: weaponDefinition(timelostWeapon, "测试步枪（失时）"),
    // 与 baseWeapon **同名**但属于更旧的发布组：用来逼出「只保留最新发布组」的归约。
    [String(oldPrintWeapon)]: weaponDefinition(oldPrintWeapon, "测试步枪"),
    [String(unrelatedWeapon)]: weaponDefinition(unrelatedWeapon, "无关步枪")
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

const runtimeDefinitions = {
  ...definitions.item_definitions,
  ...definitions.plug_definitions
} as DefinitionComponentData;

function relation(
  itemHash: number,
  releaseGroupKey: string,
  releaseLabel: string,
  variantTags: WeaponIdentityRelation["variant_tags"]
): WeaponIdentityRelation {
  return {
    item_hash: itemHash,
    family_key: "测试步枪",
    release_group_key: releaseGroupKey,
    variant_kind: variantTags[0] ?? "standard",
    variant_tags: variantTags,
    canonical_item_hash: baseWeapon,
    release_label: releaseLabel,
    relation_evidence: "release_trait"
  };
}

const identityRelations: WeaponIdentityRelation[] = [
  relation(baseWeapon, groupA, "releases.v3.1.0", ["standard"]),
  relation(adeptWeapon, groupA, "releases.v3.1.0", ["adept"]),
  relation(timelostWeapon, groupA, "releases.v3.1.0", ["timelost"]),
  // releases.v1 < releases.v3：归约会把这条所在的发布组丢掉。
  relation(oldPrintWeapon, groupB, "releases.v1.0.0", ["standard"]),
  relation(unrelatedWeapon, groupC, "releases.v3.0.0", ["standard"])
];

const validation: WeaponKnowledgeValidationContext = {
  manifest_version: "test-manifest-identity",
  semantic_definitions: definitions,
  // 导入期展开身份要用它——生产环境由 `getWeaponIdentityRelations` 提供（返回整个发布组）。
  weaponIdentityRelations: identityRelations
};

/**
 * 用**旧版普通玩家模板**而不是统一推荐模板：统一模板没有「武器ID」列，武器只能靠名字认，
 * 于是所有行都落在三级（仅名称）分支上，一级 / 二级根本走不到。要覆盖发布组归约与变体约束，
 * 夹具必须能写下武器 ID。
 */
const header = "武器,武器ID,英文名称,推荐来源,用途,第一列,第二列,Perk 1,Perk 2,大师,起源特性,评级,备注";

/**
 * 每条规则都带一个独特的备注，用来在读取结果里认出它是哪一行——
 * `rule_stable_id` 是不透明哈希，测不了「哪条规则」。
 */
type RuleFixture = {
  /** 备注列，同时是本网的规则标识。 */
  label: string;
  weaponName: string;
  weaponIds: string;
  /** 断言用的期望展开集（由夹具身份直接推出，不由被测实现推出）。 */
  expectedHashes: number[];
};

const ruleFixtures: RuleFixture[] = [
  {
    // 一级：点名了 baseWeapon，变体无约束（名字里没有后缀）→ 二级把同组其它版本也带上。
    label: "R1基础通用",
    weaponName: "测试步枪",
    weaponIds: String(baseWeapon),
    expectedHashes: [baseWeapon, adeptWeapon, timelostWeapon]
  },
  {
    // 一级 + 变体约束：名字带「（专家）」→ 只适用专家版，二级不放大。
    label: "R2专家专用",
    weaponName: "测试步枪（专家）",
    weaponIds: String(adeptWeapon),
    expectedHashes: [adeptWeapon]
  },
  {
    // 零级 + 发布组归约：只写名字、没有武器 ID，官方名命中**两个**同名武器
    // （4001 与更旧的 4004）→ 归约只留最新发布组，4004 不算。
    label: "R3只写名字",
    weaponName: "测试步枪",
    weaponIds: "",
    expectedHashes: [baseWeapon, adeptWeapon, timelostWeapon]
  },
  {
    // 零级 + 变体约束：只写名字且名字带「（失时）」→ 只留失时版。
    label: "R4名字带变体",
    weaponName: "测试步枪（失时）",
    weaponIds: "",
    expectedHashes: [timelostWeapon]
  }
];

/**
 * 只做单元级展开断言、**不进 CSV** 的身份：格式校验要求一行里每个「武器ID」的官方名都与「武器」列
 * 一致，所以「普通版 / 专家版 / 失时版」三个 ID 写在同一行是导不进来的——现实数据里它们是三行。
 * 但展开算法本身对多 ID 必须是对称的：写了几个版本，这几个版本就都得看得到（用户 2026-09-16 口径）。
 */
const multiIdIdentityFixtures: RuleFixture[] = [
  {
    label: "三版本三 ID 一行",
    weaponName: "测试步枪",
    weaponIds: [baseWeapon, adeptWeapon, timelostWeapon].join(" / "),
    expectedHashes: [baseWeapon, adeptWeapon, timelostWeapon]
  }
];

const csv = [
  header,
  ...ruleFixtures.map((rule) => [
    rule.weaponName, rule.weaponIds, "", "Aegis推荐", "PvE", "", "",
    "伏特弹", "快速命中", "", "", "S", rule.label
  ].join(","))
].join("\n");

/** 夹具声明的武器 ID：与 `splitValues` 同一口径（「 / 」分隔），但不借用被测实现。 */
function declaredIds(rule: RuleFixture): number[] {
  return rule.weaponIds
    .split("/")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(Number);
}

function writeCsv(text: string, name = "推荐.csv"): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), "d2-tools-identity-"));
  const path = join(dir, name);
  writeFileSync(path, text, "utf8");
  return { dir, path };
}

/** 目标武器在读取期的名称与英文名：模拟真实调用方传进来的那一份。 */
function sourceOptionsFor(itemHash: number) {
  const definition = definitions.item_definitions[String(itemHash)];
  return {
    manifest_version: validation.manifest_version,
    item_name: definition?.displayProperties?.name ?? "",
    itemDefinitions: runtimeDefinitions
  };
}

/**
 * 读取期：目标武器能匹配到哪些规则（按夹具备注标识）。
 *
 * 走的必须是**组装后的服务**（`csvRecommendationSource` 适配器 → `itemHashes.includes`）：
 * 身份在导入期就已定死，读取期不再需要 `weaponIdentityRelations` 这类输入。
 */
async function readTimeMatchedLabels(dataDir: string, itemHash: number): Promise<string[]> {
  const service = createDefaultCommunityPerkService({ data: { data_dir: dataDir } });
  const recommendation = await service.getRecommendationsWithAllSources(itemHash, sourceOptionsFor(itemHash));
  return (recommendation?.source_records ?? [])
    .map((record) => record.note ?? "")
    .sort();
}

/** 新口径：规则的预展开 hash 集包含该目标的那些规则。 */
function expansionMatchedLabels(itemHash: number, nameEntries: ReturnType<typeof buildWeaponNameEntries>): string[] {
  return ruleFixtures
    .filter((rule) => expandRecommendationItemHashes({
      itemHashes: declaredIds(rule),
      weaponName: rule.weaponName
    }, identityRelations, nameEntries).includes(itemHash))
    .map((rule) => rule.label)
    .sort();
}

/** 每个版本的开页按新口径应当看到的规则（展开集包含该目标的那些规则）。 */
const expectedExpansionByWeapon: Record<number, string[]> = {
  [baseWeapon]: ["R1基础通用", "R3只写名字"],
  [adeptWeapon]: ["R1基础通用", "R2专家专用", "R3只写名字"],
  [timelostWeapon]: ["R1基础通用", "R3只写名字", "R4名字带变体"],
  [oldPrintWeapon]: [],
  [unrelatedWeapon]: []
};

/** 「写了几个版本，这几个版本就都看得到」——用户口径在三个变体上的直接投影。 */
const symmetricAcrossVariants = ["R1基础通用", "R3只写名字"];

describe("recommendation identity expansion (S3′-0)", () => {
  it("expands each rule to exactly the weapon hashes the read-time matcher would select", () => {
    const nameEntries = buildWeaponNameEntries(definitions.item_definitions);
    for (const rule of [...ruleFixtures, ...multiIdIdentityFixtures]) {
      const expanded = expandRecommendationItemHashes({
        itemHashes: declaredIds(rule),
        weaponName: rule.weaponName
      }, identityRelations, nameEntries);
      expect({ label: rule.label, hashes: [...expanded].sort() }).toEqual({
        label: rule.label,
        hashes: [...rule.expectedHashes].sort()
      });
    }
  });

  it("gives every variant page the widened rule set its expanded hashes promise", async () => {
    const { dir, path } = writeCsv(csv);
    const preview = previewWeaponRecommendationCsv(csv, path, definitions);
    expect(preview.blocking_issue_count).toBe(0);
    await importWeaponRecommendationCsv(dir, path, preview.fingerprint, validation, { name: "身份夹具", mode: "create" });

    const nameEntries = buildWeaponNameEntries(definitions.item_definitions);
    for (const [key, expected] of Object.entries(expectedExpansionByWeapon)) {
      const itemHash = Number(key);
      expect({ itemHash, labels: expansionMatchedLabels(itemHash, nameEntries) }).toEqual({
        itemHash,
        labels: [...expected].sort()
      });
    }

    // 用户口径的正面表述：同一条规则，三个版本的开页都要看得到，不分主次；
    // 「只写普通版 ID」的那条（R1）不能只在普通版页面上出现。
    for (const itemHash of [baseWeapon, adeptWeapon, timelostWeapon]) {
      const labels = expansionMatchedLabels(itemHash, nameEntries);
      for (const label of symmetricAcrossVariants) {
        expect({ itemHash, label, seen: labels.includes(label) }).toEqual({ itemHash, label, seen: true });
      }
    }
  });

  it("pins the fixture itself: the old read-time path agrees once the import stores the expanded set", async () => {
    const { dir, path } = writeCsv(csv);
    const preview = previewWeaponRecommendationCsv(csv, path, definitions);
    await importWeaponRecommendationCsv(dir, path, preview.fingerprint, validation, { name: "身份夹具", mode: "create" });

    const nameEntries = buildWeaponNameEntries(definitions.item_definitions);
    // 非空锚点：没有它们，下面「两边都空」也会通过，网就成了摆设。
    expect(await readTimeMatchedLabels(dir, baseWeapon)).toEqual(["R1基础通用", "R3只写名字"]);
    // 发布组归约把「只写名字」那一行补出的 4004（旧发布组）丢掉了：同名的历史复刻不算命中。
    expect(await readTimeMatchedLabels(dir, oldPrintWeapon)).toEqual([]);
    // 无关武器一条都不该命中。
    expect(await readTimeMatchedLabels(dir, unrelatedWeapon)).toEqual([]);

    for (const [key, expected] of Object.entries(expectedExpansionByWeapon)) {
      const itemHash = Number(key);
      const readTime = await readTimeMatchedLabels(dir, itemHash);
      const expanded = expansionMatchedLabels(itemHash, nameEntries);
      expect({ itemHash, labels: readTime }).toEqual({ itemHash, labels: [...expected].sort() });
      // **S3′-1 的判据**：导入期把身份定死成 hash 之后，读取期只剩成员判断，两边必然逐条相同。
      // S3′-1 之前这里读出来的是**真子集**——4002 只有 `R2专家专用`、4003 只有 `R4名字带变体`，
      // 少掉的 `R1基础通用` / `R3只写名字` 正是被「同来源精确优先」压掉的那几条。
      expect({ itemHash, readTime }).toEqual({ itemHash, readTime: expanded });
    }
  });
});
