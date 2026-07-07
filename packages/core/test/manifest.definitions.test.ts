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
      DestinySandboxPerkDefinition: "/common/destiny2_content/json/zh-chs/sandbox-perks.json"
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
  });

  it("falls back to English JSON component paths", () => {
    expect(selectDefinitionComponentPath(metadata, "fr", "DestinyInventoryItemDefinition"))
      .toBe("/common/destiny2_content/json/en/items.json");
  });

  it("defines all runtime-required definition components in one place", () => {
    expect(requiredDefinitionComponents).toEqual([
      "DestinyInventoryItemDefinition",
      "DestinyPlugSetDefinition",
      "DestinySandboxPerkDefinition",
      "DestinyActivityDefinition",
      "DestinyMilestoneDefinition",
      "DestinyVendorDefinition",
      "DestinyInventoryBucketDefinition",
      "DestinyLoadoutNameDefinition"
    ]);
  });
});
