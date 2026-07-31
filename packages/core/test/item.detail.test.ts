import { describe, expect, it } from "vitest";
import { getItemDefinitionDetail } from "../src/items/detail.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

const definitions: DefinitionComponentData = {
  "1": {
    hash: 1,
    displayProperties: {
      name: "Riskrunner",
      description: "Exotic submachine gun.",
      icon: "/common/destiny2_content/icons/riskrunner.png"
    },
    itemTypeDisplayName: "Submachine Gun",
    inventory: { tierTypeName: "Exotic" },
    sockets: {
      socketEntries: [{ reusablePlugSetHash: 500 }]
    }
  },
  "100": {
    hash: 100,
    displayProperties: {
      name: "Arc Conductor",
      description: "Taking Arc damage increases weapon power."
    }
  }
};

const plugSets: DefinitionComponentData = {
  "500": {
    hash: 500,
    reusablePlugItems: [{ plugItemHash: 100 }]
  }
};

describe("item definition detail", () => {
  it("returns display data and perk groups for an item hash", () => {
    expect(getItemDefinitionDetail(definitions, 1, { plugSetDefinitions: plugSets })).toEqual({
      hash: 1,
      name: "Riskrunner",
      description: "Exotic submachine gun.",
      icon: "https://www.bungie.net/common/destiny2_content/icons/riskrunner.png",
      item_type: "Submachine Gun",
      tier: "Exotic",
      perks: [
        {
          socket_index: 0,
          source_kinds: ["reusable_set"],
          plugs: [
            {
              hash: 100,
              name: "Arc Conductor",
              description: "Taking Arc damage increases weapon power.",
              icon: undefined
            }
          ]
        }
      ],
      source: {
        status: "missing",
        label: "官方来源提示",
        description: "Bungie Manifest 未提供官方来源提示。"
      }
    });
  });

  it("returns null for unknown item hashes", () => {
    expect(getItemDefinitionDetail(definitions, 999)).toBeNull();
  });
});
