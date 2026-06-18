import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { D2Config } from "../src/config/schema.js";
import {
  getManifestStatus,
  initializeManifestMetadata,
  loadManifestMetadataCache,
  saveManifestMetadataCache
} from "../src/manifest/cache.js";
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

function config(dataDir: string): D2Config {
  return {
    bungie: {
      api_key: "api-key",
      client_id: "client",
      client_secret: "secret",
      redirect_uri: "https://127.0.0.1:28780/oauth/callback"
    },
    data: {
      data_dir: dataDir,
      manifest_language: "zh-chs"
    },
    ai: {
      provider: "",
      api_key: "",
      model: "",
      base_url: ""
    }
  };
}

describe("manifest metadata", () => {
  it("selects the configured language path when available", () => {
    expect(selectManifestLanguagePath(manifest, "zh-chs"))
      .toBe("/common/destiny2_content/sqlite/zh-chs/world_sql_content.sqlite");
  });

  it("falls back to English when the configured language is missing", () => {
    expect(selectManifestLanguagePath(manifest, "fr"))
      .toBe("/common/destiny2_content/sqlite/en/world_sql_content.sqlite");
  });

  it("persists metadata cache and exposes status", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-service-manifest-"));

    saveManifestMetadataCache({
      dataDir,
      language: "zh-chs",
      metadata: manifest,
      cachedAt: "2026-06-18T00:00:00.000Z"
    });

    expect(loadManifestMetadataCache(dataDir)).toEqual({
      cached_at: "2026-06-18T00:00:00.000Z",
      language: "zh-chs",
      sqlite_path: "/common/destiny2_content/sqlite/zh-chs/world_sql_content.sqlite",
      metadata: manifest
    });
    expect(getManifestStatus(dataDir)).toEqual({
      initialized: true,
      version: "123",
      language: "zh-chs",
      sqlite_path: "/common/destiny2_content/sqlite/zh-chs/world_sql_content.sqlite",
      cached_at: "2026-06-18T00:00:00.000Z"
    });
  });

  it("initializes metadata through an injected fetcher", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "d2-service-manifest-"));
    const seenApiKeys: string[] = [];

    const status = await initializeManifestMetadata({
      config: config(dataDir),
      fetchMetadata: async (apiKey) => {
        seenApiKeys.push(apiKey);
        return manifest;
      },
      now: () => new Date("2026-06-18T01:02:03.000Z")
    });

    expect(seenApiKeys).toEqual(["api-key"]);
    expect(status).toEqual({
      initialized: true,
      version: "123",
      language: "zh-chs",
      sqlite_path: "/common/destiny2_content/sqlite/zh-chs/world_sql_content.sqlite",
      cached_at: "2026-06-18T01:02:03.000Z"
    });
  });
});
