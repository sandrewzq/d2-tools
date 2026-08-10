import type { AccountItemPlugSummary, AccountItemSummary, AccountSummary } from "../account/summary.js";
import type { ArmorStatKey } from "../loadouts/analysis.js";
import {
  addArmorStatValues,
  armorStatKeys,
  cloneArmorStatValues,
  equalArmorStatValues,
  type ArmorArchetypeIdentity,
  type ArmorClass,
  type ArmorLocation,
  type ArmorMasterworkIdentity,
  type ArmorModifierSnapshot,
  type ArmorPieceDataQuality,
  type ArmorPieceSnapshot,
  type ArmorSlot,
  type ArmorStatModIdentity,
  type ArmorStatValues,
  type ArmorTuningIdentity
} from "./model.js";
import type { ArmorArchetypeRule, ArmorRuleset } from "./ruleset.js";

export type NormalizeArmorPieceInput = {
  item: AccountItemSummary;
  location: ArmorLocation;
  ruleset: ArmorRuleset;
  source_character_id?: string;
};

export function normalizeArmorPiece(input: NormalizeArmorPieceInput): ArmorPieceSnapshot | null {
  if (input.item.group_key !== "armor") return null;

  const slot = resolveArmorSlot(input.item, input.ruleset);
  const finalStats = cloneArmorStatValues(input.item.armor_stats);
  const baseStats = input.item.armor_stat_breakdown
    ? cloneBreakdownPart(input.item.armor_stat_breakdown, "base")
    : undefined;
  const socketTotal = input.item.armor_stat_breakdown
    ? cloneBreakdownPart(input.item.armor_stat_breakdown, "mod")
    : undefined;
  const archetypeMatch = resolveArmorArchetype(input.item.socket_plugs, input.ruleset);
  const modifiers = input.item.socket_plugs
    .filter((plug) => !isArmorArchetypePlug(plug, input.ruleset))
    .flatMap(classifyArmorModifier);
  const archetype = archetypeMatch.rule
    ? createArchetypeIdentity(archetypeMatch.rule, input.item.socket_plugs, baseStats)
    : undefined;
  const tuningMatches = modifiers.filter((modifier) => (
    modifier.kind === "tuning_shift" || modifier.kind === "tuning_plus3"
  ));
  const armorModMatches = modifiers.filter((modifier) => modifier.kind === "armor_stat_mod");
  const masterworkMatches = modifiers.filter((modifier) => modifier.kind === "masterwork");
  const tuning = tuningMatches.length === 1 ? createTuningIdentity(tuningMatches[0]!) : undefined;
  const armorStatMod = armorModMatches.length === 1
    ? createArmorStatModIdentity(armorModMatches[0]!)
    : undefined;
  const masterwork = masterworkMatches.length === 1
    ? createMasterworkIdentity(masterworkMatches[0]!, input.ruleset)
    : undefined;
  const quality = buildArmorPieceQuality({
    item: input.item,
    slot,
    hasFinalStats: Boolean(input.item.armor_stats),
    hasBaseStats: Boolean(baseStats),
    socketTotal,
    modifiers,
    archetype,
    archetypeAmbiguous: archetypeMatch.ambiguous,
    tuning,
    tuningCount: tuningMatches.length,
    armorModCount: armorModMatches.length,
    masterworkCount: masterworkMatches.length
  });
  const exotic = isExoticArmor(input.item);

  return {
    item_hash: input.item.hash,
    instance_id: input.item.instance_id,
    name: input.item.name,
    class: armorClass(input.item.class_type),
    class_type: input.item.class_type,
    slot,
    location: input.location,
    source_character_id: input.source_character_id,
    exotic,
    exotic_class_item: exotic && slot === "class",
    set: input.item.armor_set ? { ...input.item.armor_set } : undefined,
    stats: {
      base: baseStats,
      socket_total: socketTotal,
      final: finalStats
    },
    modifiers,
    archetype,
    tuning,
    armor_stat_mod: armorStatMod,
    masterwork,
    quality
  };
}

export function normalizeAccountArmorPieces(
  account: AccountSummary,
  ruleset: ArmorRuleset
): ArmorPieceSnapshot[] {
  const pieces: ArmorPieceSnapshot[] = [];
  for (const character of account.characters) {
    pushNormalized(pieces, character.equipped_items, "equipped", ruleset, character.character_id);
    pushNormalized(pieces, character.inventory_items, "inventory", ruleset, character.character_id);
    pushNormalized(pieces, character.postmaster_items, "postmaster", ruleset, character.character_id);
  }
  pushNormalized(pieces, account.vault.items, "vault", ruleset);
  return pieces;
}

function pushNormalized(
  target: ArmorPieceSnapshot[],
  items: AccountItemSummary[],
  location: ArmorLocation,
  ruleset: ArmorRuleset,
  sourceCharacterId?: string
): void {
  for (const item of items) {
    const piece = normalizeArmorPiece({
      item,
      location,
      ruleset,
      source_character_id: sourceCharacterId
    });
    if (piece) target.push(piece);
  }
}

function resolveArmorSlot(item: AccountItemSummary, ruleset: ArmorRuleset): ArmorSlot | undefined {
  const bucketHash = item.bucket_hash;
  const bucketName = normalizeText(item.bucket_name);
  return ruleset.slots.find((rule) => (
    (typeof bucketHash === "number" && rule.bucket_hashes.includes(bucketHash))
    || rule.aliases.some((alias) => bucketName.includes(normalizeText(alias)))
  ))?.slot;
}

function resolveArmorArchetype(
  plugs: AccountItemPlugSummary[],
  ruleset: ArmorRuleset
): { rule?: ArmorArchetypeRule; ambiguous: boolean } {
  const matches = ruleset.archetypes.filter((rule) => plugs.some((plug) => (
    rule.plug_hashes.includes(plug.hash)
    || rule.aliases.some((alias) => normalizeText(plug.name) === normalizeText(alias))
  )));
  return {
    rule: matches.length === 1 ? matches[0] : undefined,
    ambiguous: matches.length > 1
  };
}

function isArmorArchetypePlug(
  plug: AccountItemPlugSummary,
  ruleset: ArmorRuleset
): boolean {
  return ruleset.archetypes.some((rule) => (
    rule.plug_hashes.includes(plug.hash)
    || rule.aliases.some((alias) => normalizeText(plug.name) === normalizeText(alias))
  ));
}

function createArchetypeIdentity(
  rule: ArmorArchetypeRule,
  plugs: AccountItemPlugSummary[],
  baseStats: ArmorStatValues | undefined
): ArmorArchetypeIdentity {
  const sourcePlug = plugs.find((plug) => (
    rule.plug_hashes.includes(plug.hash)
    || rule.aliases.some((alias) => normalizeText(plug.name) === normalizeText(alias))
  ));
  const tertiaryStat = baseStats
    ? inferTertiaryStat(baseStats, rule.primary_stat, rule.secondary_stat)
    : undefined;
  return {
    id: rule.id,
    name: rule.name,
    primary_stat: rule.primary_stat,
    secondary_stat: rule.secondary_stat,
    tertiary_stat: tertiaryStat,
    source_plug_hash: sourcePlug?.hash,
    confidence: sourcePlug ? "exact" : "derived"
  };
}

function inferTertiaryStat(
  baseStats: ArmorStatValues,
  primary: ArmorStatKey,
  secondary: ArmorStatKey
): ArmorStatKey | undefined {
  const candidates = armorStatKeys
    .filter((stat) => stat !== primary && stat !== secondary)
    .map((stat) => ({ stat, value: baseStats[stat] }))
    .sort((left, right) => right.value - left.value);
  const first = candidates[0];
  const second = candidates[1];
  return first && first.value > 0 && first.value > (second?.value ?? 0)
    ? first.stat
    : undefined;
}

function classifyArmorModifier(plug: AccountItemPlugSummary): ArmorModifierSnapshot[] {
  const values = cloneArmorStatValues(plug.armor_stat_modifiers);
  const entries = nonZeroEntries(values);
  if (!entries.length) return [];

  const semanticText = normalizeText(`${plug.name} ${plug.item_type ?? ""} ${plug.category_identifier ?? ""}`);
  const masterworkHint = /(masterwork|大师杰作|大師傑作|傑作)/.test(semanticText);
  const tuningHint = /(tuning|adjustment|调整|調整|调谐|調諧)/.test(semanticText);
  const armorModHint = /(armor.?mod|stat.?mod|护甲模组|護甲模組|属性模组|屬性模組)/.test(semanticText);
  const shift = resolveShift(entries);

  if (masterworkHint) {
    return [modifierSnapshot("masterwork", "exact", values, plug)];
  }
  if (tuningHint && shift) {
    return [modifierSnapshot("tuning_shift", "exact", values, plug)];
  }
  if (tuningHint && isPlus3Pattern(entries)) {
    return [modifierSnapshot("tuning_plus3", "exact", values, plug)];
  }
  if (shift) {
    return [modifierSnapshot("tuning_shift", "derived", values, plug)];
  }
  if (armorModHint && isArmorStatModPattern(entries)) {
    return [modifierSnapshot("armor_stat_mod", "derived", values, plug)];
  }
  return [modifierSnapshot("unclassified_socket", "ambiguous", values, plug)];
}

function modifierSnapshot(
  kind: ArmorModifierSnapshot["kind"],
  confidence: ArmorModifierSnapshot["confidence"],
  values: ArmorStatValues,
  plug: AccountItemPlugSummary
): ArmorModifierSnapshot {
  return {
    kind,
    confidence,
    values,
    plug_hash: plug.hash,
    plug_name: plug.name,
    category_identifier: plug.category_identifier
  };
}

function createTuningIdentity(modifier: ArmorModifierSnapshot): ArmorTuningIdentity | undefined {
  if (modifier.kind === "tuning_plus3") {
    return { mode: "plus3", source_plug_hash: modifier.plug_hash };
  }
  if (modifier.kind !== "tuning_shift") return undefined;
  const shift = resolveShift(nonZeroEntries(modifier.values));
  return shift
    ? {
        mode: "shift",
        from_stat: shift.from,
        to_stat: shift.to,
        rolled_to_stat: shift.to,
        source_plug_hash: modifier.plug_hash
      }
    : undefined;
}

function createArmorStatModIdentity(
  modifier: ArmorModifierSnapshot
): ArmorStatModIdentity | undefined {
  const entries = nonZeroEntries(modifier.values);
  const entry = entries.length === 1 ? entries[0] : undefined;
  return entry && (entry.value === 5 || entry.value === 10)
    ? { stat: entry.stat, value: entry.value, source_plug_hash: modifier.plug_hash }
    : undefined;
}

function createMasterworkIdentity(
  modifier: ArmorModifierSnapshot,
  ruleset: ArmorRuleset
): ArmorMasterworkIdentity {
  const positiveValues = nonZeroEntries(modifier.values)
    .map((entry) => entry.value)
    .filter((value) => value > 0);
  const uniqueValues = [...new Set(positiveValues)];
  const tier = uniqueValues.length === 1
    && uniqueValues[0]! >= 1
    && uniqueValues[0]! <= ruleset.masterwork.maximum_tier
    ? uniqueValues[0]
    : undefined;
  return {
    tier,
    values: modifier.values,
    source_plug_hash: modifier.plug_hash
  };
}

function buildArmorPieceQuality(input: {
  item: AccountItemSummary;
  slot?: ArmorSlot;
  hasFinalStats: boolean;
  hasBaseStats: boolean;
  socketTotal?: ArmorStatValues;
  modifiers: ArmorModifierSnapshot[];
  archetype?: ArmorArchetypeIdentity;
  archetypeAmbiguous: boolean;
  tuning?: ArmorTuningIdentity;
  tuningCount: number;
  armorModCount: number;
  masterworkCount: number;
}): ArmorPieceDataQuality {
  const warnings: string[] = [];
  const modifierTotal = addArmorStatValues(...input.modifiers.map((modifier) => modifier.values));
  const modifiersReconciled = Boolean(input.socketTotal)
    && equalArmorStatValues(modifierTotal, input.socketTotal!);
  const hasUnclassifiedModifier = input.modifiers.some((modifier) => modifier.kind === "unclassified_socket");
  const identityAmbiguous = input.archetypeAmbiguous
    || input.tuningCount > 1
    || input.armorModCount > 1
    || input.masterworkCount > 1;

  if (!input.item.instance_id) warnings.push("缺少真实实例 ID，不能进入已有库存严格求解。");
  if (!input.slot) warnings.push("无法确认护甲槽位。");
  if (!input.hasFinalStats) warnings.push("缺少最终六维属性。");
  if (!input.hasBaseStats) warnings.push("缺少基础值与 Socket 修正拆分。");
  if (input.socketTotal && !modifiersReconciled) warnings.push("Socket Plug 修正与账号属性拆分无法对账。");
  if (hasUnclassifiedModifier) warnings.push("存在无法确定身份的护甲属性 Plug。");
  if (input.archetypeAmbiguous) warnings.push("匹配到多个护甲框架定义。");
  if (input.tuningCount > 1) warnings.push("识别到多个调整来源。");
  if (input.armorModCount > 1) warnings.push("识别到多个护甲属性模组来源。");
  if (input.masterworkCount > 1) warnings.push("识别到多个大师杰作来源。");
  if (!input.archetype) warnings.push("尚未从当前 Manifest 确认护甲框架。");
  if (input.archetype && !input.archetype.tertiary_stat) warnings.push("无法唯一确认第三属性。");
  if (!input.tuning) warnings.push("尚未确认调整身份。");

  const ownedReady = Boolean(
    input.item.instance_id
    && input.slot
    && input.hasFinalStats
  );
  const strictReplayReady = ownedReady
    && input.hasBaseStats
    && modifiersReconciled
    && !hasUnclassifiedModifier
    && !identityAmbiguous;
  const acquisitionIdentityReady = Boolean(
    input.slot
    && input.archetype?.tertiary_stat
    && input.tuning
    && !identityAmbiguous
  );

  return {
    status: identityAmbiguous
      ? "ambiguous"
      : strictReplayReady && acquisitionIdentityReady
        ? "complete"
        : "partial",
    owned_ready: ownedReady,
    strict_replay_ready: strictReplayReady,
    acquisition_identity_ready: acquisitionIdentityReady,
    checks: {
      has_instance_id: Boolean(input.item.instance_id),
      has_slot: Boolean(input.slot),
      has_final_stats: input.hasFinalStats,
      has_base_stats: input.hasBaseStats,
      modifiers_reconciled: modifiersReconciled,
      has_archetype_identity: Boolean(input.archetype?.tertiary_stat),
      has_tuning_identity: Boolean(input.tuning)
    },
    warnings
  };
}

function cloneBreakdownPart(
  breakdown: NonNullable<AccountItemSummary["armor_stat_breakdown"]>,
  part: "base" | "mod" | "final"
): ArmorStatValues {
  return Object.fromEntries(armorStatKeys.map((stat) => [stat, breakdown[stat][part]])) as ArmorStatValues;
}

function nonZeroEntries(values: ArmorStatValues): Array<{ stat: ArmorStatKey; value: number }> {
  return armorStatKeys
    .map((stat) => ({ stat, value: values[stat] }))
    .filter((entry) => entry.value !== 0);
}

function resolveShift(
  entries: Array<{ stat: ArmorStatKey; value: number }>
): { from: ArmorStatKey; to: ArmorStatKey } | undefined {
  if (entries.length !== 2) return undefined;
  const from = entries.find((entry) => entry.value === -5);
  const to = entries.find((entry) => entry.value === 5);
  return from && to ? { from: from.stat, to: to.stat } : undefined;
}

function isPlus3Pattern(entries: Array<{ stat: ArmorStatKey; value: number }>): boolean {
  return entries.length === 3
    && entries.every((entry) => entry.value === 1)
    && entries.reduce((total, entry) => total + entry.value, 0) === 3;
}

function isArmorStatModPattern(entries: Array<{ stat: ArmorStatKey; value: number }>): boolean {
  return entries.length === 1 && (entries[0]!.value === 5 || entries[0]!.value === 10);
}

function armorClass(classType: number | undefined): ArmorClass {
  if (classType === 0) return "titan";
  if (classType === 1) return "hunter";
  if (classType === 2) return "warlock";
  if (classType === 3) return "any";
  return "unknown";
}

function isExoticArmor(item: AccountItemSummary): boolean {
  return /(exotic|异域|異域)/.test(normalizeText(item.tier));
}

function normalizeText(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? "";
}
