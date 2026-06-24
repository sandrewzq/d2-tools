export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly platform: "desktop" | "mobile" | "web" | "mock";
}

export interface PlatformAppService {
  getInfo(): Promise<AppInfo>;
}

export interface PlatformPathService {
  getDataDir(): Promise<string>;
}

export interface PlatformSecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface PlatformFileService {
  readText(path: string): Promise<string | null>;
  writeText(path: string, content: string): Promise<void>;
}

export interface PlatformLogService {
  write(level: "info" | "warn" | "error", message: string): Promise<void>;
  export(): Promise<string>;
}

export interface PlatformExternalService {
  openExternal(url: string): Promise<void>;
}

export interface PlatformUpdateService {
  check(): Promise<{ available: boolean; version: string | null }>;
  install(): Promise<void>;
}

export interface PlatformServices {
  readonly app: PlatformAppService;
  readonly paths: PlatformPathService;
  readonly secureStore: PlatformSecureStore;
  readonly files: PlatformFileService;
  readonly logs: PlatformLogService;
  readonly external: PlatformExternalService;
  readonly updates: PlatformUpdateService;
}
