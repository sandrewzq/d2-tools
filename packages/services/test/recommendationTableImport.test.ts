import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readRecommendationTableText } from "../src/community/recommendationTableFile.js";
import {
  importWeaponRecommendationCsv,
  previewWeaponRecommendationCsv,
  type WeaponKnowledgeSemanticDefinitions,
  type WeaponKnowledgeValidationContext
} from "../src/community/weaponRecommendationKnowledge.js";

/**
 * 人工推荐表格的**文件层**回归网（Bug #89）。
 *
 * 覆盖两件此前完全没网的事：① 用户在 Excel 里维护的 `.xlsx` 能不能导入；
 * ② 上一版（v0.0.25 及更早）导出的 11 列模板能不能导回来——界面一直承诺可以。
 *
 * 正向夹具 `fixtures/recommendation-table.xlsx` 是**用 Info-ZIP 打出来的真文件**，
 * 不是拿被测代码自己写的：否则「读得回来」只能证明读写两边对同一处理解一致。
 * 生成方式（内容改了就重跑一次）：
 *   mkdir -p xl/_rels xl/worksheets && 写入各 XML 部件
 *   zip -q -X -r recommendation-table.xlsx '[Content_Types].xml' _rels xl
 * 负向用例（缺工作表、空表）用测试内现造的 ZIP，形状可控且不引入更多二进制。
 */

const weaponHash = 1001;
const voltShotPlug = 2001;
const rapidHitPlug = 2002;

/**
 * 英文名池（③）：英文模板那一行的武器名落在「英文名称」列，**有英文名就只按英文名匹配**，
 * 所以这条路要先在池子里查到 hash。真实调用方按文件里写过的名字去搜索索引反查
 * （`search-en.sqlite`；中英两套索引取并集），池子里装的因此是「这个名字对应的官方装备」。
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
  plug_set_definitions: {},
  english_item_definitions: {
    [String(weaponHash)]: { hash: weaponHash, displayProperties: { name: "测试步枪" } }
  }
};

const validation: WeaponKnowledgeValidationContext = {
  manifest_version: "test-manifest-1",
  semantic_definitions: semanticDefinitions
};

const fixturePath = fileURLToPath(new URL("./fixtures/recommendation-table.xlsx", import.meta.url));
const scratchDir = (): string => mkdtempSync(join(tmpdir(), "d2-tools-table-"));

/**
 * 夹具内容的等价 CSV：表头 12 列、两行数据（两个来源，各一条规则）。
 * 第二行最后一个单元格留空——表格文件里它整个单元格都不写，读出来必须补齐成空列；
 * 工作表末尾另有一个全空行，读出来必须直接丢掉。
 */
const expectedCsvText = [
  ["推荐来源", "武器", "规则名称", "用途/分类", "枪管/瞄具", "弹匣", "大师", "Perk 1", "Perk 2", "起源特性", "评级", "备注"].join(","),
  ["我的推荐", "测试步枪", "我的推荐", "pve", "", "", "", "伏特弹", "快速命中", "", "S", '"含,逗号""引号"""'].join(","),
  ["另一个来源", "测试步枪", "另一个来源", "pve", "", "", "", "伏特弹", "快速命中", "", "S", ""].join(",")
].join("\r\n");

describe("表格文件的格式适配", () => {
  it("Excel 工作簿读出来与同内容的 CSV 逐字节相同（含末尾空单元格补齐、引号转义）", () => {
    expect(readRecommendationTableText(fixturePath)).toBe(expectedCsvText);
  });

  it("同内容的 xlsx 与 CSV 走出的预览逐字段一致（含指纹）", () => {
    const fromWorkbook = previewWeaponRecommendationCsv(
      readRecommendationTableText(fixturePath),
      fixturePath,
      semanticDefinitions
    );
    const fromCsv = previewWeaponRecommendationCsv(expectedCsvText, "推荐表.csv", semanticDefinitions);
    // 指纹一致意味着「内容相同」——同一张表存成哪种格式不影响判定。
    expect(fromWorkbook.fingerprint).toBe(fromCsv.fingerprint);
    expect({ ...fromWorkbook, file_name: "" }).toEqual({ ...fromCsv, file_name: "" });
    expect(fromWorkbook.importable_recommendation_count).toBe(2);
    expect(fromWorkbook.source_labels).toEqual(["另一个来源", "我的推荐"]);
    expect(fromWorkbook.weapon_count).toBe(1);
    expect(fromWorkbook.blocking_issue_count).toBe(0);
  });

  it("导入链路直接吃 Excel 文件：从路径读、按行落库", async () => {
    const dir = scratchDir();
    const preview = previewWeaponRecommendationCsv(
      readRecommendationTableText(fixturePath),
      fixturePath,
      semanticDefinitions
    );
    const result = await importWeaponRecommendationCsv(
      dir,
      fixturePath,
      preview.fingerprint,
      validation,
      { name: "我的推荐", mode: "create" }
    );
    expect(result.imported_row_count).toBe(2);
    expect(result.recommendation_count).toBe(2);
    expect(result.source_count).toBe(2);
  });
});

describe("旧版模板的兼容", () => {
  it("上一版 11 列中文模板能导入，来源名取「规则名称」列", () => {
    const text = [
      ["武器", "规则名称", "用途/分类", "枪管/瞄具", "弹匣", "大师", "Perk 1", "Perk 2", "起源特性", "评级", "备注"].join(","),
      ["测试步枪", "老版来源", "pve", "", "", "", "伏特弹", "快速命中", "", "S", "老版备注"].join(",")
    ].join("\r\n");
    const preview = previewWeaponRecommendationCsv(text, "旧版.csv", semanticDefinitions);
    expect(preview.blocking_issue_count).toBe(0);
    expect(preview.importable_recommendation_count).toBe(1);
    expect(preview.source_labels).toEqual(["老版来源"]);
  });

  it("上一版 11 列英文模板能导入", () => {
    const text = [
      ["Weapon", "Rule Name", "Mode / Category", "Barrel / Sight", "Magazine", "Masterwork", "Perk 1", "Perk 2", "Origin Trait", "Rating", "Note"].join(","),
      ["测试步枪", "旧版英文来源", "pve", "", "", "", "伏特弹", "快速命中", "", "S", ""].join(",")
    ].join("\r\n");
    const preview = previewWeaponRecommendationCsv(text, "legacy.csv", semanticDefinitions);
    expect(preview.blocking_issue_count).toBe(0);
    expect(preview.source_labels).toEqual(["旧版英文来源"]);
  });

  it("当前 12 列英文模板照常导入", () => {
    const text = [
      ["Source", "Weapon", "Rule Name", "Mode / Category", "Barrel / Sight", "Magazine", "Masterwork", "Perk 1", "Perk 2", "Origin Trait", "Rating", "Note"].join(","),
      ["英文来源", "测试步枪", "英文来源", "pve", "", "", "", "伏特弹", "快速命中", "", "S", ""].join(",")
    ].join("\r\n");
    const preview = previewWeaponRecommendationCsv(text, "english.csv", semanticDefinitions);
    expect(preview.blocking_issue_count).toBe(0);
    expect(preview.source_labels).toEqual(["英文来源"]);
  });
});

describe("失败时要说得清", () => {
  it("行宽与这份文件自己的表头不一致时被拦下", () => {
    const text = [
      ["推荐来源", "武器", "规则名称", "用途/分类", "枪管/瞄具", "弹匣", "大师", "Perk 1", "Perk 2", "起源特性", "评级", "备注"].join(","),
      ["我的推荐", "测试步枪"].join(",")
    ].join("\r\n");
    const preview = previewWeaponRecommendationCsv(text, "缺列.csv", semanticDefinitions);
    expect(preview.importable_recommendation_count).toBe(0);
    expect(preview.blocking_issues[0].message).toContain("与这份文件表头的 12 列不一致");
  });

  it("表头对不上时报出实际读到的表头，而不是只说「不受支持」", () => {
    const text = ["武器,来源,一句话点评", "测试步枪,某某,好用"].join("\r\n");
    expect(() => previewWeaponRecommendationCsv(text, "自定义.csv")).toThrow(/实际读到「武器 \/ 来源 \/ 一句话点评/u);
  });

  it("旧版二进制 .xls 给出「请另存为」的明确提示", () => {
    const path = join(scratchDir(), "旧版.xls");
    writeFileSync(path, Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(32)]));
    expect(() => readRecommendationTableText(path)).toThrow(/旧版 Excel 工作簿/);
  });

  it("压缩包里没有 Excel 工作表时说明原因", () => {
    const path = join(scratchDir(), "别的压缩包.xlsx");
    writeFileSync(path, storedZip({ "[Content_Types].xml": "<Types/>" }));
    expect(() => readRecommendationTableText(path)).toThrow(/没有 Excel 工作表/);
  });

  it("第一个工作表是空的时说明原因", () => {
    const path = join(scratchDir(), "空表.xlsx");
    writeFileSync(path, storedZip(workbookParts("<sheetData/>")));
    expect(() => readRecommendationTableText(path)).toThrow(/第一个工作表是空的/);
  });
});

/** 第一个工作表的内容可替换的工作簿部件。 */
function workbookParts(sheetData: string): Record<string, string> {
  return {
    "xl/workbook.xml": "<workbook><sheets><sheet name=\"表\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>",
    "xl/_rels/workbook.xml.rels": "<Relationships><Relationship Id=\"rId1\" Target=\"worksheets/sheet1.xml\"/></Relationships>",
    "xl/worksheets/sheet1.xml": `<worksheet>${sheetData}</worksheet>`
  };
}

/** 现造一个只存不压（method 0）的 ZIP：负向用例需要形状可控，且不引入更多二进制夹具。 */
function storedZip(entries: Record<string, string>): Buffer {
  const parts: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name, "utf8");
    const data = Buffer.from(content, "utf8");
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);
    parts.push(local, data);

    const entry = Buffer.alloc(46 + nameBytes.length);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt32LE(crc32(data), 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    nameBytes.copy(entry, 46);
    directory.push(entry);
    offset += local.length + data.length;
  }
  const directoryBytes = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(directory.length, 8);
  end.writeUInt16LE(directory.length, 10);
  end.writeUInt32LE(directoryBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directoryBytes, end]);
}

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
