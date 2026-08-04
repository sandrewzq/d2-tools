import { describe, expect, it } from "vitest";
import type { DestinyManifestMetadata } from "../src/manifest/metadata.js";
import {
  requiredDefinitionComponents,
  selectDefinitionComponentPath
} from "../src/manifest/definitions.js";

const metadata: DestinyManifestMetadata = {
  version: "123",
  mobileWorldContentPaths: {
    "en": "/common/destiny2_content/sqlite/en/world.sqlite",
    "zh-chs": "/common/destiny2_content/sqlite/zh-chs/world.sqlite"
  },
  jsonWorldComponentContentPaths: {
    "en": {
      DestinyInventoryItemDefinition: "/common/destiny2_content/json/en/items.json"
    },
    "zh-chs": {
      DestinyInventoryItemDefinition: "/common/destiny2_content/json/zh-chs/items.json",
      DestinyPlugSetDefinition: "/common/destiny2_content/json/zh-chs/plug-sets.json",
      DestinySandboxPerkDefinition: "/common/destiny2_content/json/zh-chs/sandbox-perks.json",
      DestinyCollectibleDefinition: "/common/destiny2_content/json/zh-chs/collectibles.json",
      DestinyActivityModifierDefinition: "/common/destiny2_content/json/zh-chs/activity-modifiers.json",
      DestinyDestinationDefinition: "/common/destiny2_content/json/zh-chs/destinations.json",
      DestinyPlaceDefinition: "/common/destiny2_content/json/zh-chs/places.json",
      DestinyObjectiveDefinition: "/common/destiny2_content/json/zh-chs/objectives.json"
    }
  }
};

describe("manifest definition core helpers", () => {
  it("selects a JSON definition component path for the configured language", () => {
    expect(selectDefinitionComponentPath(metadata, "zh-chs", "DestinyInventoryItemDefinition"))
      .toBe("/common/destiny2_content/json/zh-chs/items.json");
    expect(selectDefinitionComponentPath(metadata, "zh-chs", "DestinyPlugSetDefinition"))
      .toBe("/common/destiny2_content/json/zh-chs/plug-sets.json");
    expect(selectDefinitionComponentPath(metadata, "zh-chs", "DestinySandboxPerkDefinition"))
      .toBe("/common/destiny2_content/json/zh-chs/sandbox-perks.json");
    expect(selectDefinitionComponentPath(metadata, "zh-chs", "DestinyCollectibleDefinition"))
      .toBe("/common/destiny2_content/json/zh-chs/collectibles.json");
    expect(selectDefinitionComponentPath(metadata, "zh-chs", "DestinyActivityModifierDefinition"))
      .toBe("/common/destiny2_content/json/zh-chs/activity-modifiers.json");
    expect(selectDefinitionComponentPath(metadata, "zh-chs", "DestinyDestinationDefinition"))
      .toBe("/common/destiny2_content/json/zh-chs/destinations.json");
    expect(selectDefinitionComponentPath(metadata, "zh-chs", "DestinyPlaceDefinition"))
      .toBe("/common/destiny2_content/json/zh-chs/places.json");
    expect(selectDefinitionComponentPath(metadata, "zh-chs", "DestinyObjectiveDefinition"))
      .toBe("/common/destiny2_content/json/zh-chs/objectives.json");
  });

  it("falls back to English JSON component paths", () => {
    expect(selectDefinitionComponentPath(metadata, "fr", "DestinyInventoryItemDefinition"))
      .toBe("/common/destiny2_content/json/en/items.json");
  });

  it("defines all runtime-required definition components in one place", () => {
    expect(requiredDefinitionComponents).toEqual([
      "DestinyInventoryItemDefinition",
      "DestinyInventoryItemConstantsDefinition",
      "DestinyBreakerTypeDefinition",
      "DestinyDamageTypeDefinition",
      "DestinyPlugSetDefinition",
      "DestinySandboxPerkDefinition",
      "DestinyCollectibleDefinition",
      "DestinySeasonDefinition",
      "DestinyEquipableItemSetDefinition",
      "DestinyActivityDefinition",
      "DestinyMilestoneDefinition",
      "DestinyVendorDefinition",
      "DestinyInventoryBucketDefinition",
      "DestinyLoadoutNameDefinition",
      "DestinyStatDefinition",
      "DestinyActivityModifierDefinition",
      "DestinyDestinationDefinition",
      "DestinyPlaceDefinition",
      "DestinyObjectiveDefinition"
    ]);
  });
});
