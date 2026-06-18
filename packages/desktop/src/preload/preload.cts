import { contextBridge, ipcRenderer } from "electron";
import type {
  D2Config,
  AuthLoginResult,
  AccountSummary,
  HealthStatus,
  ItemSearchResult,
  ManifestStatus,
  StartupState
} from "@d2-service/core";

contextBridge.exposeInMainWorld("d2", {
  getHealth: () => ipcRenderer.invoke("health:get") as Promise<HealthStatus>,
  getConfig: () => ipcRenderer.invoke("config:get") as Promise<D2Config>,
  saveConfig: (config: D2Config) => ipcRenderer.invoke("config:save", config) as Promise<D2Config>,
  loginBungie: () => ipcRenderer.invoke("auth:login") as Promise<AuthLoginResult>,
  getAccountSummary: () => ipcRenderer.invoke("account:summary") as Promise<AccountSummary>,
  getStartupState: () => ipcRenderer.invoke("startup:get") as Promise<StartupState>,
  getManifestStatus: () => ipcRenderer.invoke("manifest:status") as Promise<ManifestStatus>,
  initializeManifest: () => ipcRenderer.invoke("manifest:initialize") as Promise<ManifestStatus>,
  searchItems: (query: string) => ipcRenderer.invoke("items:search", query) as Promise<ItemSearchResult[]>
});
