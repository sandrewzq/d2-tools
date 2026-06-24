import type {
  AppInfo,
  PlatformServices,
  PlatformUpdateCheckResult
} from "./contracts";

export interface MockPlatformSeed {
  readonly dataDir?: string;
  readonly appInfo?: Partial<AppInfo>;
  readonly updateCheckResult?: PlatformUpdateCheckResult;
}

export function createMockPlatformServices(
  seed: MockPlatformSeed = {}
): PlatformServices {
  const secureValues = new Map<string, string>();
  const files = new Map<string, string>();
  const logs: string[] = [];
  const dataDir = seed.dataDir ?? "D:/mock/d2-tools";

  return {
    app: {
      async getInfo() {
        return {
          name: seed.appInfo?.name ?? "d2-tools",
          version: seed.appInfo?.version ?? "0.0.0",
          platform: seed.appInfo?.platform ?? "mock"
        };
      }
    },
    paths: {
      async getDataDir() {
        return dataDir;
      }
    },
    secureStore: {
      async get(key) {
        return secureValues.get(key) ?? null;
      },
      async set(key, value) {
        secureValues.set(key, value);
      },
      async delete(key) {
        secureValues.delete(key);
      }
    },
    files: {
      async readText(path) {
        return files.get(path) ?? null;
      },
      async writeText(path, content) {
        files.set(path, content);
      }
    },
    logs: {
      async write(level, message) {
        logs.push(`${level}:${message}`);
      },
      async export() {
        return logs.join("\n");
      }
    },
    external: {
      async openExternal(url) {
        logs.push(`open:${url}`);
      }
    },
    updates: {
      async check() {
        return (
          seed.updateCheckResult ?? { available: false, version: null, notes: null }
        );
      },
      async install() {
        logs.push("updates:install");
      }
    }
  };
}
