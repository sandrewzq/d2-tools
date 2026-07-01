import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DestinyManifestMetadata } from "../src/manifest/metadata.js";
import {
  getDefinitionStatus,
  hasRequiredDefinitionComponents,
  initializeDefinitionComponent,
  loadDefinitionComponent,
  loadDefinitionComponentByLanguage,
  requiredDefinitionComponents,
  selectDefinitionComponentPath
} from "../src/manifest/definitions.js";
import { hasRequiredDefinitionCacheFiles } from "../src/manifest/definitions.ts";

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

describe("manifest definition components", () => {
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

  it("downloads, caches, and reports definition status", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-definitions-"));
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

  it("downloads plug set and sandbox perk definitions", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-definitions-"));

    const plugSetStatus = await initializeDefinitionComponent({
      dataDir,
      language: "zh-chs",
      metadata,
      component: "DestinyPlugSetDefinition",
      fetchJson: async () => ({
        "10": {
          hash: 10,
          reusablePlugItems: [{ plugItemHash: 100 }]
        }
      })
    });
    const sandboxPerkStatus = await initializeDefinitionComponent({
      dataDir,
      language: "zh-chs",
      metadata,
      component: "DestinySandboxPerkDefinition",
      fetchJson: async () => ({
        "20": {
          hash: 20,
          displayProperties: { name: "增伤", description: "提高伤害" }
        }
      })
    });

    expect(plugSetStatus).toMatchObject({
      initialized: true,
      component: "DestinyPlugSetDefinition",
      count: 1
    });
    expect(sandboxPerkStatus).toMatchObject({
      initialized: true,
      component: "DestinySandboxPerkDefinition",
      count: 1
    });
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

  it("reuses parsed definition data from memory after the first load", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-definitions-"));

    await initializeDefinitionComponent({
      dataDir,
      language: "zh-chs",
      metadata,
      component: "DestinyInventoryItemDefinition",
      fetchJson: async () => ({
        "1": {
          hash: 1,
          displayProperties: {
            name: "缓存测试武器",
            description: "用于验证内存缓存",
            icon: "/icon.png"
          }
        }
      })
    });

    const firstLoad = loadDefinitionComponent(dataDir, "DestinyInventoryItemDefinition");
    const secondLoad = loadDefinitionComponent(dataDir, "DestinyInventoryItemDefinition");

    expect(firstLoad).toBe(secondLoad);
  });

  it("keeps the configured language as the default cache when downloading auxiliary English definitions", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-definitions-"));

    await initializeDefinitionComponent({
      dataDir,
      language: "zh-chs",
      metadata,
      component: "DestinyInventoryItemDefinition",
      fetchJson: async () => ({
        "1": {
          hash: 1,
          displayProperties: { name: "风险管理者" }
        }
      })
    });
    await initializeDefinitionComponent({
      dataDir,
      language: "en",
      metadata,
      component: "DestinyInventoryItemDefinition",
      writeDefaultCache: false,
      fetchJson: async () => ({
        "1": {
          hash: 1,
          displayProperties: { name: "Riskrunner" }
        }
      })
    });

    expect(loadDefinitionComponent(dataDir, "DestinyInventoryItemDefinition")?.["1"]?.displayProperties?.name)
      .toBe("风险管理者");
    expect(loadDefinitionComponentByLanguage(dataDir, "DestinyInventoryItemDefinition", "zh-chs")?.["1"]?.displayProperties?.name)
      .toBe("风险管理者");
    expect(loadDefinitionComponentByLanguage(dataDir, "DestinyInventoryItemDefinition", "en")?.["1"]?.displayProperties?.name)
      .toBe("Riskrunner");
  });

  it("does not treat partial definition caches as fully initialized", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-definitions-"));

    await initializeDefinitionComponent({
      dataDir,
      language: "zh-chs",
      metadata,
      component: "DestinyInventoryItemDefinition",
      fetchJson: async () => ({
        "1": {
          hash: 1,
          displayProperties: { name: "只有物品定义" }
        }
      })
    });

    expect(hasRequiredDefinitionComponents(dataDir)).toBe(false);
  });

  it("checks required definition cache files without parsing full component data", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-definitions-"));
    const definitionDir = join(dataDir, "manifest", "definitions");
    mkdirSync(definitionDir, { recursive: true });

    for (const component of requiredDefinitionComponents) {
      writeFileSync(join(definitionDir, `${component}.json`), "{not-valid-json", "utf8");
    }

    expect(hasRequiredDefinitionCacheFiles(dataDir)).toBe(true);
  });

  it("reports missing required definition cache files in the lightweight startup check", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-tools-definitions-"));
    const definitionDir = join(dataDir, "manifest", "definitions");
    mkdirSync(definitionDir, { recursive: true });

    for (const component of requiredDefinitionComponents.slice(0, -1)) {
      writeFileSync(join(definitionDir, `${component}.json`), "{not-valid-json", "utf8");
    }

    expect(hasRequiredDefinitionCacheFiles(dataDir)).toBe(false);
  });
});
