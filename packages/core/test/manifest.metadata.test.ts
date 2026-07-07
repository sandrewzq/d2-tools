import { describe, expect, it } from "vitest";
import {
  selectManifestLanguagePath,
  type DestinyManifestMetadata
} from "../src/manifest/metadata.js";

const manifest: DestinyManifestMetadata = {
  version: "123",
  mobileWorldContentPaths: {
    "en": "/common/destiny2_content/sqlite/en/world_sql_content.sqlite",
    "zh-chs": "/common/destiny2_content/sqlite/zh-chs/world_sql_content.sqlite"
  },
  jsonWorldComponentContentPaths: {
    "zh-chs": {
      DestinyInventoryItemDefinition: "/common/destiny2_content/json/zh-chs/items.json"
    }
  }
};

describe("manifest metadata core helpers", () => {
  it("selects the configured language path when available", () => {
    expect(selectManifestLanguagePath(manifest, "zh-chs"))
      .toBe("/common/destiny2_content/sqlite/zh-chs/world_sql_content.sqlite");
  });

  it("falls back to English when the configured language is missing", () => {
    expect(selectManifestLanguagePath(manifest, "fr"))
      .toBe("/common/destiny2_content/sqlite/en/world_sql_content.sqlite");
  });
});
