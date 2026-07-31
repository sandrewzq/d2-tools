import { describe, expect, it } from "vitest";
import { summarizeItemSource } from "../src/items/source.js";

describe("item source summary", () => {
  it("uses Bungie sourceData sourceString when available", () => {
    expect(summarizeItemSource({
      displayProperties: { name: "Riskrunner" },
      sourceData: { sourceString: "至日" }
    })).toEqual({
      status: "ready",
      label: "历史获取途径",
      description: "Bungie 官方资料将这件装备标记为来自“至日”相关活动或内容。这只说明历史归属，不代表“至日”当前正在开放。",
      source_kind: "item",
      source_hash: undefined,
      linked_definition_hash: undefined
    });
  });

  it("falls back when Manifest does not expose a source", () => {
    expect(summarizeItemSource({ displayProperties: { name: "Unknown" } })).toEqual({
      status: "missing",
      label: "历史获取途径",
      description: "Bungie 官方资料没有标注这件装备的历史获取途径。"
    });
  });

  it("follows a linked legacy definition to its Bungie collectible source hint", () => {
    expect(summarizeItemSource({
      hash: 3388655311,
      translationBlock: {
        arrangements: [{ classHash: 0, artArrangementHash: 2721249463 }]
      }
    }, {
      itemDefinitions: {
        "2721249463": {
          hash: 2721249463,
          collectibleHash: 301231525
        }
      },
      collectibleDefinitions: {
        "301231525": {
          hash: 301231525,
          sourceString: "来源：“救赎花园”突袭",
          sourceHash: 1491707941
        }
      }
    })).toEqual({
      status: "ready",
      label: "历史获取途径",
      description: "Bungie 官方资料记录的获取途径：“救赎花园”突袭。这只说明历史来源，不代表当前仍可获得。",
      source_kind: "linked_collectible",
      source_hash: 1491707941,
      linked_definition_hash: 2721249463
    });
  });
});
