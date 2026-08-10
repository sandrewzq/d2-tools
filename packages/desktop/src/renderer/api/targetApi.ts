import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type {
  EquipmentTargetConversionResult,
  EquipmentTargetStore,
  GuideEquipmentTargetConversionRequest
} from "@d2-tools/core/targets/equipmentTargets";

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
export type {
  ArmorAcquisitionTarget,
  EquipmentTarget,
  EquipmentTargetConversionIssue,
  EquipmentTargetConversionResult,
  EquipmentTargetMatch,
  EquipmentTargetMatchResult,
  EquipmentTargetSource,
  EquipmentTargetSourceKind,
  EquipmentTargetStore,
  GuideEquipmentTargetConversionRequest,
  WeaponTarget,
  WeaponTargetCandidate,
  WeaponTargetPerkRequirement,
  WeaponTargetResolution
} from "@d2-tools/core/targets/equipmentTargets";

export type TargetApi = {
  getLocalTargetRules(): Promise<LocalTargetRules>;
  saveLocalTargetRules(rules: LocalTargetRules): Promise<LocalTargetRules>;
  clearLocalTargetRules(): Promise<LocalTargetRules>;
  getEquipmentTargetStore(): Promise<EquipmentTargetStore>;
  saveEquipmentTargetStore(store: EquipmentTargetStore): Promise<EquipmentTargetStore>;
  clearEquipmentTargetStore(): Promise<EquipmentTargetStore>;
  convertConfirmedGuideEquipmentTargets(
    input: GuideEquipmentTargetConversionRequest
  ): Promise<EquipmentTargetConversionResult>;
};
