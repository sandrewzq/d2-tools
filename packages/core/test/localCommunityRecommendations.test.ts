import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clearLocalCommunityRecommendations,
  loadLocalCommunityRecommendations,
  saveLocalCommunityRecommendations
} from "../src/community-perks/localCommunityRecommendations.js";
import { parseLocalCommunityRecommendations } from "../src/community-perks/localCommunityImport.js";

describe("local community recommendations", () => {
  it("parses JSON recommendation tables", () => {
    const table = parseLocalCommunityRecommendations(JSON.stringify({
      title: "中文社区推荐",
      rules: [
        {
          item_hash: 123,
          perk_hashes: [11, 22],
          mode: "pve",
          note: "清怪组合",
          source_label: "本地表 A"
        }
      ]
    }));

    expect(table).toEqual({
      title: "中文社区推荐",
      rules: [
        {
          item_hash: 123,
          perk_hashes: [11, 22],
          mode: "pve",
          note: "清怪组合",
          source_label: "本地表 A"
        }
      ]
    });
  });

  it("parses CSV recommendation tables", () => {
    const table = parseLocalCommunityRecommendations([
      "title:中文社区 CSV",
      "item_hash,perk_hashes,mode,note,source_label",
      '123,"11,22",pve,清怪组合,本地 CSV',
      "456,33|44,pvp,对战组合,本地 CSV"
    ].join("\n"));

    expect(table.title).toBe("中文社区 CSV");
    expect(table.rules).toEqual([
      { item_hash: 123, perk_hashes: [11, 22], mode: "pve", note: "清怪组合", source_label: "本地 CSV" },
      { item_hash: 456, perk_hashes: [33, 44], mode: "pvp", note: "对战组合", source_label: "本地 CSV" }
    ]);
  });

  it("persists local community recommendation tables", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-local-community-"));

    const saved = saveLocalCommunityRecommendations(dir, {
      title: "本地推荐",
      rules: [
        { item_hash: 123, perk_hashes: [11, 22], mode: "general", note: "通用", source_label: "本地表" }
      ]
    });

    expect(loadLocalCommunityRecommendations(dir)).toEqual(saved);

    clearLocalCommunityRecommendations(dir);
    expect(loadLocalCommunityRecommendations(dir)).toBeNull();
  });
});
