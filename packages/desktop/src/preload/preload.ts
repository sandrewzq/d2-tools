import { contextBridge, ipcRenderer } from "electron";
import type { D2Config, HealthStatus, StartupState } from "@d2-service/core";

contextBridge.exposeInMainWorld("d2", {
  getHealth: () => ipcRenderer.invoke("health:get") as Promise<HealthStatus>,
  getConfig: () => ipcRenderer.invoke("config:get") as Promise<D2Config>,
  saveConfig: (config: D2Config) => ipcRenderer.invoke("config:save", config) as Promise<D2Config>,
  getStartupState: () => ipcRenderer.invoke("startup:get") as Promise<StartupState>
});
