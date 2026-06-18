import { describe, expect, it } from "vitest";
import { summarizeItemPerks } from "../src/items/perks.js";
import type { DefinitionComponentData, DefinitionRecord } from "../src/manifest/definitions.js";

const itemDefinitions: DefinitionComponentData = {
  "100": {
    hash: 100,
    displayProperties: {
      name: "爆破专家",
      description: "使用技能会重新装填武器。"
    }
  },
  "101": {
    hash: 101,
    displayProperties: {
      name: "萤火虫",
      description: "精准击杀产生元素爆炸。"
    }
  },
  "102": {
    hash: 102,
    displayProperties: {
      name: "维持生计",
      description: "击败目标会部分装填弹匣。"
    }
  }
};

const plugSetDefinitions: DefinitionComponentData = {
  "500": {
    hash: 500,
    reusablePlugItems: [
      { plugItemHash: 101 },
      { plugItemHash: 102 }
    ]
  }
};

describe("item perk summaries", () => {
  it("summarizes direct reusable plug items from item sockets", () => {
    const item: DefinitionRecord = {
      hash: 1,
      sockets: {
        socketEntries: [
          {
            reusablePlugItems: [{ plugItemHash: 100 }]
          }
        ]
      }
    };

    expect(summarizeItemPerks(item, itemDefinitions, {})).toEqual([
      {
        socket_index: 0,
        plugs: [
          {
            hash: 100,
            name: "爆破专家",
            description: "使用技能会重新装填武器。"
          }
        ]
      }
    ]);
  });

  it("summarizes plug items from reusable plug sets", () => {
    const item: DefinitionRecord = {
      hash: 1,
      sockets: {
        socketEntries: [
          {
            reusablePlugSetHash: 500
          }
        ]
      }
    };

    expect(summarizeItemPerks(item, itemDefinitions, { plugSetDefinitions })).toEqual([
      {
        socket_index: 0,
        plugs: [
          {
            hash: 101,
            name: "萤火虫",
            description: "精准击杀产生元素爆炸。"
          },
          {
            hash: 102,
            name: "维持生计",
            description: "击败目标会部分装填弹匣。"
          }
        ]
      }
    ]);
  });

  it("skips hidden sockets and unnamed plugs", () => {
    const item: DefinitionRecord = {
      hash: 1,
      sockets: {
        socketEntries: [
          {
            hidePerksInItemTooltip: true,
            reusablePlugItems: [{ plugItemHash: 100 }]
          },
          {
            reusablePlugItems: [{ plugItemHash: 999 }]
          }
        ]
      }
    };

    expect(summarizeItemPerks(item, itemDefinitions, {})).toEqual([]);
  });
});
