import { describe, expect, it } from "vitest";
import { searchPerkDefinitions } from "../src/items/perkSearch.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

const perks: DefinitionComponentData = {
  "10": {
    hash: 10,
    displayProperties: {
      name: "爆破专家",
      description: "使用技能会重新装填武器。"
    }
  },
  "11": {
    hash: 11,
    displayProperties: {
      name: "萤火虫",
      description: "精准击杀产生元素爆炸。"
    }
  }
};

const items: DefinitionComponentData = {
  "100": {
    hash: 100,
    displayProperties: { name: "午夜政变", description: "" },
    sockets: { socketEntries: [{ reusablePlugItems: [{ plugItemHash: 10 }] }] }
  }
};

describe("perk definition search", () => {
  it("matches perk names and includes related weapons", () => {
    expect(searchPerkDefinitions(perks, "爆破", { itemDefinitions: items })).toEqual([
      {
        hash: 10,
        name: "爆破专家",
        description: "使用技能会重新装填武器。",
        related_items: [{ hash: 100, name: "午夜政变" }]
      }
    ]);
  });

  it("matches perk descriptions", () => {
    expect(searchPerkDefinitions(perks, "元素").map((perk) => perk.name)).toEqual(["萤火虫"]);
  });
});
