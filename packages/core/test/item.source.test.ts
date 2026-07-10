import { describe, expect, it } from "vitest";
import { summarizeItemSource } from "../src/items/source.js";

describe("item source summary", () => {
  it("uses Bungie sourceData sourceString when available", () => {
    expect(summarizeItemSource({
      displayProperties: { name: "Riskrunner" },
      sourceData: { sourceString: "完成异域任务获取。" }
    })).toEqual({
      status: "ready",
      label: "官方来源提示",
      description: "完成异域任务获取。",
      source_kind: "item",
      source_hash: undefined,
      linked_definition_hash: undefined
    });
  });

  it("falls back when Manifest does not expose a source", () => {
    expect(summarizeItemSource({ displayProperties: { name: "Unknown" } })).toEqual({
      status: "missing",
      label: "官方来源提示",
      description: "Bungie Manifest 未提供官方来源提示。"
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
      label: "官方来源提示",
      description: "“救赎花园”突袭",
      source_kind: "linked_collectible",
      source_hash: 1491707941,
      linked_definition_hash: 2721249463
    });
  });
});
