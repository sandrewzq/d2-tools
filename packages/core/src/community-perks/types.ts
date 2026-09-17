import type { DefinitionComponentData } from "../manifest/definitions.js";
import type {
  AccountWeaponRollPlugSummary,
  AccountWeaponRollSummary
} from "../account/summary.js";

export type RecommendationRequirement = {
  slot?: RecommendationRequirementSlot;
  operator: "any" | "all";
  candidates: PerkRef[];
};

export type RecommendationRule = {
  sourceId: string;
  ruleId: string;
  itemHashes: number[];
  mode: "pve" | "pvp" | "general";
  kind: "roll" | "weapon_only";
  requirements: RecommendationRequirement[];
  note?: string;
};

export type RecommendationRequirementSlot =
  | "barrel"
  | "magazine"
  | "masterwork"
  | "perk1"
  | "perk2"
  | "origin";

export type PerkRef = {
  hash: number;
  name: string;
  englishName?: string;
  description?: string;
  icon?: string;
};

export type PerkCombo = {
  rule_stable_id?: string;
  source_id?: string;
  source_label?: string;
  kind?: "roll" | "weapon_only";
  perks: PerkRef[];
  mode: "pve" | "pvp" | "general";
  note?: string;
};

export type DimWishlistDiagnosticSlot = RecommendationRequirementSlot | "special" | "unknown";

export type DimWishlistPerkDiagnostic = {
  original_hash: number;
  resolved_hash?: number;
  resolved_hashes?: number[];
  name: string;
  /**
   * 这个 perk 落在这把枪的哪一栏。**只有一个结果**：两个特长栏都可能出时按作者书写的
   * 栏位顺序消歧（见 `dimWishlistDiagnostics`），所以没有「归不了栏」这一档。
   */
  slot: DimWishlistDiagnosticSlot;
  status: "exact" | "unknown_slot" | "special_socket";
};

export type WeaponRecommendation = {
  item_hash: number;
  item_name: string;
  combos: PerkCombo[];
  matched_modes: Array<"pve" | "pvp" | "general">;
  individual_perks?: PerkRef[];
  weapon_level_recommendations?: Array<{
    mode: "pve" | "pvp" | "general";
    source_label: string;
    note?: string;
  }>;
  source_records?: RecommendationSourceRecord[];
  sample_size?: number;
  source_label?: string;
  source_warnings?: string[];
  disclaimer?: string;
};

export type RecommendationSourceRequirement = {
  slot: RecommendationRequirementSlot;
  label: string;
  /**
   * 来源提出的全部候选名。**这就是「来源要求了什么」的唯一通道**：
   * 解析不出官方 Hash 的名字也留在这里，消费方按武器定义自行判断能否核对
   * （见 `WeaponDetailContent` 的候选渲染）。曾有一个平行的
   * `unresolved_candidate_names` 字段，它在两个产出方都只是这里的子集，已删除。
   */
  candidate_names: string[];
  candidates: PerkRef[];
};

export type RecommendationSourceRecord = {
  rule_stable_id: string;
  source_id: string;
  /**
   * 同一份来源（同一文档 / 同一次导入）的全部实例共用的分组键；不分组时等于 source_id。
   * 消费层靠它合并同一份来源的多个实例，因此不需要解析 source_id 的命名约定。
   */
  source_group_id: string;
  source_label: string;
  source_url?: string;
  purposes: Array<"pve" | "pvp" | "general">;
  rating?: string;
  ranking?: string;
  note?: string;
  page_updated_at?: string;
  version?: string;
  source_location?: string;
  requirements: RecommendationSourceRequirement[];
};

export type RecommendationSourceSlotMatch = {
  slot: RecommendationRequirementSlot;
  label: string;
  state: "match" | "different" | "source_not_specified" | "uncheckable";
  source_candidate_names: string[];
  source_candidates: PerkRef[];
  instance_owned: AccountWeaponRollPlugSummary[];
  current_enabled: AccountWeaponRollPlugSummary[];
};

export type RecommendationSourceMatch = {
  rule_stable_id: string;
  source_id: string;
  /** 同来源记录，见 `RecommendationSourceRecord.source_group_id`。 */
  source_group_id: string;
  source_label: string;
  source_url?: string;
  state:
    | "full"
    | "core"
    | "close"
    | "key_missing"
    | "not_matched"
    | "weapon_only"
    | "uncheckable";
  matched_requirement_count: number;
  requirement_count: number;
  checkable_requirement_count: number;
  uncheckable_requirement_count: number;
  purposes: Array<"pve" | "pvp" | "general">;
  rating?: string;
  ranking?: string;
  note?: string;
  page_updated_at?: string;
  version?: string;
  source_location?: string;
  slots: RecommendationSourceSlotMatch[];
};

/**
 * 读取来源事实所需的全部输入。
 *
 * 这里**没有**武器身份关系：身份在导入期已经算成 hash 写进来源事实，读取期只做成员判断
 * （T56 分层图 ②→⑤）。读取期重新按名称 / 发布组 / 变体推导「这条规则适用于谁」是越权，
 * 正是要拆掉的分叉。
 */
export type SourceOptions = {
  manifest_version?: string;
  itemDefinitions?: DefinitionComponentData;
  plugSetDefinitions?: DefinitionComponentData;
  englishItemDefinitions?: DefinitionComponentData;
  englishPlugSetDefinitions?: DefinitionComponentData;
  item_name?: string;
};

export type WeaponVariantKind =
  | "standard"
  | "adept"
  | "timelost"
  | "harrowed"
  | "holofoil"
  | "named_variant";

export type WeaponIdentityRelation = {
  item_hash: number;
  family_key: string;
  release_group_key: string;
  variant_kind: WeaponVariantKind;
  variant_tags: WeaponVariantKind[];
  canonical_item_hash: number;
  release_label?: string;
  relation_evidence: "release_trait" | "isolated";
};

export interface CommunityPerkSource {
  name: string;
  isAvailable(): boolean;
  getRecommendations(
    item_hash: number,
    options: SourceOptions
  ): Promise<WeaponRecommendation | null>;
}

export type VaultItemMatchInfo = {
  matched: number;
  available: number;
  perk_pool_count?: number;
  combo_count?: number;
  modes: Array<"pve" | "pvp" | "general">;
  sample_perks?: PerkRef[];
  source_label?: string;
};

export type VaultItemMatchInput = {
  hash: number;
  instance_id?: string;
  item_name?: string;
  socket_plugs?: Array<{ hash: number; socket_index?: number; name?: string }>;
  weapon_roll?: AccountWeaponRollSummary;
};

export type VaultItemInstanceMatchInfo = VaultItemMatchInfo & {
  hash: number;
  instance_id?: string;
  canonical_weapon_name: string;
  coverage: "covered" | "uncovered";
  match_status: "full_match" | "partial_match" | "no_match" | "indeterminate";
  recommendation_state: "priority" | "compare" | "uncovered";
  partial: number;
  source_matches?: RecommendationSourceMatch[];
};

export type RecommendationCardSourceSummary = {
  source_id: string;
  /** 同来源记录，见 `RecommendationSourceRecord.source_group_id`。 */
  source_group_id: string;
  source_label: string;
  state: RecommendationSourceMatch["state"];
  purposes: Array<"pve" | "pvp" | "general">;
  matched_requirement_count: number;
  requirement_count: number;
  uncheckable_requirement_count: number;
  matched_perk_count: number;
  perk_requirement_count: number;
  uncheckable_perk_count: number;
};

/**
 * 仓库卡片、筛选与整理使用的轻量推荐事实。
 * 不包含逐栏候选、图标、说明、链接或 DIM 规则明细。
 */
export type RecommendationCardSummary = Pick<
  VaultItemInstanceMatchInfo,
  | "hash"
  | "instance_id"
  | "canonical_weapon_name"
  | "coverage"
  | "match_status"
  | "recommendation_state"
  | "matched"
  | "partial"
  | "available"
  | "modes"
> & {
  sources: RecommendationCardSourceSummary[];
};

export type VaultRecommendationDependencyIssueCode =
  | "manifest_unavailable"
  | "manifest_outdated"
  | "recommendation_unavailable";

export type VaultRecommendationDependencyIssue = {
  code: VaultRecommendationDependencyIssueCode;
  severity: "warning" | "blocking";
  message: string;
};

export type VaultCommunityMatchResult = {
  matches: VaultItemInstanceMatchInfo[];
  card_summaries?: RecommendationCardSummary[];
  changed_instance_ids?: string[];
  issues: VaultRecommendationDependencyIssue[];
  manifest_version?: string;
  recommendation_revision?: string;
};

export type VaultCommunityMatchOptions = {
  include_evidence?: boolean;
};
