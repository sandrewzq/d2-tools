import { describe, expect, it } from "vitest";
import type { SourceOptions } from "@d2-tools/core/community-perks";
import type { DefinitionComponentData } from "@d2-tools/core/manifest/definitions";
import { parseDimWishlistWithIssues } from "@d2-tools/core/analysis/wishlistImport";
import { filterDimWishlistForImport } from "../src/community/dimWishlistValidation.js";

/**
 * 导入期校验（T56 · 原 T60）：笔误行按行跳过，其余照常导入。
 *
 * 这里钉的是三条容易在改动里悄悄失效的性质：
 * 1. **拿不到定义池就不判定**——否则资料库缺一把枪就会把整份文件判没（最危险的失败方向）；
 * 2. **只有「丢行打破了原本成立的候选集合」才整把跳过**——否则作者写的独立组合会被一起删掉；
 * 3. 四种行级判据各自只跳自己那一行，报得出类别与位置。
 */

const weaponHash = 5001;
const barrelA = 6005;
const barrelB = 6006;
const perkA = 6001;
const perkB = 6002;
const perkC = 6003;
const perkD = 6004;
/** 定义池里根本不存在的 Hash：用来演「写错的 perk」。 */
const perkTypo = 999_001;

function plugDefinition(hash: number, name: string, category: string) {
  return {
    hash,
    itemTypeDisplayName: category === "barrel" ? "枪管" : "特性",
    plug: { plugCategoryIdentifier: category },
    displayProperties: { name, description: name }
  };
}

/** 一把枪：一栏枪管、两栏特性（perkA/perkB 同属第一栏，perkC/perkD 同属第二栏）。 */
const definitions = {
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
  },
  [String(barrelA)]: plugDefinition(barrelA, "枪管甲", "barrel"),
  [String(barrelB)]: plugDefinition(barrelB, "枪管乙", "barrel"),
  [String(perkA)]: plugDefinition(perkA, "特性甲", "frames"),
  [String(perkB)]: plugDefinition(perkB, "特性乙", "frames"),
  [String(perkC)]: plugDefinition(perkC, "特性丙", "frames"),
  [String(perkD)]: plugDefinition(perkD, "特性丁", "frames")
} as DefinitionComponentData;

const options: SourceOptions = { itemDefinitions: definitions };

const rule = (perks: number[], itemHash = weaponHash) => `dimwishlist:item=${itemHash}&perks=${perks.join(",")}`;

function validate(text: string, sourceOptions: SourceOptions = options) {
  const parsed = parseDimWishlistWithIssues(text);
  return {
    parsed,
    result: filterDimWishlistForImport({
      wishlist: parsed.wishlist,
      parse_issues: parsed.issues,
      options: sourceOptions
    })
  };
}

function categories(result: ReturnType<typeof validate>["result"]): string[] {
  return result.issues.map((issue) => issue.category);
}

describe("导入期校验：笔误行按行跳过", () => {
  it("一份干净的文件不该被动：一行都不跳，计数全为零", () => {
    const { result } = validate([
      "// 说明用注释，不是规则",
      rule([barrelA, perkA, perkC]),
      rule([barrelB, perkB, perkD])
    ].join("\n"));

    // 非空锚点：没有这两条，「什么都没跳」在两个 0 上也能通过。
    expect(result.wishlist.rules).toHaveLength(2);
    expect(result.skipped_row_count).toBe(0);
    expect(result.affected_weapon_count).toBe(0);
    expect(result.skipped_weapon_count).toBe(0);
    expect(result.issue_count).toBe(0);
  });

  it("不是规则的散文行不报问题（否则带说明头的文件会刷屏，把真笔误淹掉）", () => {
    const { result } = validate([
      "这是一份推荐清单，下面开始：",
      "# 标题也常见",
      rule([barrelA, perkA, perkC])
    ].join("\n"));

    expect(result.wishlist.rules).toHaveLength(1);
    expect(result.issue_count).toBe(0);
  });

  it("perk 在这把枪的候选里查不到：只跳这一行，其余照常", () => {
    const { result } = validate([
      rule([barrelA, perkA, perkC]),
      rule([barrelA, perkA, perkTypo]),
      rule([barrelB, perkB, perkD])
    ].join("\n"));

    expect(result.wishlist.rules).toHaveLength(2);
    expect(result.skipped_row_count).toBe(1);
    expect(result.affected_weapon_count).toBe(1);
    expect(result.skipped_weapon_count).toBe(0);
    expect(categories(result)).toEqual(["unknown_perk"]);
    // 指向哪一行、哪把枪、哪个 perk 都要说得出，用户才改得动文件。
    const issue = result.issues[0]!;
    expect(issue.line_number).toBe(2);
    expect(issue.weapon_name).toBe("测试步枪");
    expect(issue.perk_name).toBe(String(perkTypo));
  });

  it("同一行里两个 perk 落在同一栏：不可能同时拥有，跳这一行", () => {
    const { result } = validate([
      rule([barrelA, perkA, perkB, perkC]),
      rule([barrelA, perkA, perkC])
    ].join("\n"));

    expect(result.wishlist.rules).toHaveLength(1);
    expect(categories(result)).toEqual(["same_slot"]);
    expect(result.issues[0]!.message).toContain("特性甲");
    expect(result.issues[0]!.message).toContain("特性乙");
  });

  it("同一行里同一个 perk 写了两次：跳这一行，并点名是哪个 perk", () => {
    const { result } = validate([
      rule([barrelA, perkA, perkC, perkC]),
      rule([barrelA, perkA, perkC])
    ].join("\n"));

    expect(result.wishlist.rules).toHaveLength(1);
    expect(categories(result)).toEqual(["duplicate_perk"]);
    expect(result.issues[0]!.perk_name).toBe("特性丙");
  });

  it("写不成规则的行（非法 Hash / 缺字段）：按行跳过并把原文摆出来", () => {
    const { result } = validate([
      "dimwishlist:item=5001&perks=oops",
      rule([barrelA, perkA, perkC])
    ].join("\n"));

    expect(result.wishlist.rules).toHaveLength(1);
    expect(result.skipped_row_count).toBe(1);
    expect(categories(result)).toEqual(["unparseable_rule"]);
    expect(result.issues[0]!.raw_line).toBe("dimwishlist:item=5001&perks=oops");
    // 语法行也尽量认出是哪把枪（宽松取 item=），报错点到枪上用户才找得到那一段。
    expect(result.issues[0]!.weapon_name).toBe("测试步枪");
  });

  it("资料库里没有这把枪的定义：一行都不判（否则整个文件会被误判没）", () => {
    const unknownWeapon = 7_777_777;
    const { result } = validate([
      rule([perkTypo, perkA], unknownWeapon),
      rule([perkTypo, perkB], unknownWeapon)
    ].join("\n"));

    expect(result.wishlist.rules).toHaveLength(2);
    expect(result.issue_count).toBe(0);
    expect(result.skipped_row_count).toBe(0);
  });

  it("整个定义池为空（资料库没就绪）：同样一行都不判", () => {
    const { result } = validate([
      rule([perkTypo, perkA]),
      rule([perkTypo, perkB])
    ].join("\n"), {});

    expect(result.wishlist.rules).toHaveLength(2);
    expect(result.issue_count).toBe(0);
    // 看不见的武器不许判笔误，也不许判成「摊开写」——两个方向的判定都要靠定义池。
    expect(result.merged_row_count).toBe(0);
  });
});

/**
 * Bug #102：「两个特长栏都可能出」的 perk——两个特长插槽的掉落池里都有它。
 *
 * 按插件身份反查会得到两个候选栏位。从前这被判成「跨栏无法唯一归栏」、**整行丢掉**：
 * 作者写明的候选从「任选其一」里静默消失（`意外复苏（专家）` 的第一栏少了 `脉冲增幅器`），
 * 整把枪只有一行规则时更是整把消失（`砷毒噬咬-4b` 在在线合集里丢了全部 342 行）。
 * 实测 DIM 文本是按栏位顺序逐个写 perk 的，所以按书写顺序消歧后归栏只有一个结果，
 * 这一档不存在了；真·同栏冲突（同一栏写了两个 perk）照旧报。
 */
const sharedWeaponHash = 5002;
const sharedA = 6010;
const sharedB = 6011;

/** 一把枪：两栏特性，`sharedA` / `sharedB` 两栏都可能出。 */
const sharedTraitDefinitions = {
  [String(sharedWeaponHash)]: {
    hash: sharedWeaponHash,
    itemTypeDisplayName: "步枪",
    displayProperties: { name: "两栏步枪", description: "shared trait rifle" },
    sockets: {
      socketEntries: [
        { reusablePlugItems: [{ plugItemHash: barrelA }, { plugItemHash: barrelB }] },
        { reusablePlugItems: [{ plugItemHash: perkA }, { plugItemHash: perkB }, { plugItemHash: sharedA }, { plugItemHash: sharedB }] },
        { reusablePlugItems: [{ plugItemHash: sharedA }, { plugItemHash: sharedB }, { plugItemHash: perkC }, { plugItemHash: perkD }] }
      ]
    }
  },
  [String(sharedA)]: plugDefinition(sharedA, "两栏特性甲", "frames"),
  [String(sharedB)]: plugDefinition(sharedB, "两栏特性乙", "frames")
} as DefinitionComponentData;

const sharedOptions: SourceOptions = { itemDefinitions: { ...definitions, ...sharedTraitDefinitions } };

describe("导入期校验：两个特长栏都可能出的 perk 不算问题（Bug #102）", () => {
  it("写在第二个特长栏位置：不丢行，也不报问题", () => {
    // 第一栏写 perkA（只可能落第一栏），第二栏位置写的 sharedA（两栏都可能出）。
    const { result } = validate(rule([barrelA, perkA, sharedA], sharedWeaponHash), sharedOptions);

    expect(result.wishlist.rules).toHaveLength(1);
    expect(result.skipped_row_count).toBe(0);
    expect(result.issue_count).toBe(0);
  });

  it("一行里两个都可能两栏出的 perk：按书写顺序分归两栏，不报同栏冲突", () => {
    const { result } = validate(rule([sharedA, sharedB], sharedWeaponHash), sharedOptions);

    expect(result.wishlist.rules).toHaveLength(1);
    expect(result.issue_count).toBe(0);
  });

  it("两个都只可能落第一栏的 perk：真冲突照旧报", () => {
    const { result } = validate(rule([perkA, perkB], sharedWeaponHash), sharedOptions);

    expect(result.wishlist.rules).toHaveLength(0);
    expect(result.skipped_row_count).toBe(1);
    expect(categories(result)).toEqual(["same_slot"]);
  });

  it("消歧之后撞车的行也照旧报：书写顺序与栏位顺序矛盾时不许静默放过", () => {
    // sharedA→第一栏、sharedB→第二栏，最后这个 perkA 只可能落第一栏，没有空栏可去。
    const { result } = validate(rule([sharedA, sharedB, perkA], sharedWeaponHash), sharedOptions);

    expect(result.wishlist.rules).toHaveLength(0);
    expect(categories(result)).toEqual(["same_slot"]);
  });
});

describe("导入期校验：摊开写的展开行不是笔误", () => {
  /**
   * 实测那份文件的形状（那份社区愿望单里的光鳃之调）：
   * 作者想写「第一栏任选其一 × 第二栏任选其一」，却把 2×2 的四种搭配连同各种组合摊开写成 9 行，
   * 其中 5 行把同一栏的两个 perk 写在了一起（他自己忘了那是「任选其一」）。
   * 从前这 5 行逐行报「不可能同时拥有」，整份文件因此报出 7291 行。
   */
  const expandedPool = [
    rule([perkA, perkB, perkC, perkD]),
    rule([perkA, perkB, perkC]),
    rule([perkA, perkB, perkD]),
    rule([perkA, perkC, perkD]),
    rule([perkB, perkC, perkD]),
    rule([perkA, perkC]),
    rule([perkA, perkD]),
    rule([perkB, perkC]),
    rule([perkB, perkD])
  ].join("\n");

  it("一组候选摊开写成 9 行：5 行算摊开写的冗余，不再报问题", () => {
    const { result } = validate(expandedPool);

    expect(result.merged_row_count).toBe(5);
    expect(result.merged_weapon_count).toBe(1);
    expect(result.skipped_row_count).toBe(0);
    expect(result.affected_weapon_count).toBe(0);
    expect(result.issue_count).toBe(0);
    // 认不认得出摊开写只影响报数，不影响数据：写进去的还是那四条「每栏任选其一」。
    expect(result.wishlist.rules.map((entry) => entry.perk_hashes)).toEqual([
      [perkA, perkC],
      [perkA, perkD],
      [perkB, perkC],
      [perkB, perkD]
    ]);
  });

  it("留下的行凑不成一组候选：同栏冲突照旧按问题报", () => {
    // 两条互不相干的 Roll（2×2 只写了两条），第三条又把第一栏写重了。
    // 这不是「一组候选摊开写」，第三条照旧要报——否则「摊开写」会变成笔误的挡箭牌。
    const { result } = validate([
      rule([perkA, perkC]),
      rule([perkB, perkD]),
      rule([perkA, perkB, perkC])
    ].join("\n"));

    expect(result.merged_row_count).toBe(0);
    expect(result.skipped_row_count).toBe(1);
    expect(categories(result)).toEqual(["same_slot"]);
  });

  it("留下的行是一组候选，但这一行的 perk 哪个留的行都没覆盖：照旧报", () => {
    // 前四条正好是 2×2 的全部搭配，第五条写了「第一栏的两个 perk」却一个第二栏都没写——
    // 它写到的 perk 不落在任何留下的行里，丢掉它就是真丢一条，必须报出来。
    const { result } = validate([
      rule([perkA, perkC]),
      rule([perkA, perkD]),
      rule([perkB, perkC]),
      rule([perkB, perkD]),
      rule([perkA, perkB])
    ].join("\n"));

    expect(result.merged_row_count).toBe(0);
    expect(result.skipped_row_count).toBe(1);
    expect(categories(result)).toEqual(["same_slot"]);
    expect(result.issues[0]!.line_number).toBe(5);
  });

  it("一行里写错了一个 perk：照旧按问题报，摊开写的识别不吞它", () => {
    // 这行的「特性甲 + 特性丙」已被留下的行覆盖，但它还多写了一个查不到的 perk——
    // 那是笔误，不是摊开写多写出来的行。
    const { result } = validate([
      expandedPool,
      rule([perkA, perkC, perkTypo])
    ].join("\n"));

    expect(result.merged_row_count).toBe(5);
    expect(result.skipped_row_count).toBe(1);
    expect(categories(result)).toEqual(["unknown_perk"]);
  });

  it("一行把同一个 perk 写了两遍、去重后又撞同栏：仍按问题报", () => {
    // 「写了两遍」只在解析层看得见（下游拿到的规则已去重）。这一行去重后是「特性甲 + 特性乙 + 特性丙」，
    // 既撞同栏、内容又已被留下的行覆盖——只看这两条它会当成摊开写的冗余被吞掉，
    // 而作者其实是要把「特性甲」写重了。笔误优先于写法。
    const { result } = validate([
      expandedPool,
      rule([perkA, perkA, perkB, perkC])
    ].join("\n"));

    expect(result.merged_row_count).toBe(5);
    expect(result.skipped_row_count).toBe(1);
    expect(categories(result)).toEqual(["same_slot"]);
    expect(result.issues[0]!.line_number).toBe(10);
  });
});

describe("导入期校验：整把枪跳过的触发条件", () => {
  const product = [perkA, perkC];

  it("丢行破坏了原本成立的候选集合：这把枪剩下的规则一起跳过", () => {
    // 作者写的是一组「每栏任选其一」（2×2 = 4 条）；其中一条把第二栏的 perk 写重了。
    // 去掉这一行后只剩 3 条，凑不成乘积——按残缺集合展示才是错的，所以整把枪一起跳过。
    const { result } = validate([
      rule([perkA, perkC]),
      rule([perkA, perkD]),
      rule([perkB, perkC]),
      rule([perkB, perkD, perkD])
    ].join("\n"));

    expect(result.skipped_row_count).toBe(1);
    expect(result.affected_weapon_count).toBe(1);
    expect(result.skipped_weapon_count).toBe(1);
    expect(result.wishlist.rules).toHaveLength(0);
    expect(categories(result)).toEqual(["duplicate_perk", "irreducible_weapon"]);
  });

  it("作者本来写的是几条独立组合：丢一行只是少一条，其余照常保留", () => {
    // 这两条 Roll 互不相干，本来就归约不成「每栏任选其一」。若照口径字面执行
    // （「剩余集合不构成乘积就整把跳过」），第二条好 Roll 会被一起删掉——
    // 正是口径里「避免为通过校验而悄悄丢正常数据」要防的事。
    const { result } = validate([
      rule([perkA, perkC]),
      rule([perkB, perkD]),
      rule([perkA, perkTypo])
    ].join("\n"));

    expect(result.wishlist.rules).toHaveLength(2);
    expect(result.skipped_row_count).toBe(1);
    expect(result.affected_weapon_count).toBe(1);
    expect(result.skipped_weapon_count).toBe(0);
    expect(categories(result)).toEqual(["unknown_perk"]);
  });

  it("整把枪的规则都被跳过时，它的来源注释段也不留下（不留空来源）", () => {
    // `title:` 只有第一条是文档标题，后续靠注释段（note）区分来源——这里要的是两个来源段。
    const { result, parsed } = validate([
      "// note: 来源甲",
      rule([perkA, perkTypo]),
      "// note: 来源乙",
      rule([barrelA, perkA, perkC])
    ].join("\n"));

    // 夹具自检：两个来源段都解析出来了（否则下面的断言是空转）。
    expect(parsed.wishlist.source_blocks?.map((block) => block.note)).toEqual(["来源甲", "来源乙"]);
    expect(result.wishlist.rules).toHaveLength(1);
    expect(result.wishlist.source_blocks?.map((block) => block.note)).toEqual(["来源乙"]);
  });
});
