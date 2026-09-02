import type { AccountItemSummary, AiAdviceSections } from "./sharedTypes";

export type VaultApi = {
  getVaultTags(): Promise<VaultTags>;
  saveVaultTag(input: SaveVaultTagInput): Promise<VaultTags>;
  saveVaultTagsBatch(inputs: SaveVaultTagInput[]): Promise<VaultTags>;
  saveVaultNote(input: SaveVaultNoteInput): Promise<VaultTags>;
  analyzeVault(input: VaultAnalysisInput): Promise<VaultAnalysisResult>;
  generateVaultAiAdvice(input: VaultAnalysisInput): Promise<VaultAiAdviceResult>;
};

export type DimWishlistMode = "pve" | "pvp" | "general";

export type DimWishlistRule = {
  item_hash: number;
  perk_hashes: number[];
  mode: DimWishlistMode;
  note: string;
  tags?: string[];
  author?: string;
  source_note?: string;
  source_title?: string;
  source_description?: string;
  source_block_id?: string;
};

export type DimWishlistSourceBlock = {
  id: string;
  title?: string;
  description?: string;
  note?: string;
  tags?: string[];
  author?: string;
};

export type DimWishlist = {
  title: string;
  description?: string;
  author?: string;
  source_blocks?: DimWishlistSourceBlock[];
  rules: DimWishlistRule[];
};

export type LocalCommunityMode = "pve" | "pvp" | "general";

export type LocalCommunityRecommendationRule = {
  item_hash: number;
  perk_hashes: number[];
  mode: LocalCommunityMode;
  note: string;
  source_label?: string;
};

export type LocalCommunityRecommendationTable = {
  title: string;
  rules: LocalCommunityRecommendationRule[];
};

export type VaultTagValue = "none" | "keep" | "review" | "junk" | "farm" | "loadout";

export type VaultTags = {
  items: Record<string, { tag?: Exclude<VaultTagValue, "none">; note?: string }>;
};

export type SaveVaultTagInput = {
  item_key: string;
  tag: VaultTagValue;
};

export type SaveVaultNoteInput = {
  item_key: string;
  note: string;
};

export type VaultAnalysisInput = {
  items: AccountItemSummary[];
  tags: VaultTags;
};

export type VaultAnalysisItem = {
  item_key: string;
  name: string;
  tier?: string;
  item_type?: string;
  power?: number;
  plugs: string[];
};

export type VaultAnalysisResult = {
  facts: string[];
  analysis: string[];
  suggestions: string[];
  items: {
    keep: VaultAnalysisItem[];
    review: VaultAnalysisItem[];
    junk: VaultAnalysisItem[];
  };
};

export type VaultScoreGrade = "keep" | "review" | "junk";

export type VaultItemScore = {
  item_key: string;
  name: string;
  score: number;
  grade: VaultScoreGrade;
  reasons: string[];
  warnings: string[];
  breakdown?: {
    base: VaultScoreBreakdownEntry;
    positive: VaultScoreBreakdownEntry[];
    negative: VaultScoreBreakdownEntry[];
    warnings: string[];
  };
};

export type VaultScoreBreakdownEntry = {
  label: string;
  points: number;
};

export type VaultScoreSummary = {
  counts: Record<VaultScoreGrade, number>;
  top_keep: VaultItemScore[];
  top_review: VaultItemScore[];
  top_junk: VaultItemScore[];
};

export type VaultAiAdviceResult = {
  local: VaultAnalysisResult;
  ai: {
    provider: string;
    model: string;
    text: string;
    sections: AiAdviceSections;
  } | null;
  skipped_reason?: string;
};
