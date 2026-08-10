import type { ArmorStatKey } from "../loadouts/analysis.js";
import type { LoadoutPlanArmorConstraints } from "../loadouts/plans.js";

export type RequirementConfidence = "high" | "medium" | "low";

export type ConfidentValue<T> = {
  value: T;
  confidence: RequirementConfidence;
};

export type GuideWeaponRequirementKind = "specific" | "archetype" | "element" | "role";

export type GuideWeaponRequirement = {
  name: string;
  confidence: RequirementConfidence;
  requirement: GuideWeaponRequirementKind;
  perk_names?: string[];
};

export type GuideArmorStatRequirement = {
  stat: ArmorStatKey | "mobility" | "resilience" | "recovery" | "discipline" | "intellect" | "strength";
  source_label?: string;
  mapping?: "direct" | "legacy-alias";
  minimum: number;
  confidence: RequirementConfidence;
};

export type GuideArmorConstraintDraft = {
  status: "ready" | "needs_confirmation";
  constraints: LoadoutPlanArmorConstraints;
  warnings: string[];
  confirmations: string[];
};

export type BuildGuideRequirement = {
  raw_text: string;
  class_name?: ConfidentValue<string>;
  subclass?: ConfidentValue<string>;
  exotic_armor: Array<{ name: string; confidence: RequirementConfidence }>;
  weapons: GuideWeaponRequirement[];
  armor_stats: GuideArmorStatRequirement[];
  mods: Array<{ name: string; confidence: RequirementConfidence }>;
  aspects: Array<{ name: string; confidence: RequirementConfidence }>;
  fragments: Array<{ name: string; confidence: RequirementConfidence }>;
  notes: string[];
  needs_confirmation: string[];
};

export type BuildGuideParseResult = {
  requirement: BuildGuideRequirement;
  parser: "ai-json" | "local-fallback";
  warnings: string[];
};

export type GuideMatchStatus = "matched" | "partial" | "missing" | "needs_confirmation";

export type GuideMatchedItem = {
  hash: number;
  instance_id?: string;
  name: string;
  bucket_name?: string;
  item_type?: string;
  group_key?: "weapons" | "armor" | "equipment" | "other";
  status: GuideMatchStatus;
  reason: string;
};

export type BuildGuideMatchResult = {
  requirement: BuildGuideRequirement;
  matched_items: GuideMatchedItem[];
  missing_requirements: string[];
  alternative_items: GuideMatchedItem[];
  needs_confirmation: string[];
  summary: string;
};

export type BuildGuideLoadoutDraft = {
  name: string;
  character_id: string;
  class_name?: string;
  raw_text?: string;
  items: GuideMatchedItem[];
  missing_requirements: string[];
  notes: string[];
  armor_constraint_draft?: GuideArmorConstraintDraft;
};

export type BuildGuideTaskState = {
  raw_text: string;
  parse_result?: BuildGuideParseResult;
  match_result?: BuildGuideMatchResult;
  draft?: BuildGuideLoadoutDraft;
  next_actions: Array<"parse" | "match" | "create_draft" | "save_draft" | "review_gaps">;
};
