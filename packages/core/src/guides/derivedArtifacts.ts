import type { AccountItemSummary } from "../account/summary.js";
import type {
  BuildGuideRequirement,
  GuideArmorConstraintDraft,
  GuideMatchedItem
} from "../assistant/guideSchema.js";
import { matchBuildGuideToAccount } from "../assistant/guideMatching.js";
import { createGuideArmorConstraintDraftFromRequirement } from "../assistant/loadoutDraft.js";
import type { EvidenceRef } from "../evidence/reference.js";
import type { GuideExtraction } from "./extraction.js";
import { selectConfirmedGuideRequirement } from "./extraction.js";
import type { GuideDocument } from "./library.js";

export type GuideArmorConstraintDraftArtifact = GuideArmorConstraintDraft & {
  version: 1;
  artifact_id: string;
  kind: "armor_constraint_draft";
  guide_document_id: string;
  guide_title: string;
  source_snapshot_id: string;
  source_fingerprint: string;
  extraction_id: string;
  parser_version: string;
  accepted_candidate_ids: string[];
  class_name?: string;
  summary: string;
  created_at: string;
  evidence_refs: EvidenceRef[];
};

export type GuideLoadoutItemCandidate = {
  candidate_id: string;
  relation: "matched" | "alternative";
  selected_by_default: boolean;
  item: GuideMatchedItem;
};

export type GuideLoadoutCandidatesArtifact = {
  version: 1;
  artifact_id: string;
  kind: "loadout_candidates";
  status: "draft";
  guide_document_id: string;
  guide_title: string;
  source_snapshot_id: string;
  source_fingerprint: string;
  extraction_id: string;
  parser_version: string;
  accepted_candidate_ids: string[];
  account_scope: {
    destiny_membership_id: string;
    membership_type: number;
    character_id: string;
    character_class: string;
    fingerprint: string;
  };
  summary: string;
  candidates: GuideLoadoutItemCandidate[];
  missing_requirements: string[];
  confirmations: string[];
  armor_constraint_draft?: GuideArmorConstraintDraft;
  created_at: string;
  evidence_refs: EvidenceRef[];
};

export function createGuideArmorConstraintDraftArtifact(input: {
  document: GuideDocument;
  extraction: GuideExtraction;
}): GuideArmorConstraintDraftArtifact | null {
  const { document, extraction } = input;
  if (extraction.status !== "confirmed" || !extraction.confirmed_at) return null;
  if (extraction.guide_document_id !== document.id
    || extraction.source_snapshot_id !== document.current_snapshot_id) {
    return null;
  }

  const requirement = selectConfirmedGuideRequirement(extraction);
  const draft = createGuideArmorConstraintDraftFromRequirement({ requirement });
  if (!draft) return null;

  const artifactId = `guide-armor-constraint:${extraction.id}`;
  const createdAt = extraction.confirmed_at;
  return {
    ...draft,
    version: 1,
    artifact_id: artifactId,
    kind: "armor_constraint_draft",
    guide_document_id: document.id,
    guide_title: document.title,
    source_snapshot_id: extraction.source_snapshot_id,
    source_fingerprint: extraction.source_fingerprint,
    extraction_id: extraction.id,
    parser_version: extraction.parser_version,
    accepted_candidate_ids: [...extraction.accepted_candidate_ids],
    ...(requirement.class_name?.value ? { class_name: requirement.class_name.value } : {}),
    summary: extraction.summary,
    created_at: createdAt,
    evidence_refs: [{
      evidence_id: `${artifactId}:guide`,
      kind: "local_data",
      label: `${document.title} / 已确认 Armor 约束`,
      observed_at: createdAt,
      entity: { type: "guide", id: document.id },
      result_id: artifactId,
      open_target: {
        kind: "guide",
        id: document.id,
        secondary_id: extraction.source_snapshot_id
      }
    }]
  };
}

export function createGuideLoadoutCandidatesArtifact(input: {
  document: GuideDocument;
  extraction: GuideExtraction;
  account: {
    destiny_membership_id: string;
    membership_type: number;
  };
  character: {
    character_id: string;
    class_name: string;
  };
  items: readonly AccountItemSummary[];
  now?: Date;
}): GuideLoadoutCandidatesArtifact | null {
  const { document, extraction } = input;
  if (extraction.status !== "confirmed" || !extraction.confirmed_at) return null;
  if (extraction.guide_document_id !== document.id
    || extraction.source_snapshot_id !== document.current_snapshot_id) {
    return null;
  }

  const requirement = selectConfirmedGuideRequirement(extraction);
  const match = matchBuildGuideToAccount({
    requirement,
    items: [...input.items],
    targetCharacterId: input.character.character_id
  });
  const confirmations = uniqueStrings([
    ...match.needs_confirmation,
    ...confirmedRequirementReviewNotes(requirement)
  ]);
  const accountFingerprint = fingerprint([
    input.account.destiny_membership_id,
    String(input.account.membership_type),
    input.character.character_id,
    ...match.matched_items.map((item) => itemIdentity("matched", item)).sort(),
    ...match.alternative_items.map((item) => itemIdentity("alternative", item)).sort(),
    ...[...match.missing_requirements].sort(),
    ...[...confirmations].sort()
  ]);
  const artifactId = `guide-loadout-candidates:${extraction.id}:${input.character.character_id}:${accountFingerprint}`;
  const candidates = [
    ...match.matched_items.map((item) => toLoadoutCandidate(artifactId, "matched", item)),
    ...match.alternative_items.map((item) => toLoadoutCandidate(artifactId, "alternative", item))
  ];
  const armorConstraintDraft = createGuideArmorConstraintDraftFromRequirement({
    requirement,
    matchedItems: match.matched_items,
    alternativeItems: match.alternative_items
  });
  const createdAt = (input.now ?? new Date()).toISOString();
  return {
    version: 1,
    artifact_id: artifactId,
    kind: "loadout_candidates",
    status: "draft",
    guide_document_id: document.id,
    guide_title: document.title,
    source_snapshot_id: extraction.source_snapshot_id,
    source_fingerprint: extraction.source_fingerprint,
    extraction_id: extraction.id,
    parser_version: extraction.parser_version,
    accepted_candidate_ids: [...extraction.accepted_candidate_ids],
    account_scope: {
      destiny_membership_id: input.account.destiny_membership_id,
      membership_type: input.account.membership_type,
      character_id: input.character.character_id,
      character_class: input.character.class_name,
      fingerprint: accountFingerprint
    },
    summary: match.summary,
    candidates,
    missing_requirements: [...match.missing_requirements],
    confirmations,
    ...(armorConstraintDraft ? { armor_constraint_draft: armorConstraintDraft } : {}),
    created_at: createdAt,
    evidence_refs: [
      {
        evidence_id: `${artifactId}:guide`,
        kind: "local_data",
        label: `${document.title} / 已确认攻略要求`,
        observed_at: extraction.confirmed_at,
        entity: { type: "guide", id: document.id },
        result_id: artifactId,
        open_target: { kind: "guide", id: document.id, secondary_id: extraction.source_snapshot_id }
      },
      {
        evidence_id: `${artifactId}:account`,
        kind: "bungie_profile",
        label: `${input.character.class_name} / 攻略账号匹配`,
        observed_at: createdAt,
        entity: { type: "character", id: input.character.character_id },
        result_id: artifactId,
        open_target: { kind: "account", id: input.character.character_id }
      }
    ]
  };
}

function toLoadoutCandidate(
  artifactId: string,
  relation: GuideLoadoutItemCandidate["relation"],
  item: GuideMatchedItem
): GuideLoadoutItemCandidate {
  const identity = item.instance_id ? `instance:${item.instance_id}` : `definition:${item.hash}`;
  return {
    candidate_id: `${artifactId}:${relation}:${identity}`,
    relation,
    selected_by_default: relation === "matched",
    item: { ...item }
  };
}

function itemIdentity(relation: GuideLoadoutItemCandidate["relation"], item: GuideMatchedItem): string {
  return [
    relation,
    String(item.hash),
    item.instance_id ?? "",
    item.status,
    item.reason
  ].join(":");
}

function fingerprint(values: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const value of values.join("\u0000")) {
    hash ^= value.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function confirmedRequirementReviewNotes(requirement: BuildGuideRequirement): string[] {
  return [
    ...(requirement.subclass ? [`子职业要求“${requirement.subclass.value}”尚未映射到具体技能 Hash`] : []),
    ...requirement.mods.map((item) => `模组要求“${item.name}”需要在配装页确认具体插槽`),
    ...requirement.aspects.map((item) => `星相要求“${item.name}”尚未映射到具体技能 Hash`),
    ...requirement.fragments.map((item) => `碎片要求“${item.name}”尚未映射到具体技能 Hash`),
    ...requirement.notes.map((item) => `攻略说明：${item}`)
  ];
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
