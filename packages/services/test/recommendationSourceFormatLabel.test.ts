import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import { saveDimWishlist } from "../src/analysis/wishlistStore.js";
import { readRecommendationManagementSnapshot } from "../src/community/recommendationManagement.js";
import { recommendationSourceKindLabel } from "../src/community/recommendationSourceKindLabels.js";
import {
  importWeaponRecommendationCsv,
  previewWeaponRecommendationCsv,
  type WeaponKnowledgeSemanticDefinitions
} from "../src/community/weaponRecommendationKnowledge.js";

/**
 * T65：来源管理面每一行的**来源格式**（「推荐表格」/「愿望单文本」）。
 *
 * 这里钉的是「名字从数据来」：显示的格式只由存储里的来源类型决定，
 * 与来源叫什么名字、从哪儿读来的都无关。所以下面的用例特意让**名字和格式相反**——
 * 一旦有人改成按名字猜、或者干脆写死一个，断言当场不成立。
 */

const weaponHash = 5001;
const barrelA = 6005;
const barrelB = 6006;
const perkA = 6001;
const perkB = 6002;
const perkC = 6003;
const perkD = 6004;

/**
 * 一把枪、一栏枪管、两栏特性：够 CSV 把官方名解析成 hash 就行。
 * 两栏特性是统一模板要求的（`Perk 1` / `Perk 2` 都是必填核心栏位），
 * 同一栏写第二个名字则会被导入期判成「属于别的栏位」。
 */
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

const unifiedHeader = "推荐来源,武器,规则名称,用途/分类,枪管/瞄具,弹匣,大师,Perk 1,Perk 2,起源特性,评级,备注";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "d2-tools-source-format-"));
}

/** 走真实导入路径写一份推荐表格（人工维护的那种）。 */
async function importTable(dir: string, name: string): Promise<void> {
  const text = [
    unifiedHeader,
    ["测试来源", "测试步枪", "一条规则", "PvE", "枪管甲", "", "", "特性甲", "特性丙", "", "S", ""].join(",")
  ].join("\n");
  const path = join(dir, `${name}.csv`);
  writeFileSync(path, text, "utf8");
  const preview = previewWeaponRecommendationCsv(text, path, definitions);
  // 导入被挡住时要把每一条问题打出来，而不是只说一句 false。
  expect(preview.blocking_issues).toEqual([]);
  await importWeaponRecommendationCsv(dir, path, preview.fingerprint, {
    manifest_version: "test-manifest-source-format",
    semantic_definitions: definitions
  }, { name, mode: "create" });
}

/** 走真实导入路径写一份愿望单文本。 */
function importWishlistText(dir: string, name: string): void {
  const wishlist: DimWishlist = {
    title: name,
    rules: [{
      rule_stable_id: "dim-1",
      item_hash: weaponHash,
      perk_hashes: [perkA],
      mode: "pve",
      note: ""
    }]
  };
  saveDimWishlist(dir, wishlist, { name, mode: "create" });
}

/** 管理面读到的「来源名 → 来源格式」。 */
function formatLabels(dir: string): Record<string, string> {
  const snapshot = readRecommendationManagementSnapshot(dir);
  return Object.fromEntries(snapshot.sources.map((source) => [source.label, source.format_label]));
}

describe("T65 来源格式名来自数据", () => {
  it("两种格式各显示自己的名字", async () => {
    const dir = tempDir();
    await importTable(dir, "表格来源");
    importWishlistText(dir, "愿望单来源");

    expect(readRecommendationManagementSnapshot(dir).sources).toHaveLength(2);
    expect(formatLabels(dir)).toEqual({
      表格来源: "推荐表格",
      愿望单来源: "愿望单文本"
    });
  });

  it("名字与格式相反时，显示的仍是数据里的格式，不是名字猜的", async () => {
    const dir = tempDir();
    // 名字逐字写成另一种格式的说法：显示必须只认存储里的来源类型。
    await importTable(dir, "愿望单文本");
    importWishlistText(dir, "推荐表格");

    expect(formatLabels(dir)).toEqual({
      愿望单文本: "推荐表格",
      推荐表格: "愿望单文本"
    });
  });

  it("认不出来的来源类型不把内部代号漏给界面", () => {
    // 库里存着历史遗留的类型值（builtin / excel），当前没有写入方。
    // 认不出来时给空串，调用方据此不显示——而不是把 `builtin` 这类内部代号写到界面上。
    expect(recommendationSourceKindLabel("csv")).toBe("推荐表格");
    expect(recommendationSourceKindLabel("dim")).toBe("愿望单文本");
    expect(recommendationSourceKindLabel("builtin")).toBe("");
    expect(recommendationSourceKindLabel("")).toBe("");
  });
});
