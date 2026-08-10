import type { ArmorStatKey } from "../loadouts/analysis.js";
import {
  addArmorStatValues,
  armorStatKeys,
  cloneArmorStatValues,
  createEmptyArmorStatValues,
  totalArmorStatValues,
  type ArmorClass,
  type ArmorSlot,
  type ArmorStatModIdentity,
  type ArmorStatValues
} from "./model.js";
import type { ArmorArchetypeRule, ArmorRuleset } from "./ruleset.js";

export type ArmorConfigurationTuning =
  | {
      mode: "shift";
      from_stat: ArmorStatKey;
      to_stat: ArmorStatKey;
      rolled_to_stat?: ArmorStatKey;
    }
  | {
      mode: "plus3";
    };

export type ArmorConfigurationInput = {
  configuration_id: string;
  slot: ArmorSlot;
  class: ArmorClass;
  archetype_id: string;
  tertiary_stat: ArmorStatKey;
  masterwork_tier?: number;
  tuning: ArmorConfigurationTuning;
  armor_stat_mod?: Omit<ArmorStatModIdentity, "source_plug_hash">;
  item_hash?: number;
  name?: string;
  exotic?: boolean;
  exotic_class_item?: boolean;
  set?: {
    hash: number;
    name: string;
  };
};

export type ArmorConfiguration = {
  kind: "theoretical_config";
  configuration_id: string;
  ruleset_id: ArmorRuleset["ruleset_id"];
  ruleset_version: number;
  item_hash?: number;
  name: string;
  slot: ArmorSlot;
  class: ArmorClass;
  exotic: boolean;
  exotic_class_item: boolean;
  set?: {
    hash: number;
    name: string;
  };
  archetype: {
    id: string;
    name: string;
    primary_stat: ArmorStatKey;
    secondary_stat: ArmorStatKey;
    tertiary_stat: ArmorStatKey;
  };
  masterwork_tier: number;
  tuning: ArmorConfigurationTuning;
  armor_stat_mod?: Omit<ArmorStatModIdentity, "source_plug_hash">;
  stats: {
    raw: ArmorStatValues;
    masterwork: ArmorStatValues;
    tuning: ArmorStatValues;
    armor_stat_mod: ArmorStatValues;
    final: ArmorStatValues;
  };
};

export type ArmorConfigurationIssue = {
  code: string;
  message: string;
};

export type ArmorConfigurationBuildResult =
  | {
      status: "valid";
      configuration: ArmorConfiguration;
      issues: [];
    }
  | {
      status: "invalid";
      issues: ArmorConfigurationIssue[];
    };

export function buildArmorConfiguration(
  ruleset: ArmorRuleset,
  input: ArmorConfigurationInput
): ArmorConfigurationBuildResult {
  const issues: ArmorConfigurationIssue[] = [];
  const archetype = ruleset.archetypes.find((candidate) => candidate.id === input.archetype_id);
  const masterworkTier = input.masterwork_tier ?? ruleset.masterwork.maximum_tier;

  if (!input.configuration_id.trim()) {
    issues.push({ code: "missing_configuration_id", message: "理论护甲配置缺少稳定 ID。" });
  }
  if (!archetype) {
    issues.push({ code: "unknown_archetype", message: `规则集中不存在护甲框架 ${input.archetype_id}。` });
  }
  if (!Number.isInteger(masterworkTier)
    || masterworkTier < 0
    || masterworkTier > ruleset.masterwork.maximum_tier) {
    issues.push({
      code: "invalid_masterwork_tier",
      message: `大师杰作等级必须位于 0-${ruleset.masterwork.maximum_tier}。`
    });
  }
  if (archetype
    && (input.tertiary_stat === archetype.primary_stat
      || input.tertiary_stat === archetype.secondary_stat)) {
    issues.push({
      code: "invalid_tertiary_stat",
      message: "第三属性不能与框架的主要或次要属性相同。"
    });
  }
  if (input.exotic_class_item && input.slot !== "class") {
    issues.push({ code: "invalid_exotic_class_item_slot", message: "异域职业物品必须位于职业物品槽位。" });
  }
  if (input.exotic_class_item && input.exotic === false) {
    issues.push({ code: "invalid_exotic_class_item_tier", message: "异域职业物品必须同时标记为异域护甲。" });
  }
  validateTuning(input.tuning, issues);
  validateArmorStatMod(input.armor_stat_mod, ruleset, issues);

  if (!archetype || issues.length) return { status: "invalid", issues };

  const raw = buildRawStats(archetype, input.tertiary_stat, ruleset);
  const masterwork = buildMasterworkStats(
    archetype,
    input.tertiary_stat,
    masterworkTier,
    ruleset
  );
  const tuning = buildTuningStats(archetype, input.tertiary_stat, input.tuning, ruleset);
  const armorStatMod = buildArmorStatModStats(input.armor_stat_mod);
  const final = addArmorStatValues(raw, masterwork, tuning, armorStatMod);

  if (totalArmorStatValues(raw) !== ruleset.piece.raw_total) {
    issues.push({ code: "ruleset_raw_total_mismatch", message: "规则集的单件原始总值无法由框架数值重建。" });
  }
  if (masterworkTier === ruleset.masterwork.maximum_tier
    && totalArmorStatValues(addArmorStatValues(raw, masterwork)) !== ruleset.piece.full_masterwork_total) {
    issues.push({ code: "ruleset_masterwork_total_mismatch", message: "规则集的满大师杰作总值无法由当前规则重建。" });
  }
  for (const stat of armorStatKeys) {
    if (final[stat] < ruleset.stat_limits.minimum || final[stat] > ruleset.stat_limits.maximum) {
      issues.push({
        code: "stat_out_of_range",
        message: `${stat} 的理论值 ${final[stat]} 超出规则范围。`
      });
    }
  }
  if (issues.length) return { status: "invalid", issues };

  const exotic = input.exotic_class_item ? true : Boolean(input.exotic);
  return {
    status: "valid",
    issues: [],
    configuration: {
      kind: "theoretical_config",
      configuration_id: input.configuration_id,
      ruleset_id: ruleset.ruleset_id,
      ruleset_version: ruleset.version,
      item_hash: input.item_hash,
      name: input.name?.trim() || "理论护甲",
      slot: input.slot,
      class: input.class,
      exotic,
      exotic_class_item: Boolean(input.exotic_class_item),
      set: input.set ? { ...input.set } : undefined,
      archetype: {
        id: archetype.id,
        name: archetype.name,
        primary_stat: archetype.primary_stat,
        secondary_stat: archetype.secondary_stat,
        tertiary_stat: input.tertiary_stat
      },
      masterwork_tier: masterworkTier,
      tuning: { ...input.tuning },
      armor_stat_mod: input.armor_stat_mod ? { ...input.armor_stat_mod } : undefined,
      stats: {
        raw,
        masterwork,
        tuning,
        armor_stat_mod: armorStatMod,
        final
      }
    }
  };
}

function validateTuning(
  tuning: ArmorConfigurationTuning,
  issues: ArmorConfigurationIssue[]
): void {
  if (tuning.mode !== "shift") return;
  if (tuning.from_stat === tuning.to_stat) {
    issues.push({ code: "invalid_tuning_shift", message: "调整的减少属性与增加属性不能相同。" });
  }
  if (tuning.rolled_to_stat && tuning.rolled_to_stat !== tuning.to_stat) {
    issues.push({
      code: "fixed_tuning_target_mismatch",
      message: "调整的增加属性必须匹配该护甲不可重选的固定目标。"
    });
  }
}

function validateArmorStatMod(
  mod: ArmorConfigurationInput["armor_stat_mod"],
  ruleset: ArmorRuleset,
  issues: ArmorConfigurationIssue[]
): void {
  if (!mod) return;
  if (!ruleset.armor_mod.allowed_values.includes(mod.value)) {
    issues.push({ code: "invalid_armor_stat_mod", message: `不支持 +${mod.value} 护甲属性模组。` });
  }
}

function buildRawStats(
  archetype: ArmorArchetypeRule,
  tertiaryStat: ArmorStatKey,
  ruleset: ArmorRuleset
): ArmorStatValues {
  const stats = createEmptyArmorStatValues();
  stats[archetype.primary_stat] = ruleset.piece.primary_value;
  stats[archetype.secondary_stat] = ruleset.piece.secondary_value;
  stats[tertiaryStat] = ruleset.piece.tertiary_value;
  return stats;
}

function buildMasterworkStats(
  archetype: ArmorArchetypeRule,
  tertiaryStat: ArmorStatKey,
  tier: number,
  ruleset: ArmorRuleset
): ArmorStatValues {
  const stats = createEmptyArmorStatValues();
  const archetypeStats = new Set<ArmorStatKey>([
    archetype.primary_stat,
    archetype.secondary_stat,
    tertiaryStat
  ]);
  for (const stat of armorStatKeys) {
    if (!archetypeStats.has(stat)) {
      stats[stat] = tier * ruleset.masterwork.off_archetype_points_per_tier;
    }
  }
  return stats;
}

function buildTuningStats(
  archetype: ArmorArchetypeRule,
  tertiaryStat: ArmorStatKey,
  tuning: ArmorConfigurationTuning,
  ruleset: ArmorRuleset
): ArmorStatValues {
  const stats = createEmptyArmorStatValues();
  if (tuning.mode === "shift") {
    stats[tuning.from_stat] = ruleset.tuning.shift.from;
    stats[tuning.to_stat] += ruleset.tuning.shift.to;
    return stats;
  }

  const archetypeStats = new Set<ArmorStatKey>([
    archetype.primary_stat,
    archetype.secondary_stat,
    tertiaryStat
  ]);
  for (const stat of armorStatKeys) {
    if (!archetypeStats.has(stat)) {
      stats[stat] = ruleset.tuning.plus3.off_archetype_points_each;
    }
  }
  return stats;
}

function buildArmorStatModStats(
  mod: ArmorConfigurationInput["armor_stat_mod"]
): ArmorStatValues {
  const stats = createEmptyArmorStatValues();
  if (mod) stats[mod.stat] = mod.value;
  return cloneArmorStatValues(stats);
}
