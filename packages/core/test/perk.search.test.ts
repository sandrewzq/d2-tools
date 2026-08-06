import { describe, expect, it } from "vitest";
import { findRelatedEquipmentDefinitions, searchPerkDefinitions } from "../src/items/perkSearch.js";
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
  },
  "101": {
    hash: 101,
    displayProperties: { name: "轻量弓", description: "" },
    sockets: { socketEntries: [{ reusablePlugSetHash: 500 }] }
  },
  "102": {
    hash: 102,
    displayProperties: { name: "试制弓", description: "" },
    sockets: { socketEntries: [{ randomizedPlugSetHash: 501 }] }
  },
  "1000": {
    hash: 1000,
    displayProperties: { name: "爆破专家", description: "使用技能会重新装填武器。" },
    perks: [{ perkHash: 10 }]
  }
};

const plugSets: DefinitionComponentData = {
  "500": {
    hash: 500,
    reusablePlugItems: [{ plugItemHash: 10 }]
  },
  "501": {
    hash: 501,
    reusablePlugItems: [{ plugItemHash: 1000 }]
  }
};

describe("perk definition search", () => {
  it("matches perk names and includes related weapons", () => {
    expect(searchPerkDefinitions(perks, "爆破", { itemDefinitions: items })).toEqual([
      {
        key: "perk:10",
        hash: 10,
        hashes: [10],
        name: "爆破专家",
        description: "使用技能会重新装填武器。",
        related_count: 1,
        related_groups: []
      }
    ]);
  });

  it("matches perk descriptions", () => {
    expect(searchPerkDefinitions(perks, "元素").map((perk) => perk.name)).toEqual(["萤火虫"]);
  });

  it("includes related weapons from reusable plug sets", () => {
    const relatedItems = findRelatedEquipmentDefinitions([10], items, plugSets).map((item) => Number(item.hash));

    expect(relatedItems).toContain(100);
    expect(relatedItems).toContain(101);
  });

  it("includes related weapons whose plug item points back to the sandbox perk", () => {
    expect(findRelatedEquipmentDefinitions([10], items, plugSets).map((item) => Number(item.hash)))
      .toContain(102);
  });
});
