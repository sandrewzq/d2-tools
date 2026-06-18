import { describe, expect, it } from "vitest";
import { searchItemDefinitions } from "../src/items/search.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

const definitions: DefinitionComponentData = {
  "1": {
    hash: 1,
    displayProperties: {
      name: "风险管理者",
      description: "一把会导引电弧的异域冲锋枪。",
      icon: "/common/destiny2_content/icons/riskrunner.png"
    },
    itemTypeDisplayName: "冲锋枪",
    inventory: { tierTypeName: "异域" }
  },
  "2": {
    hash: 2,
    displayProperties: {
      name: "Riskrunner",
      description: "Exotic submachine gun.",
      icon: "/common/destiny2_content/icons/riskrunner_en.png"
    },
    itemTypeDisplayName: "Submachine Gun",
    inventory: { tierTypeName: "Exotic" }
  },
  "3": {
    hash: 3,
    displayProperties: {
      name: "",
      description: "Hidden item"
    }
  }
};

describe("item definition search", () => {
  it("returns compact summaries for Chinese display name matches", () => {
    expect(searchItemDefinitions(definitions, "风险")).toEqual([
      {
        hash: 1,
        name: "风险管理者",
        description: "一把会导引电弧的异域冲锋枪。",
        icon: "https://www.bungie.net/common/destiny2_content/icons/riskrunner.png",
        item_type: "冲锋枪",
        tier: "异域"
      }
    ]);
  });

  it("matches English display names case-insensitively", () => {
    expect(searchItemDefinitions(definitions, "runner").map((item) => item.hash)).toEqual([2]);
  });

  it("limits result count", () => {
    expect(searchItemDefinitions(definitions, "risk", { limit: 1 })).toHaveLength(1);
  });

  it("returns no results for blank queries", () => {
    expect(searchItemDefinitions(definitions, "   ")).toEqual([]);
  });
});
