import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { callAiWithWebSearch, supportsAiWebSearch } from "../ai/chat.js";
import { summarizeItemPerks, type ItemPlugSummary } from "../items/perks.js";
import type { D2Config } from "../config/schema.js";
import type {
  CommunityPerkSource,
  PerkCombo,
  PerkRef,
  SourceOptions,
  WeaponRecommendation
} from "./types.js";

type LightggCacheEntry = {
  cached_at: number;
  recommendation: WeaponRecommendation;
  raw_response?: string;
};

type AiLightggConfig = {
  data?: { data_dir?: string };
  ai?: {
    protocol?: string;
    provider?: string;
    api_key?: string;
    model?: string;
    base_url?: string;
    enable_lightgg?: boolean;
    force_lightgg?: boolean;
  };
} | null | undefined;

export function createAiLightggSource(config: AiLightggConfig): CommunityPerkSource {
  const data_dir = config?.data?.data_dir;
  const cacheDir = data_dir ? join(data_dir, "cache", "lightgg") : "";
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
      provider: aiProvider(config),
      api_key: config?.ai?.api_key ?? "",
      model: config?.ai?.model ?? "",
      base_url: config?.ai?.base_url ?? "",
      enable_lightgg: config?.ai?.enable_lightgg ?? false,
      force_lightgg: config?.ai?.force_lightgg ?? false
    },
    features: {
      write_actions_enabled: false,
      color_mode: "light"
    }
  };
}

function aiProvider(config: AiLightggConfig): string {
  return config?.ai?.provider ?? "";
}

function buildLightggQuery(item_name: string, url: string): string {
  return [
    `请访问 ${url}，分析武器 "${item_name}" 在 light.gg 上的社区推荐 perk 组合。`,
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

export function parseLightggResponse(
  item_hash: number,
  item_name: string,
  url: string,
  text: string,
  options: SourceOptions
): WeaponRecommendation | null {
  const jsonText = extractJsonBlock(text);
  if (!jsonText) {
    return rawAiAnalysisRecommendation(item_hash, item_name, text, url);
  }

  try {
    const parsed = JSON.parse(jsonText) as {
      combos?: Array<{
        mode?: string;
        perks?: Array<{ name?: string; hash?: number } | string>;
        popularity?: number;
        note?: string;
      }>;
      analysis?: string;
      disclaimer?: string;
    };

    const plugMap = buildPlugMap(item_hash, options.itemDefinitions, options.plugSetDefinitions);
    const englishPlugMap = buildPlugMap(item_hash, options.englishItemDefinitions, options.englishPlugSetDefinitions);
    const combos: PerkCombo[] = [];

    for (const combo of parsed.combos ?? []) {
      const mode = normalizeMode(combo.mode);
      const perks = (combo.perks ?? [])
        .map((perk) => parsePerkRef(perk, plugMap, englishPlugMap))
        .filter((ref): ref is PerkRef => Boolean(ref));
      if (perks.length === 0) continue;

      combos.push({
        perks,
        popularity: typeof combo.popularity === "number" ? combo.popularity : undefined,
        source: "ai_lightgg",
        mode,
        note: combo.note || undefined
      });
    }

    if (combos.length === 0) {
      return parsed.analysis
        ? rawAiAnalysisRecommendation(item_hash, item_name, parsed.analysis, url, parsed.disclaimer)
        : null;
    }

    const modes = Array.from(new Set(combos.map((c) => c.mode)));

    return {
      item_hash,
      item_name,
      combos,
      matched_modes: modes,
      individual_perks: uniquePerks(combos),
      sample_size: combos.length,
      source_label: "AI · light.gg",
      ai_analysis: parsed.analysis?.trim() || undefined,
      disclaimer: parsed.disclaimer || `来自 light.gg 社区数据，由 AI 实时分析生成，仅供参考。原文：${url}`
    };
  } catch {
    return rawAiAnalysisRecommendation(item_hash, item_name, text, url);
  }
}

function rawAiAnalysisRecommendation(
  item_hash: number,
  item_name: string,
  text: string,
  url: string,
  disclaimer?: string
): WeaponRecommendation | null {
  const analysis = text.trim();
  if (!analysis) return null;
  return {
    item_hash,
    item_name,
    combos: [],
    matched_modes: [],
    individual_perks: [],
    sample_size: 0,
    source_label: "AI · light.gg",
    ai_analysis: analysis,
    disclaimer: disclaimer || `light.gg 返回内容无法解析为结构化推荐，已保留 AI 原始分析。原文：${url}`
  };
}

function extractJsonBlock(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function normalizeMode(mode: string | undefined): "pve" | "pvp" | "general" {
  const normalized = String(mode ?? "general").toLowerCase().trim();
  if (normalized === "pve" || normalized === "pve/pvp") return "pve";
  if (normalized === "pvp") return "pvp";
  return "general";
}

function parsePerkRef(
  perk: { name?: string; hash?: number } | string,
  plugMap: Map<number, ItemPlugSummary>,
  englishPlugMap: Map<number, ItemPlugSummary>
): PerkRef | null {
  if (typeof perk === "string") {
    const name = perk.trim();
    if (!name) return null;
    const matched = findPlugByName(name, plugMap);
    if (matched) {
      return { hash: matched.hash, name: matched.name, englishName: englishPlugMap.get(matched.hash)?.name, icon: matched.icon };
    }
    return { hash: 0, name };
  }

  const name = perk.name?.trim();
  if (!name && !perk.hash) return null;
  if (perk.hash && plugMap.has(perk.hash)) {
    const matched = plugMap.get(perk.hash);
    return { hash: perk.hash, name: matched?.name ?? name ?? String(perk.hash), englishName: englishPlugMap.get(perk.hash)?.name, icon: matched?.icon };
  }
  const matched = name ? findPlugByName(name, plugMap) : null;
  if (matched) {
    return { hash: matched.hash, name: matched.name, englishName: englishPlugMap.get(matched.hash)?.name, icon: matched.icon };
  }
  return { hash: perk.hash ?? 0, name: name ?? String(perk.hash ?? 0) };
}

function uniquePerks(combos: PerkCombo[]): PerkRef[] {
  const perks = new Map<number, PerkRef>();
  for (const combo of combos) {
    for (const perk of combo.perks) {
      if (!perks.has(perk.hash)) {
        perks.set(perk.hash, perk);
      }
    }
  }
  return [...perks.values()];
}

function findPlugByName(name: string, plugMap: Map<number, ItemPlugSummary>): ItemPlugSummary | null {
  const lower = name.toLowerCase();
  for (const plug of plugMap.values()) {
    if (plug.name.toLowerCase() === lower) return plug;
  }
  for (const plug of plugMap.values()) {
    if (plug.name.toLowerCase().includes(lower) || lower.includes(plug.name.toLowerCase())) return plug;
  }
  return null;
}

function buildPlugMap(
  item_hash: number,
  itemDefinitions: SourceOptions["itemDefinitions"],
  plugSetDefinitions: SourceOptions["plugSetDefinitions"]
): Map<number, ItemPlugSummary> {
  const map = new Map<number, ItemPlugSummary>();
  if (!itemDefinitions) return map;

  const weaponDef = itemDefinitions[String(item_hash)];
  if (!weaponDef) return map;

  const groups = summarizeItemPerks(weaponDef, itemDefinitions, {
    plugSetDefinitions,
    maxPlugsPerSocket: 24
  });

  for (const group of groups) {
    for (const plug of group.plugs) {
      map.set(plug.hash, plug);
    }
  }

  return map;
}

function readCache(cacheDir: string, item_hash: number): WeaponRecommendation | null {
  const path = cachePath(cacheDir, item_hash);
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

function writeCache(cacheDir: string, item_hash: number, recommendation: WeaponRecommendation, raw_response?: string): void {
  mkdirSync(cacheDir, { recursive: true });
  const entry: LightggCacheEntry = {
    cached_at: Date.now(),
    recommendation,
    raw_response
  };
  writeFileSync(cachePath(cacheDir, item_hash), `${JSON.stringify(entry, null, 2)}\n`, "utf8");
}

export function clearLightggCache(data_dir: string): void {
  const cacheDir = join(data_dir, "cache", "lightgg");
  if (!existsSync(cacheDir)) return;

  rmSync(cacheDir, { recursive: true, force: true });
}

function cachePath(cacheDir: string, item_hash: number): string {
  return join(cacheDir, `${item_hash}.json`);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
