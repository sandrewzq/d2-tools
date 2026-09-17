import type {
  RecommendationCardSummary,
  VaultCommunityMatchOptions,
  VaultItemInstanceMatchInfo,
  VaultCommunityMatchResult,
  VaultItemMatchInfo,
  VaultItemMatchInput,
  WeaponRecommendation
} from "@d2-tools/core/community-perks";
import type { DimWishlistImportPreview, DimWishlistLinkReadResult } from "@d2-tools/core/analysis/wishlistImport";

export type {
  AccountItemDetail,
  AccountItemPlugSummary,
  AccountItemSnapshot,
  AccountItemSummary,
  AccountSnapshot,
  AmmoTypeKey,
  ArmorEnergySummary,
  ArmorStatBreakdownSummary,
  ArmorStatSummary,
  EquipmentGroupKey,
  WeaponFrameSummary,
  WeaponStatKey,
  WeaponStatSummary
} from "@d2-tools/core/account/summary";
export type { ArmorStatKey } from "@d2-tools/core/loadouts/analysis";
export type { ItemPerkGroup, ItemPlugSummary } from "@d2-tools/core/items/perks";
export type { ItemDefinitionStat } from "@d2-tools/core/items/search";
export type { ItemDefinitionVersionSummary, ItemReleaseSummary } from "@d2-tools/core/items/release";
export type { ArmorSetCatalogEntry, ArmorSetCatalogItem, EquipableItemSetSummary } from "@d2-tools/core/items/equipableItemSet";
export type { WeaponBreakerTypeSummary } from "@d2-tools/core/items/breakerTypes";
export type { DamageTypeSummary } from "@d2-tools/core/items/damageTypes";
export type { LiveItemAvailability } from "@d2-tools/core/items/liveAvailability";
export type { ItemSourceSummary } from "@d2-tools/core/items/source";
export type {
  BuildGuideLoadoutDraft,
  BuildGuideMatchResult,
  BuildGuideParseResult,
  BuildGuideRequirement
} from "@d2-tools/core/assistant/guideSchema";
export type { RecommendationCardSummary, VaultCommunityMatchOptions, VaultCommunityMatchResult, VaultItemInstanceMatchInfo, VaultItemMatchInfo, VaultItemMatchInput, WeaponRecommendation };
export type {
  DimWishlistImportPreview,
  DimWishlistLinkReadResult
};

export type {
  RecommendationImportTarget,
  RecommendationDocumentSummary
} from "@d2-tools/services/community/recommendationDocumentStore";

export type WeaponRecommendationKnowledgeStatus = {
  dataset_revision: string;
  imported_at: string;
  recommendation_count: number;
  weapon_count: number;
  source_count: number;
};

export type WeaponKnowledgeImportPreview = {
  file_name: string;
  recommendation_count: number;
  importable_recommendation_count: number;
  weapon_count: number;
  source_count: number;
  source_labels: string[];
  fingerprint: string;
  blocking_issue_count: number;
  skipped_row_count: number;
  blocking_issues: Array<{
    row_number: number;
    weapon_name: string;
    source_label: string;
    field: "推荐来源" | "规则名称" | "武器ID" | "武器" | "枪管" | "弹匣" | "大师" | "Perk 1" | "Perk 2" | "起源特性";
    value: string;
    message: string;
  }>;
};

export type WeaponKnowledgeImportResult = WeaponRecommendationKnowledgeStatus & {
  file_name: string;
  imported_row_count: number;
  skipped_row_count: number;
};

/** 导入身份 = 用户给的名字 + 新建 / 覆盖；界面必须两者都收。 */
export type WeaponKnowledgeImportTarget = {
  name: string;
  mode: "create" | "overwrite";
};

export type WeaponKnowledgeImportSelection = WeaponKnowledgeImportPreview & {
  token?: string;
};

export type RecommendationManagedSource = {
  source_key: string;
  label: string;
  /** 来源格式的面向用户说法（推荐表格 / 愿望单文本），见服务层同名类型。 */
  format_label: string;
  state: "active" | "disabled" | "removed";
  configured: boolean;
  rule_count: number;
  weapon_count: number;
  revision: string;
  imported_at: string;
  /** 这份来源在整个账号里点到多少件（仓库 + 角色身上 + 角色背包 + 邮政官），见服务层同名字段。 */
  affected_instance_count?: number;
  /** 同一件事，只算仓库里那部分——也就是来源清单上那个数字，见服务层同名字段。 */
  vault_instance_count?: number;
  /** 这一行在事实层登记过的全部键（分组键 + 下辖实例键），见服务层同名类型。 */
  fact_keys: string[];
};

export type RecommendationManagedRule = {
  source_key: string;
  source_label: string;
  rule_stable_id: string;
  weapon_hashes: number[];
  weapon_name: string;
  purposes: Array<"pve" | "pvp" | "general">;
  requirements: Array<{ slot: string; names: string[] }>;
  note: string;
  state: "active" | "removed";
  review_required: boolean;
  source_revision: string;
  reason: string;
  affected_instance_count?: number;
};

export type RecommendationManagementSnapshot = {
  revision: string;
  sources: RecommendationManagedSource[];
  removed_rules: RecommendationManagedRule[];
  /** 「清空已导入的推荐规则」这个动作的对象摘要，由服务层按存储派生。 */
  clear_rule_imports: { configured: boolean; source_count: number; rule_count: number };
  affected_weapon_hashes?: number[];
  /** 本次操作是否改动了一个由导入文档托管的来源，见服务层同名类型。 */
  stored_source_changed?: boolean;
};

export type FileExportResult = {
  canceled: boolean;
  file_path?: string;
  message: string;
};

export type AiAdviceSections = {
  facts: string[];
  analysis: string[];
  suggestions: string[];
  action_reminders: string[];
  raw: string;
};
