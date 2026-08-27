import type { ArmorStatKey } from "../loadouts/analysis.js";
import { armorSlots, armorStatKeys, type ArmorSlot } from "./model.js";

export type ArmorArchetypeRule = {
  id: string;
  name: string;
  primary_stat: ArmorStatKey;
  secondary_stat: ArmorStatKey;
  plug_hashes: number[];
  aliases: string[];
};

export type ArmorSlotRule = {
  slot: ArmorSlot;
  aliases: string[];
  bucket_hashes: number[];
};

export type ArmorRuleset = {
  ruleset_id: "armor-3.0";
  version: number;
  source: {
    kind: "local_rule";
    reference: string;
  };
  manifest?: {
    version: string;
    language?: string;
  };
  effective_from?: string;
  compatible_versions: readonly number[];
  stat_keys: readonly ArmorStatKey[];
  slots: readonly ArmorSlotRule[];
  archetypes: readonly ArmorArchetypeRule[];
  piece: {
    primary_value: 30;
    secondary_value: 25;
    tertiary_value: 20;
    raw_total: 75;
    full_masterwork_total: 90;
  };
  masterwork: {
    maximum_tier: 5;
    off_archetype_points_per_tier: 1;
  };
  tuning: {
    shift: { from: -5; to: 5 };
    plus3: { off_archetype_points_each: 1; total: 3 };
  };
  armor_mod: {
    allowed_values: readonly [0, 5, 10];
    maximum_per_piece: 1;
    default_energy_capacity: 10;
    energy_costs: Readonly<Record<5 | 10, number>>;
  };
  stat_limits: {
    minimum: 0;
    maximum: 200;
  };
};

export type CreateArmor30RulesetInput = {
  version?: number;
  source_reference?: string;
  manifest_version?: string;
  manifest_language?: string;
  effective_from?: string;
  compatible_versions?: readonly number[];
  archetypes?: readonly ArmorArchetypeRule[];
  slots?: readonly ArmorSlotRule[];
};

const defaultSlotRules: readonly ArmorSlotRule[] = [
  { slot: "helmet", aliases: ["头盔", "頭盔", "helmet"], bucket_hashes: [3448274439] },
  { slot: "arms", aliases: ["臂铠", "臂鎧", "gauntlets", "arms"], bucket_hashes: [3551918588] },
  { slot: "chest", aliases: ["胸甲", "chest armor", "chest"], bucket_hashes: [14239492] },
  { slot: "legs", aliases: ["腿甲", "leg armor", "legs"], bucket_hashes: [20886954] },
  { slot: "class", aliases: ["职业物品", "職業物品", "class armor", "class item"], bucket_hashes: [1585787867] }
];

export function createArmor30Ruleset(
  input: CreateArmor30RulesetInput = {}
): ArmorRuleset {
  const version = normalizeVersion(input.version);
  return {
    ruleset_id: "armor-3.0",
    version,
    source: {
      kind: "local_rule",
      reference: input.source_reference?.trim() || "d2-service:armor-3.0"
    },
    ...(input.manifest_version?.trim()
      ? {
          manifest: {
            version: input.manifest_version.trim(),
            ...(input.manifest_language?.trim()
              ? { language: input.manifest_language.trim() }
              : {})
          }
        }
      : {}),
    ...(input.effective_from?.trim() ? { effective_from: input.effective_from.trim() } : {}),
    compatible_versions: normalizeCompatibleVersions(input.compatible_versions, version),
    stat_keys: armorStatKeys,
    slots: (input.slots ?? defaultSlotRules).map(cloneSlotRule),
    archetypes: (input.archetypes ?? []).map(cloneArchetypeRule),
    piece: {
      primary_value: 30,
      secondary_value: 25,
      tertiary_value: 20,
      raw_total: 75,
      full_masterwork_total: 90
    },
    masterwork: {
      maximum_tier: 5,
      off_archetype_points_per_tier: 1
    },
    tuning: {
      shift: { from: -5, to: 5 },
      plus3: { off_archetype_points_each: 1, total: 3 }
    },
    armor_mod: {
      allowed_values: [0, 5, 10],
      maximum_per_piece: 1,
      default_energy_capacity: 10,
      energy_costs: {
        5: 1,
        10: 3
      }
    },
    stat_limits: {
      minimum: 0,
      maximum: 200
    }
  };
}

export function validateArmorRuleset(ruleset: ArmorRuleset): string[] {
  const issues: string[] = [];
  const archetypeIds = new Set<string>();
  const archetypePlugOwners = new Map<number, string>();
  const archetypeAliasOwners = new Map<string, string>();

  if (!Number.isInteger(ruleset.version) || ruleset.version < 1) {
    issues.push("ArmorRuleset version 必须是正整数。");
  }
  if (!ruleset.source.reference.trim()) {
    issues.push("ArmorRuleset 必须记录本地规则来源。");
  }
  if (!ruleset.compatible_versions.includes(ruleset.version)
    || ruleset.compatible_versions.some((version) => !Number.isInteger(version) || version < 1)) {
    issues.push("ArmorRuleset 兼容版本必须包含当前正整数版本。");
  }
  const configuredSlots = new Set(ruleset.slots.map((rule) => rule.slot));
  if (ruleset.slots.length !== armorSlots.length
    || armorSlots.some((slot) => !configuredSlots.has(slot))) {
    issues.push("ArmorRuleset 必须定义五个护甲槽位。");
  }
  for (const archetype of ruleset.archetypes) {
    if (archetypeIds.has(archetype.id)) issues.push(`护甲框架 ID 重复：${archetype.id}`);
    archetypeIds.add(archetype.id);
    if (archetype.primary_stat === archetype.secondary_stat) {
      issues.push(`护甲框架 ${archetype.name} 的主要和次要属性不能相同。`);
    }
    for (const plugHash of archetype.plug_hashes) {
      const owner = archetypePlugOwners.get(plugHash);
      if (owner && owner !== archetype.id) {
        issues.push(`护甲框架 Plug Hash ${plugHash} 同时属于 ${owner} 和 ${archetype.id}。`);
      } else {
        archetypePlugOwners.set(plugHash, archetype.id);
      }
    }
    for (const alias of archetype.aliases) {
      const normalizedAlias = normalizeAlias(alias);
      if (!normalizedAlias) continue;
      const owner = archetypeAliasOwners.get(normalizedAlias);
      if (owner && owner !== archetype.id) {
        issues.push(`护甲框架别名 ${alias} 同时属于 ${owner} 和 ${archetype.id}。`);
      } else {
        archetypeAliasOwners.set(normalizedAlias, archetype.id);
      }
    }
  }
  return issues;
}

function cloneArchetypeRule(rule: ArmorArchetypeRule): ArmorArchetypeRule {
  return {
    ...rule,
    plug_hashes: [...new Set(rule.plug_hashes)],
    aliases: [...new Set(rule.aliases.map((alias) => alias.trim()).filter(Boolean))]
  };
}

function cloneSlotRule(rule: ArmorSlotRule): ArmorSlotRule {
  return {
    slot: rule.slot,
    aliases: [...new Set(rule.aliases.map((alias) => alias.trim()).filter(Boolean))],
    bucket_hashes: [...new Set(rule.bucket_hashes)]
  };
}

function normalizeVersion(version: number | undefined): number {
  return Number.isInteger(version) && version! > 0 ? version! : 1;
}

function normalizeCompatibleVersions(
  versions: readonly number[] | undefined,
  currentVersion: number
): number[] {
  return [...new Set([
    currentVersion,
    ...(versions ?? []).filter((version) => Number.isInteger(version) && version > 0)
  ])].sort((left, right) => left - right);
}

function normalizeAlias(value: string): string {
  return value.trim().toLocaleLowerCase();
}
