import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { D2Config } from "@d2-tools/core/config/schema";

const portableBackupFormat = "d2-tools-portable-backup";
const portableBackupVersion = 1;

export const portableBackupFileNames = [
  "dim-wishlist.json",
  "target-rules.json",
  "vault-tags.json",
  "loadout-templates.json",
  "local-community-recommendations.json",
  "personal-weapon-knowledge.json"
] as const;

type PortableBackupFileName = typeof portableBackupFileNames[number];
type PortableBackupFiles = Partial<Record<PortableBackupFileName, unknown>>;

export type PortableBackup = {
  format: typeof portableBackupFormat;
  version: typeof portableBackupVersion;
  created_at: string;
  app_version: string;
  config: D2Config;
  files: PortableBackupFiles;
};

export type PartialD2Config = {
  bungie?: Partial<D2Config["bungie"]>;
  data?: Partial<D2Config["data"]>;
  ai?: Partial<D2Config["ai"]>;
  features?: Partial<D2Config["features"]>;
};

export type ParsedBackupDocument =
  | { kind: "portable"; backup: PortableBackup }
  | { kind: "legacy-config"; config: PartialD2Config };

export function createPortableBackup(input: {
  dataDir: string;
  config: D2Config;
  appVersion: string;
  now?: Date;
}): PortableBackup {
  const files: PortableBackupFiles = {};
  for (const fileName of portableBackupFileNames) {
    const path = join(input.dataDir, fileName);
    if (!existsSync(path)) {
      continue;
    }

    try {
      files[fileName] = JSON.parse(readFileSync(path, "utf8")) as unknown;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`无法备份 ${fileName}：${message}`);
    }
  }

  return {
    format: portableBackupFormat,
    version: portableBackupVersion,
    created_at: (input.now ?? new Date()).toISOString(),
    app_version: input.appVersion,
    config: sanitizePortableConfig(input.config),
    files
  };
}

export function writePortableBackup(path: string, backup: PortableBackup): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
}

export function parseBackupDocument(text: string): ParsedBackupDocument {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`备份文件不是有效 JSON：${message}`);
  }

  if (!isRecord(value)) {
    throw new Error("备份文件格式无效。");
  }

  if (value.format === portableBackupFormat) {
    return { kind: "portable", backup: validatePortableBackup(value) };
  }

  return { kind: "legacy-config", config: validateLegacyConfig(value) };
}

export function mergePortableConfig(current: D2Config, imported: PartialD2Config): D2Config {
  return {
    ...current,
    bungie: {
      ...current.bungie,
      ...imported.bungie,
      api_key: current.bungie.api_key,
      client_secret: current.bungie.client_secret
    },
    data: {
      ...current.data,
      ...imported.data,
      data_dir: current.data.data_dir
    },
    ai: {
      ...current.ai,
      ...imported.ai,
      api_key: current.ai.api_key
    },
    features: {
      ...current.features,
      ...imported.features
    }
  };
}

export function restorePortableFiles(dataDir: string, files: PortableBackupFiles): void {
  const serialized = new Map<PortableBackupFileName, string>();
  for (const fileName of portableBackupFileNames) {
    if (!Object.prototype.hasOwnProperty.call(files, fileName)) {
      continue;
    }
    serialized.set(fileName, `${JSON.stringify(files[fileName], null, 2)}\n`);
  }

  for (const fileName of portableBackupFileNames) {
    const path = join(dataDir, fileName);
    const content = serialized.get(fileName);
    if (content === undefined) {
      if (existsSync(path)) {
        rmSync(path, { force: true });
      }
      continue;
    }

    writeFileSync(path, content, "utf8");
  }
}

export function restorePortableBackup(input: {
  dataDir: string;
  currentConfig: D2Config;
  backup: PortableBackup;
  rollback: PortableBackup;
  rollbackPath: string;
  saveConfig: (config: D2Config) => void;
}): void {
  try {
    restorePortableFiles(input.dataDir, input.backup.files);
    input.saveConfig(mergePortableConfig(input.currentConfig, input.backup.config));
  } catch (error) {
    try {
      restorePortableFiles(input.dataDir, input.rollback.files);
      input.saveConfig(input.currentConfig);
    } catch (rollbackError) {
      const message = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      throw new Error(`恢复失败，自动回滚也失败：${message}。回滚文件：${input.rollbackPath}`);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`恢复失败，已自动回滚：${message}`);
  }
}

export function portableBackupFileCount(backup: PortableBackup): number {
  return portableBackupFileNames.filter((fileName) => Object.prototype.hasOwnProperty.call(backup.files, fileName)).length;
}

function sanitizePortableConfig(config: D2Config): D2Config {
  return {
    ...config,
    bungie: {
      ...config.bungie,
      api_key: "",
      client_secret: ""
    },
    data: {
      ...config.data,
      data_dir: ""
    },
    ai: {
      ...config.ai,
      api_key: ""
    }
  };
}

function validatePortableBackup(value: Record<string, unknown>): PortableBackup {
  if (value.version !== portableBackupVersion) {
    throw new Error(`不支持的备份版本：${String(value.version ?? "-")}。`);
  }
  if (typeof value.created_at !== "string" || typeof value.app_version !== "string") {
    throw new Error("备份文件缺少创建时间或应用版本。");
  }
  if (!isRecord(value.config) || !isRecord(value.files)) {
    throw new Error("备份文件缺少配置或用户数据。");
  }

  const allowedFiles = new Set<string>(portableBackupFileNames);
  for (const fileName of Object.keys(value.files)) {
    if (!allowedFiles.has(fileName)) {
      throw new Error(`备份文件包含不允许恢复的文件：${fileName}。`);
    }
  }

  return {
    format: portableBackupFormat,
    version: portableBackupVersion,
    created_at: value.created_at,
    app_version: value.app_version,
    config: validateConfigShape(value.config),
    files: value.files as PortableBackupFiles
  };
}

function validateLegacyConfig(value: Record<string, unknown>): PartialD2Config {
  const sectionNames = ["bungie", "data", "ai", "features"] as const;
  if (!sectionNames.some((section) => isRecord(value[section]))) {
    throw new Error("文件既不是便携备份，也不是可识别的旧版配置备份。");
  }

  for (const section of sectionNames) {
    const sectionValue = value[section];
    if (sectionValue !== undefined && !isRecord(sectionValue)) {
      throw new Error(`旧版配置中的 ${section} 字段格式无效。`);
    }
    if (isRecord(sectionValue)) {
      validateConfigSection(section, sectionValue, false);
    }
  }
  return value as unknown as PartialD2Config;
}

function validateConfigShape(value: Record<string, unknown>): D2Config {
  for (const section of ["bungie", "data", "ai", "features"] as const) {
    const sectionValue = value[section];
    if (!isRecord(sectionValue)) {
      throw new Error(`备份配置缺少 ${section} 字段。`);
    }
    validateConfigSection(section, sectionValue, true);
  }
  return value as unknown as D2Config;
}

function validateConfigSection(
  section: "bungie" | "data" | "ai" | "features",
  value: Record<string, unknown>,
  requireAll: boolean
): void {
  const fields = configFieldTypes[section];
  for (const [field, expectedType] of Object.entries(fields)) {
    const fieldValue = value[field];
    const isOptional = optionalConfigFields.has(`${section}.${field}`);
    if (fieldValue === undefined) {
      if (requireAll && !isOptional) {
        throw new Error(`备份配置缺少 ${section}.${field} 字段。`);
      }
      continue;
    }
    if (typeof fieldValue !== expectedType) {
      throw new Error(`备份配置中的 ${section}.${field} 字段类型无效。`);
    }
  }

  if (section === "features") {
    if (value.color_mode !== undefined && value.color_mode !== "light" && value.color_mode !== "dark") {
      throw new Error("备份配置中的 features.color_mode 值无效。");
    }
    if (value.interface_locale !== undefined && value.interface_locale !== "zh-CN" && value.interface_locale !== "en-US") {
      throw new Error("备份配置中的 features.interface_locale 值无效。");
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const configFieldTypes = {
  bungie: {
    api_key: "string",
    client_id: "string",
    client_secret: "string",
    redirect_uri: "string"
  },
  data: {
    data_dir: "string",
    manifest_language: "string"
  },
  ai: {
    protocol: "string",
    provider: "string",
    api_key: "string",
    model: "string",
    base_url: "string",
    enable_lightgg: "boolean",
    force_lightgg: "boolean"
  },
  features: {
    write_actions_enabled: "boolean",
    color_mode: "string",
    interface_locale: "string",
    manifest_language_follows_interface: "boolean"
  }
} as const;

const optionalConfigFields = new Set([
  "ai.protocol",
  "ai.provider",
  "ai.force_lightgg"
]);
