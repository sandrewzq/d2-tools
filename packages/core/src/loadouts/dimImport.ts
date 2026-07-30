import type { CreateLocalLoadoutPlanInput, LoadoutPlanArmorConstraints, LoadoutPlanArmorStatKey } from "./plans.js";

export type DimLoadoutImportPreview = {
  source_url: string;
  share_id?: string;
  name: string;
  class_name: string;
  item_count: number;
  warnings: string[];
  draft: CreateLocalLoadoutPlanInput;
};

export type DimShareLink = {
  kind: "dim-share" | "url-loadout";
  source_url: string;
  share_id?: string;
  inline_loadout?: unknown;
};

/** Accept the public DIM exchange formats without treating arbitrary URLs as importable. */
export function parseDimShareLink(value: string): DimShareLink {
  const raw = value.trim();
  if (!raw) throw new Error("请输入 DIM 配装分享链接。");

  const dimMatch = raw.match(/^(?:(?:https?:\/\/)?dim\.gg\/)?([a-z0-9]{7,})(?:\/.*)?$/i);
  if (dimMatch) {
    return {
      kind: "dim-share",
      source_url: `https://dim.gg/${dimMatch[1]}`,
      share_id: dimMatch[1]
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("这不是有效的 DIM 分享链接。请使用 dim.gg/... 或 DIM 的 /loadouts?loadout=... 链接。");
  }
  if (!/(^|\.)destinyitemmanager\.com$/i.test(url.hostname) || !url.pathname.endsWith("/loadouts")) {
    throw new Error("仅支持 DIM 的 dim.gg 分享链接或 /loadouts?loadout=... 导出链接。");
  }
  const serialized = url.searchParams.get("loadout");
  if (!serialized) throw new Error("DIM 链接中没有可读取的 loadout 数据。");
  try {
    return { kind: "url-loadout", source_url: url.toString(), inline_loadout: JSON.parse(serialized) as unknown };
  } catch {
    throw new Error("DIM 链接中的 loadout 数据不是有效 JSON。");
  }
}

export function createDimLoadoutImportPreview(input: {
  source_url: string;
  payload: unknown;
  share_id?: string;
}): DimLoadoutImportPreview {
  const loadout = unwrapLoadout(input.payload);
  const items = array(loadout.items);
  if (!items.length) throw new Error("DIM 配装没有可导入的装备条目。");

  const warnings: string[] = [];
  const itemTargets = items.flatMap((entry, index) => {
    const record = object(entry);
    const itemHash = finiteNumber(record.hash ?? record.itemHash);
    if (itemHash === undefined) {
      warnings.push(`第 ${index + 1} 项缺少装备定义，已跳过。`);
      return [];
    }
    const instanceId = string(record.id ?? record.itemInstanceId ?? record.instanceId);
    const plugHashes = extractPlugHashes(record.socketOverrides ?? record.plugs ?? record.plugItemHashes);
    return [{
      slot: string(record.bucketName ?? record.bucket_name) ?? `DIM 装备 ${index + 1}`,
      item_hash: itemHash >>> 0,
      ...(instanceId ? { selected_instance_id: instanceId } : {}),
      plug_hashes: plugHashes
    }];
  });
  if (!itemTargets.length) throw new Error("DIM 配装的装备条目缺少可用的定义 Hash。");

  const parameters = object(loadout.parameters);
  const className = classNameFromDim(loadout.classType ?? loadout.class_type);
  const name = string(loadout.name) ?? "DIM 导入方案";
  const notes = [string(loadout.notes), string(loadout.description)].filter(Boolean).join("\n") || undefined;
  const armorConstraints = extractArmorConstraints(parameters, warnings);
  const subclass = extractSubclass(parameters, warnings);

  return {
    source_url: input.source_url,
    ...(input.share_id ? { share_id: input.share_id } : {}),
    name,
    class_name: className,
    item_count: itemTargets.length,
    warnings,
    draft: {
      name,
      class_name: className,
      source: { kind: "dim-link", reference_url: input.source_url, label: input.share_id ? `DIM ${input.share_id}` : "DIM 导出链接" },
      item_targets: itemTargets,
      ...(subclass ? { subclass_target: subclass } : {}),
      ...(armorConstraints ? { armor_constraints: armorConstraints } : {}),
      ...(notes ? { notes } : {}),
      guidance: {
        warnings,
        evidence: [`DIM 分享链接：${input.source_url}`]
      }
    }
  };
}

function unwrapLoadout(value: unknown): Record<string, unknown> {
  const root = object(value);
  const nested = object(root.loadout);
  const loadout = Object.keys(nested).length ? nested : root;
  if (!Array.isArray(loadout.items)) throw new Error("DIM 返回的数据不包含 loadout.items，格式可能已经变化。");
  return loadout;
}

function extractPlugHashes(value: unknown): number[] {
  const hashes: number[] = [];
  const add = (candidate: unknown) => {
    const hash = finiteNumber(candidate);
    if (hash !== undefined) hashes.push(hash >>> 0);
  };
  if (Array.isArray(value)) value.forEach(add);
  else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(add);
  else add(value);
  return [...new Set(hashes)];
}

function extractArmorConstraints(
  parameters: Record<string, unknown>,
  warnings: string[]
): LoadoutPlanArmorConstraints | undefined {
  const constraints = array(parameters.statConstraints ?? parameters.stat_constraints);
  if (!constraints.length) return undefined;
  const statMinimums: Partial<Record<LoadoutPlanArmorStatKey, number>> = {};
  for (const value of constraints) {
    const record = object(value);
    const stat = dimStatKey(record.stat ?? record.statName ?? record.statHash);
    const minimum = finiteNumber(record.minStat ?? record.minimum ?? record.minTier);
    if (!stat || minimum === undefined) {
      warnings.push("DIM 中有无法映射到当前六维模型的属性约束，已保留为预览警告。");
      continue;
    }
    statMinimums[stat] = Math.max(minimum > 10 && "minTier" in record ? minimum * 10 : minimum, 0);
  }
  if (!Object.keys(statMinimums).length) return undefined;
  return {
    stat_minimums: statMinimums,
    priority_stats: [],
    fragment_stat_bonuses: {},
    five_point_mod_budget: 0,
    ten_point_mod_budget: 0,
    locked_instance_ids: [],
    excluded_instance_ids: [],
    allowed_locations: ["equipped", "inventory", "vault", "postmaster"]
  };
}

function extractSubclass(parameters: Record<string, unknown>, warnings: string[]) {
  const subclass = object(parameters.subclass ?? parameters.subclassConfig);
  const subclassHash = finiteNumber(subclass.hash ?? subclass.subclassHash);
  const abilityHashes = numberArray(subclass.abilities ?? subclass.abilityHashes);
  const aspectHashes = numberArray(subclass.aspects ?? subclass.aspectHashes);
  const fragmentHashes = numberArray(subclass.fragments ?? subclass.fragmentHashes);
  const modHashes = numberArray(parameters.mods ?? subclass.mods);
  if (!subclassHash && !abilityHashes.length && !aspectHashes.length && !fragmentHashes.length && !modHashes.length) return undefined;
  if (!subclassHash) warnings.push("DIM 子职业配置未提供稳定子职业 Hash，仅保留可确认的技能和模组 Hash。");
  return {
    ...(subclassHash ? { subclass_hash: subclassHash >>> 0 } : {}),
    ability_hashes: abilityHashes,
    aspect_hashes: aspectHashes,
    fragment_hashes: fragmentHashes,
    mod_hashes: modHashes
  };
}

function dimStatKey(value: unknown): LoadoutPlanArmorStatKey | undefined {
  const normalized = String(value ?? "").toLowerCase();
  if (["resilience", "health", "4244567218"].includes(normalized)) return "health";
  if (["strength", "melee", "392767087"].includes(normalized)) return "melee";
  if (["discipline", "grenade", "1735777505"].includes(normalized)) return "grenade";
  if (["intellect", "super", "144602215"].includes(normalized)) return "super";
  if (["mobility", "class", "1943323491"].includes(normalized)) return "class";
  if (["recovery", "weapon", "2996146975"].includes(normalized)) return "weapon";
  return undefined;
}

function classNameFromDim(value: unknown): string {
  const classType = finiteNumber(value);
  if (classType === 0) return "泰坦";
  if (classType === 1) return "猎人";
  if (classType === 2) return "术士";
  return "未限定职业";
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function string(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function numberArray(value: unknown): number[] {
  return array(value)
    .map((item) => typeof item === "object" && item ? finiteNumber(object(item).hash ?? object(item).plugItemHash) : finiteNumber(item))
    .filter((item): item is number => item !== undefined)
    .map((item) => item >>> 0);
}
