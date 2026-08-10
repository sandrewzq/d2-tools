import type { ArmorStatKey } from "../loadouts/analysis.js";
import {
  addArmorStatValues,
  armorStatKeys,
  cloneArmorStatValues,
  createEmptyArmorStatValues,
  equalArmorStatValues,
  subtractArmorStatValues,
  type ArmorModifierKind,
  type ArmorPieceSnapshot,
  type ArmorStatValues
} from "./model.js";

export type ArmorStatLedgerLayerKind = ArmorModifierKind | "unattributed";

export type ArmorStatLedgerLayer = {
  kind: ArmorStatLedgerLayerKind;
  label: string;
  values: ArmorStatValues;
  source_plug_hash?: number;
};

export type ArmorPieceStatLedger = {
  item_hash: number;
  instance_id?: string;
  base?: ArmorStatValues;
  layers: ArmorStatLedgerLayer[];
  calculated_final?: ArmorStatValues;
  observed_final: ArmorStatValues;
  final_delta?: ArmorStatValues;
  reconciled: boolean;
  warnings: string[];
};

export type ArmorLoadoutStatLedger = {
  pieces: ArmorPieceStatLedger[];
  armor_total: ArmorStatValues;
  fragment_adjustments: ArmorStatValues;
  final_total: ArmorStatValues;
  reconciled: boolean;
};

export function buildArmorPieceStatLedger(piece: ArmorPieceSnapshot): ArmorPieceStatLedger {
  const layers: ArmorStatLedgerLayer[] = piece.modifiers.map((modifier) => ({
    kind: modifier.kind,
    label: modifier.plug_name,
    values: cloneArmorStatValues(modifier.values),
    source_plug_hash: modifier.plug_hash
  }));
  const attributedSocketTotal = addArmorStatValues(...layers.map((layer) => layer.values));
  const warnings: string[] = [];

  if (piece.stats.socket_total && !equalArmorStatValues(attributedSocketTotal, piece.stats.socket_total)) {
    layers.push({
      kind: "unattributed",
      label: "未归因 Socket 修正",
      values: subtractArmorStatValues(piece.stats.socket_total, attributedSocketTotal)
    });
    warnings.push("部分 Socket 属性变化未能关联到具体 Plug。");
  }

  if (!piece.stats.base) {
    warnings.push("缺少基础属性，无法重放最终值。");
    return {
      item_hash: piece.item_hash,
      instance_id: piece.instance_id,
      layers,
      observed_final: cloneArmorStatValues(piece.stats.final),
      reconciled: false,
      warnings
    };
  }

  const calculatedFinal = addArmorStatValues(
    piece.stats.base,
    ...layers.map((layer) => layer.values)
  );
  const observedFinal = cloneArmorStatValues(piece.stats.final);
  const reconciled = equalArmorStatValues(calculatedFinal, observedFinal);
  if (!reconciled) warnings.push("基础值与修正层重放后仍无法得到账号最终属性。");

  return {
    item_hash: piece.item_hash,
    instance_id: piece.instance_id,
    base: cloneArmorStatValues(piece.stats.base),
    layers,
    calculated_final: calculatedFinal,
    observed_final: observedFinal,
    final_delta: subtractArmorStatValues(observedFinal, calculatedFinal),
    reconciled,
    warnings
  };
}

export function buildArmorLoadoutStatLedger(
  pieces: readonly ArmorPieceSnapshot[],
  fragmentAdjustments: Partial<Record<ArmorStatKey, number>> = {}
): ArmorLoadoutStatLedger {
  const pieceLedgers = pieces.map(buildArmorPieceStatLedger);
  const armorTotal = pieces.reduce(
    (total, piece) => addArmorStatValues(total, piece.stats.final),
    createEmptyArmorStatValues()
  );
  const fragments = cloneArmorStatValues(fragmentAdjustments);
  const finalTotal = addArmorStatValues(armorTotal, fragments);

  return {
    pieces: pieceLedgers,
    armor_total: armorTotal,
    fragment_adjustments: fragments,
    final_total: finalTotal,
    reconciled: pieceLedgers.every((ledger) => ledger.reconciled)
  };
}

export function armorStatLedgerTotal(values: ArmorStatValues): number {
  return armorStatKeys.reduce((total, stat) => total + values[stat], 0);
}
