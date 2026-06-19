import { describe, expect, it } from "vitest";
import { summarizeItemSource } from "../src/items/source.js";

describe("item source summary", () => {
  it("uses Bungie sourceData sourceString when available", () => {
    expect(summarizeItemSource({
      displayProperties: { name: "Riskrunner" },
      sourceData: { sourceString: "完成异域任务获取。" }
    })).toEqual({
      status: "ready",
      label: "来源",
      description: "完成异域任务获取。"
    });
  });

  it("falls back when Manifest does not expose a source", () => {
    expect(summarizeItemSource({ displayProperties: { name: "Unknown" } })).toEqual({
      status: "missing",
      label: "来源",
      description: "Bungie Manifest 未提供完整来源，后续再接入更细的数据源。"
    });
  });
});
