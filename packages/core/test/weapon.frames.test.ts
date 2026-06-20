import { describe, expect, it } from "vitest";
import { summarizeWeaponFrame } from "../src/items/weaponFrames.js";
import type { DefinitionComponentData } from "../src/manifest/definitions.js";

const itemDefinitions: DefinitionComponentData = {
  "1": {
    hash: 1,
    displayProperties: {
      name: "Test Pulse Rifle"
    },
    itemTypeDisplayName: "Pulse Rifle",
    inventory: {
      bucketTypeHash: 1498876634
    },
    sockets: {
      socketEntries: [
        { reusablePlugSetHash: 5001 }
      ]
    }
  },
  "10": {
    hash: 10,
    displayProperties: {
      name: "High-Impact Frame",
      description: "Slow-firing and high-damage."
    },
    itemTypeDisplayName: "Intrinsic"
  },
  "20": {
    hash: 20,
    displayProperties: {
      name: "适配框架",
      description: "稳定均衡。"
    },
    itemTypeDisplayName: "内在特性"
  },
  "30": {
    hash: 30,
    displayProperties: {
      name: "Headseeker"
    },
    itemTypeDisplayName: "Trait"
  }
};

const plugSetDefinitions: DefinitionComponentData = {
  "5001": {
    hash: 5001,
    reusablePlugItems: [{ plugItemHash: 10 }]
  },
  "5002": {
    hash: 5002,
    reusablePlugItems: [{ plugItemHash: 20 }]
  },
  "5003": {
    hash: 5003,
    reusablePlugItems: [{ plugItemHash: 30 }]
  }
};

describe("weapon frame summary", () => {
  it("extracts a stable frame summary from an intrinsic plug set", () => {
    expect(summarizeWeaponFrame(itemDefinitions["1"], itemDefinitions, { plugSetDefinitions })).toEqual({
      key: "high-impact-frame",
      name: "High-Impact Frame"
    });
  });

  it("supports localized frame names", () => {
    expect(summarizeWeaponFrame({
      ...itemDefinitions["1"],
      sockets: {
        socketEntries: [{ reusablePlugSetHash: 5002 }]
      }
    }, itemDefinitions, { plugSetDefinitions })).toEqual({
      key: "适配框架",
      name: "适配框架"
    });
  });

  it("returns undefined when a weapon has no recognizable frame plug", () => {
    expect(summarizeWeaponFrame({
      ...itemDefinitions["1"],
      sockets: {
        socketEntries: [{ reusablePlugSetHash: 5003 }]
      }
    }, itemDefinitions, { plugSetDefinitions })).toBeUndefined();
  });
});
