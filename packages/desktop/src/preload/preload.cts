import { contextBridge, ipcRenderer } from "electron";
import type {
  D2Config,
  AuthLoginResult,
  AccountSummary,
  HealthStatus,
  ItemDefinitionDetail,
  ItemSearchResult,
  ManifestStatus,
  StartupState,
  SaveVaultNoteInput,
  SaveVaultTagInput,
  VaultTags,
  AccountItemSummary,
  VaultAnalysisResult,
  VaultAiAdviceResult,
  ItemAiAdviceInput,
  ItemAiAdviceResult,
  AiConnectionTestResult,
  ActionLogEntry,
  DailySummary,
  ItemAliases,
  ItemAliasEntry,
  PerkSearchResult,
  LibraryHistory,
  LibraryHistoryItem,
  LoadoutTemplate,
  CreateLoadoutTemplateInput,
  ItemActionPlan,
  ItemActionPlanInput,
  BatchTransferPlan,
  ActivityHistorySummary
} from "@d2-service/core";

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

type ItemActionResult = {
  ok: true;
  message: string;
};

contextBridge.exposeInMainWorld("d2", {
  getHealth: () => ipcRenderer.invoke("health:get") as Promise<HealthStatus>,
  getConfig: () => ipcRenderer.invoke("config:get") as Promise<D2Config>,
  saveConfig: (config: D2Config) => ipcRenderer.invoke("config:save", config) as Promise<D2Config>,
  testAiConnection: () => ipcRenderer.invoke("ai:test") as Promise<AiConnectionTestResult>,
  loginBungie: () => ipcRenderer.invoke("auth:login") as Promise<AuthLoginResult>,
  getAccountSummary: () => ipcRenderer.invoke("account:summary") as Promise<AccountSummary>,
  getItemDetail: (hash: number) => ipcRenderer.invoke("items:detail", hash) as Promise<ItemDefinitionDetail>,
  getStartupState: () => ipcRenderer.invoke("startup:get") as Promise<StartupState>,
  getManifestStatus: () => ipcRenderer.invoke("manifest:status") as Promise<ManifestStatus>,
  initializeManifest: () => ipcRenderer.invoke("manifest:initialize") as Promise<ManifestStatus>,
  searchItems: (query: string) => ipcRenderer.invoke("items:search", query) as Promise<ItemSearchResult[]>,
  searchPerks: (query: string) => ipcRenderer.invoke("items:perks:search", query) as Promise<PerkSearchResult[]>,
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
  deleteLoadoutTemplate: (id: string) => ipcRenderer.invoke("loadouts:delete", id) as Promise<LoadoutTemplate[]>,
  createLoadoutTemplateTransferPlan: (input: {
    template: LoadoutTemplate;
    target_character_id: string;
    available_items: AccountSummary["vault"]["items"];
    equipped_items: AccountSummary["vault"]["items"];
  }) => ipcRenderer.invoke("loadouts:transfer-plan", input) as Promise<BatchTransferPlan>,
  getVaultTags: () => ipcRenderer.invoke("vault:tags:get") as Promise<VaultTags>,
  saveVaultTag: (input: SaveVaultTagInput) => ipcRenderer.invoke("vault:tag:save", input) as Promise<VaultTags>,
  saveVaultNote: (input: SaveVaultNoteInput) => ipcRenderer.invoke("vault:note:save", input) as Promise<VaultTags>,
  analyzeVault: (input: { items: AccountItemSummary[]; tags: VaultTags }) =>
    ipcRenderer.invoke("analysis:vault", input) as Promise<VaultAnalysisResult>,
  generateVaultAiAdvice: (input: { items: AccountItemSummary[]; tags: VaultTags }) =>
    ipcRenderer.invoke("analysis:vault:ai", input) as Promise<VaultAiAdviceResult>,
  generateItemAiAdvice: (input: Omit<ItemAiAdviceInput, "config">) =>
    ipcRenderer.invoke("analysis:item:ai", input) as Promise<ItemAiAdviceResult>,
  setItemLockState: (input: ItemLockActionInput) =>
    ipcRenderer.invoke("actions:item:set-lock", input) as Promise<ItemActionResult>,
  equipItem: (input: ItemEquipActionInput) =>
    ipcRenderer.invoke("actions:item:equip", input) as Promise<ItemActionResult>,
  transferItem: (input: ItemTransferActionInput) =>
    ipcRenderer.invoke("actions:item:transfer", input) as Promise<ItemActionResult>,
  getActionLog: () => ipcRenderer.invoke("actions:log:get") as Promise<ActionLogEntry[]>,
  createItemActionPlan: (input: ItemActionPlanInput) =>
    ipcRenderer.invoke("actions:plan:item", input) as Promise<ItemActionPlan>,
  createBatchTransferPlan: (input: { character_id: string; transfer_to_vault: boolean; items: AccountSummary["vault"]["items"] }) =>
    ipcRenderer.invoke("actions:plan:batch-transfer", input) as Promise<BatchTransferPlan>,
  getDailySummary: () => ipcRenderer.invoke("daily:summary") as Promise<DailySummary>,
  getActivitySummary: (input: { membership_type: number; membership_id: string; character_ids: string[] }) =>
    ipcRenderer.invoke("activities:summary", input) as Promise<ActivityHistorySummary>,
  exportDiagnostics: () => ipcRenderer.invoke("diagnostics:export") as Promise<string>
});
