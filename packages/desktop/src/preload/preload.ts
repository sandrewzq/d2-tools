import { contextBridge, ipcRenderer } from "electron";
import type { AccountItemSummary, AccountSummary } from "@d2-tools/core/account/summary";
import type { ActionLogEntry } from "@d2-tools/core/actions/log";
import type { BatchTransferPlan, ItemActionPlan, ItemActionPlanInput } from "@d2-tools/core/actions/plan";
import type { ActivityHistorySummary } from "@d2-tools/core/activities/history";
import type {
  BuildGuideMatchResult,
  BuildGuideRequirement
} from "@d2-tools/core/assistant/guideSchema";
import type {
  AiChatReplyResult,
  AiConnectionTestResult,
  AiModelListResult,
  ItemAiAdviceInput,
  ItemAiAdviceResult,
  VaultAiAdviceResult
} from "@d2-tools/core/ai/chat";
import type { AiSettings } from "@d2-tools/core/ai/settings";
import type { VaultAnalysisResult } from "@d2-tools/core/analysis/vault";
import type { LocalTargetRules } from "@d2-tools/core/analysis/targets";
import type { DimWishlist } from "@d2-tools/core/analysis/wishlistImport";
import type { LocalCommunityRecommendationTable, VaultItemMatchInfo, WeaponRecommendation } from "@d2-tools/core/community-perks";
import type { D2Config } from "@d2-tools/core/config/schema";
import type { DailySummary } from "@d2-tools/core/daily/summary";
import type { HealthStatus } from "@d2-tools/core/health";
import type { ItemAliases, ItemAliasEntry } from "@d2-tools/core/items/aliases";
import type { ItemDefinitionDetail } from "@d2-tools/core/items/detail";
import type { LiveItemAvailability } from "@d2-tools/core/items/liveAvailability";
import type { PerkSearchResult } from "@d2-tools/core/items/perkSearch";
import type { ItemSearchResult } from "@d2-tools/core/items/search";
import type { LibraryHistory, LibraryHistoryItem } from "@d2-tools/core/library/history";
import type { CreateLoadoutTemplateInput, LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import type { ManifestStatus } from "@d2-tools/core/manifest/cache";
import type { AuthLoginResult } from "@d2-tools/core/oauth/login";
import type { StartupState } from "@d2-tools/core/startup/startupState";
import type { SaveVaultNoteInput, SaveVaultTagInput, VaultTags } from "@d2-tools/core/vault/tags";
import type { BackgroundTaskSnapshot } from "../shared/backgroundTasks.js";
import type { UpdateSnapshot } from "../shared/updateTypes.js";

type ItemLockActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
  state: boolean;
};

type ItemEquipActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_name?: string;
};

type ItemTransferActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_reference_hash: number;
  item_name?: string;
  transfer_to_vault: boolean;
};

type PostmasterPullActionInput = {
  membership_type: number;
  character_id: string;
  item_id: string;
  item_reference_hash: number;
  item_name?: string;
  stack_size?: number;
};

type LoadoutEquipActionInput = {
  membership_type: number;
  character_id: string;
  loadout_index: number;
  loadout_name?: string;
};

type LoadoutSnapshotActionInput = {
  membership_type: number;
  character_id: string;
  loadout_index: number;
  loadout_name?: string;
};

type ItemActionResult = {
  ok: true;
  message: string;
};

type BatchEquipItemsInput = {
  membership_type: number;
  character_id: string;
  items: ItemEquipActionInput[];
};

type BatchTransferItemsInput = {
  membership_type: number;
  character_id: string;
  items: ItemTransferActionInput[];
};

type BatchItemActionResult = {
  ok: true;
  total: number;
  success_count: number;
  failed_count: number;
  message: string;
};

contextBridge.exposeInMainWorld("d2", {
  getHealth: () => ipcRenderer.invoke("health:get") as Promise<HealthStatus>,
  getConfig: () => ipcRenderer.invoke("config:get") as Promise<D2Config>,
  saveConfig: (config: D2Config) => ipcRenderer.invoke("config:save", config) as Promise<D2Config>,
  openDataDir: () => ipcRenderer.invoke("config:open-data-dir") as Promise<void>,
  exportConfig: () => ipcRenderer.invoke("config:export"),
  importConfig: () => ipcRenderer.invoke("config:import"),
  clearCache: () => ipcRenderer.invoke("config:clear-cache"),
  listAiModels: (ai: AiSettings) => ipcRenderer.invoke("ai:models", ai) as Promise<AiModelListResult>,
  testAiConnection: () => ipcRenderer.invoke("ai:test") as Promise<AiConnectionTestResult>,
  loginBungie: () => ipcRenderer.invoke("auth:login") as Promise<AuthLoginResult>,
  getAccountSummary: () => ipcRenderer.invoke("account:summary") as Promise<AccountSummary>,
  getItemDetail: (hash: number) => ipcRenderer.invoke("items:detail", hash) as Promise<ItemDefinitionDetail>,
  getStartupState: () => ipcRenderer.invoke("startup:get") as Promise<StartupState>,
  setWindowColorMode: (colorMode: "light" | "dark") =>
    ipcRenderer.invoke("window:set-color-mode", colorMode) as Promise<void>,
  openExternal: (url: string) =>
    ipcRenderer.invoke("shell:open-external", url) as Promise<void>,
  getBackgroundTasks: () => ipcRenderer.invoke("background-tasks:list") as Promise<BackgroundTaskSnapshot[]>,
  onBackgroundTasksChanged: (callback: (tasks: BackgroundTaskSnapshot[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, tasks: BackgroundTaskSnapshot[]) => callback(tasks);
    ipcRenderer.on("background-tasks:changed", listener);
    return () => ipcRenderer.removeListener("background-tasks:changed", listener);
  },
  getManifestStatus: () => ipcRenderer.invoke("manifest:status") as Promise<ManifestStatus>,
  initializeManifest: () => ipcRenderer.invoke("manifest:initialize") as Promise<ManifestStatus>,
  searchItems: (query: string) => ipcRenderer.invoke("items:search", query) as Promise<ItemSearchResult[]>,
  searchPerks: (query: string) => ipcRenderer.invoke("items:perks:search", query) as Promise<PerkSearchResult[]>,
  getLiveItemAvailability: (itemHashes: number[]) =>
    ipcRenderer.invoke("items:live-availability", itemHashes) as Promise<LiveItemAvailability>,
  getItemAliases: () => ipcRenderer.invoke("aliases:get") as Promise<ItemAliases>,
  saveItemAlias: (input: ItemAliasEntry) => ipcRenderer.invoke("aliases:save", input) as Promise<ItemAliases>,
  getLibraryHistory: () => ipcRenderer.invoke("library:history:get") as Promise<LibraryHistory>,
  addRecentItem: (item: Omit<LibraryHistoryItem, "viewed_at">) =>
    ipcRenderer.invoke("library:recent:add", item) as Promise<LibraryHistory>,
  addFavoriteItem: (item: Omit<LibraryHistoryItem, "viewed_at">) =>
    ipcRenderer.invoke("library:favorite:add", item) as Promise<LibraryHistory>,
  removeFavoriteItem: (hash: number) =>
    ipcRenderer.invoke("library:favorite:remove", hash) as Promise<LibraryHistory>,
  listLoadoutTemplates: () => ipcRenderer.invoke("loadouts:list") as Promise<LoadoutTemplate[]>,
  createLoadoutTemplate: (input: CreateLoadoutTemplateInput) =>
    ipcRenderer.invoke("loadouts:create", input) as Promise<LoadoutTemplate>,
  renameLoadoutTemplate: (id: string, name: string) =>
    ipcRenderer.invoke("loadouts:rename", { id, name }) as Promise<LoadoutTemplate>,
  deleteLoadoutTemplate: (id: string) => ipcRenderer.invoke("loadouts:delete", id) as Promise<LoadoutTemplate[]>,
  createLoadoutTemplateTransferPlan: (input: {
    template: LoadoutTemplate;
    target_character_id: string;
    available_items: AccountSummary["vault"]["items"];
    equipped_items: AccountSummary["vault"]["items"];
  }) => ipcRenderer.invoke("loadouts:transfer-plan", input) as Promise<BatchTransferPlan>,
  getDimWishlist: () => ipcRenderer.invoke("wishlist:get") as Promise<DimWishlist | null>,
  saveDimWishlist: (wishlist: DimWishlist) => ipcRenderer.invoke("wishlist:save", wishlist) as Promise<DimWishlist>,
  clearDimWishlist: () => ipcRenderer.invoke("wishlist:clear") as Promise<null>,
  getLocalTargetRules: () => ipcRenderer.invoke("targets:get") as Promise<LocalTargetRules>,
  saveLocalTargetRules: (rules: LocalTargetRules) =>
    ipcRenderer.invoke("targets:save", rules) as Promise<LocalTargetRules>,
  clearLocalTargetRules: () => ipcRenderer.invoke("targets:clear") as Promise<LocalTargetRules>,
  getLocalCommunityRecommendations: () =>
    ipcRenderer.invoke("community:local:get") as Promise<LocalCommunityRecommendationTable | null>,
  saveLocalCommunityRecommendations: (table: LocalCommunityRecommendationTable) =>
    ipcRenderer.invoke("community:local:save", table) as Promise<LocalCommunityRecommendationTable>,
  clearLocalCommunityRecommendations: () => ipcRenderer.invoke("community:local:clear") as Promise<null>,
  getVaultTags: () => ipcRenderer.invoke("vault:tags:get") as Promise<VaultTags>,
  saveVaultTag: (input: SaveVaultTagInput) => ipcRenderer.invoke("vault:tag:save", input) as Promise<VaultTags>,
  saveVaultTagsBatch: (inputs: SaveVaultTagInput[]) =>
    ipcRenderer.invoke("vault:tags:save-batch", inputs) as Promise<VaultTags>,
  saveVaultNote: (input: SaveVaultNoteInput) => ipcRenderer.invoke("vault:note:save", input) as Promise<VaultTags>,
  analyzeVault: (input: { items: AccountItemSummary[]; tags: VaultTags }) =>
    ipcRenderer.invoke("analysis:vault", input) as Promise<VaultAnalysisResult>,
  generateVaultAiAdvice: (input: { items: AccountItemSummary[]; tags: VaultTags }) =>
    ipcRenderer.invoke("analysis:vault:ai", input) as Promise<VaultAiAdviceResult>,
  generateItemAiAdvice: (input: Omit<ItemAiAdviceInput, "config">) =>
    ipcRenderer.invoke("analysis:item:ai", input) as Promise<ItemAiAdviceResult>,
  sendAiChat: (input: { question: string; context: string }) =>
    ipcRenderer.invoke("analysis:chat:ai", input) as Promise<AiChatReplyResult>,
  parseBuildGuide: (input: { rawText: string; aiText?: string }) =>
    ipcRenderer.invoke("assistant:guide:parse", input),
  matchBuildGuide: (input: { requirement: BuildGuideRequirement; characterId?: string }) =>
    ipcRenderer.invoke("assistant:guide:match", input),
  createGuideLoadoutDraft: (input: { match: BuildGuideMatchResult; characterId: string; fallbackName: string }) =>
    ipcRenderer.invoke("assistant:guide:draft", input),
  setItemLockState: (input: ItemLockActionInput) =>
    ipcRenderer.invoke("actions:item:set-lock", input) as Promise<ItemActionResult>,
  equipItem: (input: ItemEquipActionInput) =>
    ipcRenderer.invoke("actions:item:equip", input) as Promise<ItemActionResult>,
  transferItem: (input: ItemTransferActionInput) =>
    ipcRenderer.invoke("actions:item:transfer", input) as Promise<ItemActionResult>,
  batchEquipItems: (input: BatchEquipItemsInput) =>
    ipcRenderer.invoke("actions:items:batch-equip", input) as Promise<BatchItemActionResult>,
  batchTransferItems: (input: BatchTransferItemsInput) =>
    ipcRenderer.invoke("actions:items:batch-transfer", input) as Promise<BatchItemActionResult>,
  pullFromPostmaster: (input: PostmasterPullActionInput) =>
    ipcRenderer.invoke("actions:item:pull-postmaster", input) as Promise<ItemActionResult>,
  equipLoadout: (input: LoadoutEquipActionInput) =>
    ipcRenderer.invoke("actions:loadout:equip", input) as Promise<ItemActionResult>,
  snapshotLoadout: (input: LoadoutSnapshotActionInput) =>
    ipcRenderer.invoke("actions:loadout:snapshot", input) as Promise<ItemActionResult>,
  getActionLog: () => ipcRenderer.invoke("actions:log:get") as Promise<ActionLogEntry[]>,
  createItemActionPlan: (input: ItemActionPlanInput) =>
    ipcRenderer.invoke("actions:plan:item", input) as Promise<ItemActionPlan>,
  createBatchTransferPlan: (input: { character_id: string; transfer_to_vault: boolean; items: AccountSummary["vault"]["items"] }) =>
    ipcRenderer.invoke("actions:plan:batch-transfer", input) as Promise<BatchTransferPlan>,
  getDailySummary: () => ipcRenderer.invoke("daily:summary") as Promise<DailySummary>,
  getActivitySummary: (input: { membership_type: number; membership_id: string; character_ids: string[] }) =>
    ipcRenderer.invoke("activities:summary", input) as Promise<ActivityHistorySummary>,
  exportDiagnostics: () => ipcRenderer.invoke("diagnostics:export") as Promise<string>,
  getUpdateStatus: () => ipcRenderer.invoke("updates:get-status") as Promise<UpdateSnapshot>,
  checkForUpdates: () => ipcRenderer.invoke("updates:check") as Promise<UpdateSnapshot>,
  downloadUpdate: () => ipcRenderer.invoke("updates:download") as Promise<UpdateSnapshot>,
  quitAndInstallUpdate: () => ipcRenderer.invoke("updates:quit-and-install") as Promise<void>,
  openUpdateDownloadPage: () => ipcRenderer.invoke("updates:open-download-page") as Promise<void>,
  onUpdateStatusChanged: (callback: (snapshot: UpdateSnapshot) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: UpdateSnapshot) => callback(snapshot);
    ipcRenderer.on("updates:status", listener);
    return () => ipcRenderer.removeListener("updates:status", listener);
  },
  getCommunityPerkRecommendations: (item_hash: number, options?: { item_name?: string }) =>
    ipcRenderer.invoke("community:recommendations:get", item_hash, options) as Promise<WeaponRecommendation | null>,
  matchCommunityVaultItems: (items: Array<{ hash: number; socket_plugs?: Array<{ hash: number }> }>) =>
    ipcRenderer.invoke("community:vault:match", items) as Promise<Array<{ hash: number } & VaultItemMatchInfo>>,
  clearLightggCache: () => ipcRenderer.invoke("community:lightgg:cache:clear") as Promise<void>
});
