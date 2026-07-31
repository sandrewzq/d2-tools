import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";

export type ItemReleaseSummary = {
  status: "ready" | "partial";
  label: "发布赛季" | "发布标记";
  description: string;
  season_hash?: number;
  season_number?: number;
  name?: string;
  release_traits?: string[];
  start_at?: string;
  end_at?: string;
};

export type ItemDefinitionVersionSummary = {
  current_version: number;
  label: string;
  power_cap_hash?: number;
  watermark_icons?: string[];
};

export function summarizeItemRelease(
  definition: DefinitionRecord,
  seasonDefinitions: DefinitionComponentData | undefined
): ItemReleaseSummary | undefined {
  const seasonHash = definition.seasonHash;
  const releaseTraits = (definition.traitIds ?? [])
    .filter((traitId) => traitId.startsWith("releases."))
    .sort();
  if (typeof seasonHash === "number") {
    const season = seasonDefinitions?.[String(seasonHash)];
    const seasonNumber = season?.seasonNumber;
    const name = season?.displayProperties?.name?.trim();
    if (season && typeof seasonNumber === "number" && Number.isInteger(seasonNumber) && seasonNumber >= 0 && name) {
      return {
        status: "ready",
        label: "发布赛季",
        season_hash: seasonHash,
        season_number: seasonNumber,
        name,
        description: `第 ${seasonNumber} 赛季 · ${name}`,
        ...(releaseTraits.length ? { release_traits: releaseTraits } : {}),
        ...(season.startDate ? { start_at: season.startDate } : {}),
        ...(season.endDate ? { end_at: season.endDate } : {})
      };
    }
    return {
      status: "partial",
      label: "发布赛季",
      season_hash: seasonHash,
      description: `发布赛季 Hash ${seasonHash} 的定义资料未返回。`,
      ...(releaseTraits.length ? { release_traits: releaseTraits } : {})
    };
  }
  if (!releaseTraits.length) return undefined;
  return {
    status: "partial",
    label: "发布标记",
    description: `官方发布标记 · ${releaseTraits.join(" · ")}（定义未提供 seasonHash）`,
    release_traits: releaseTraits
  };
}

export function summarizeItemDefinitionVersion(
  definition: DefinitionRecord
): ItemDefinitionVersionSummary | undefined {
  const currentVersion = definition.quality?.currentVersion;
  if (typeof currentVersion !== "number" || !Number.isInteger(currentVersion) || currentVersion < 0) return undefined;
  const powerCapHash = definition.quality?.versions?.[currentVersion]?.powerCapHash;
  return {
    current_version: currentVersion,
    label: `质量版本 ${currentVersion}`,
    ...(typeof powerCapHash === "number" ? { power_cap_hash: powerCapHash } : {}),
    ...(definition.quality?.displayVersionWatermarkIcons?.length
      ? { watermark_icons: definition.quality.displayVersionWatermarkIcons.map(normalizeBungieAssetUrl) }
      : {})
  };
}

function normalizeBungieAssetUrl(value: string): string {
  const path = value.trim();
  if (!path || /^https?:\/\//i.test(path)) return path;
  return `https://www.bungie.net${path.startsWith("/") ? path : `/${path}`}`;
}
