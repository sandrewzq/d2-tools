import type { DefinitionComponentData, DefinitionRecord } from "../manifest/definitions.js";

export type ItemReleaseKind = "season" | "annual" | "dlc" | "core" | "update" | "unknown";

export type ItemReleaseSummary = {
  status: "ready" | "partial";
  label: "发布版本";
  kind: ItemReleaseKind;
  description: string;
  season_hash?: number;
  season_number?: number;
  year_number?: number;
  name?: string;
  release_traits?: string[];
  start_at?: string;
  end_at?: string;
};

export type ItemDefinitionVersionSummary = {
  current_version: number;
  version_count: number;
  label: string;
  power_cap_hash?: number;
  current_watermark_icon?: string;
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
  const registeredRelease = releaseTraits
    .map((traitId) => releaseTraitRegistry[traitId])
    .filter((value): value is ReleaseTraitDefinition => value !== undefined)
    .sort((left, right) => releaseKindPriority(left.kind) - releaseKindPriority(right.kind))[0];
  const seasonByHash = typeof seasonHash === "number"
    ? seasonDefinitions?.[String(seasonHash)]
    : undefined;

  if (registeredRelease) {
    const registeredSeason = registeredRelease.seasonNumber === undefined
      ? undefined
      : findSeasonDefinition(seasonDefinitions, registeredRelease.seasonNumber);
    return summarizeRegisteredRelease(
      registeredRelease,
      releaseTraits,
      seasonByHash ?? registeredSeason
    );
  }

  if (seasonByHash) {
    const summary = summarizeSeasonDefinition(seasonByHash, releaseTraits);
    if (summary) return summary;
  }

  if (typeof seasonHash === "number") {
    return {
      status: "partial",
      label: "发布版本",
      kind: "season",
      season_hash: seasonHash,
      description: "官方赛季定义暂未返回。",
      ...(releaseTraits.length ? { release_traits: releaseTraits } : {})
    };
  }

  if (!releaseTraits.length) return undefined;

  const inferredKind = inferReleaseKind(releaseTraits[0]);
  return {
    status: inferredKind === "unknown" ? "partial" : "ready",
    label: "发布版本",
    kind: inferredKind,
    description: genericReleaseDescription(inferredKind),
    release_traits: releaseTraits
  };
}

type ReleaseTraitDefinition = {
  kind: Exclude<ItemReleaseKind, "unknown">;
  name?: string;
  seasonNumber?: number;
  seasonName?: string;
  yearNumber?: number;
};

const releaseTraitRegistry: Readonly<Record<string, ReleaseTraitDefinition>> = {
  "releases.v300.annual": { kind: "annual", yearNumber: 1, name: "红色战争" },
  "releases.v400.annual": { kind: "annual", yearNumber: 2, name: "遗落之族" },
  "releases.v460.annual": { kind: "annual", yearNumber: 3, name: "暗影要塞" },
  "releases.v500.annual": { kind: "annual", yearNumber: 4, name: "凌光之刻" },
  "releases.v600.annual": { kind: "annual", yearNumber: 5, name: "邪姬魅影" },
  "releases.v700.annual": { kind: "annual", yearNumber: 6, name: "光陨之秋" },
  "releases.v800.annual": { kind: "annual", yearNumber: 7, name: "终焉之形" },
  "releases.v900.dlc": { kind: "dlc", name: "宿命边缘", seasonNumber: 27, seasonName: "赛季：溯回" },
  "releases.v910.dlc": { kind: "dlc", seasonNumber: 27, seasonName: "赛季：溯回" },
  "releases.v950.dlc": { kind: "dlc", name: "反叛", seasonNumber: 28, seasonName: "凯旋纪念碑" },
  "releases.v900.core": { kind: "core", seasonNumber: 27, seasonName: "赛季：溯回" },
  "releases.v910.core": { kind: "core", seasonNumber: 27, seasonName: "赛季：溯回" },
  "releases.v950.core": { kind: "core", seasonNumber: 28, seasonName: "凯旋纪念碑" },
  "releases.v960.core": { kind: "core", seasonNumber: 28, seasonName: "凯旋纪念碑" },
  "releases.v970.core": { kind: "core", seasonNumber: 28, seasonName: "凯旋纪念碑" },
  "releases.v900": { kind: "update", seasonNumber: 27, seasonName: "赛季：溯回" },
  "releases.v910": { kind: "update", seasonNumber: 27, seasonName: "赛季：溯回" },
  "releases.v950": { kind: "update", seasonNumber: 28, seasonName: "凯旋纪念碑" },
  "releases.v960": { kind: "update", seasonNumber: 28, seasonName: "凯旋纪念碑" },
  "releases.v970": { kind: "update", seasonNumber: 28, seasonName: "凯旋纪念碑" },
  "releases.v310.season": { kind: "season", seasonNumber: 1, name: "第1赛季" },
  "releases.v320.season": { kind: "season", seasonNumber: 2, name: "冥王诅咒" },
  "releases.v350.season": { kind: "season", seasonNumber: 3, name: "复苏" },
  "releases.v400.season": { kind: "season", seasonNumber: 4, name: "恶徒赛季" },
  "releases.v410.season": { kind: "season", seasonNumber: 5, name: "锻炉赛季" },
  "releases.v420.season": { kind: "season", seasonNumber: 6, name: "浪客赛季" },
  "releases.v450.season": { kind: "season", seasonNumber: 7, name: "丰盈赛季" },
  "releases.v460.season": { kind: "season", seasonNumber: 8, name: "不朽赛季" },
  "releases.v470.season": { kind: "season", seasonNumber: 9, name: "黎明赛季" },
  "releases.v480.season": { kind: "season", seasonNumber: 10, name: "英杰赛季" },
  "releases.v490.season": { kind: "season", seasonNumber: 11, name: "影临赛季" },
  "releases.v500.season": { kind: "season", seasonNumber: 12, name: "狂猎赛季" },
  "releases.v510.season": { kind: "season", seasonNumber: 13, name: "天选赛季" },
  "releases.v520.season": { kind: "season", seasonNumber: 14, name: "永夜赛季" },
  "releases.v530.season": { kind: "season", seasonNumber: 15, name: "神隐赛季" },
  "releases.v540.season": { kind: "season", seasonNumber: 15, name: "神隐赛季" },
  "releases.v600.season": { kind: "season", seasonNumber: 16, name: "苏生赛季" },
  "releases.v610.season": { kind: "season", seasonNumber: 17, name: "宿怨赛季" },
  "releases.v620.season": { kind: "season", seasonNumber: 18, name: "侠盗赛季" },
  "releases.v630.season": { kind: "season", seasonNumber: 19, name: "炽天使赛季" },
  "releases.v700.season": { kind: "season", seasonNumber: 20, name: "抗战赛季" },
  "releases.v710.season": { kind: "season", seasonNumber: 21, name: "深渊赛季" },
  "releases.v720.season": { kind: "season", seasonNumber: 22, name: "奇巫赛季" },
  "releases.v730.season": { kind: "season", seasonNumber: 23, name: "终愿赛季" },
  "releases.v800.season": { kind: "season", seasonNumber: 24, name: "篇章：回响" },
  "releases.v810.season": { kind: "season", seasonNumber: 25, name: "篇章：怨魂" },
  "releases.v820.season": { kind: "season", seasonNumber: 26, name: "篇章：异端" }
};

function summarizeSeasonDefinition(
  season: DefinitionRecord,
  releaseTraits: string[]
): ItemReleaseSummary | undefined {
  const seasonNumber = season.seasonNumber;
  const name = season.displayProperties?.name?.trim();
  if (typeof seasonNumber !== "number" || !Number.isInteger(seasonNumber) || seasonNumber < 0 || !name) {
    return undefined;
  }

  const yearNumber = destinyYearNumber(seasonNumber);
  return {
    status: "ready",
    label: "发布版本",
    kind: "season",
    ...(typeof season.hash === "number" ? { season_hash: season.hash } : {}),
    season_number: seasonNumber,
    ...(yearNumber !== undefined ? { year_number: yearNumber } : {}),
    name,
    description: formatSeasonDescription(seasonNumber, name, yearNumber),
    ...(releaseTraits.length ? { release_traits: releaseTraits } : {}),
    ...(season.startDate ? { start_at: season.startDate } : {}),
    ...(season.endDate ? { end_at: season.endDate } : {})
  };
}

function summarizeRegisteredRelease(
  release: ReleaseTraitDefinition,
  releaseTraits: string[],
  season?: DefinitionRecord
): ItemReleaseSummary {
  const seasonNumber = typeof season?.seasonNumber === "number"
    ? season.seasonNumber
    : release.seasonNumber;
  const seasonName = season?.displayProperties?.name?.trim() || release.seasonName;
  const yearNumber = release.yearNumber ?? (
    seasonNumber === undefined ? undefined : destinyYearNumber(seasonNumber)
  );
  const seasonContext = formatReleaseSeasonContext(seasonNumber, seasonName, yearNumber);
  const seasonFields = {
    ...(typeof season?.hash === "number" ? { season_hash: season.hash } : {}),
    ...(seasonNumber !== undefined ? { season_number: seasonNumber } : {}),
    ...(yearNumber !== undefined ? { year_number: yearNumber } : {}),
    ...(season?.startDate ? { start_at: season.startDate } : {}),
    ...(season?.endDate ? { end_at: season.endDate } : {})
  };

  if (release.kind === "season" && release.seasonNumber !== undefined) {
    const name = seasonName ?? release.name ?? `第${release.seasonNumber}赛季`;
    return {
      status: "ready",
      label: "发布版本",
      kind: "season",
      ...seasonFields,
      name,
      description: formatSeasonDescription(release.seasonNumber, name, yearNumber),
      release_traits: releaseTraits
    };
  }

  if (release.kind === "annual") {
    return {
      status: release.name ? "ready" : "partial",
      label: "发布版本",
      kind: "annual",
      ...seasonFields,
      ...(release.name ? { name: release.name } : {}),
      description: [
        yearNumber !== undefined ? `第${yearNumber}年` : undefined,
        release.name ?? "年度资料片"
      ].filter(Boolean).join(" · "),
      release_traits: releaseTraits
    };
  }

  if (release.kind === "dlc") {
    return {
      status: release.name ? "ready" : "partial",
      label: "发布版本",
      kind: "dlc",
      ...seasonFields,
      ...(release.name ? { name: release.name } : {}),
      description: [
        ...seasonContext,
        release.name ? `${release.name}内容包` : "内容包版本"
      ].join(" · "),
      release_traits: releaseTraits
    };
  }

  return {
    status: "ready",
    label: "发布版本",
    kind: release.kind,
    ...seasonFields,
    description: [
      ...seasonContext,
      release.kind === "core" ? "核心内容更新" : genericReleaseDescription(release.kind)
    ].join(" · "),
    release_traits: releaseTraits
  };
}

function formatReleaseSeasonContext(
  seasonNumber: number | undefined,
  seasonName: string | undefined,
  yearNumber: number | undefined
): string[] {
  return [
    yearNumber !== undefined ? `第${yearNumber}年` : undefined,
    seasonNumber !== undefined ? `第${seasonNumber}赛季` : undefined,
    seasonName
  ].filter((value): value is string => Boolean(value));
}

function findSeasonDefinition(
  seasonDefinitions: DefinitionComponentData | undefined,
  seasonNumber: number
): DefinitionRecord | undefined {
  return Object.values(seasonDefinitions ?? {}).find((season) => season.seasonNumber === seasonNumber);
}

function inferReleaseKind(traitId: string): ItemReleaseKind {
  if (traitId.endsWith(".season")) return "season";
  if (traitId.endsWith(".annual")) return "annual";
  if (traitId.endsWith(".dlc")) return "dlc";
  if (traitId.endsWith(".core")) return "core";
  if (/^releases\.v\d+$/.test(traitId)) return "update";
  return "unknown";
}

function releaseKindPriority(kind: Exclude<ItemReleaseKind, "unknown">): number {
  if (kind === "season") return 0;
  if (kind === "dlc") return 1;
  if (kind === "annual") return 2;
  if (kind === "core") return 3;
  return 4;
}

function genericReleaseDescription(kind: ItemReleaseKind): string {
  if (kind === "season") return "赛季版本";
  if (kind === "annual") return "年度资料片";
  if (kind === "dlc") return "内容包版本";
  if (kind === "core") return "核心内容版本";
  if (kind === "update") return "版本内容更新";
  return "官方发布版本未标注";
}

function destinyYearNumber(seasonNumber: number): number | undefined {
  const yearStarts = [1, 4, 8, 12, 16, 20, 24, 27];
  for (let index = yearStarts.length - 1; index >= 0; index -= 1) {
    if (seasonNumber >= yearStarts[index]!) return index + 1;
  }
  return undefined;
}

function formatSeasonDescription(
  seasonNumber: number,
  name: string,
  yearNumber: number | undefined
): string {
  return [
    yearNumber !== undefined ? `第${yearNumber}年` : undefined,
    `第${seasonNumber}赛季`,
    name
  ].filter(Boolean).join(" · ");
}

export function summarizeItemDefinitionVersion(
  definition: DefinitionRecord
): ItemDefinitionVersionSummary | undefined {
  const currentVersion = definition.quality?.currentVersion;
  if (typeof currentVersion !== "number" || !Number.isInteger(currentVersion) || currentVersion < 0) return undefined;
  const powerCapHash = definition.quality?.versions?.[currentVersion]?.powerCapHash;
  const watermarkIcons = (definition.quality?.displayVersionWatermarkIcons ?? [])
    .map(normalizeBungieAssetUrl)
    .filter(Boolean);
  const currentWatermarkIcon = watermarkIcons[currentVersion]
    ?? (definition.iconWatermark ? normalizeBungieAssetUrl(definition.iconWatermark) : undefined);
  const versionCount = Math.max(
    definition.quality?.versions?.length ?? 0,
    watermarkIcons.length,
    currentVersion + 1
  );
  return {
    current_version: currentVersion,
    version_count: versionCount,
    label: `Manifest 定义版本 ${currentVersion + 1}/${versionCount}`,
    ...(typeof powerCapHash === "number" ? { power_cap_hash: powerCapHash } : {}),
    ...(currentWatermarkIcon ? { current_watermark_icon: currentWatermarkIcon } : {}),
    ...(watermarkIcons.length ? { watermark_icons: watermarkIcons } : {})
  };
}

function normalizeBungieAssetUrl(value: string): string {
  const path = value.trim();
  if (!path || /^https?:\/\//i.test(path)) return path;
  return `https://www.bungie.net${path.startsWith("/") ? path : `/${path}`}`;
}
