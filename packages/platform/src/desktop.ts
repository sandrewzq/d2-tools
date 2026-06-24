import { invoke } from "@tauri-apps/api/core";

import type { AppInfo, PlatformServices } from "./contracts";

export function createDesktopPlatformServices(): PlatformServices {
  return {
    app: {
      getInfo: () => invoke<AppInfo>("app_get_info")
    },
    paths: {
      getDataDir: () => invoke<string>("path_get_data_dir")
    },
    secureStore: {
      get: (key) => invoke<string | null>("secure_get", { key }),
      set: (key, value) => invoke<void>("secure_set", { key, value }),
      delete: (key) => invoke<void>("secure_delete", { key })
    },
    files: {
      readText: (path) => invoke<string | null>("fs_read_app_file", { path }),
      writeText: (path, content) =>
        invoke<void>("fs_write_app_file", { path, content })
    },
    logs: {
      write: (level, message) => invoke<void>("log_write", { level, message }),
      export: () => invoke<string>("log_export")
    },
    external: {
      openExternal: (url) => invoke<void>("open_external", { url })
    },
    updates: {
      check: () =>
        invoke<{ available: boolean; version: string | null }>("updates_check"),
      install: () => invoke<void>("updates_install")
    }
  };
}
