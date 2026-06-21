import type { VaultItemMatchInfo, WeaponRecommendation } from "@d2-tools/core/community-perks";

export type { WeaponRecommendation, VaultItemMatchInfo };

declare global {
  interface Window {
    d2: {
      getHealth(): Promise<{ ok: true; service: string; version: string; timestamp: string }>;
      getConfig(): Promise<D2Config>;
      saveConfig(config: D2Config): Promise<D2Config>;
      testAiConnection(): Promise<AiConnectionTestResult>;
      loginBungie(): Promise<AuthLoginResult>;
      getAccountSummary(): Promise<AccountSummary>;
      getItemDetail(hash: number): Promise<ItemDefinitionDetail>;
      getStartupState(): Promise<StartupState>;
      getManifestStatus(): Promise<ManifestStatus>;
      initializeManifest(): Promise<ManifestStatus>;
      searchItems(query: string): Promise<ItemSearchResult[]>;
      searchPerks(query: string): Promise<PerkSearchResult[]>;
      getItemAliases(): Promise<ItemAliases>;
      saveItemAlias(input: ItemAliasEntry): Promise<ItemAliases>;
      getLibraryHistory(): Promise<LibraryHistory>;
      addRecentItem(item: Omit<LibraryHistoryItem, "viewed_at">): Promise<LibraryHistory>;
      addFavoriteItem(item: Omit<LibraryHistoryItem, "viewed_at">): Promise<LibraryHistory>;
      removeFavoriteItem(hash: number): Promise<LibraryHistory>;
      listLoadoutTemplates(): Promise<LoadoutTemplate[]>;
      createLoadoutTemplate(input: CreateLoadoutTemplateInput): Promise<LoadoutTemplate>;
      renameLoadoutTemplate(id: string, name: string): Promise<LoadoutTemplate>;
      deleteLoadoutTemplate(id: string): Promise<LoadoutTemplate[]>;
      createLoadoutTemplateTransferPlan(input: LoadoutTemplateTransferPlanInput): Promise<BatchTransferPlan>;
      getDimWishlist(): Promise<DimWishlist | null>;
      saveDimWishlist(wishlist: DimWishlist): Promise<DimWishlist>;
      clearDimWishlist(): Promise<null>;
      getVaultTags(): Promise<VaultTags>;
      saveVaultTag(input: SaveVaultTagInput): Promise<VaultTags>;
      saveVaultTagsBatch(inputs: SaveVaultTagInput[]): Promise<VaultTags>;
      saveVaultNote(input: SaveVaultNoteInput): Promise<VaultTags>;
      analyzeVault(input: VaultAnalysisInput): Promise<VaultAnalysisResult>;
      generateVaultAiAdvice(input: VaultAnalysisInput): Promise<VaultAiAdviceResult>;
      generateItemAiAdvice(input: ItemAiAdviceInput): Promise<ItemAiAdviceResult>;
      sendAiChat(input: AiChatRequest): Promise<AiChatReplyResult>;
      setItemLockState(input: ItemLockActionInput): Promise<ItemActionResult>;
      equipItem(input: ItemEquipActionInput): Promise<ItemActionResult>;
      transferItem(input: ItemTransferActionInput): Promise<ItemActionResult>;
      batchEquipItems(input: BatchEquipItemsInput): Promise<BatchItemActionResult>;
      batchTransferItems(input: BatchTransferItemsInput): Promise<BatchItemActionResult>;
      pullFromPostmaster(input: PostmasterPullActionInput): Promise<ItemActionResult>;
      equipLoadout(input: LoadoutEquipActionInput): Promise<ItemActionResult>;
      snapshotLoadout(input: LoadoutSnapshotActionInput): Promise<ItemActionResult>;
      getActionLog(): Promise<ActionLogEntry[]>;
      createItemActionPlan(input: ItemActionPlanInput): Promise<ItemActionPlan>;
      createBatchTransferPlan(input: BatchTransferPlanInput): Promise<BatchTransferPlan>;
      getDailySummary(): Promise<DailySummary>;
      getActivitySummary(input: ActivitySummaryInput): Promise<ActivityHistorySummary>;
      exportDiagnostics(): Promise<string>;
      getCommunityPerkRecommendations(item_hash: number, options?: { item_name?: string }): Promise<WeaponRecommendation | null>;
      matchCommunityVaultItems(items: Array<{ hash: number; socket_plugs?: Array<{ hash: number }> }>): Promise<Array<{ hash: number } & VaultItemMatchInfo>>;
      clearLightggCache(): Promise<void>;
    };
  }
}

export const api = window.d2;

export type D2Config = {
  bungie: {
    api_key: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
  };
  data: {
    data_dir: string;
    manifest_language: string;
  };
  ai: {
    provider: string;
    api_key: string;
    model: string;
    base_url: string;
    enable_lightgg: boolean;
  };
  features: {
    write_actions_enabled: boolean;
  };
};

export type AuthLoginResult = {
  ok: true;
  message: string;
};

export type AccountSummary = {
  account_name: string;
  destiny_membership_id: string;
  membership_type: number;
  characters: CharacterSummary[];
  vault: {
    item_count: number;
    items: AccountItemSummary[];
    sample_items: AccountItemSummary[];
  };
  materials: {
    item_count: number;
    items: AccountMaterialSummary[];
  };
};

export type CharacterSummary = {
  character_id: string;
  class_name: string;
  light?: number;
  emblem_url?: string;
  equipped_items: AccountItemSummary[];
  equipment_groups: CharacterEquipmentGroup[];
  inventory_items: AccountItemSummary[];
  inventory_groups: CharacterEquipmentGroup[];
  postmaster_items: AccountItemSummary[];
  loadout_slots: CharacterLoadoutSlotSummary[];
};

export type CharacterLoadoutSlotSummary = {
  index: number;
  name: string;
  icon_hash?: number;
  color_hash?: number;
  item_count: number;
  items: Array<{
    instance_id?: string;
    name: string;
    bucket_name?: string;
  }>;
};

export type AccountItemSummary = {
  hash: number;
  instance_id?: string;
  name: string;
  icon?: string;
  item_type?: string;
  ammo_type?: AmmoTypeKey;
  tier?: string;
  bucket_hash?: number;
  bucket_name?: string;
  group_key: EquipmentGroupKey;
  weapon_frame?: WeaponFrameSummary;
  power?: number;
  locked?: boolean;
  socket_plugs?: AccountItemPlugSummary[];
};

export type AccountMaterialSummary = {
  hash: number;
  name: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  quantity: number;
};

export type AccountItemPlugSummary = {
  hash: number;
  name: string;
  description?: string;
  icon?: string;
};

export type DimWishlistMode = "pve" | "pvp" | "general";

export type DimWishlistRule = {
  item_hash: number;
  perk_hashes: number[];
  mode: DimWishlistMode;
  note: string;
};

export type DimWishlist = {
  title: string;
  rules: DimWishlistRule[];
};

export type VaultTagValue = "none" | "keep" | "review" | "junk";

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
  scoring: VaultScoreSummary;
};

export type VaultScoreGrade = "keep" | "review" | "junk";

export type VaultItemScore = {
  item_key: string;
  name: string;
  score: number;
  grade: VaultScoreGrade;
  reasons: string[];
  warnings: string[];
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

export type ItemAiAdviceInput = {
  item: AccountItemSummary & {
    description?: string;
    note?: string;
  };
  tags: VaultTags;
};

export type ItemAiAdviceResult = {
  score: VaultItemScore;
  ai: {
    provider: string;
    model: string;
    text: string;
    sections: AiAdviceSections;
  } | null;
  skipped_reason?: string;
};

export type AiChatRequest = {
  question: string;
  context: string;
};

export type AiChatReplyResult = {
  provider: string;
  model: string;
  text: string;
};

export type AiAdviceSections = {
  facts: string[];
  analysis: string[];
  suggestions: string[];
  action_reminders: string[];
  raw: string;
};

export type ItemLockActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
  state: boolean;
};

export type ItemEquipActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
};

export type ItemTransferActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_reference_hash: number;
  item_name?: string;
  transfer_to_vault: boolean;
};

export type PostmasterPullActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_reference_hash: number;
  item_name?: string;
  stack_size?: number;
};

export type LoadoutEquipActionInput = {
  membership_type: number;
  character_id: string;
  loadout_index: number;
  loadout_name?: string;
};

export type LoadoutSnapshotActionInput = {
  membership_type: number;
  character_id: string;
  loadout_index: number;
  loadout_name?: string;
};

export type ItemActionResult = {
  ok: true;
  message: string;
};

export type BatchEquipItemsInput = {
  membership_type: number;
  character_id: string;
  items: ItemEquipActionInput[];
};

export type BatchTransferItemsInput = {
  membership_type: number;
  character_id: string;
  items: ItemTransferActionInput[];
};

export type BatchItemActionResult = {
  ok: true;
  total: number;
  success_count: number;
  failed_count: number;
  message: string;
};

export type ActionLogEntry = {
  id: string;
  created_at: string;
  action: "set-lock" | "equip" | "transfer" | "postmaster-pull" | "loadout-equip" | "loadout-snapshot";
  item_name?: string;
  item_instance_id?: string;
  character_id?: string;
  ok: boolean;
  message?: string;
};

export type DailySourceStatus = "ready" | "pending";

export type DailySummarySource = {
  status: DailySourceStatus;
  label: string;
  message: string;
  items?: DailySummaryItem[];
};

export type DailySummaryItem = {
  title: string;
  subtitle?: string;
  description?: string;
  source?: string;
};

export type DailySummary = {
  date_label: string;
  daily_reset: {
    label: string;
    next_reset_iso: string;
    time_remaining_label: string;
  };
  weekly_reset: {
    label: string;
    next_reset_iso: string;
    time_remaining_label: string;
  };
  sources: {
    rotations: DailySummarySource;
    vendors: DailySummarySource;
    lost_sector: DailySummarySource;
    weekly_report: DailySummarySource;
  };
  checklist: string[];
  recommendations: string[];
};

export type AiConnectionTestResult = {
  ok: true;
  provider: string;
  model: string;
  message: string;
};

export type ItemDefinitionDetail = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  source: ItemSourceSummary;
  perks?: ItemPerkGroup[];
};

export type EquipmentGroupKey = "weapons" | "armor" | "equipment" | "other";
export type AmmoTypeKey = "primary" | "special" | "heavy";

export type CharacterEquipmentGroup = {
  key: EquipmentGroupKey;
  label: string;
  items: AccountItemSummary[];
};

export type StartupState = {
  nextStep: "bungie-config" | "login" | "home";
  cards: {
    bungieConfig: StatusCardState;
    account: StatusCardState;
    manifest: StatusCardState;
    ai: StatusCardState;
  };
};

export type StatusCardState = {
  status: "ready" | "missing" | "skipped";
  label: string;
};

export type ManifestStatus = {
  initialized: boolean;
  version?: string;
  language?: string;
  sqlite_path?: string;
  cached_at?: string;
};

export type ItemSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  item_type?: string;
  tier?: string;
  ammo_type?: AmmoTypeKey;
  bucket_hash?: number;
  bucket_name?: string;
  group_key?: EquipmentGroupKey;
  weapon_frame?: WeaponFrameSummary;
  source: ItemSourceSummary;
  perks?: ItemPerkGroup[];
};

export type WeaponFrameSummary = {
  key: string;
  name: string;
};

export type ItemSourceSummary = {
  status: "ready" | "missing";
  label: string;
  description: string;
};

export type PerkSearchResult = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  related_items?: Array<{ hash: number; name: string; group_key?: EquipmentGroupKey }>;
};

export type ItemAliasEntry = {
  alias: string;
  target: string;
  kind: "item" | "perk";
};

export type ItemAliases = {
  entries: ItemAliasEntry[];
};

export type LibraryHistoryItem = {
  hash: number;
  name: string;
  icon?: string;
  viewed_at?: string;
};

export type LibraryHistory = {
  recent: LibraryHistoryItem[];
  favorites: LibraryHistoryItem[];
};

export type LoadoutTemplate = {
  id: string;
  name: string;
  character_id: string;
  class_name: string;
  created_at: string;
  updated_at?: string;
  items: Array<{
    hash: number;
    instance_id?: string;
    name: string;
    bucket_name?: string;
    weapon_frame_name?: string;
    perk_names?: string[];
  }>;
};

export type CreateLoadoutTemplateInput = {
  name: string;
  character_id: string;
  class_name: string;
  equipped_items: AccountItemSummary[];
};

export type ItemActionPlanInput = {
  action: "set-lock" | "equip" | "transfer";
  item_name: string;
  item_instance_id?: string;
  item_reference_hash?: number;
  character_id?: string;
  state?: boolean;
  transfer_to_vault?: boolean;
};

export type ItemActionPlan = {
  action: ItemActionPlanInput["action"];
  title: string;
  description: string;
  requires_confirmation: true;
  executable: false;
  input: ItemActionPlanInput;
};

export type BatchTransferPlanInput = {
  character_id: string;
  transfer_to_vault: boolean;
  items: AccountItemSummary[];
};

export type LoadoutTemplateTransferPlanInput = {
  template: LoadoutTemplate;
  target_character_id: string;
  available_items: AccountItemSummary[];
  equipped_items: AccountItemSummary[];
};

export type BatchTransferPlan = {
  summary: string;
  steps: ItemActionPlan[];
};

export type ActivitySummaryInput = {
  membership_type: number;
  membership_id: string;
  character_ids: string[];
};

export type ActivityHistorySummary = {
  recent: {
    total: number;
    latest_period?: string;
    pve: { total: number; completed: number };
    pvp: { total: number; completed: number };
    other: { total: number; completed: number };
  };
  raids: {
    entries: Array<{
      activity_name: string;
      activity_type: "raid" | "dungeon";
      completions: number;
      attempts: number;
      last_completed_at?: string;
    }>;
  };
  recent_items: Array<{
    activity_name: string;
    mode: "pve" | "pvp" | "other";
    completed: boolean;
    period: string;
  }>;
};

export type ItemPerkGroup = {
  socket_index: number;
  plugs: ItemPlugSummary[];
};

export type ItemPlugSummary = {
  hash: number;
  name: string;
  description: string;
  icon?: string;
};
