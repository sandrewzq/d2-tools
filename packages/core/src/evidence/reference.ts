export type EvidenceRefKind =
  | "bungie_profile"
  | "bungie_vendor"
  | "bungie_milestone"
  | "manifest_definition"
  | "local_data"
  | "dim_import"
  | "domain_result";

export type EvidenceOpenTargetKind =
  | "account"
  | "item"
  | "perk"
  | "vendor"
  | "loadout"
  | "guide"
  | "result";

export type EvidenceOpenTarget = {
  kind: EvidenceOpenTargetKind;
  id: string;
  secondary_id?: string;
};

export type EvidenceEntityRef = {
  type: string;
  id: string;
};

export type EvidenceRef = {
  evidence_id: string;
  kind: EvidenceRefKind;
  label: string;
  observed_at: string;
  expires_at?: string;
  entity?: EvidenceEntityRef;
  manifest_version?: string;
  result_id?: string;
  open_target?: EvidenceOpenTarget;
};

