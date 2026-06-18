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
  SaveVaultTagInput,
  VaultTags,
  AccountItemSummary,
  VaultAnalysisResult,
  VaultAiAdviceResult,
  AiConnectionTestResult
} from "@d2-service/core";

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
  getVaultTags: () => ipcRenderer.invoke("vault:tags:get") as Promise<VaultTags>,
  saveVaultTag: (input: SaveVaultTagInput) => ipcRenderer.invoke("vault:tag:save", input) as Promise<VaultTags>,
  analyzeVault: (input: { items: AccountItemSummary[]; tags: VaultTags }) =>
    ipcRenderer.invoke("analysis:vault", input) as Promise<VaultAnalysisResult>,
  generateVaultAiAdvice: (input: { items: AccountItemSummary[]; tags: VaultTags }) =>
    ipcRenderer.invoke("analysis:vault:ai", input) as Promise<VaultAiAdviceResult>
});
