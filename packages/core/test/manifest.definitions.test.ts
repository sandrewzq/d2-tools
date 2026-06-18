import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DestinyManifestMetadata } from "../src/manifest/metadata.js";
import {
  getDefinitionStatus,
  initializeDefinitionComponent,
  loadDefinitionComponent,
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
      DestinyInventoryItemDefinition: "/common/destiny2_content/json/zh-chs/items.json"
    }
  }
};

describe("manifest definition components", () => {
  it("selects a JSON definition component path for the configured language", () => {
    expect(selectDefinitionComponentPath(metadata, "zh-chs", "DestinyInventoryItemDefinition"))
      .toBe("/common/destiny2_content/json/zh-chs/items.json");
  });

  it("falls back to English JSON component paths", () => {
    expect(selectDefinitionComponentPath(metadata, "fr", "DestinyInventoryItemDefinition"))
      .toBe("/common/destiny2_content/json/en/items.json");
  });

  it("downloads, caches, and reports definition status", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-service-definitions-"));
    const seenUrls: string[] = [];

    const status = await initializeDefinitionComponent({
      dataDir,
      language: "zh-chs",
      metadata,
      component: "DestinyInventoryItemDefinition",
      fetchJson: async (url) => {
        seenUrls.push(url);
        return {
          "1": {
            hash: 1,
            displayProperties: {
              name: "风险管理者",
              description: "电弧冲锋枪",
              icon: "/icon.png"
            },
            itemTypeDisplayName: "冲锋枪",
            inventory: { tierTypeName: "异域" }
          }
        };
      },
      now: () => new Date("2026-06-18T02:03:04.000Z")
    });

    expect(seenUrls).toEqual([
      "https://www.bungie.net/common/destiny2_content/json/zh-chs/items.json"
    ]);
    expect(status).toEqual({
      initialized: true,
      component: "DestinyInventoryItemDefinition",
      language: "zh-chs",
      cached_at: "2026-06-18T02:03:04.000Z",
      count: 1
    });
    expect(getDefinitionStatus(dataDir, "DestinyInventoryItemDefinition")).toEqual(status);
    expect(loadDefinitionComponent(dataDir, "DestinyInventoryItemDefinition")).toEqual({
      "1": {
        hash: 1,
        displayProperties: {
          name: "风险管理者",
          description: "电弧冲锋枪",
          icon: "/icon.png"
        },
        itemTypeDisplayName: "冲锋枪",
        inventory: { tierTypeName: "异域" }
      }
    });
  });
});
