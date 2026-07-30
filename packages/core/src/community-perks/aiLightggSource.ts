import { summarizeItemPerks, type ItemPlugSummary } from "../items/perks.js";
import type {
  PerkCombo,
  PerkRef,
  SourceOptions,
  WeaponRecommendation
} from "./types.js";

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
