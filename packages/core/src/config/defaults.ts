import { join } from "node:path";
import { homedir } from "node:os";
import type { D2Config } from "./schema.js";

type DataDirPlatformOptions = {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  homeDir: string;
};

export function defaultDataDir(): string {
  return defaultDataDirForPlatform({
    platform: process.platform,
    env: process.env,
    homeDir: homedir()
  });
}

export function defaultDataDirForPlatform(options: DataDirPlatformOptions): string {
  return platformDataDir(options, "d2-tools");
}

function platformDataDir(options: DataDirPlatformOptions, appName: string): string {
  if (options.platform === "win32") {
    return join(options.env.APPDATA ?? options.homeDir, appName);
  }

  if (options.platform === "darwin") {
    return join(options.homeDir, "Library", "Application Support", appName);
  }

  return join(options.env.XDG_DATA_HOME ?? join(options.homeDir, ".local", "share"), appName);
}

export function defaultConfig(dataDir = defaultDataDir()): D2Config {
  return {
    bungie: {
      api_key: "",
      client_id: "",
      client_secret: "",
      redirect_uri: "https://127.0.0.1:28780/oauth/callback"
    },
    data: {
      data_dir: dataDir,
      manifest_language: "zh-chs"
    },
    ai: {
      protocol: "",
      provider: "",
      api_key: "",
      model: "",
      base_url: "",
      enable_lightgg: false,
      force_lightgg: false
    },
    features: {
      write_actions_enabled: false,
      color_mode: "light",
      density: "standard",
      interface_locale: "zh-CN",
      manifest_language_follows_interface: true
    }
  };
}
