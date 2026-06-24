# Tauri 2 架构底座 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 clean slate 的 Tauri 2 架构底座，让 `apps/desktop -> ui -> data/platform -> core/Tauri/local storage` 链路可运行、可测试、可继续扩展。

**Architecture:** 新主线采用 `apps/desktop` 装配 Tauri 2 桌面端，业务规则放在 `packages/core`，local-first repository 放在 `packages/data`，平台能力 contract 和 adapter 放在 `packages/platform`，跨端 React 组件放在 `packages/ui`，无业务工具放在 `packages/shared`。第一阶段只实现薄功能闭环，不追平旧 Electron 功能。

**Tech Stack:** Tauri 2、React、TypeScript、Vite、pnpm 9、Vitest、SQLite + 文件缓存、TanStack Query、Zustand。

## Global Constraints

- 仓库文档、计划、状态更新和用户可见说明使用中文。
- 不沿用旧 Electron 技术结构；旧版本只作为业务需求参考。
- 当前目录 `D:\sandrew\d2-tools` 是 `tauri2-rebuild` worktree；旧 Electron 版本已在 `D:\sandrew\d2-service` 保留，当前分支允许删除旧 Electron 文件并彻底重构。
- 第一项实现任务必须先清理旧 `packages/desktop`、`packages/http` 和旧 `packages/core` 内容，再建立新 workspace。
- 第一阶段不做移动端实际功能、不做 Web/PWA 实际功能。
- 第一阶段不接 API 服务、PostgreSQL、云同步、远程账号或队列同步。
- UI 层禁止直接调用 Tauri `invoke` 或插件 API。
- `packages/data` 禁止直接 import `apps/*` 或具体 Tauri adapter。
- `packages/core` 禁止依赖 `data/platform/ui/apps`。
- 敏感 token、refresh token、AI provider key 不进入普通 SQLite。
- 文档改动后运行 `npx pnpm@9.15.0 docs:check` 和 `git diff --check`。
- 代码改动完成前至少运行相关定向测试、`npx pnpm@9.15.0 typecheck`；声称全仓通过前运行 `npx pnpm@9.15.0 test`。

---

## 文件结构总览

### 新增目录

- `apps/desktop/`：Tauri 2 桌面装配层。
- `apps/desktop/src-tauri/`：Rust 壳、Tauri 配置、权限、commands。
- `apps/desktop/src/`：React 入口、路由、providers、desktop adapter 装配。
- `packages/shared/`：通用类型、错误模型、结果模型、工具函数。
- `packages/core/`：纯业务模型和薄切片领域逻辑。
- `packages/platform/`：平台能力 contracts、mock adapter、desktop adapter。
- `packages/data/`：repository contracts、schema、migration、本地存储。
- `packages/ui/`：React primitives、layouts、薄功能组件。

### 重点创建文件

- `pnpm-workspace.yaml`：纳入 `apps/*` 和 `packages/*`。
- `tsconfig.base.json`：统一 TypeScript 基础配置。
- `vitest.config.ts`：覆盖新 workspace 包测试。
- `packages/shared/src/errors.ts`：`AppError`、`AppResult`。
- `packages/shared/src/time.ts`：时间工具。
- `packages/core/src/index.ts`：core 聚合入口。
- `packages/platform/src/contracts.ts`：平台能力 contract。
- `packages/platform/src/mock.ts`：测试用 mock platform。
- `packages/platform/src/desktop.ts`：Tauri desktop adapter。
- `packages/data/src/repositories/*.ts`：各 repository contract。
- `packages/data/src/createDataServices.ts`：data service 工厂。
- `packages/ui/src/primitives/*.tsx`：基础 UI。
- `packages/ui/src/features/*.tsx`：薄切片 UI 组件。
- `apps/desktop/src/App.tsx`：桌面 app shell。
- `apps/desktop/src/providers/AppProviders.tsx`：platform/data/query providers。
- `apps/desktop/src-tauri/src/commands/*.rs`：平台 commands。
- `apps/desktop/src-tauri/capabilities/default.json`：Tauri 权限清单。

---

### Task 1: Workspace 和基础工具链

**Files:**
- Delete: `packages/desktop/`
- Delete: `packages/http/`
- Delete: `packages/core/`
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Create: `tsconfig.base.json`
- Modify: `vitest.config.ts`
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `packages/shared/package.json`
- Create: `packages/core/package.json`
- Create: `packages/platform/package.json`
- Create: `packages/data/package.json`
- Create: `packages/ui/package.json`

**Interfaces:**
- Produces: workspace 包名 `@d2-tools/shared`、`@d2-tools/core`、`@d2-tools/platform`、`@d2-tools/data`、`@d2-tools/ui`、`@d2-tools/desktop`
- Produces: root commands `build`、`typecheck`、`test`、`docs:check`
- Consumes: pnpm 9.15.0、TypeScript、Vitest

- [ ] **Step 1: 清理旧 Electron 结构**

Run:

```powershell
$targets = @("packages/desktop", "packages/http", "packages/core")
foreach ($target in $targets) {
  $resolved = Resolve-Path -LiteralPath $target -ErrorAction SilentlyContinue
  if ($null -ne $resolved) {
    if (-not $resolved.Path.StartsWith((Resolve-Path .).Path)) {
      throw "Refusing to remove path outside workspace: $($resolved.Path)"
    }
    Remove-Item -LiteralPath $resolved.Path -Recurse -Force
  }
}
```

Expected:

```text
旧 Electron renderer/main/preload、旧 http 包和旧 core 包已从当前分支删除。
```

- [ ] **Step 2: 更新 workspace 范围**

把 `pnpm-workspace.yaml` 改成：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: 增加根 TypeScript 基础配置**

创建 `tsconfig.base.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["node", "vitest/globals"]
  }
}
```

- [ ] **Step 4: 建立每个包的最小 package.json**

每个 package 使用这个模式，按包名替换 `name`：

```json
{
  "name": "@d2-tools/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest --run"
  }
}
```

`packages/ui/package.json` 额外包含 React peer dependency：

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 5: 建立每个包的 tsconfig.json**

每个 package 使用：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src", "test"]
}
```

`apps/desktop/tsconfig.json` 使用：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 6: 更新根脚本**

确认 root `package.json` 至少包含：

```json
{
  "scripts": {
    "dev": "pnpm --filter @d2-tools/desktop dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm docs:check && pnpm -r test",
    "docs:check": "node scripts/check-doc-policy.mjs && pnpm encoding:check"
  }
}
```

- [ ] **Step 7: 运行工具链验证**

Run:

```powershell
npx pnpm@9.15.0 install
npx pnpm@9.15.0 build
npx pnpm@9.15.0 typecheck
```

Expected:

```text
所有 workspace 包完成 build/typecheck，没有 TypeScript 编译错误。
```

- [ ] **Step 8: Commit**

```powershell
git add pnpm-workspace.yaml package.json tsconfig.base.json vitest.config.ts apps packages
git commit -m "chore: scaffold tauri workspace packages"
```

---

### Task 2: Shared 基础类型和错误模型

**Files:**
- Create: `packages/shared/src/errors.ts`
- Create: `packages/shared/src/result.ts`
- Create: `packages/shared/src/time.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/test/errors.test.ts`

**Interfaces:**
- Produces: `AppErrorCode`、`AppError`、`createAppError(code, message, cause?)`
- Produces: `AppResult<T>`、`ok(value)`、`err(error)`
- Produces: `nowIso()`、`parseIsoDate(value)`
- Consumes: none

- [ ] **Step 1: 写失败测试**

创建 `packages/shared/test/errors.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { createAppError, err, ok, parseIsoDate } from "../src/index";

describe("shared error and result helpers", () => {
  it("creates typed app errors", () => {
    const error = createAppError("platform.unavailable", "平台能力不可用", {
      command: "secure_get"
    });

    expect(error.code).toBe("platform.unavailable");
    expect(error.message).toBe("平台能力不可用");
    expect(error.cause).toEqual({ command: "secure_get" });
  });

  it("creates result values", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    const failure = createAppError("data.read_failed", "读取失败");
    expect(err(failure)).toEqual({ ok: false, error: failure });
  });

  it("parses iso dates safely", () => {
    expect(parseIsoDate("2026-06-24T00:00:00.000Z")?.toISOString()).toBe(
      "2026-06-24T00:00:00.000Z"
    );
    expect(parseIsoDate("bad-date")).toBeNull();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/shared test
```

Expected:

```text
FAIL  packages/shared/test/errors.test.ts
Cannot find module '../src/index'
```

- [ ] **Step 3: 实现 shared 类型**

创建 `packages/shared/src/errors.ts`：

```ts
export type AppErrorCode =
  | "platform.unavailable"
  | "platform.permission_denied"
  | "data.read_failed"
  | "data.write_failed"
  | "auth.failed"
  | "manifest.refresh_failed"
  | "ai.request_failed";

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

export function createAppError(
  code: AppErrorCode,
  message: string,
  cause?: unknown
): AppError {
  return cause === undefined ? { code, message } : { code, message, cause };
}
```

创建 `packages/shared/src/result.ts`：

```ts
import type { AppError } from "./errors";

export type AppResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: AppError };

export function ok<T>(value: T): AppResult<T> {
  return { ok: true, value };
}

export function err<T = never>(error: AppError): AppResult<T> {
  return { ok: false, error };
}
```

创建 `packages/shared/src/time.ts`：

```ts
export function nowIso(): string {
  return new Date().toISOString();
}

export function parseIsoDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
```

创建 `packages/shared/src/index.ts`：

```ts
export * from "./errors";
export * from "./result";
export * from "./time";
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/shared test
npx pnpm@9.15.0 --filter @d2-tools/shared typecheck
```

Expected:

```text
PASS  packages/shared/test/errors.test.ts
```

- [ ] **Step 5: Commit**

```powershell
git add packages/shared
git commit -m "feat(shared): add base result and error types"
```

---

### Task 3: Core 领域薄模型

**Files:**
- Create: `packages/core/src/settings.ts`
- Create: `packages/core/src/manifest.ts`
- Create: `packages/core/src/account.ts`
- Create: `packages/core/src/vault.ts`
- Create: `packages/core/src/ai.ts`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/test/domain-models.test.ts`

**Interfaces:**
- Produces: `AppSettings`、`ManifestStatus`、`AccountSummary`、`VaultItemSummary`、`AiConversation`
- Consumes: `@d2-tools/shared`

- [ ] **Step 1: 写领域类型测试**

创建 `packages/core/test/domain-models.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  createDefaultSettings,
  summarizeVaultItems,
  type VaultItemSummary
} from "../src/index";

describe("core domain models", () => {
  it("creates default settings without secrets", () => {
    const settings = createDefaultSettings("D:/data/d2-tools");

    expect(settings.dataDir).toBe("D:/data/d2-tools");
    expect(settings.bungie.apiKeyConfigured).toBe(false);
    expect(settings.ai.providerConfigured).toBe(false);
    expect(JSON.stringify(settings)).not.toContain("token");
    expect(JSON.stringify(settings)).not.toContain("secret");
  });

  it("summarizes vault items by type", () => {
    const items: VaultItemSummary[] = [
      { instanceId: "1", itemHash: 10, name: "武器 A", type: "weapon", power: 1990 },
      { instanceId: "2", itemHash: 20, name: "护甲 A", type: "armor", power: 1980 }
    ];

    expect(summarizeVaultItems(items)).toEqual({
      total: 2,
      weapons: 1,
      armor: 1,
      other: 0
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/core test
```

Expected:

```text
FAIL  packages/core/test/domain-models.test.ts
Cannot find module '../src/index'
```

- [ ] **Step 3: 实现 core 薄模型**

创建 `packages/core/src/settings.ts`：

```ts
export interface AppSettings {
  readonly dataDir: string;
  readonly bungie: {
    readonly apiKeyConfigured: boolean;
  };
  readonly ai: {
    readonly providerConfigured: boolean;
    readonly providerId: string | null;
    readonly model: string | null;
  };
}

export function createDefaultSettings(dataDir: string): AppSettings {
  return {
    dataDir,
    bungie: { apiKeyConfigured: false },
    ai: {
      providerConfigured: false,
      providerId: null,
      model: null
    }
  };
}
```

创建 `packages/core/src/manifest.ts`：

```ts
export type ManifestStatusState = "missing" | "ready" | "refreshing" | "failed";

export interface ManifestStatus {
  readonly state: ManifestStatusState;
  readonly version: string | null;
  readonly updatedAt: string | null;
  readonly errorMessage: string | null;
}
```

创建 `packages/core/src/account.ts`：

```ts
export interface AccountSummary {
  readonly membershipId: string;
  readonly displayName: string;
  readonly characterCount: number;
  readonly lastRefreshedAt: string;
}
```

创建 `packages/core/src/vault.ts`：

```ts
export type VaultItemType = "weapon" | "armor" | "other";

export interface VaultItemSummary {
  readonly instanceId: string;
  readonly itemHash: number;
  readonly name: string;
  readonly type: VaultItemType;
  readonly power: number | null;
}

export interface VaultItemCounts {
  readonly total: number;
  readonly weapons: number;
  readonly armor: number;
  readonly other: number;
}

export function summarizeVaultItems(items: readonly VaultItemSummary[]): VaultItemCounts {
  return items.reduce<VaultItemCounts>(
    (counts, item) => ({
      total: counts.total + 1,
      weapons: counts.weapons + (item.type === "weapon" ? 1 : 0),
      armor: counts.armor + (item.type === "armor" ? 1 : 0),
      other: counts.other + (item.type === "other" ? 1 : 0)
    }),
    { total: 0, weapons: 0, armor: 0, other: 0 }
  );
}
```

创建 `packages/core/src/ai.ts`：

```ts
export interface AiMessage {
  readonly id: string;
  readonly role: "user" | "assistant" | "system";
  readonly content: string;
  readonly createdAt: string;
}

export interface AiConversation {
  readonly id: string;
  readonly title: string;
  readonly messages: readonly AiMessage[];
  readonly updatedAt: string;
}
```

创建 `packages/core/src/index.ts`：

```ts
export * from "./account";
export * from "./ai";
export * from "./manifest";
export * from "./settings";
export * from "./vault";
```

- [ ] **Step 4: 运行 core 验证**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/core test
npx pnpm@9.15.0 --filter @d2-tools/core typecheck
```

Expected:

```text
PASS  packages/core/test/domain-models.test.ts
```

- [ ] **Step 5: Commit**

```powershell
git add packages/core
git commit -m "feat(core): add foundation domain models"
```

---

### Task 4: Platform contracts 和 mock adapter

**Files:**
- Create: `packages/platform/src/contracts.ts`
- Create: `packages/platform/src/mock.ts`
- Create: `packages/platform/src/index.ts`
- Create: `packages/platform/test/mock-platform.test.ts`

**Interfaces:**
- Produces: `PlatformServices`
- Produces: `createMockPlatformServices(seed?)`
- Consumes: `@d2-tools/shared`

- [ ] **Step 1: 写 mock adapter 测试**

创建 `packages/platform/test/mock-platform.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { createMockPlatformServices } from "../src/index";

describe("mock platform services", () => {
  it("stores secure values outside normal data repositories", async () => {
    const platform = createMockPlatformServices();

    await platform.secureStore.set("bungie.refreshToken", "refresh-token");

    await expect(platform.secureStore.get("bungie.refreshToken")).resolves.toBe(
      "refresh-token"
    );
  });

  it("reads and writes app files", async () => {
    const platform = createMockPlatformServices();

    await platform.files.writeText("settings/app.json", "{\"ok\":true}");

    await expect(platform.files.readText("settings/app.json")).resolves.toBe(
      "{\"ok\":true}"
    );
  });

  it("returns app info and data dir", async () => {
    const platform = createMockPlatformServices({
      dataDir: "D:/data/d2-tools"
    });

    await expect(platform.app.getInfo()).resolves.toEqual({
      name: "d2-tools",
      version: "0.0.0",
      platform: "mock"
    });
    await expect(platform.paths.getDataDir()).resolves.toBe("D:/data/d2-tools");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/platform test
```

Expected:

```text
FAIL  packages/platform/test/mock-platform.test.ts
Cannot find module '../src/index'
```

- [ ] **Step 3: 实现 contracts**

创建 `packages/platform/src/contracts.ts`：

```ts
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
```

- [ ] **Step 4: 实现 mock adapter**

创建 `packages/platform/src/mock.ts`：

```ts
import type { AppInfo, PlatformServices } from "./contracts";

export interface MockPlatformSeed {
  readonly dataDir?: string;
  readonly appInfo?: Partial<AppInfo>;
}

export function createMockPlatformServices(seed: MockPlatformSeed = {}): PlatformServices {
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
        return { available: false, version: null };
      },
      async install() {
        logs.push("updates:install");
      }
    }
  };
}
```

创建 `packages/platform/src/index.ts`：

```ts
export * from "./contracts";
export * from "./mock";
```

- [ ] **Step 5: 运行 platform 验证**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/platform test
npx pnpm@9.15.0 --filter @d2-tools/platform typecheck
```

Expected:

```text
PASS  packages/platform/test/mock-platform.test.ts
```

- [ ] **Step 6: Commit**

```powershell
git add packages/platform
git commit -m "feat(platform): add platform service contracts"
```

---

### Task 5: Data repository contracts 和内存实现

**Files:**
- Create: `packages/data/src/repositories/settingsRepository.ts`
- Create: `packages/data/src/repositories/manifestRepository.ts`
- Create: `packages/data/src/repositories/aiRepository.ts`
- Create: `packages/data/src/createDataServices.ts`
- Create: `packages/data/src/index.ts`
- Create: `packages/data/test/data-services.test.ts`

**Interfaces:**
- Produces: `DataServices`
- Produces: `createDataServices(platform: PlatformServices): Promise<DataServices>`
- Consumes: `@d2-tools/core`、`@d2-tools/platform`

- [ ] **Step 1: 写 repository contract 测试**

创建 `packages/data/test/data-services.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { createMockPlatformServices } from "@d2-tools/platform";
import { createDataServices } from "../src/index";

describe("data services", () => {
  it("loads default settings from platform data dir", async () => {
    const platform = createMockPlatformServices({ dataDir: "D:/data/d2-tools" });
    const data = await createDataServices(platform);

    await expect(data.settings.getSettings()).resolves.toMatchObject({
      dataDir: "D:/data/d2-tools",
      bungie: { apiKeyConfigured: false },
      ai: { providerConfigured: false }
    });
  });

  it("persists settings through the file service", async () => {
    const platform = createMockPlatformServices({ dataDir: "D:/data/d2-tools" });
    const data = await createDataServices(platform);

    await data.settings.saveSettings({
      ai: { providerConfigured: true, providerId: "openai", model: "gpt-5" }
    });

    await expect(data.settings.getSettings()).resolves.toMatchObject({
      ai: { providerConfigured: true, providerId: "openai", model: "gpt-5" }
    });
  });

  it("does not persist ai keys in settings json", async () => {
    const platform = createMockPlatformServices();
    const data = await createDataServices(platform);

    await platform.secureStore.set("ai.openai.key", "secret-key");
    await data.settings.saveSettings({
      ai: { providerConfigured: true, providerId: "openai", model: "gpt-5" }
    });

    const stored = await platform.files.readText("settings/app.json");
    expect(stored).not.toContain("secret-key");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/data test
```

Expected:

```text
FAIL  packages/data/test/data-services.test.ts
Cannot find module '../src/index'
```

- [ ] **Step 3: 实现 settings repository**

创建 `packages/data/src/repositories/settingsRepository.ts`：

```ts
import { createDefaultSettings, type AppSettings } from "@d2-tools/core";
import type { PlatformServices } from "@d2-tools/platform";

export type AppSettingsPatch = Partial<{
  dataDir: string;
  bungie: Partial<AppSettings["bungie"]>;
  ai: Partial<AppSettings["ai"]>;
}>;

export interface SettingsRepository {
  getSettings(): Promise<AppSettings>;
  saveSettings(input: AppSettingsPatch): Promise<AppSettings>;
}

const SETTINGS_PATH = "settings/app.json";

export function createSettingsRepository(platform: PlatformServices): SettingsRepository {
  async function readStoredSettings(): Promise<AppSettings | null> {
    const raw = await platform.files.readText(SETTINGS_PATH);
    return raw === null ? null : (JSON.parse(raw) as AppSettings);
  }

  async function getSettings(): Promise<AppSettings> {
    const stored = await readStoredSettings();
    if (stored !== null) {
      return stored;
    }

    return createDefaultSettings(await platform.paths.getDataDir());
  }

  return {
    getSettings,
    async saveSettings(input) {
      const current = await getSettings();
      const next: AppSettings = {
        dataDir: input.dataDir ?? current.dataDir,
        bungie: {
          ...current.bungie,
          ...input.bungie
        },
        ai: {
          ...current.ai,
          ...input.ai
        }
      };

      await platform.files.writeText(SETTINGS_PATH, JSON.stringify(next, null, 2));
      return next;
    }
  };
}
```

- [ ] **Step 4: 实现 manifest 和 ai repository 最小接口**

创建 `packages/data/src/repositories/manifestRepository.ts`：

```ts
import type { ManifestStatus } from "@d2-tools/core";

export interface ManifestRepository {
  getStatus(): Promise<ManifestStatus>;
  refresh(): Promise<ManifestStatus>;
}

export function createManifestRepository(): ManifestRepository {
  let status: ManifestStatus = {
    state: "missing",
    version: null,
    updatedAt: null,
    errorMessage: null
  };

  return {
    async getStatus() {
      return status;
    },
    async refresh() {
      status = {
        state: "ready",
        version: "mock-manifest",
        updatedAt: new Date().toISOString(),
        errorMessage: null
      };
      return status;
    }
  };
}
```

创建 `packages/data/src/repositories/aiRepository.ts`：

```ts
import type { AiConversation } from "@d2-tools/core";

export interface AiRepository {
  listConversations(): Promise<readonly AiConversation[]>;
  saveConversation(conversation: AiConversation): Promise<AiConversation>;
}

export function createAiRepository(): AiRepository {
  const conversations = new Map<string, AiConversation>();

  return {
    async listConversations() {
      return Array.from(conversations.values()).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
    },
    async saveConversation(conversation) {
      conversations.set(conversation.id, conversation);
      return conversation;
    }
  };
}
```

- [ ] **Step 5: 实现 data service 工厂**

创建 `packages/data/src/createDataServices.ts`：

```ts
import type { PlatformServices } from "@d2-tools/platform";
import {
  createSettingsRepository,
  type SettingsRepository
} from "./repositories/settingsRepository";
import {
  createManifestRepository,
  type ManifestRepository
} from "./repositories/manifestRepository";
import { createAiRepository, type AiRepository } from "./repositories/aiRepository";

export interface DataServices {
  readonly settings: SettingsRepository;
  readonly manifest: ManifestRepository;
  readonly ai: AiRepository;
}

export async function createDataServices(
  platform: PlatformServices
): Promise<DataServices> {
  return {
    settings: createSettingsRepository(platform),
    manifest: createManifestRepository(),
    ai: createAiRepository()
  };
}
```

创建 `packages/data/src/index.ts`：

```ts
export * from "./createDataServices";
export * from "./repositories/aiRepository";
export * from "./repositories/manifestRepository";
export * from "./repositories/settingsRepository";
```

- [ ] **Step 6: 运行 data 验证**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/data test
npx pnpm@9.15.0 --filter @d2-tools/data typecheck
```

Expected:

```text
PASS  packages/data/test/data-services.test.ts
```

- [ ] **Step 7: Commit**

```powershell
git add packages/data
git commit -m "feat(data): add local-first repository foundation"
```

---

### Task 6: UI primitives 和薄功能组件

**Files:**
- Create: `packages/ui/src/primitives/Button.tsx`
- Create: `packages/ui/src/primitives/Panel.tsx`
- Create: `packages/ui/src/layouts/AppShell.tsx`
- Create: `packages/ui/src/features/SettingsSummary.tsx`
- Create: `packages/ui/src/features/ManifestStatusView.tsx`
- Create: `packages/ui/src/features/AiConversationList.tsx`
- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/test/ui-render.test.tsx`

**Interfaces:**
- Produces: `Button`、`Panel`、`AppShell`、`SettingsSummary`、`ManifestStatusView`、`AiConversationList`
- Consumes: `@d2-tools/core`

- [ ] **Step 1: 写 UI 渲染测试**

创建 `packages/ui/test/ui-render.test.tsx`：

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AiConversationList,
  AppShell,
  ManifestStatusView,
  SettingsSummary
} from "../src/index";

describe("ui foundation components", () => {
  it("renders app shell without platform dependencies", () => {
    const html = renderToStaticMarkup(
      <AppShell title="d2-tools">
        <span>内容</span>
      </AppShell>
    );

    expect(html).toContain("d2-tools");
    expect(html).toContain("内容");
  });

  it("renders settings summary", () => {
    const html = renderToStaticMarkup(
      <SettingsSummary
        settings={{
          dataDir: "D:/data/d2-tools",
          bungie: { apiKeyConfigured: false },
          ai: { providerConfigured: true, providerId: "openai", model: "gpt-5" }
        }}
      />
    );

    expect(html).toContain("D:/data/d2-tools");
    expect(html).toContain("gpt-5");
  });

  it("renders manifest and conversation state", () => {
    expect(
      renderToStaticMarkup(
        <ManifestStatusView
          status={{
            state: "ready",
            version: "mock-manifest",
            updatedAt: "2026-06-24T00:00:00.000Z",
            errorMessage: null
          }}
        />
      )
    ).toContain("mock-manifest");

    expect(renderToStaticMarkup(<AiConversationList conversations={[]} />)).toContain(
      "暂无会话"
    );
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/ui test
```

Expected:

```text
FAIL  packages/ui/test/ui-render.test.tsx
Cannot find module '../src/index'
```

- [ ] **Step 3: 实现 UI primitives**

创建 `packages/ui/src/primitives/Button.tsx`：

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: ReactNode;
}

export function Button({ children, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} {...props}>
      {children}
    </button>
  );
}
```

创建 `packages/ui/src/primitives/Panel.tsx`：

```tsx
import type { ReactNode } from "react";

export interface PanelProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function Panel({ title, children }: PanelProps) {
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: 实现 layouts 和 feature 组件**

创建 `packages/ui/src/layouts/AppShell.tsx`：

```tsx
import type { ReactNode } from "react";

export interface AppShellProps {
  readonly title: string;
  readonly children: ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  return (
    <main>
      <header>
        <h1>{title}</h1>
      </header>
      <div>{children}</div>
    </main>
  );
}
```

创建 `packages/ui/src/features/SettingsSummary.tsx`：

```tsx
import type { AppSettings } from "@d2-tools/core";
import { Panel } from "../primitives/Panel";

export interface SettingsSummaryProps {
  readonly settings: AppSettings;
}

export function SettingsSummary({ settings }: SettingsSummaryProps) {
  return (
    <Panel title="设置">
      <dl>
        <dt>数据目录</dt>
        <dd>{settings.dataDir}</dd>
        <dt>Bungie API</dt>
        <dd>{settings.bungie.apiKeyConfigured ? "已配置" : "未配置"}</dd>
        <dt>AI 模型</dt>
        <dd>{settings.ai.model ?? "未配置"}</dd>
      </dl>
    </Panel>
  );
}
```

创建 `packages/ui/src/features/ManifestStatusView.tsx`：

```tsx
import type { ManifestStatus } from "@d2-tools/core";
import { Panel } from "../primitives/Panel";

export interface ManifestStatusViewProps {
  readonly status: ManifestStatus;
}

export function ManifestStatusView({ status }: ManifestStatusViewProps) {
  return (
    <Panel title="Manifest">
      <p>状态：{status.state}</p>
      <p>版本：{status.version ?? "未下载"}</p>
      {status.errorMessage === null ? null : <p>错误：{status.errorMessage}</p>}
    </Panel>
  );
}
```

创建 `packages/ui/src/features/AiConversationList.tsx`：

```tsx
import type { AiConversation } from "@d2-tools/core";
import { Panel } from "../primitives/Panel";

export interface AiConversationListProps {
  readonly conversations: readonly AiConversation[];
}

export function AiConversationList({ conversations }: AiConversationListProps) {
  return (
    <Panel title="AI 会话">
      {conversations.length === 0 ? (
        <p>暂无会话</p>
      ) : (
        <ul>
          {conversations.map((conversation) => (
            <li key={conversation.id}>{conversation.title}</li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
```

创建 `packages/ui/src/index.ts`：

```ts
export * from "./features/AiConversationList";
export * from "./features/ManifestStatusView";
export * from "./features/SettingsSummary";
export * from "./layouts/AppShell";
export * from "./primitives/Button";
export * from "./primitives/Panel";
```

- [ ] **Step 5: 运行 UI 验证**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/ui test
npx pnpm@9.15.0 --filter @d2-tools/ui typecheck
```

Expected:

```text
PASS  packages/ui/test/ui-render.test.tsx
```

- [ ] **Step 6: Commit**

```powershell
git add packages/ui
git commit -m "feat(ui): add foundation components"
```

---

### Task 7: Tauri 2 桌面空壳和权限清单

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/src/main.tsx`
- Create: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/styles.css`
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src-tauri/capabilities/default.json`
- Create: `apps/desktop/src-tauri/src/main.rs`
- Create: `apps/desktop/src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `@d2-tools/desktop` scripts `dev`、`build`、`tauri`
- Consumes: `@d2-tools/ui`、`@d2-tools/data`、`@d2-tools/platform`

- [ ] **Step 1: 创建桌面 package**

`apps/desktop/package.json`：

```json
{
  "name": "@d2-tools/desktop",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -p tsconfig.json && vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest --run",
    "tauri": "tauri",
    "dev:desktop": "tauri dev",
    "package:desktop": "tauri build"
  },
  "dependencies": {
    "@d2-tools/core": "workspace:*",
    "@d2-tools/data": "workspace:*",
    "@d2-tools/platform": "workspace:*",
    "@d2-tools/ui": "workspace:*",
    "@tauri-apps/api": "^2.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.3"
  }
}
```

- [ ] **Step 2: 创建 Vite 入口**

`apps/desktop/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>d2-tools</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/desktop/vite.config.ts`：

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  }
});
```

- [ ] **Step 3: 创建 React 空壳**

`apps/desktop/src/main.tsx`：

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`apps/desktop/src/App.tsx`：

```tsx
import { AppShell } from "@d2-tools/ui";

export function App() {
  return (
    <AppShell title="d2-tools">
      <p>Tauri 2 架构底座</p>
    </AppShell>
  );
}
```

`apps/desktop/src/styles.css`：

```css
:root {
  color: #202124;
  background: #f6f7f9;
  font-family: Inter, "Segoe UI", sans-serif;
}

body {
  margin: 0;
}

main {
  min-height: 100vh;
  padding: 24px;
}
```

- [ ] **Step 4: 创建 Tauri 配置和权限清单**

`apps/desktop/src-tauri/tauri.conf.json`：

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "d2-tools",
  "version": "0.0.0",
  "identifier": "com.d2tools.app",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "devUrl": "http://127.0.0.1:5173",
    "beforeBuildCommand": "pnpm build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "d2-tools",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 720
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis"]
  }
}
```

`apps/desktop/src-tauri/capabilities/default.json`：

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default permissions for d2-tools desktop shell",
  "windows": ["main"],
  "permissions": ["core:default", "shell:allow-open"]
}
```

- [ ] **Step 5: 创建 Rust 空壳**

`apps/desktop/src-tauri/Cargo.toml`：

```toml
[package]
name = "d2-tools"
version = "0.0.0"
description = "d2-tools desktop"
edition = "2021"

[lib]
name = "d2_tools_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

`apps/desktop/src-tauri/src/main.rs`：

```rust
fn main() {
    d2_tools_lib::run();
}
```

`apps/desktop/src-tauri/src/lib.rs`：

```rust
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("failed to run d2-tools desktop app");
}
```

- [ ] **Step 6: 验证桌面构建**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop build
npx pnpm@9.15.0 --filter @d2-tools/desktop typecheck
```

Expected:

```text
Vite build 成功，TypeScript 无错误。
```

- [ ] **Step 7: 手动启动验证**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop dev:desktop
```

Expected:

```text
Tauri 窗口打开，首屏显示 d2-tools 和 Tauri 2 架构底座。
```

- [ ] **Step 8: Commit**

```powershell
git add apps/desktop
git commit -m "feat(desktop): add tauri shell"
```

---

### Task 8: Desktop platform adapter 和 Tauri commands

**Files:**
- Create: `packages/platform/src/desktop.ts`
- Modify: `packages/platform/src/index.ts`
- Create: `apps/desktop/src/platform/createDesktopPlatform.ts`
- Create: `apps/desktop/src-tauri/src/commands/app.rs`
- Create: `apps/desktop/src-tauri/src/commands/path.rs`
- Create: `apps/desktop/src-tauri/src/commands/secure.rs`
- Create: `apps/desktop/src-tauri/src/commands/log.rs`
- Create: `apps/desktop/src-tauri/src/commands/mod.rs`
- Modify: `apps/desktop/src-tauri/src/lib.rs`

**Interfaces:**
- Produces: `createDesktopPlatformServices(): PlatformServices`
- Produces Tauri commands: `app_get_info`、`path_get_data_dir`、`secure_get`、`secure_set`、`secure_delete`、`log_write`、`log_export`
- Consumes: Tauri `invoke`

- [ ] **Step 1: 实现 desktop adapter**

创建 `packages/platform/src/desktop.ts`：

```ts
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
      writeText: (path, content) => invoke<void>("fs_write_app_file", { path, content })
    },
    logs: {
      write: (level, message) => invoke<void>("log_write", { level, message }),
      export: () => invoke<string>("log_export")
    },
    external: {
      openExternal: (url) => invoke<void>("open_external", { url })
    },
    updates: {
      check: () => invoke<{ available: boolean; version: string | null }>("updates_check"),
      install: () => invoke<void>("updates_install")
    }
  };
}
```

修改 `packages/platform/src/index.ts`：

```ts
export * from "./contracts";
export * from "./desktop";
export * from "./mock";
```

- [ ] **Step 2: 实现 Rust app/path commands**

`apps/desktop/src-tauri/src/commands/app.rs`：

```rust
use serde::Serialize;

#[derive(Serialize)]
pub struct AppInfo {
    name: String,
    version: String,
    platform: String,
}

#[tauri::command]
pub fn app_get_info() -> AppInfo {
    AppInfo {
        name: "d2-tools".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: "desktop".to_string(),
    }
}
```

`apps/desktop/src-tauri/src/commands/path.rs`：

```rust
#[tauri::command]
pub fn path_get_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;

    std::fs::create_dir_all(&path).map_err(|error| error.to_string())?;
    Ok(path.to_string_lossy().to_string())
}
```

- [ ] **Step 3: 实现 secure/log commands 的最小文件兜底**

`apps/desktop/src-tauri/src/commands/secure.rs`：

```rust
use std::collections::HashMap;
use std::sync::Mutex;

pub struct SecureStoreState(pub Mutex<HashMap<String, String>>);

#[tauri::command]
pub fn secure_get(key: String, state: tauri::State<SecureStoreState>) -> Option<String> {
    state.0.lock().ok()?.get(&key).cloned()
}

#[tauri::command]
pub fn secure_set(
    key: String,
    value: String,
    state: tauri::State<SecureStoreState>,
) -> Result<(), String> {
    state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .insert(key, value);
    Ok(())
}

#[tauri::command]
pub fn secure_delete(key: String, state: tauri::State<SecureStoreState>) -> Result<(), String> {
    state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .remove(&key);
    Ok(())
}
```

`apps/desktop/src-tauri/src/commands/log.rs`：

```rust
use std::sync::Mutex;

pub struct LogState(pub Mutex<Vec<String>>);

#[tauri::command]
pub fn log_write(
    level: String,
    message: String,
    state: tauri::State<LogState>,
) -> Result<(), String> {
    state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .push(format!("{level}:{message}"));
    Ok(())
}

#[tauri::command]
pub fn log_export(state: tauri::State<LogState>) -> Result<String, String> {
    Ok(state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .join("\n"))
}
```

- [ ] **Step 4: 注册 commands**

`apps/desktop/src-tauri/src/commands/mod.rs`：

```rust
pub mod app;
pub mod log;
pub mod path;
pub mod secure;
```

修改 `apps/desktop/src-tauri/src/lib.rs`：

```rust
mod commands;

use commands::log::LogState;
use commands::secure::SecureStoreState;
use std::collections::HashMap;
use std::sync::Mutex;

pub fn run() {
    tauri::Builder::default()
        .manage(SecureStoreState(Mutex::new(HashMap::new())))
        .manage(LogState(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![
            commands::app::app_get_info,
            commands::path::path_get_data_dir,
            commands::secure::secure_get,
            commands::secure::secure_set,
            commands::secure::secure_delete,
            commands::log::log_write,
            commands::log::log_export
        ])
        .run(tauri::generate_context!())
        .expect("failed to run d2-tools desktop app");
}
```

- [ ] **Step 5: 创建 app 侧 adapter 工厂**

`apps/desktop/src/platform/createDesktopPlatform.ts`：

```ts
import { createDesktopPlatformServices } from "@d2-tools/platform";

export function createDesktopPlatform() {
  return createDesktopPlatformServices();
}
```

- [ ] **Step 6: 验证 desktop platform 构建**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/platform typecheck
npx pnpm@9.15.0 --filter @d2-tools/desktop build
```

Expected:

```text
platform typecheck 通过，desktop build 通过。
```

- [ ] **Step 7: Commit**

```powershell
git add packages/platform apps/desktop
git commit -m "feat(desktop): connect platform commands"
```

---

### Task 9: Desktop data/provider 装配和薄首页

**Files:**
- Create: `apps/desktop/src/providers/AppServicesContext.tsx`
- Create: `apps/desktop/src/providers/AppProviders.tsx`
- Modify: `apps/desktop/src/App.tsx`
- Create: `apps/desktop/src/App.test.tsx`

**Interfaces:**
- Produces: `useAppServices()`
- Consumes: `createDesktopPlatform()`、`createDataServices(platform)`
- Consumes UI components: `SettingsSummary`、`ManifestStatusView`、`AiConversationList`

- [ ] **Step 1: 写 provider 渲染测试**

创建 `apps/desktop/src/App.test.tsx`：

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createMockPlatformServices } from "@d2-tools/platform";
import { App } from "./App";

describe("desktop app", () => {
  it("renders the foundation dashboard", async () => {
    const platform = createMockPlatformServices({ dataDir: "D:/data/d2-tools" });
    const html = renderToStaticMarkup(<App platform={platform} />);

    expect(html).toContain("d2-tools");
    expect(html).toContain("架构底座");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop test
```

Expected:

```text
FAIL  apps/desktop/src/App.test.tsx
App 不接受 platform 参数或测试文件不存在。
```

- [ ] **Step 3: 创建 services context**

`apps/desktop/src/providers/AppServicesContext.tsx`：

```tsx
import { createContext, useContext } from "react";
import type { DataServices } from "@d2-tools/data";
import type { PlatformServices } from "@d2-tools/platform";

export interface AppServices {
  readonly platform: PlatformServices;
  readonly data: DataServices | null;
}

export const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (services === null) {
    throw new Error("AppServicesContext is not available");
  }
  return services;
}
```

`apps/desktop/src/providers/AppProviders.tsx`：

```tsx
import { useEffect, useState, type ReactNode } from "react";
import { createDataServices, type DataServices } from "@d2-tools/data";
import type { PlatformServices } from "@d2-tools/platform";
import { AppServicesContext } from "./AppServicesContext";

export interface AppProvidersProps {
  readonly platform: PlatformServices;
  readonly children: ReactNode;
}

export function AppProviders({ platform, children }: AppProvidersProps) {
  const [data, setData] = useState<DataServices | null>(null);

  useEffect(() => {
    let active = true;

    void createDataServices(platform).then((services) => {
      if (active) {
        setData(services);
      }
    });

    return () => {
      active = false;
    };
  }, [platform]);

  return (
    <AppServicesContext.Provider value={{ platform, data }}>
      {children}
    </AppServicesContext.Provider>
  );
}
```

- [ ] **Step 4: 改造 App 支持注入 platform**

`apps/desktop/src/App.tsx`：

```tsx
import { useEffect, useState } from "react";
import type { AppSettings, ManifestStatus } from "@d2-tools/core";
import type { PlatformServices } from "@d2-tools/platform";
import {
  AiConversationList,
  AppShell,
  ManifestStatusView,
  SettingsSummary
} from "@d2-tools/ui";
import { createDataServices } from "@d2-tools/data";
import { createDesktopPlatform } from "./platform/createDesktopPlatform";

export interface AppProps {
  readonly platform?: PlatformServices;
}

export function App({ platform = createDesktopPlatform() }: AppProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [manifest, setManifest] = useState<ManifestStatus | null>(null);

  useEffect(() => {
    let active = true;

    void createDataServices(platform).then(async (data) => {
      const [nextSettings, nextManifest] = await Promise.all([
        data.settings.getSettings(),
        data.manifest.getStatus()
      ]);

      if (active) {
        setSettings(nextSettings);
        setManifest(nextManifest);
      }
    });

    return () => {
      active = false;
    };
  }, [platform]);

  return (
    <AppShell title="d2-tools">
      <p>架构底座</p>
      {settings === null ? <p>正在读取设置</p> : <SettingsSummary settings={settings} />}
      {manifest === null ? null : <ManifestStatusView status={manifest} />}
      <AiConversationList conversations={[]} />
    </AppShell>
  );
}
```

- [ ] **Step 5: 运行 app 验证**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop test
npx pnpm@9.15.0 --filter @d2-tools/desktop typecheck
```

Expected:

```text
PASS  apps/desktop/src/App.test.tsx
```

- [ ] **Step 6: 手动启动验证**

Run:

```powershell
npx pnpm@9.15.0 --filter @d2-tools/desktop dev:desktop
```

Expected:

```text
桌面窗口显示 d2-tools、架构底座、设置、Manifest、AI 会话区域。
```

- [ ] **Step 7: Commit**

```powershell
git add apps/desktop
git commit -m "feat(desktop): render foundation dashboard"
```

---

### Task 10: 架构边界测试

**Files:**
- Create: `test/architecture-boundaries.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**
- Produces: 测试规则阻止错误依赖方向
- Consumes: workspace 文件路径

- [ ] **Step 1: 写边界测试**

创建 `test/architecture-boundaries.test.ts`：

```ts
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { globSync } from "glob";

const root = process.cwd();

function readSourceFiles(scope: string): Array<{ path: string; content: string }> {
  return globSync(`${scope}/**/*.{ts,tsx}`, {
    cwd: root,
    ignore: ["**/dist/**", "**/node_modules/**"]
  }).map((path) => ({
    path,
    content: readFileSync(join(root, path), "utf8")
  }));
}

function expectNoImport(scope: string, forbidden: RegExp, reason: string) {
  const offenders = readSourceFiles(scope).filter((file) => forbidden.test(file.content));
  expect(
    offenders.map((file) => `${relative(root, join(root, file.path))}: ${reason}`)
  ).toEqual([]);
}

describe("architecture boundaries", () => {
  it("core does not depend on platform, data, ui, or apps", () => {
    expectNoImport(
      "packages/core/src",
      /from\s+["'](@d2-tools\/(platform|data|ui)|\.\.\/\.\.\/apps)/,
      "core must stay platform independent"
    );
  });

  it("ui does not import tauri or app code", () => {
    expectNoImport(
      "packages/ui/src",
      /from\s+["'](@tauri-apps\/|.*apps\/desktop)/,
      "ui must not call platform APIs directly"
    );
  });

  it("data does not import app code or tauri", () => {
    expectNoImport(
      "packages/data/src",
      /from\s+["'](@tauri-apps\/|.*apps\/desktop)/,
      "data must use platform contracts only"
    );
  });

  it("desktop app exists", () => {
    expect(existsSync(join(root, "apps/desktop/src-tauri/tauri.conf.json"))).toBe(true);
  });
});
```

- [ ] **Step 2: 安装 glob 开发依赖**

Run:

```powershell
npx pnpm@9.15.0 add -D glob -w
```

Expected:

```text
root devDependencies 出现 glob。
```

- [ ] **Step 3: 运行边界测试**

Run:

```powershell
npx pnpm@9.15.0 vitest --run test/architecture-boundaries.test.ts
```

Expected:

```text
PASS  test/architecture-boundaries.test.ts
```

- [ ] **Step 4: Commit**

```powershell
git add package.json pnpm-lock.yaml test/architecture-boundaries.test.ts vitest.config.ts
git commit -m "test: enforce architecture boundaries"
```

---

### Task 11: 文档和验证收口

**Files:**
- Modify: `docs/todo.md`
- Modify: `docs/development.md`
- Modify: `docs/work/backlog/2026-06-24-tauri2-rebuild-design.md`
- Create: `docs/work/backlog/2026-06-24-tauri2-architecture-foundation-plan.md`

**Interfaces:**
- Produces: 当前架构底座状态、开发命令、边界说明
- Consumes: Task 1-10 的实际落地文件

- [ ] **Step 1: 更新 `docs/development.md` 技术栈和结构**

在 `docs/development.md` 的技术栈和仓库结构中记录：

```markdown
- 桌面框架：Tauri 2
- 前端：React + TypeScript + Vite
- 包结构：`apps/desktop`、`packages/core`、`packages/data`、`packages/platform`、`packages/ui`、`packages/shared`
- 第一阶段不启用远程账号、PostgreSQL、队列同步或云同步
```

- [ ] **Step 2: 更新 `docs/todo.md` 验收状态**

把 `P0 · Tauri 2 架构底座重构` 的状态补充为：

```markdown
**当前状态** M1-M4 架构底座任务已按计划拆分；实现时按 `docs/work/backlog/2026-06-24-tauri2-architecture-foundation-plan.md` 执行。
```

实现完成后再把状态改为：

```markdown
**当前状态** 架构底座已落地：workspace、包边界、Tauri 壳、platform contract、data repository、UI 薄切片和边界测试已通过。
```

- [ ] **Step 3: 运行文档检查**

Run:

```powershell
npx pnpm@9.15.0 docs:check
git diff --check
```

Expected:

```text
Documentation policy check passed.
Encoding check passed.
git diff --check 无尾随空格错误。
```

- [ ] **Step 4: 运行全量验证**

Run:

```powershell
npx pnpm@9.15.0 typecheck
npx pnpm@9.15.0 test
```

Expected:

```text
typecheck 通过。
test 通过，包含 docs:check、包测试和架构边界测试。
```

- [ ] **Step 5: Commit**

```powershell
git add docs
git commit -m "docs: document tauri foundation implementation"
```

---

## Self-Review

### Spec coverage

- 阶段边界：Task 1、Task 7、Task 11 覆盖。
- 包架构：Task 1、Task 10 覆盖。
- Tauri 平台底座：Task 7、Task 8 覆盖。
- 数据层底座：Task 5 覆盖。
- UI 层和装配：Task 6、Task 9 覆盖。
- OAuth 和安全：Task 4、Task 8 定义安全存储 contract 和最小 command；完整 OAuth 在后续薄功能任务继续扩展。
- AI 边界：Task 3、Task 5、Task 6 覆盖 AI 会话和 provider 配置基础。
- 架构里程碑 M1-M4：Task 1-11 覆盖。

### Placeholder scan

本计划没有遗留未决标记。所有任务都有明确文件、接口、命令和预期结果。

### Type consistency

- `AppSettings` 在 Task 3 定义，Task 5、Task 6、Task 9 使用同一结构。
- `PlatformServices` 在 Task 4 定义，Task 5、Task 8、Task 9 使用同一结构。
- `DataServices` 在 Task 5 定义，Task 9 使用同一结构。
- `ManifestStatus`、`AiConversation` 均由 Task 3 统一导出。

---

## Execution Handoff

Plan complete and saved to `docs/work/backlog/2026-06-24-tauri2-architecture-foundation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
