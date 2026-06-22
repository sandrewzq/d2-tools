import type { EquipmentGroupKey } from "../account/summary.js";

export type VaultScoreGrade = "keep" | "review" | "junk";

export type ScorableVaultItem = {
  hash: number;
  instance_id?: string;
  name: string;
  tier?: string;
  group_key: EquipmentGroupKey;
  locked?: boolean;
  socket_plugs?: unknown[];
};

export type VaultItemScore = {
  item_key: string;
  name: string;
  score: number;
  grade: VaultScoreGrade;
  reasons: string[];
  warnings: string[];
  breakdown: VaultScoreBreakdown;
};

export type VaultScoreBreakdownEntry = {
  label: string;
  points: number;
};

export type VaultScoreBreakdown = {
  base: VaultScoreBreakdownEntry;
  positive: VaultScoreBreakdownEntry[];
  negative: VaultScoreBreakdownEntry[];
  warnings: string[];
};

export type VaultScoreSummary = {
  counts: Record<VaultScoreGrade, number>;
  top_keep: VaultItemScore[];
  top_review: VaultItemScore[];
  top_junk: VaultItemScore[];
};
