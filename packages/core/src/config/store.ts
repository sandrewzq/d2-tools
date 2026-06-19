import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyEnvOverrides } from "./env.js";
import { defaultConfig, defaultDataDir } from "./defaults.js";
import type { ConfigEnv, D2Config } from "./schema.js";

export type ConfigStoreOptions = {
  dataDir?: string;
  env?: ConfigEnv;
};

const legacyLocalRedirectUri = "http://127.0.0.1:28780/oauth/callback";
const currentLocalRedirectUri = "https://127.0.0.1:28780/oauth/callback";

export function configPath(dataDir: string): string {
  return join(dataDir, "config.json");
}

function mergeConfigWithDefaults(config: Partial<D2Config>, dataDir: string): D2Config {
  const defaults = defaultConfig(dataDir);

  return {
    bungie: {
      ...defaults.bungie,
      ...config.bungie
    },
    data: {
      ...defaults.data,
      ...config.data
    },
    ai: {
      ...defaults.ai,
      ...config.ai
    },
    features: {
      ...defaults.features,
      ...config.features
    }
  };
}

export function loadConfig(options: ConfigStoreOptions = {}): D2Config {
  const selectedDataDir = options.dataDir ?? options.env?.D2_DATA_DIR ?? defaultDataDir();
  mkdirSync(selectedDataDir, { recursive: true });

  const path = configPath(selectedDataDir);
  const base = existsSync(path)
    ? mergeConfigWithDefaults(JSON.parse(readFileSync(path, "utf8")) as Partial<D2Config>, selectedDataDir)
    : defaultConfig(selectedDataDir);

  base.data.data_dir = selectedDataDir;
  return normalizeConfig(applyEnvOverrides(base, options.env ?? process.env));
}

export function saveConfig(config: D2Config, options: { dataDir?: string } = {}): void {
  const normalizedConfig = normalizeConfig(config);
  const selectedDataDir = options.dataDir ?? normalizedConfig.data.data_dir ?? defaultDataDir();
  mkdirSync(selectedDataDir, { recursive: true });
  writeFileSync(configPath(selectedDataDir), `${JSON.stringify(normalizedConfig, null, 2)}\n`, "utf8");
}

function normalizeConfig(config: D2Config): D2Config {
  if (config.bungie.redirect_uri === legacyLocalRedirectUri) {
    return {
      ...config,
      bungie: {
        ...config.bungie,
        redirect_uri: currentLocalRedirectUri
      }
    };
  }

  return config;
}
