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
  WeaponKnowledgeIdentityContext,
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
 * **口径（2026-09-24 拍板：推荐跟着武器走，不跟着版本走）：家族全展开 + 声明版本优先 +
 * 逐 hash 池子自检。** 旧口径在展开之后多做一步「只保留最新发布组」的归约，本文件原来是按那套写的；
 * 归约被删掉之后，**同名的历史复刻版本也要看到推荐**——这正是下面 `oldPrintWeapon`(4004) 的存在意义：
 * 它在旧口径下是空集，在新口径下与基础版看到同一批规则。
 *
 * 三条口径各由本文件的哪些夹具钉住：
 *
 *   1. **家族全展开**：`oldPrintWeapon`(4004) 属于更旧的发布组，却和 4001 / 4002 / 4003 同族 ——
 *      断言它看得到 R1 / R3。归约若被重新引入，这一条立刻红。
 *   2. **声明版本优先**：`adeptWeapon`(4002) 自己被 R2 写了规则，R1 / R3 就不再展开到它上面
 *      （同一版本叠两条规则会把「符合 n 套」从 1 抬到 2）。夹具因此必须把「文件里声明过的 hash」
 *      传进展开，与落库期 `declaredItemHashesOf(rows)` 取同一个集合。
 *   3. **变体约束**：名字带「（专家）」「（失时）」的行只展开到那个变体（R2 / R4）。
 *
 * 因此本网的断言是两条，而不再是「逐条等价」：
 *
 *   1. 每条规则的展开集 === 夹具按身份直接推出的期望集；
 *   2. 展开集里的每个版本，开页都看得到这条规则（读取期只剩成员判断，两边必然逐条相同）。
 *
 * 夹具刻意只用**契约**（规则写了什么身份、目标能匹配到哪些规则），不碰任何表名或 SQL：
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
    // 与 baseWeapon **同名**、属于更旧的发布组：家族全展开要把它带进来，归约则正好相反。
    [String(oldPrintWeapon)]: weaponDefinition(oldPrintWeapon, "测试步枪"),
    // 名字与上面四把都不同：只在无关武器上留一条「一条都不该命中」的反例。
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

/**
 * 家族键 = 抹掉官方变体后缀的武器名。生产侧 `weaponFamilyKey` 还要拼上
 * `item.weapon.*` trait、itemType、bucketTypeHash，那三段在本夹具里对每把枪都相同，省掉不影响口径。
 *
 * **每把枪各自算**：`unrelatedWeapon` 从前被误挂进「测试步枪」这个家族键，家族全展开会把
 * 无关武器并进来——那是夹具的错，不是实现的错。
 */
function familyKeyOf(itemHash: number): string {
  const name = definitions.item_definitions[String(itemHash)]?.displayProperties?.name ?? "";
  return name.replace(/\s*[（(][^（）()]+[）)]\s*$/u, "").trim();
}

/**
 * 发布组字段照写：**新口径已经不看它**（家族键 + 变体标签就够），留着是为了让夹具仍然是生产输出的
 * 形状，也让「展开不依赖发布组」这件事有一个可证伪的点——4004 在 group-b、其余三把在 group-a，
 * 若哪天又按发布组收窄，下面的期望集会立刻对不上。
 */
function relation(
  itemHash: number,
  releaseGroupKey: string,
  releaseLabel: string,
  variantTags: WeaponIdentityRelation["variant_tags"]
): WeaponIdentityRelation {
  return {
    item_hash: itemHash,
    family_key: familyKeyOf(itemHash),
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
  relation(oldPrintWeapon, groupB, "releases.v1.0.0", ["standard"]),
  relation(unrelatedWeapon, groupC, "releases.v3.0.0", ["standard"])
];

/** 导入期展开用的身份上下文：与落库路径 `weaponIdentityRelations + buildWeaponNameEntries` 同源。 */
const identityContext: WeaponKnowledgeIdentityContext = {
  relations: identityRelations,
  nameEntries: buildWeaponNameEntries(definitions.item_definitions)
};

const validation: WeaponKnowledgeValidationContext = {
  manifest_version: "test-manifest-identity",
  semantic_definitions: definitions,
  // 导入期展开身份要用它——生产环境由 `getWeaponIdentityRelations` 提供（返回整个武器家族）。
  weaponIdentityRelations: identityRelations
};

/**
 * 用**旧版普通玩家模板**而不是统一推荐模板：统一模板没有「武器ID」列，武器只能靠名字认，
 * 于是所有行都落在「只写名字」那一支上，变体约束走不到。要覆盖家族展开与变体约束，
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
    // 点名了 baseWeapon，变体无约束 → 家族全展开到 4003 与 4004；4002 被 R2 声明过，不在这里展开。
    label: "R1基础通用",
    weaponName: "测试步枪",
    weaponIds: String(baseWeapon),
    expectedHashes: [baseWeapon, timelostWeapon, oldPrintWeapon]
  },
  {
    // 变体约束：名字带「（专家）」→ 只适用专家版，家族展开不放大。
    label: "R2专家专用",
    weaponName: "测试步枪（专家）",
    weaponIds: String(adeptWeapon),
    expectedHashes: [adeptWeapon]
  },
  {
    // 只写名字、没有武器 ID，官方名命中**两个**同名武器（4001 与更旧的 4004）→ 两条都是基础集，
    // 再按家族展开补上 4003；4002 被 R2 声明过。
    label: "R3只写名字",
    weaponName: "测试步枪",
    weaponIds: "",
    expectedHashes: [baseWeapon, timelostWeapon, oldPrintWeapon]
  },
  {
    // 只写名字且名字带「（失时）」→ 变体约束只留失时版。
    label: "R4名字带变体",
    weaponName: "测试步枪（失时）",
    weaponIds: "",
    expectedHashes: [timelostWeapon]
  }
];

/**
 * 只做单元级展开断言、**不进 CSV** 的身份：格式校验要求一行里每个「武器ID」的官方名都与「武器」列
 * 一致，所以「普通版 / 专家版 / 失时版」三个 ID 写在同一行是导不进来的——现实数据里它们是三行。
 * 但展开算法本身对多 ID 必须是对称的：写下的每个版本都在展开集里，家族其余版本照常补上。
 */
const multiIdIdentityFixtures: RuleFixture[] = [
  {
    label: "三版本三 ID 一行",
    weaponName: "测试步枪",
    weaponIds: [baseWeapon, adeptWeapon, timelostWeapon].join(" / "),
    expectedHashes: [baseWeapon, adeptWeapon, timelostWeapon, oldPrintWeapon]
  }
];

const csv = [
  header,
  ...ruleFixtures.map((rule) => [
    rule.weaponName, rule.weaponIds, "", "示例推荐表", "PvE", "", "",
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

/**
 * 「声明版本优先」的声明集 = **本份文件里所有行写下的**武器 ID，与落库期 `declaredItemHashesOf(rows)`
 * 同一个集合（含被拦下的行）。只写名字的行没有写下版本——它们的身份在展开时按官方名补出，
 * 补出来的 hash 不算「声明」（那是一次同名推导，拿去压别的规则的展开就变成漏匹配）。
 * 展开不带上这个集合，本网就会去验一套落库时根本不成立的期望。
 */
const declaredByFile = [...new Set(ruleFixtures.flatMap((rule) => declaredIds(rule)))];

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

/** 新口径：规则按同一套身份上下文展开后，hash 集包含该目标的那些规则。 */
function expansionMatchedLabels(itemHash: number): string[] {
  return ruleFixtures
    .filter((rule) => expandForFixture(rule).includes(itemHash))
    .map((rule) => rule.label)
    .sort();
}

/** 一条夹具行在导入期会展开成哪些 hash（与落库期同一套输入）。 */
function expandForFixture(rule: RuleFixture): number[] {
  return expandRecommendationItemHashes({
    itemHashes: declaredIds(rule),
    weaponName: rule.weaponName
  }, identityRelations, identityContext.nameEntries, { declaredItemHashes: declaredByFile });
}

/** 每个版本的开页按新口径应当看到的规则（展开集包含该目标的那些规则）。 */
const expectedExpansionByWeapon: Record<number, string[]> = {
  [baseWeapon]: ["R1基础通用", "R3只写名字"],
  [adeptWeapon]: ["R2专家专用"],
  [timelostWeapon]: ["R1基础通用", "R3只写名字", "R4名字带变体"],
  // 家族全展开补回的漏匹配：旧印刷版另一个发布组，从前是空集。
  [oldPrintWeapon]: ["R1基础通用", "R3只写名字"],
  [unrelatedWeapon]: []
};

describe("recommendation identity expansion (S3′-0)", () => {
  it("expands each rule to exactly the weapon hashes the read-time matcher would select", () => {
    for (const rule of [...ruleFixtures, ...multiIdIdentityFixtures]) {
      expect({ label: rule.label, hashes: [...expandForFixture(rule)].sort() }).toEqual({
        label: rule.label,
        hashes: [...rule.expectedHashes].sort()
      });
    }
  });

  it("shows each rule on every version page its expanded set promises", async () => {
    const { dir, path } = writeCsv(csv);
    const preview = previewWeaponRecommendationCsv(csv, path, definitions, identityContext);
    expect(preview.blocking_issue_count).toBe(0);
    await importWeaponRecommendationCsv(dir, path, preview.fingerprint, validation, { name: "身份夹具", mode: "create" });

    for (const [key, expected] of Object.entries(expectedExpansionByWeapon)) {
      const itemHash = Number(key);
      expect({ itemHash, labels: expansionMatchedLabels(itemHash) }).toEqual({
        itemHash,
        labels: [...expected].sort()
      });
    }

    // 家族全展开的正面表述：同族的旧印刷版与基础版看到同一批通用规则。
    expect(expansionMatchedLabels(oldPrintWeapon)).toEqual(["R1基础通用", "R3只写名字"]);
    // 声明版本优先的正面表述：专家版由文件自己写的那条负责，通用规则不叠上去。
    expect(expansionMatchedLabels(adeptWeapon)).toEqual(["R2专家专用"]);
  });

  it("pins the fixture itself: the read-time path agrees once the import stores the expanded set", async () => {
    const { dir, path } = writeCsv(csv);
    const preview = previewWeaponRecommendationCsv(csv, path, definitions, identityContext);
    await importWeaponRecommendationCsv(dir, path, preview.fingerprint, validation, { name: "身份夹具", mode: "create" });

    // 非空锚点：没有它们，下面「两边都空」也会通过，网就成了摆设。
    expect(await readTimeMatchedLabels(dir, baseWeapon)).toEqual(["R1基础通用", "R3只写名字"]);
    // 旧口径在这里是空集（归约把另一个发布组丢掉了），新口径把这两条补了回来。
    expect(await readTimeMatchedLabels(dir, oldPrintWeapon)).toEqual(["R1基础通用", "R3只写名字"]);
    // 无关武器一条都不该命中。
    expect(await readTimeMatchedLabels(dir, unrelatedWeapon)).toEqual([]);

    for (const [key, expected] of Object.entries(expectedExpansionByWeapon)) {
      const itemHash = Number(key);
      const readTime = await readTimeMatchedLabels(dir, itemHash);
      const expanded = expansionMatchedLabels(itemHash);
      expect({ itemHash, labels: readTime }).toEqual({ itemHash, labels: [...expected].sort() });
      // **S3′-1 的判据**：导入期把身份定死成 hash 之后，读取期只剩成员判断，两边必然逐条相同。
      expect({ itemHash, readTime }).toEqual({ itemHash, readTime: expanded });
    }
  });
});
