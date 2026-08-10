import { parseBuildGuideFallback } from "../assistant/guideParsing.js";
import type {
  BuildGuideRequirement,
  GuideArmorStatRequirement,
  GuideWeaponRequirement,
  RequirementConfidence
} from "../assistant/guideSchema.js";
import type { GuideSnapshot } from "./library.js";

export const guideExtractionParserVersion = "guide-extraction-v1";

export type GuideExtractionCandidateKind =
  | "class"
  | "subclass"
  | "exotic_armor"
  | "weapon"
  | "armor_stat"
  | "mod"
  | "aspect"
  | "fragment";

export type GuideExtractionCandidateDetailKind =
  | "class"
  | "subclass"
  | "exotic_armor"
  | "weapon_specific"
  | "weapon_archetype"
  | "weapon_element"
  | "weapon_role"
  | "armor_stat"
  | "armor_stat_legacy"
  | "mod"
  | "aspect"
  | "fragment";

export type GuideExtractionCandidateDetail = {
  kind: GuideExtractionCandidateDetailKind;
  perk_names?: string[];
};

export type GuideTextReference = {
  start_line: number;
  end_line: number;
  quote: string;
};

export type GuideExtractionCandidate = {
  id: string;
  kind: GuideExtractionCandidateKind;
  label: string;
  detail: GuideExtractionCandidateDetail;
  confidence: RequirementConfidence;
  source_reference?: GuideTextReference;
};

export type GuideExtraction = {
  id: string;
  guide_document_id: string;
  source_snapshot_id: string;
  source_fingerprint: string;
  parser: "local-fallback";
  parser_version: typeof guideExtractionParserVersion;
  status: "draft" | "confirmed";
  summary: string;
  requirement: BuildGuideRequirement;
  candidates: GuideExtractionCandidate[];
  warnings: string[];
  confirmations: string[];
  accepted_candidate_ids: string[];
  created_at: string;
  confirmed_at?: string;
};

export type GuideExtractionConfirmation = {
  id: string;
  guide_document_id: string;
  source_snapshot_id: string;
  source_fingerprint: string;
  parser_version: string;
  accepted_candidate_ids: string[];
  confirmed_at: string;
};

export function createGuideExtraction(input: {
  guideDocumentId: string;
  snapshot: GuideSnapshot;
  now?: Date;
}): GuideExtraction {
  const parsed = parseBuildGuideFallback(input.snapshot.body);
  const candidates = createCandidates(parsed.requirement, input.snapshot.body);
  return {
    id: `${guideExtractionParserVersion}:${input.snapshot.id}`,
    guide_document_id: input.guideDocumentId,
    source_snapshot_id: input.snapshot.id,
    source_fingerprint: input.snapshot.content_fingerprint,
    parser: "local-fallback",
    parser_version: guideExtractionParserVersion,
    status: "draft",
    summary: firstMeaningfulLine(input.snapshot.body),
    requirement: parsed.requirement,
    candidates,
    warnings: ["当前提取使用本地确定性解析；未识别内容仍保留在原文中。"],
    confirmations: [...parsed.requirement.needs_confirmation],
    accepted_candidate_ids: [],
    created_at: (input.now ?? new Date()).toISOString()
  };
}

export function confirmGuideExtraction(
  extraction: GuideExtraction,
  acceptedCandidateIds: readonly string[],
  now = new Date()
): GuideExtraction {
  const validIds = new Set(extraction.candidates.map((candidate) => candidate.id));
  return {
    ...extraction,
    status: "confirmed",
    accepted_candidate_ids: [...new Set(acceptedCandidateIds.filter((id) => validIds.has(id)))],
    confirmed_at: now.toISOString()
  };
}

export function selectConfirmedGuideRequirement(extraction: GuideExtraction): BuildGuideRequirement {
  const accepted = new Set(extraction.accepted_candidate_ids);
  const include = (kind: GuideExtractionCandidateKind, index = 0) => accepted.has(candidateId(kind, index));
  return {
    ...extraction.requirement,
    class_name: include("class") ? extraction.requirement.class_name : undefined,
    subclass: include("subclass") ? extraction.requirement.subclass : undefined,
    exotic_armor: extraction.requirement.exotic_armor.filter((_value, index) => include("exotic_armor", index)),
    weapons: extraction.requirement.weapons.filter((_value, index) => include("weapon", index)),
    armor_stats: extraction.requirement.armor_stats.filter((_value, index) => include("armor_stat", index)),
    mods: extraction.requirement.mods.filter((_value, index) => include("mod", index)),
    aspects: extraction.requirement.aspects.filter((_value, index) => include("aspect", index)),
    fragments: extraction.requirement.fragments.filter((_value, index) => include("fragment", index))
  };
}

export function toGuideExtractionConfirmation(extraction: GuideExtraction): GuideExtractionConfirmation {
  if (extraction.status !== "confirmed" || !extraction.confirmed_at) {
    throw new Error("guide extraction must be confirmed before it can be persisted");
  }
  return {
    id: extraction.id,
    guide_document_id: extraction.guide_document_id,
    source_snapshot_id: extraction.source_snapshot_id,
    source_fingerprint: extraction.source_fingerprint,
    parser_version: extraction.parser_version,
    accepted_candidate_ids: [...extraction.accepted_candidate_ids],
    confirmed_at: extraction.confirmed_at
  };
}

export function restoreGuideExtractionConfirmation(input: {
  confirmation: GuideExtractionConfirmation;
  snapshot: GuideSnapshot;
}): GuideExtraction | null {
  if (input.confirmation.parser_version !== guideExtractionParserVersion
    || input.confirmation.source_snapshot_id !== input.snapshot.id
    || input.confirmation.source_fingerprint !== input.snapshot.content_fingerprint) {
    return null;
  }
  const confirmedAt = new Date(input.confirmation.confirmed_at);
  if (!Number.isFinite(confirmedAt.getTime())) return null;
  const extraction = createGuideExtraction({
    guideDocumentId: input.confirmation.guide_document_id,
    snapshot: input.snapshot,
    now: confirmedAt
  });
  if (extraction.id !== input.confirmation.id) return null;
  return {
    ...confirmGuideExtraction(extraction, input.confirmation.accepted_candidate_ids, confirmedAt),
    created_at: extraction.created_at
  };
}

function createCandidates(requirement: BuildGuideRequirement, body: string): GuideExtractionCandidate[] {
  return [
    ...(requirement.class_name ? [candidate("class", 0, requirement.class_name.value, { kind: "class" }, requirement.class_name.confidence, body)] : []),
    ...(requirement.subclass ? [candidate("subclass", 0, requirement.subclass.value, { kind: "subclass" }, requirement.subclass.confidence, body)] : []),
    ...requirement.exotic_armor.map((value, index) => candidate("exotic_armor", index, value.name, { kind: "exotic_armor" }, value.confidence, body)),
    ...requirement.weapons.map((value, index) => candidate("weapon", index, value.name, formatWeaponDetail(value), value.confidence, body)),
    ...requirement.armor_stats.map((value, index) => candidate("armor_stat", index, formatArmorStatLabel(value), formatArmorStatDetail(value), value.confidence, body)),
    ...requirement.mods.map((value, index) => candidate("mod", index, value.name, { kind: "mod" }, value.confidence, body)),
    ...requirement.aspects.map((value, index) => candidate("aspect", index, value.name, { kind: "aspect" }, value.confidence, body)),
    ...requirement.fragments.map((value, index) => candidate("fragment", index, value.name, { kind: "fragment" }, value.confidence, body))
  ];
}

function candidate(
  kind: GuideExtractionCandidateKind,
  index: number,
  label: string,
  detail: GuideExtractionCandidateDetail,
  confidence: RequirementConfidence,
  body: string
): GuideExtractionCandidate {
  return {
    id: candidateId(kind, index),
    kind,
    label,
    detail,
    confidence,
    source_reference: locateReference(body, label)
  };
}

function candidateId(kind: GuideExtractionCandidateKind, index: number): string {
  return `${kind}:${index}`;
}

function locateReference(body: string, label: string): GuideTextReference | undefined {
  const lines = body.split(/\r?\n/);
  const normalizedLabel = label.trim().toLocaleLowerCase("zh-CN");
  const index = lines.findIndex((line) => line.toLocaleLowerCase("zh-CN").includes(normalizedLabel));
  if (index < 0) return undefined;
  return {
    start_line: index + 1,
    end_line: index + 1,
    quote: lines[index]!.trim().slice(0, 240)
  };
}

function firstMeaningfulLine(body: string): string {
  return body.split(/\r?\n/).map((line) => line.trim()).find(Boolean)?.slice(0, 240) ?? "攻略提取结果";
}

const weaponDetailKinds = {
  specific: "weapon_specific",
  archetype: "weapon_archetype",
  element: "weapon_element",
  role: "weapon_role"
} as const satisfies Record<GuideWeaponRequirement["requirement"], GuideExtractionCandidateDetailKind>;

function formatWeaponDetail(value: GuideWeaponRequirement): GuideExtractionCandidateDetail {
  return {
    kind: weaponDetailKinds[value.requirement],
    perk_names: value.perk_names?.length ? [...value.perk_names] : undefined
  };
}

function formatArmorStatLabel(value: GuideArmorStatRequirement): string {
  return `${value.source_label ?? value.stat} ${value.minimum}`;
}

function formatArmorStatDetail(value: GuideArmorStatRequirement): GuideExtractionCandidateDetail {
  return { kind: value.mapping === "legacy-alias" ? "armor_stat_legacy" : "armor_stat" };
}
