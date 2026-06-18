import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyEnvOverrides } from "./env.js";
import { defaultConfig, defaultDataDir } from "./defaults.js";
import type { ConfigEnv, D2Config } from "./schema.js";

export type ConfigStoreOptions = {
  dataDir?: string;
  env?: ConfigEnv;
};

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
  return applyEnvOverrides(base, options.env ?? process.env);
}

export function saveConfig(config: D2Config, options: { dataDir?: string } = {}): void {
  const selectedDataDir = options.dataDir ?? config.data.data_dir ?? defaultDataDir();
  mkdirSync(selectedDataDir, { recursive: true });
  writeFileSync(configPath(selectedDataDir), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
