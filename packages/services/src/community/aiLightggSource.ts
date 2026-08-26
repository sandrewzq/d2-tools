import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { callAiWithWebSearch, supportsAiWebSearch } from "@d2-tools/core/ai/chat";
import type { D2Config } from "@d2-tools/core/config/schema";
import {
  parseLightggResponse,
  type CommunityPerkSource,
  type SourceOptions,
  type WeaponRecommendation
} from "@d2-tools/core/community-perks";

type LightggCacheEntry = {
  cached_at: number;
  recommendation: WeaponRecommendation;
  raw_response?: string;
};

export type AiLightggConfig = {
  data?: { data_dir?: string };
  ai?: {
    protocol?: string;
    api_key?: string;
    model?: string;
    base_url?: string;
    enable_lightgg?: boolean;
    force_lightgg?: boolean;
  };
} | null | undefined;

export function createAiLightggSource(config: AiLightggConfig): CommunityPerkSource {
  const dataDir = config?.data?.data_dir;
  const cacheDir = dataDir ? join(dataDir, "cache", "lightgg") : "";
  const ai = config?.ai;
  const aiConfig = buildAiConfig(config);

  return {
    name: "AI light.gg",
    isAvailable: () => Boolean(
      (supportsAiWebSearch(aiConfig.ai) || ai?.force_lightgg)
      && ai?.api_key
      && ai?.model
      && ai?.enable_lightgg
    ),
    async getRecommendations(item_hash: number, options: SourceOptions): Promise<WeaponRecommendation | null> {
      if (!cacheDir) return null;

      const cached = readCache(cacheDir, item_hash);
      if (cached) return cached;

      const itemName = options.item_name ?? String(item_hash);
      const url = `https://www.light.gg/db/items/${item_hash}/${slugify(itemName)}/`;
      const query = buildLightggQuery(itemName, url);
      const result = await callAiWithWebSearch({ config: aiConfig, query });
      const recommendation = parseLightggResponse(item_hash, itemName, url, result.text, options);
      if (!recommendation || (recommendation.combos.length === 0 && !recommendation.ai_analysis)) return null;

      writeCache(cacheDir, item_hash, recommendation, result.text);
      return recommendation;
    }
  };
}

export function clearLightggCache(dataDir: string): void {
  const cacheDir = join(dataDir, "cache", "lightgg");
  if (!existsSync(cacheDir)) return;
  rmSync(cacheDir, { recursive: true, force: true });
}

function buildAiConfig(config: AiLightggConfig): D2Config {
  return {
    bungie: {
      api_key: "",
      client_id: "",
      client_secret: "",
      redirect_uri: ""
    },
    data: {
      data_dir: config?.data?.data_dir ?? "",
      manifest_language: "zh-chs"
    },
    ai: {
      protocol: config?.ai?.protocol ?? "",
      api_key: config?.ai?.api_key ?? "",
      model: config?.ai?.model ?? "",
      base_url: config?.ai?.base_url ?? "",
      enable_lightgg: config?.ai?.enable_lightgg ?? false,
      force_lightgg: config?.ai?.force_lightgg ?? false
    },
    features: {
      color_mode: "light",
      density: "standard",
      interface_locale: "zh-CN",
      manifest_language_follows_interface: true
    }
  };
}

function buildLightggQuery(itemName: string, url: string): string {
  return [
    `请访问 ${url}，分析武器 "${itemName}" 在 light.gg 上的社区推荐 perk 组合。`,
    "",
    "请按以下 JSON 格式返回（只返回 JSON，不要其他说明）：",
    "{",
    '  "combos": [',
    '    {',
    '      "mode": "pve" | "pvp" | "general",',
    '      "perks": [',
    '        {"hash": 123456, "name": "perk 中文名或英文名"}',
    '      ],',
    '      "popularity": 85.5,',
    '      "note": "可选简短说明"',
    '    }',
    '  ],',
    '  "analysis": "面向中文玩家的简要分析",',
    '  "disclaimer": "数据来自 light.gg，仅供参考"',
    "}",
    "",
    "要求：",
    "1. 只返回一个合法 JSON 对象。",
    "2. perks 只列出该武器实际可出的 trait 插槽 perk，并优先填写 perk hash（Bungie plug item hash）和名称。",
    "3. 如果无法访问页面或没有推荐数据，返回 { \"combos\": [], \"analysis\": \"\", \"disclaimer\": \"\" }"
  ].join("\n");
}

function readCache(cacheDir: string, itemHash: number): WeaponRecommendation | null {
  const path = cachePath(cacheDir, itemHash);
  if (!existsSync(path)) return null;

  try {
    const entry = JSON.parse(readFileSync(path, "utf8")) as LightggCacheEntry;
    const ttlMs = 24 * 60 * 60 * 1000;
    if (Date.now() - entry.cached_at > ttlMs) return null;
    return entry.recommendation;
  } catch {
    return null;
  }
}

function writeCache(
  cacheDir: string,
  itemHash: number,
  recommendation: WeaponRecommendation,
  rawResponse?: string
): void {
  mkdirSync(cacheDir, { recursive: true });
  const entry: LightggCacheEntry = {
    cached_at: Date.now(),
    recommendation,
    raw_response: rawResponse
  };
  writeFileSync(cachePath(cacheDir, itemHash), `${JSON.stringify(entry, null, 2)}\n`, "utf8");
}

function cachePath(cacheDir: string, itemHash: number): string {
  return join(cacheDir, `${itemHash}.json`);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
