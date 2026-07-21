import { contextBridge, ipcRenderer } from "electron";
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
import type {
  PersonalWeaponKnowledgeTable,
  SavePersonalWeaponKnowledgeInput
} from "@d2-tools/core/community-perks/personalWeaponKnowledge";
import type { D2Config } from "@d2-tools/core/config/schema";
import type { HealthStatus } from "@d2-tools/core/health";
import type { ItemAliases, ItemAliasEntry } from "@d2-tools/core/items/aliases";
import type { ItemDefinitionDetail } from "@d2-tools/core/items/detail";
import type { LiveItemAvailability } from "@d2-tools/core/items/liveAvailability";
import type { PerkSearchResult } from "@d2-tools/core/items/perkSearch";
import type { ItemSearchResult } from "@d2-tools/core/items/search";
import type { LibraryHistory, LibraryHistoryItem } from "@d2-tools/core/library/history";
import type { CreateLoadoutTemplateInput, LoadoutTemplate } from "@d2-tools/core/loadouts/templates";
import type { SaveVaultNoteInput, SaveVaultTagInput, VaultTags } from "@d2-tools/core/vault/tags";
import type { WeeklySummary } from "@d2-tools/core/weekly/summary";
import type {
  AccountItemDetail,
  AccountItemDetailRequestOptions,
  AccountItemSummary,
  AccountSummary,
  AccountSummaryRequestOptions,
  AuthLoginResult,
  CachedAccountSnapshot
} from "../contracts/account.js";
import type {
  ActionLogEntry,
  ApplySocketPlugsActionInput,
  BatchEquipItemsInput,
  BatchItemActionResult,
  BatchTransferPlan,
  BatchTransferItemsInput,
  InsertSocketPlugActionInput,
  ItemActionPlan,
  ItemActionPlanInput,
  ItemActionResult,
  ItemEquipActionInput,
  ItemLockActionInput,
  ItemTransferActionInput,
  LoadoutEquipActionInput,
  LoadoutSnapshotActionInput,
  PostmasterPullActionInput
} from "../contracts/actions.js";
import type { DailySummary, HomeBriefing } from "../contracts/daily.js";
import type {
  ManifestStatus,
  ManifestStatusRequestOptions,
  StartupState
} from "../contracts/manifest.js";
import type {
  VendorInventoryRequest,
  VendorInventorySnapshot
} from "../contracts/vendors.js";
import type {
  DesktopIpcErrorDetails,
  DesktopIpcErrorPayload
} from "../contracts/errors.js";
import type { BackgroundTaskSnapshot } from "../shared/backgroundTasks.js";
import type { AppUpdateSnapshot } from "../shared/updateTypes.js";

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
  getAccountSummary: (options?: AccountSummaryRequestOptions) =>
    invokeDesktopIpc<AccountSummary>("account:summary", options),
  getCachedAccountSnapshot: () =>
    ipcRenderer.invoke("account:snapshot:cached") as Promise<CachedAccountSnapshot | null>,
  getAccountItemDetail: (instanceId: string, options?: AccountItemDetailRequestOptions) =>
    invokeDesktopIpc<AccountItemDetail>("account:item-detail", instanceId, options),
  getItemDetail: (hash: number) => invokeDesktopIpc<ItemDefinitionDetail>("items:detail", hash),
  getStartupState: () => ipcRenderer.invoke("startup:get") as Promise<StartupState>,
  setWindowColorMode: (colorMode: "light" | "dark") =>
    ipcRenderer.invoke("window:set-color-mode", colorMode) as Promise<void>,
  minimizeWindow: () => ipcRenderer.invoke("window:minimize") as Promise<void>,
  toggleMaximizeWindow: () => ipcRenderer.invoke("window:toggle-maximize") as Promise<void>,
  closeWindow: () => ipcRenderer.invoke("window:close") as Promise<void>,
  openExternal: (url: string) =>
    ipcRenderer.invoke("shell:open-external", url) as Promise<void>,
  getBackgroundTasks: () => ipcRenderer.invoke("background-tasks:list") as Promise<BackgroundTaskSnapshot[]>,
  onBackgroundTasksChanged: (callback: (tasks: BackgroundTaskSnapshot[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, tasks: BackgroundTaskSnapshot[]) => callback(tasks);
    ipcRenderer.on("background-tasks:changed", listener);
    return () => ipcRenderer.removeListener("background-tasks:changed", listener);
  },
  getManifestStatus: (options?: ManifestStatusRequestOptions) =>
    invokeDesktopIpc<ManifestStatus>("manifest:status", options),
  initializeManifest: () => invokeDesktopIpc<ManifestStatus>("manifest:initialize"),
  repairManifest: () => invokeDesktopIpc<ManifestStatus>("manifest:repair"),
  searchItems: (query: string) => invokeDesktopIpc<ItemSearchResult[]>("items:search", query),
  searchPerks: (query: string) => invokeDesktopIpc<PerkSearchResult[]>("items:perks:search", query),
  getLiveItemAvailability: (itemHashes: number[]) =>
    invokeDesktopIpc<LiveItemAvailability>("items:live-availability", itemHashes),
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
  getPersonalWeaponKnowledge: (weaponName?: string) =>
    ipcRenderer.invoke("community:personal:get", weaponName) as Promise<PersonalWeaponKnowledgeTable>,
  savePersonalWeaponKnowledge: (input: SavePersonalWeaponKnowledgeInput) =>
    ipcRenderer.invoke("community:personal:save", input) as Promise<PersonalWeaponKnowledgeTable>,
  setPersonalWeaponKnowledgeEnabled: (id: string, enabled: boolean) =>
    ipcRenderer.invoke("community:personal:set-enabled", id, enabled) as Promise<PersonalWeaponKnowledgeTable>,
  deletePersonalWeaponKnowledge: (id: string) =>
    ipcRenderer.invoke("community:personal:delete", id) as Promise<PersonalWeaponKnowledgeTable>,
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
    invokeDesktopIpc<ItemActionResult>("actions:item:set-lock", input),
  equipItem: (input: ItemEquipActionInput) =>
    invokeDesktopIpc<ItemActionResult>("actions:item:equip", input),
  insertSocketPlug: (input: InsertSocketPlugActionInput) =>
    invokeDesktopIpc<ItemActionResult>("actions:item:insert-socket-plug", input),
  applySocketPlugs: (input: ApplySocketPlugsActionInput) =>
    invokeDesktopIpc<ItemActionResult>("actions:item:apply-socket-plugs", input),
  transferItem: (input: ItemTransferActionInput) =>
    invokeDesktopIpc<ItemActionResult>("actions:item:transfer", input),
  batchEquipItems: (input: BatchEquipItemsInput) =>
    invokeDesktopIpc<BatchItemActionResult>("actions:items:batch-equip", input),
  batchTransferItems: (input: BatchTransferItemsInput) =>
    invokeDesktopIpc<BatchItemActionResult>("actions:items:batch-transfer", input),
  pullFromPostmaster: (input: PostmasterPullActionInput) =>
    invokeDesktopIpc<ItemActionResult>("actions:item:pull-postmaster", input),
  equipLoadout: (input: LoadoutEquipActionInput) =>
    invokeDesktopIpc<ItemActionResult>("actions:loadout:equip", input),
  snapshotLoadout: (input: LoadoutSnapshotActionInput) =>
    invokeDesktopIpc<ItemActionResult>("actions:loadout:snapshot", input),
  getActionLog: () => ipcRenderer.invoke("actions:log:get") as Promise<ActionLogEntry[]>,
  createItemActionPlan: (input: ItemActionPlanInput) =>
    ipcRenderer.invoke("actions:plan:item", input) as Promise<ItemActionPlan>,
  createBatchTransferPlan: (input: { character_id: string; transfer_to_vault: boolean; items: AccountSummary["vault"]["items"] }) =>
    ipcRenderer.invoke("actions:plan:batch-transfer", input) as Promise<BatchTransferPlan>,
  getHomeBriefing: (options?: { force?: boolean }) => invokeDesktopIpc<HomeBriefing>("home:briefing", options),
  refreshHomeBriefing: () => invokeDesktopIpc<HomeBriefing>("home:briefing:refresh"),
  getDailySummary: () => invokeDesktopIpc<DailySummary>("daily:summary"),
  getWeeklySummary: () => invokeDesktopIpc<WeeklySummary>("weekly:summary"),
  getVendorInventory: (input: VendorInventoryRequest) =>
    ipcRenderer.invoke("vendors:inventory", input) as Promise<VendorInventorySnapshot>,
  getCachedVendorInventory: (input: VendorInventoryRequest) =>
    ipcRenderer.invoke("vendors:inventory:cached", input) as Promise<VendorInventorySnapshot | null>,
  refreshVendorInventory: (input: VendorInventoryRequest) =>
    ipcRenderer.invoke("vendors:inventory:refresh", input) as Promise<VendorInventorySnapshot>,
  getActivitySummary: (input: { membership_type: number; membership_id: string; character_ids: string[] }) =>
    ipcRenderer.invoke("activities:summary", input) as Promise<ActivityHistorySummary>,
  exportDiagnostics: () => ipcRenderer.invoke("diagnostics:export") as Promise<string>,
  getUpdateStatus: () => ipcRenderer.invoke("updates:get-status") as Promise<AppUpdateSnapshot>,
  checkForUpdates: () => ipcRenderer.invoke("updates:check") as Promise<AppUpdateSnapshot>,
  downloadUpdate: () => ipcRenderer.invoke("updates:download") as Promise<AppUpdateSnapshot>,
  quitAndInstallUpdate: () => ipcRenderer.invoke("updates:quit-and-install") as Promise<void>,
  openUpdateDownloadPage: () => ipcRenderer.invoke("updates:open-download-page") as Promise<void>,
  onUpdateStatusChanged: (callback: (snapshot: AppUpdateSnapshot) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: AppUpdateSnapshot) => callback(snapshot);
    ipcRenderer.on("updates:status", listener);
    return () => ipcRenderer.removeListener("updates:status", listener);
  },
  getCommunityPerkRecommendations: (item_hash: number, options?: { item_name?: string }) =>
    ipcRenderer.invoke("community:recommendations:get", item_hash, options) as Promise<WeaponRecommendation | null>,
  matchCommunityVaultItems: (items: Array<{ hash: number; socket_plugs?: Array<{ hash: number }> }>) =>
    ipcRenderer.invoke("community:vault:match", items) as Promise<Array<{ hash: number } & VaultItemMatchInfo>>,
  clearLightggCache: () => ipcRenderer.invoke("community:lightgg:cache:clear") as Promise<void>
});

async function invokeDesktopIpc<TResult>(
  channel: string,
  ...args: unknown[]
): Promise<TResult> {
  try {
    return await ipcRenderer.invoke(channel, ...args) as TResult;
  } catch (error) {
    throw toDesktopIpcError(error, { channel });
  }
}

const desktopIpcTransportPrefix = "D2_IPC_ERROR:";

function toDesktopIpcError(
  error: unknown,
  details?: DesktopIpcErrorDetails
): Error & DesktopIpcErrorPayload {
  const payload = readDesktopIpcErrorPayload(error) ?? {
    code: "IPC_INVOKE_FAILED",
    message: errorMessage(error, "桌面服务调用失败"),
    retryable: true,
    causeCategory: "internal" as const
  };
  const ipcError = new Error(payload.message) as Error & DesktopIpcErrorPayload;
  ipcError.name = "DesktopIpcError";
  ipcError.code = payload.code;
  ipcError.retryable = payload.retryable;
  if (payload.causeCategory) ipcError.causeCategory = payload.causeCategory;
  if (details || payload.details) {
    ipcError.details = { ...payload.details, ...details };
  }
  return ipcError;
}

function readDesktopIpcErrorPayload(error: unknown): DesktopIpcErrorPayload | null {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const markerIndex = message.indexOf(desktopIpcTransportPrefix);
  if (markerIndex < 0) return null;
  try {
    const encoded = message.slice(markerIndex + desktopIpcTransportPrefix.length).trim();
    const parsed = JSON.parse(decodeURIComponent(encoded)) as Partial<DesktopIpcErrorPayload>;
    if (typeof parsed.code !== "string"
      || typeof parsed.message !== "string"
      || typeof parsed.retryable !== "boolean") {
      return null;
    }
    return parsed as DesktopIpcErrorPayload;
  } catch {
    return null;
  }
}

function errorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message
    .replace(/^Error invoking remote method '[^']+':\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .trim() || fallback;
}
