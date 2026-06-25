import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";

export type {
  LocalArmorTargetCondition,
  LocalArmorTargetRule,
  LocalTargetActionPolicy,
  LocalTargetMatchResult,
  LocalTargetRules,
  LocalTargetSummary,
  LocalWeaponTargetCondition,
  LocalWeaponTargetRule
} from "@d2-tools/core/analysis/targets";

export type TargetApi = {
  getLocalTargetRules(): Promise<LocalTargetRules>;
  saveLocalTargetRules(rules: LocalTargetRules): Promise<LocalTargetRules>;
  clearLocalTargetRules(): Promise<LocalTargetRules>;
};
