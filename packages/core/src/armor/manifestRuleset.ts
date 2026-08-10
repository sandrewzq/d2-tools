import type {
  DefinitionComponentData,
  DefinitionRecord
} from "../manifest/definitions.js";
import type { ArmorStatKey } from "../loadouts/analysis.js";
import {
  createArmor30Ruleset,
  validateArmorRuleset,
  type ArmorArchetypeRule,
  type ArmorRuleset
} from "./ruleset.js";
import {
  armorStatDefinitionHashByKey,
  armorStatKeyByDefinitionHash,
  armorStatKeys
} from "./statDefinitions.js";

export const armor30ExpectedArchetypeCount = 6;

export type ArmorManifestRulesetBuildResult = {
  status: "ready" | "incomplete";
  ruleset: ArmorRuleset;
  matched_plug_count: number;
  archetype_count: number;
  warnings: string[];
};

export type BuildArmorRulesetFromManifestInput = {
  manifest_version: string;
  manifest_language?: string;
  item_definitions: DefinitionComponentData;
  stat_definitions?: DefinitionComponentData;
  ruleset_version?: number;
  source_reference?: string;
};

type ArchetypeGroup = {
  primary: ArmorStatKey;
  secondary: ArmorStatKey;
  hashes: Set<number>;
  aliases: Set<string>;
};

export function buildArmorRulesetFromManifest(
  input: BuildArmorRulesetFromManifestInput
): ArmorManifestRulesetBuildResult {
  const groups = new Map<string, ArchetypeGroup>();
  let matchedPlugCount = 0;

  for (const [key, definition] of Object.entries(input.item_definitions)) {
    const identity = readArmorArchetypeStatPair(definition);
    if (!identity) continue;
    const hash = toUnsignedHash(Number(definition.hash ?? key));
    if (!hash) continue;
    const groupKey = `${identity.primary}:${identity.secondary}`;
    const group = groups.get(groupKey) ?? {
      primary: identity.primary,
      secondary: identity.secondary,
      hashes: new Set<number>(),
      aliases: new Set<string>()
    };
    group.hashes.add(hash);
    const name = definition.displayProperties?.name?.trim();
    if (name) group.aliases.add(name);
    groups.set(groupKey, group);
    matchedPlugCount += 1;
  }

  const archetypes = [...groups.values()]
    .map((group) => archetypeRule(group, input.stat_definitions))
    .sort(compareArchetypes);
  const ruleset = createArmor30Ruleset({
    version: input.ruleset_version,
    source_reference: input.source_reference?.trim()
      || `manifest:${input.manifest_version}:armor-archetype-investment-stats`,
    manifest_version: input.manifest_version,
    manifest_language: input.manifest_language,
    archetypes
  });
  const warnings = validateArmorRuleset(ruleset);
  if (archetypes.length !== armor30ExpectedArchetypeCount) {
    warnings.push(
      `当前 Manifest 只识别出 ${archetypes.length}/${armor30ExpectedArchetypeCount} 组 Armor 3.0 框架，不能用于完整理论规划。`
    );
  }
  if (matchedPlugCount === 0) {
    warnings.push("当前 Manifest 没有找到可确认的 Armor 3.0 框架 Plug。");
  }

  return {
    status: warnings.length === 0 ? "ready" : "incomplete",
    ruleset,
    matched_plug_count: matchedPlugCount,
    archetype_count: archetypes.length,
    warnings
  };
}

export function readArmorArchetypeStatPair(
  definition: DefinitionRecord
): { primary: ArmorStatKey; secondary: ArmorStatKey } | undefined {
  const category = definition.plug?.plugCategoryIdentifier?.trim().toLocaleLowerCase();
  if (category !== "intrinsics") return undefined;

  const totals = new Map<ArmorStatKey, number>();
  for (const stat of definition.investmentStats ?? []) {
    if (stat.isConditionallyActive || typeof stat.value !== "number") continue;
    const key = armorStatKeyByDefinitionHash[Number(stat.statTypeHash)];
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + stat.value);
  }
  const nonZero = [...totals.entries()].filter(([, value]) => value !== 0);
  if (nonZero.length !== 2) return undefined;
  const primary = nonZero.find(([, value]) => value === 30)?.[0];
  const secondary = nonZero.find(([, value]) => value === 25)?.[0];
  return primary && secondary && primary !== secondary
    ? { primary, secondary }
    : undefined;
}

function archetypeRule(
  group: ArchetypeGroup,
  statDefinitions: DefinitionComponentData | undefined
): ArmorArchetypeRule {
  const primaryName = statName(group.primary, statDefinitions);
  const secondaryName = statName(group.secondary, statDefinitions);
  const name = `${primaryName} / ${secondaryName}`;
  return {
    id: `${group.primary}-${group.secondary}`,
    name,
    primary_stat: group.primary,
    secondary_stat: group.secondary,
    plug_hashes: [...group.hashes].sort((left, right) => left - right),
    aliases: [...new Set([name, ...group.aliases])].sort((left, right) => (
      left.localeCompare(right, "zh-Hans-CN")
    ))
  };
}

function statName(
  key: ArmorStatKey,
  definitions: DefinitionComponentData | undefined
): string {
  const hash = armorStatDefinitionHashByKey[key];
  return definitions?.[String(hash)]?.displayProperties?.name?.trim() || key;
}

function compareArchetypes(left: ArmorArchetypeRule, right: ArmorArchetypeRule): number {
  return armorStatKeys.indexOf(left.primary_stat) - armorStatKeys.indexOf(right.primary_stat)
    || armorStatKeys.indexOf(left.secondary_stat) - armorStatKeys.indexOf(right.secondary_stat)
    || left.id.localeCompare(right.id);
}

function toUnsignedHash(value: number): number {
  return Number.isFinite(value) ? value >>> 0 : 0;
}
