# Phase 0 Local GUI Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable Windows GUI shell for `d2-service`: double-click app, first-run configuration wizard, local config persistence, health checks, OAuth callback listener stub, and green-package output.

**Architecture:** Use Electron as the primary Windows desktop shell. Keep Destiny 2 business logic out of the renderer by putting config, state checks, health, logging, and OAuth callback lifecycle in typed main-process/core modules exposed through a small IPC bridge. CLI, HTTP, and MCP remain advanced entry points, but phase 0 only creates the app foundation and verifies the ordinary user path.

**Tech Stack:** Node.js 22, TypeScript, Electron, Vite, React, Vitest, electron-builder, pnpm.

---

## Scope

Phase 0 implements the local GUI bootstrap only:

- Electron main process and React renderer.
- Green package build target.
- `%APPDATA%\d2-service` data directory resolution.
- `config.json` read/write with defaults.
- `.env > config.json > defaults` precedence.
- First-run wizard state machine.
- GUI health status.
- Local HTTP health endpoint.
- OAuth callback listener stub on `127.0.0.1:28780`.
- Basic local logging with secret redaction.

Phase 0 does not implement real Bungie OAuth token exchange, Manifest download, item search, profile queries, MCP tools, or AI analysis.

## File Structure

Create this structure:

```text
d2-service/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  .gitignore
  .env.example
  electron-builder.yml
  packages/
    core/
      package.json
      tsconfig.json
      src/
        config/defaults.ts
        config/env.ts
        config/schema.ts
        config/store.ts
        health/health.ts
        logging/logger.ts
        oauth/callbackServer.ts
        startup/startupState.ts
      test/
        config.store.test.ts
        startup.state.test.ts
        oauth.callbackServer.test.ts
    desktop/
      package.json
      tsconfig.json
      index.html
      vite.config.ts
      src/
        main/main.ts
        main/ipc.ts
        preload/preload.ts
        renderer/App.tsx
        renderer/main.tsx
        renderer/styles.css
        renderer/api/client.ts
        renderer/components/StatusCard.tsx
        renderer/pages/WizardPage.tsx
        renderer/pages/HomePage.tsx
    http/
      package.json
      tsconfig.json
      src/server.ts
      test/health.server.test.ts
```

Responsibilities:

- `packages/core`: deterministic local app logic. No Electron imports.
- `packages/desktop`: Electron shell, IPC bridge, React UI.
- `packages/http`: localhost health endpoint for advanced integrations.
- Root files: workspace, build, lint, test, and packaging commands.

## Task 1: Workspace And Toolchain

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `electron-builder.yml`

- [ ] **Step 1: Create root package files**

Create `package.json`:

```json
{
  "name": "d2-service",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "pnpm --filter @d2-service/desktop dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "package:win": "pnpm --filter @d2-service/desktop package:win"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "baseUrl": ".",
    "paths": {
      "@d2-service/core": ["packages/core/src/index.ts"],
      "@d2-service/http": ["packages/http/src/server.ts"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node"]
  }
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
release/
out/
.env
.local-data/
coverage/
*.log
```

Create `.env.example`:

```env
BUNGIE_API_KEY=
BUNGIE_CLIENT_ID=
BUNGIE_CLIENT_SECRET=
BUNGIE_REDIRECT_URI=http://127.0.0.1:28780/oauth/callback
D2_DATA_DIR=
D2_MANIFEST_LANGUAGE=zh-chs
AI_PROVIDER=
AI_API_KEY=
AI_MODEL=
```

Create `electron-builder.yml`:

```yaml
appId: local.d2-service.desktop
productName: d2-service
directories:
  output: release
files:
  - "dist/**"
  - "package.json"
win:
  target:
    - target: zip
      arch:
        - x64
artifactName: "d2-service-win-x64-${version}.${ext}"
```

- [ ] **Step 2: Install dependencies**

Run:

```powershell
pnpm install
```

Expected: a `pnpm-lock.yaml` file is created and the command exits with code 0.

- [ ] **Step 3: Commit**

```powershell
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore .env.example electron-builder.yml pnpm-lock.yaml
git commit -m "chore: initialize workspace tooling"
```

## Task 2: Core Package And Configuration Store

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/config/defaults.ts`
- Create: `packages/core/src/config/schema.ts`
- Create: `packages/core/src/config/env.ts`
- Create: `packages/core/src/config/store.ts`
- Create: `packages/core/src/index.ts`
- Test: `packages/core/test/config.store.test.ts`

- [ ] **Step 1: Create the failing config tests**

Create `packages/core/test/config.store.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, saveConfig } from "../src/config/store";

describe("config store", () => {
  it("creates defaults in the selected data directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));
    const config = loadConfig({ dataDir: dir, env: {} });

    expect(config.data.data_dir).toBe(dir);
    expect(config.bungie.redirect_uri).toBe("http://127.0.0.1:28780/oauth/callback");
    expect(config.data.manifest_language).toBe("zh-chs");
  });

  it("persists GUI-provided Bungie credentials without logging them", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));

    saveConfig(
      {
        bungie: {
          api_key: "api",
          client_id: "client",
          client_secret: "secret",
          redirect_uri: "http://127.0.0.1:28780/oauth/callback"
        },
        data: {
          data_dir: dir,
          manifest_language: "zh-chs"
        },
        ai: {
          provider: "",
          api_key: "",
          model: ""
        }
      },
      { dataDir: dir }
    );

    const raw = readFileSync(join(dir, "config.json"), "utf8");
    expect(raw).toContain("\"client_secret\": \"secret\"");

    const loaded = loadConfig({ dataDir: dir, env: {} });
    expect(loaded.bungie.client_secret).toBe("secret");
  });

  it("lets env override config values", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-service-config-"));
    saveConfig(
      {
        bungie: {
          api_key: "from-config",
          client_id: "client",
          client_secret: "secret",
          redirect_uri: "http://127.0.0.1:28780/oauth/callback"
        },
        data: {
          data_dir: dir,
          manifest_language: "zh-chs"
        },
        ai: {
          provider: "",
          api_key: "",
          model: ""
        }
      },
      { dataDir: dir }
    );

    const loaded = loadConfig({
      dataDir: dir,
      env: {
        BUNGIE_API_KEY: "from-env",
        D2_MANIFEST_LANGUAGE: "en"
      }
    });

    expect(loaded.bungie.api_key).toBe("from-env");
    expect(loaded.data.manifest_language).toBe("en");
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
pnpm --filter @d2-service/core test -- --run packages/core/test/config.store.test.ts
```

Expected: FAIL because `@d2-service/core` and `loadConfig` do not exist yet.

- [ ] **Step 3: Implement the core config package**

Create `packages/core/package.json`:

```json
{
  "name": "@d2-service/core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest"
  }
}
```

Create `packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "types": ["node", "vitest"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

Create `packages/core/src/config/schema.ts`:

```ts
export type D2Config = {
  bungie: {
    api_key: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
  };
  data: {
    data_dir: string;
    manifest_language: string;
  };
  ai: {
    provider: string;
    api_key: string;
    model: string;
  };
};

export type ConfigEnv = Partial<Record<
  | "BUNGIE_API_KEY"
  | "BUNGIE_CLIENT_ID"
  | "BUNGIE_CLIENT_SECRET"
  | "BUNGIE_REDIRECT_URI"
  | "D2_DATA_DIR"
  | "D2_MANIFEST_LANGUAGE"
  | "AI_PROVIDER"
  | "AI_API_KEY"
  | "AI_MODEL",
  string
>>;
```

Create `packages/core/src/config/defaults.ts`:

```ts
import { join } from "node:path";
import { homedir } from "node:os";
import type { D2Config } from "./schema";

export function defaultDataDir(): string {
  return process.env.APPDATA
    ? join(process.env.APPDATA, "d2-service")
    : join(homedir(), ".d2-service");
}

export function defaultConfig(dataDir = defaultDataDir()): D2Config {
  return {
    bungie: {
      api_key: "",
      client_id: "",
      client_secret: "",
      redirect_uri: "http://127.0.0.1:28780/oauth/callback"
    },
    data: {
      data_dir: dataDir,
      manifest_language: "zh-chs"
    },
    ai: {
      provider: "",
      api_key: "",
      model: ""
    }
  };
}
```

Create `packages/core/src/config/env.ts`:

```ts
import type { ConfigEnv, D2Config } from "./schema";

export function applyEnvOverrides(config: D2Config, env: ConfigEnv): D2Config {
  return {
    bungie: {
      api_key: env.BUNGIE_API_KEY ?? config.bungie.api_key,
      client_id: env.BUNGIE_CLIENT_ID ?? config.bungie.client_id,
      client_secret: env.BUNGIE_CLIENT_SECRET ?? config.bungie.client_secret,
      redirect_uri: env.BUNGIE_REDIRECT_URI ?? config.bungie.redirect_uri
    },
    data: {
      data_dir: env.D2_DATA_DIR ?? config.data.data_dir,
      manifest_language: env.D2_MANIFEST_LANGUAGE ?? config.data.manifest_language
    },
    ai: {
      provider: env.AI_PROVIDER ?? config.ai.provider,
      api_key: env.AI_API_KEY ?? config.ai.api_key,
      model: env.AI_MODEL ?? config.ai.model
    }
  };
}
```

Create `packages/core/src/config/store.ts`:

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyEnvOverrides } from "./env";
import { defaultConfig, defaultDataDir } from "./defaults";
import type { ConfigEnv, D2Config } from "./schema";

export type ConfigStoreOptions = {
  dataDir?: string;
  env?: ConfigEnv;
};

export function configPath(dataDir: string): string {
  return join(dataDir, "config.json");
}

export function loadConfig(options: ConfigStoreOptions = {}): D2Config {
  const selectedDataDir = options.dataDir ?? options.env?.D2_DATA_DIR ?? defaultDataDir();
  mkdirSync(selectedDataDir, { recursive: true });

  const path = configPath(selectedDataDir);
  const base = existsSync(path)
    ? ({ ...defaultConfig(selectedDataDir), ...JSON.parse(readFileSync(path, "utf8")) } as D2Config)
    : defaultConfig(selectedDataDir);

  base.data.data_dir = selectedDataDir;
  return applyEnvOverrides(base, options.env ?? process.env);
}

export function saveConfig(config: D2Config, options: { dataDir?: string } = {}): void {
  const selectedDataDir = options.dataDir ?? config.data.data_dir ?? defaultDataDir();
  mkdirSync(selectedDataDir, { recursive: true });
  writeFileSync(configPath(selectedDataDir), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
```

Create `packages/core/src/index.ts`:

```ts
export * from "./config/defaults";
export * from "./config/env";
export * from "./config/schema";
export * from "./config/store";
```

- [ ] **Step 4: Run config tests**

Run:

```powershell
pnpm --filter @d2-service/core test -- --run packages/core/test/config.store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/core
git commit -m "feat: add local configuration store"
```

## Task 3: Startup State And Health

**Files:**
- Create: `packages/core/src/startup/startupState.ts`
- Create: `packages/core/src/health/health.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/startup.state.test.ts`

- [ ] **Step 1: Write startup state tests**

Create `packages/core/test/startup.state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { D2Config } from "../src/config/schema";
import { computeStartupState } from "../src/startup/startupState";

function config(overrides: Partial<D2Config["bungie"]> = {}): D2Config {
  return {
    bungie: {
      api_key: "",
      client_id: "",
      client_secret: "",
      redirect_uri: "http://127.0.0.1:28780/oauth/callback",
      ...overrides
    },
    data: {
      data_dir: "C:/Users/test/AppData/Roaming/d2-service",
      manifest_language: "zh-chs"
    },
    ai: {
      provider: "",
      api_key: "",
      model: ""
    }
  };
}

describe("startup state", () => {
  it("requires Bungie config when credentials are missing", () => {
    expect(computeStartupState({ config: config(), hasToken: false, hasManifest: false }).nextStep)
      .toBe("bungie-config");
  });

  it("requires login when Bungie config exists but token is absent", () => {
    expect(computeStartupState({
      config: config({ api_key: "api", client_id: "client", client_secret: "secret" }),
      hasToken: false,
      hasManifest: false
    }).nextStep).toBe("login");
  });

  it("allows degraded home when manifest is absent", () => {
    const state = computeStartupState({
      config: config({ api_key: "api", client_id: "client", client_secret: "secret" }),
      hasToken: true,
      hasManifest: false
    });

    expect(state.nextStep).toBe("home");
    expect(state.cards.manifest.status).toBe("missing");
  });
});
```

- [ ] **Step 2: Run startup tests and verify failure**

Run:

```powershell
pnpm --filter @d2-service/core test -- --run packages/core/test/startup.state.test.ts
```

Expected: FAIL because `computeStartupState` does not exist.

- [ ] **Step 3: Implement startup state and health**

Create `packages/core/src/startup/startupState.ts`:

```ts
import type { D2Config } from "../config/schema";

export type StartupStep = "bungie-config" | "login" | "home";
export type StatusValue = "ready" | "missing" | "skipped";

export type StartupState = {
  nextStep: StartupStep;
  cards: {
    bungieConfig: { status: StatusValue; label: string };
    account: { status: StatusValue; label: string };
    manifest: { status: StatusValue; label: string };
    ai: { status: StatusValue; label: string };
  };
};

export function hasRequiredBungieConfig(config: D2Config): boolean {
  return Boolean(
    config.bungie.api_key.trim()
      && config.bungie.client_id.trim()
      && config.bungie.client_secret.trim()
      && config.bungie.redirect_uri.trim()
  );
}

export function computeStartupState(input: {
  config: D2Config;
  hasToken: boolean;
  hasManifest: boolean;
}): StartupState {
  const bungieReady = hasRequiredBungieConfig(input.config);

  return {
    nextStep: !bungieReady ? "bungie-config" : !input.hasToken ? "login" : "home",
    cards: {
      bungieConfig: {
        status: bungieReady ? "ready" : "missing",
        label: bungieReady ? "Bungie configuration complete" : "Bungie configuration required"
      },
      account: {
        status: input.hasToken ? "ready" : "missing",
        label: input.hasToken ? "Bungie account connected" : "Bungie login required"
      },
      manifest: {
        status: input.hasManifest ? "ready" : "missing",
        label: input.hasManifest ? "Manifest initialized" : "Manifest not initialized"
      },
      ai: {
        status: input.config.ai.provider.trim() ? "ready" : "skipped",
        label: input.config.ai.provider.trim() ? "AI configured" : "AI not configured"
      }
    }
  };
}
```

Create `packages/core/src/health/health.ts`:

```ts
export type HealthStatus = {
  ok: true;
  service: "d2-service";
  version: string;
  timestamp: string;
};

export function getHealth(version = "0.1.0"): HealthStatus {
  return {
    ok: true,
    service: "d2-service",
    version,
    timestamp: new Date().toISOString()
  };
}
```

Modify `packages/core/src/index.ts`:

```ts
export * from "./config/defaults";
export * from "./config/env";
export * from "./config/schema";
export * from "./config/store";
export * from "./health/health";
export * from "./startup/startupState";
```

- [ ] **Step 4: Run startup tests**

Run:

```powershell
pnpm --filter @d2-service/core test -- --run packages/core/test/startup.state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/core/src/startup packages/core/src/health packages/core/test/startup.state.test.ts
git commit -m "feat: add startup state model"
```

## Task 4: OAuth Callback Listener Stub

**Files:**
- Create: `packages/core/src/oauth/callbackServer.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/oauth.callbackServer.test.ts`

- [ ] **Step 1: Write callback server tests**

Create `packages/core/test/oauth.callbackServer.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { startOAuthCallbackServer } from "../src/oauth/callbackServer";

describe("OAuth callback server", () => {
  it("accepts a callback code and closes cleanly", async () => {
    const server = await startOAuthCallbackServer({ host: "127.0.0.1", port: 0 });
    const url = `${server.origin}/oauth/callback?code=abc&state=xyz`;

    const response = await fetch(url);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("Bungie login received");
    expect(await server.waitForCallback()).toEqual({ code: "abc", state: "xyz" });

    await server.close();
  });

  it("returns a helpful page when code is missing", async () => {
    const server = await startOAuthCallbackServer({ host: "127.0.0.1", port: 0 });
    const response = await fetch(`${server.origin}/oauth/callback`);

    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Missing OAuth code");

    await server.close();
  });
});
```

- [ ] **Step 2: Run callback tests and verify failure**

Run:

```powershell
pnpm --filter @d2-service/core test -- --run packages/core/test/oauth.callbackServer.test.ts
```

Expected: FAIL because `startOAuthCallbackServer` does not exist.

- [ ] **Step 3: Implement callback server**

Create `packages/core/src/oauth/callbackServer.ts`:

```ts
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";

export type OAuthCallback = {
  code: string;
  state: string | null;
};

export type OAuthCallbackServer = {
  origin: string;
  waitForCallback(): Promise<OAuthCallback>;
  close(): Promise<void>;
};

export async function startOAuthCallbackServer(options: {
  host: string;
  port: number;
}): Promise<OAuthCallbackServer> {
  let resolveCallback: (value: OAuthCallback) => void;
  const callbackPromise = new Promise<OAuthCallback>((resolve) => {
    resolveCallback = resolve;
  });

  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${options.host}`);

    if (url.pathname !== "/oauth/callback") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      response.end("<h1>Missing OAuth code</h1><p>Return to d2-service and try login again.</p>");
      return;
    }

    resolveCallback({ code, state });
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end("<h1>Bungie login received</h1><p>You can return to d2-service.</p>");
  });

  await new Promise<void>((resolve) => server.listen(options.port, options.host, resolve));
  const address = server.address() as AddressInfo;

  return {
    origin: `http://${options.host}:${address.port}`,
    waitForCallback: () => callbackPromise,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}
```

Modify `packages/core/src/index.ts`:

```ts
export * from "./config/defaults";
export * from "./config/env";
export * from "./config/schema";
export * from "./config/store";
export * from "./health/health";
export * from "./oauth/callbackServer";
export * from "./startup/startupState";
```

- [ ] **Step 4: Run callback tests**

Run:

```powershell
pnpm --filter @d2-service/core test -- --run packages/core/test/oauth.callbackServer.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/core/src/oauth packages/core/test/oauth.callbackServer.test.ts
git commit -m "feat: add OAuth callback listener"
```

## Task 5: HTTP Health Package

**Files:**
- Create: `packages/http/package.json`
- Create: `packages/http/tsconfig.json`
- Create: `packages/http/src/server.ts`
- Test: `packages/http/test/health.server.test.ts`

- [ ] **Step 1: Write health server tests**

Create `packages/http/test/health.server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { startHealthServer } from "../src/server";

describe("health server", () => {
  it("responds on /api/v1/health", async () => {
    const server = await startHealthServer({ host: "127.0.0.1", port: 0 });
    const response = await fetch(`${server.origin}/api/v1/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.service).toBe("d2-service");

    await server.close();
  });
});
```

- [ ] **Step 2: Run health server tests and verify failure**

Run:

```powershell
pnpm --filter @d2-service/http test -- --run packages/http/test/health.server.test.ts
```

Expected: FAIL because `@d2-service/http` does not exist.

- [ ] **Step 3: Implement HTTP package**

Create `packages/http/package.json`:

```json
{
  "name": "@d2-service/http",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "@d2-service/core": "workspace:*"
  }
}
```

Create `packages/http/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node", "vitest"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

Create `packages/http/src/server.ts`:

```ts
import { createServer, type Server } from "node:http";
import { AddressInfo } from "node:net";
import { getHealth } from "@d2-service/core";

export type HealthServer = {
  origin: string;
  close(): Promise<void>;
};

export async function startHealthServer(options: {
  host: string;
  port: number;
}): Promise<HealthServer> {
  const server: Server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${options.host}`);

    if (url.pathname === "/api/v1/health") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(getHealth()));
      return;
    }

    response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error_code: "NOT_FOUND" }));
  });

  await new Promise<void>((resolve) => server.listen(options.port, options.host, resolve));
  const address = server.address() as AddressInfo;

  return {
    origin: `http://${options.host}:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}
```

- [ ] **Step 4: Run HTTP tests**

Run:

```powershell
pnpm --filter @d2-service/http test -- --run packages/http/test/health.server.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/http
git commit -m "feat: add local health endpoint"
```

## Task 6: Electron Desktop Shell And IPC

**Files:**
- Create: `packages/desktop/package.json`
- Create: `packages/desktop/tsconfig.json`
- Create: `packages/desktop/vite.config.ts`
- Create: `packages/desktop/index.html`
- Create: `packages/desktop/src/main/main.ts`
- Create: `packages/desktop/src/main/ipc.ts`
- Create: `packages/desktop/src/preload/preload.ts`

- [ ] **Step 1: Create desktop package metadata**

Create `packages/desktop/package.json`:

```json
{
  "name": "@d2-service/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/main/main.js",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build && tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest",
    "package:win": "pnpm build && electron-builder --config ../../electron-builder.yml --win zip"
  },
  "dependencies": {
    "@d2-service/core": "workspace:*",
    "@d2-service/http": "workspace:*",
    "@vitejs/plugin-react": "^4.3.4",
    "electron": "^33.2.1",
    "electron-builder": "^25.1.8",
    "vite": "^6.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2"
  }
}
```

Create `packages/desktop/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node", "electron"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

Create `packages/desktop/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: ".",
  plugins: [react()],
  build: {
    outDir: "dist/renderer",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(currentDir, "index.html")
    }
  }
});
```

Create `packages/desktop/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>d2-service</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create IPC contract**

Create `packages/desktop/src/main/ipc.ts`:

```ts
import { ipcMain } from "electron";
import { computeStartupState, getHealth, loadConfig, saveConfig } from "@d2-service/core";

export function registerIpcHandlers(): void {
  ipcMain.handle("health:get", () => getHealth());

  ipcMain.handle("config:get", () => loadConfig());

  ipcMain.handle("config:save", (_event, config) => {
    saveConfig(config);
    return loadConfig();
  });

  ipcMain.handle("startup:get", () => {
    const config = loadConfig();
    return computeStartupState({
      config,
      hasToken: false,
      hasManifest: false
    });
  });
}
```

Create `packages/desktop/src/preload/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("d2", {
  getHealth: () => ipcRenderer.invoke("health:get"),
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (config: unknown) => ipcRenderer.invoke("config:save", config),
  getStartupState: () => ipcRenderer.invoke("startup:get")
});
```

Create `packages/desktop/src/main/main.ts`:

```ts
import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";

const isDev = process.env.NODE_ENV === "development";
const currentDir = fileURLToPath(new URL(".", import.meta.url));

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 980,
    minHeight: 680,
    title: "d2-service",
    webPreferences: {
      preload: join(currentDir, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    await window.loadURL("http://127.0.0.1:5173");
  } else {
    await window.loadFile(join(currentDir, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  void createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
```

- [ ] **Step 3: Run typecheck**

Run:

```powershell
pnpm --filter @d2-service/desktop typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add packages/desktop
git commit -m "feat: add Electron shell and IPC"
```

## Task 7: Renderer Wizard And Home UI

**Files:**
- Create: `packages/desktop/src/renderer/main.tsx`
- Create: `packages/desktop/src/renderer/App.tsx`
- Create: `packages/desktop/src/renderer/api/client.ts`
- Create: `packages/desktop/src/renderer/components/StatusCard.tsx`
- Create: `packages/desktop/src/renderer/pages/WizardPage.tsx`
- Create: `packages/desktop/src/renderer/pages/HomePage.tsx`
- Create: `packages/desktop/src/renderer/styles.css`

- [ ] **Step 1: Create renderer API types**

Create `packages/desktop/src/renderer/api/client.ts`:

```ts
declare global {
  interface Window {
    d2: {
      getHealth(): Promise<{ ok: true; service: string; version: string; timestamp: string }>;
      getConfig(): Promise<any>;
      saveConfig(config: unknown): Promise<any>;
      getStartupState(): Promise<any>;
    };
  }
}

export const api = window.d2;
```

- [ ] **Step 2: Create UI components**

Create `packages/desktop/src/renderer/components/StatusCard.tsx`:

```tsx
export type StatusCardProps = {
  title: string;
  status: "ready" | "missing" | "skipped";
  label: string;
  action?: string;
};

export function StatusCard(props: StatusCardProps) {
  return (
    <section className={`status-card status-${props.status}`}>
      <div>
        <h3>{props.title}</h3>
        <p>{props.label}</p>
      </div>
      {props.action ? <button type="button">{props.action}</button> : null}
    </section>
  );
}
```

Create `packages/desktop/src/renderer/pages/WizardPage.tsx`:

```tsx
import { useState } from "react";
import { api } from "../api/client";

export function WizardPage({ onSaved }: { onSaved: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [message, setMessage] = useState("");

  async function save() {
    const current = await api.getConfig();
    await api.saveConfig({
      ...current,
      bungie: {
        ...current.bungie,
        api_key: apiKey,
        client_id: clientId,
        client_secret: clientSecret
      }
    });
    setMessage("配置已保存。下一步将接入 Bungie 登录。");
    onSaved();
  }

  return (
    <main className="page">
      <h1>欢迎使用 d2-service</h1>
      <p>这是本地 Destiny 2 工具，配置和 token 都保存在你的电脑上。</p>
      <label>
        Bungie API Key
        <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
      </label>
      <label>
        Bungie Client ID
        <input value={clientId} onChange={(event) => setClientId(event.target.value)} />
      </label>
      <label>
        Bungie Client Secret
        <input
          value={clientSecret}
          onChange={(event) => setClientSecret(event.target.value)}
          type="password"
        />
      </label>
      <button type="button" onClick={save}>保存配置</button>
      {message ? <p className="notice">{message}</p> : null}
    </main>
  );
}
```

Create `packages/desktop/src/renderer/pages/HomePage.tsx`:

```tsx
import { StatusCard } from "../components/StatusCard";

export function HomePage({ state }: { state: any }) {
  return (
    <main className="page">
      <h1>d2-service</h1>
      <p>今日面板会在后续阶段接入遗失区域、商人、角色和 AI 摘要。</p>
      <div className="status-grid">
        <StatusCard title="Bungie 配置" {...state.cards.bungieConfig} action="去配置" />
        <StatusCard title="账号登录" {...state.cards.account} action="登录 Bungie" />
        <StatusCard title="资料库" {...state.cards.manifest} action="初始化" />
        <StatusCard title="AI" {...state.cards.ai} action="配置 AI" />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create app root and styles**

Create `packages/desktop/src/renderer/App.tsx`:

```tsx
import { useEffect, useState } from "react";
import { api } from "./api/client";
import { HomePage } from "./pages/HomePage";
import { WizardPage } from "./pages/WizardPage";

export function App() {
  const [state, setState] = useState<any | null>(null);

  async function refresh() {
    setState(await api.getStartupState());
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (!state) return <main className="page">正在启动 d2-service...</main>;

  if (state.nextStep === "bungie-config") {
    return <WizardPage onSaved={() => void refresh()} />;
  }

  return <HomePage state={state} />;
}
```

Create `packages/desktop/src/renderer/main.tsx`:

```tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<App />);
```

Create `packages/desktop/src/renderer/styles.css`:

```css
:root {
  color: #eceff4;
  background: #12151b;
  font-family: "Segoe UI", system-ui, sans-serif;
}

body {
  margin: 0;
}

button,
input {
  font: inherit;
}

.page {
  max-width: 1040px;
  margin: 0 auto;
  padding: 32px;
}

label {
  display: grid;
  gap: 8px;
  margin: 16px 0;
}

input {
  padding: 10px 12px;
  border: 1px solid #384152;
  border-radius: 6px;
  color: #eceff4;
  background: #1a1f2a;
}

button {
  padding: 10px 14px;
  border: 0;
  border-radius: 6px;
  color: #10131a;
  background: #8bd3ff;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.status-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #303848;
  border-radius: 8px;
  background: #181d27;
}

.status-ready {
  border-color: #4f9d69;
}

.status-missing {
  border-color: #c26b5a;
}

.status-skipped {
  border-color: #8a8f9c;
}

.notice {
  color: #8bd3ff;
}
```

- [ ] **Step 4: Run renderer typecheck**

Run:

```powershell
pnpm --filter @d2-service/desktop typecheck
```

Expected: PASS.

- [ ] **Step 5: Run desktop dev app**

Run:

```powershell
pnpm dev
```

Expected: Vite starts on `127.0.0.1:5173`. Electron launching is added in Task 8 through `dev:electron`.

- [ ] **Step 6: Commit**

```powershell
git add packages/desktop/src/renderer
git commit -m "feat: add first-run renderer UI"
```

## Task 8: Dev Launcher And Green Package Build

**Files:**
- Modify: `packages/desktop/package.json`
- Modify: `packages/desktop/src/main/main.ts`

- [ ] **Step 1: Add Electron dev launcher scripts**

Modify `packages/desktop/package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "dev:electron": "set NODE_ENV=development&& electron dist/main/main.js",
    "build": "vite build && tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest",
    "package:win": "pnpm build && electron-builder --config ../../electron-builder.yml --win zip"
  }
}
```

- [ ] **Step 2: Build desktop package**

Run:

```powershell
pnpm --filter @d2-service/desktop build
```

Expected: PASS and `packages/desktop/dist` exists.

- [ ] **Step 3: Launch Electron in dev mode**

In terminal 1:

```powershell
pnpm --filter @d2-service/desktop dev
```

In terminal 2:

```powershell
pnpm --filter @d2-service/desktop dev:electron
```

Expected: Electron opens a window. With no config, it shows the welcome/config wizard.

- [ ] **Step 4: Build green package**

Run:

```powershell
pnpm package:win
```

Expected: `release/d2-service-win-x64-0.1.0.zip` exists.

- [ ] **Step 5: Commit**

```powershell
git add packages/desktop/package.json packages/desktop/src/main/main.ts release
git commit -m "build: add Windows green package output"
```

If the generated `release` zip is too large for the repository policy, do not commit `release`; instead add `release/` to `.gitignore`, commit the build config, and record the artifact path in the final verification notes.

## Task 9: Logging With Secret Redaction

**Files:**
- Create: `packages/core/src/logging/logger.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/logger.test.ts`

- [ ] **Step 1: Write logger tests**

Create `packages/core/test/logger.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { redactSecrets } from "../src/logging/logger";

describe("logger redaction", () => {
  it("redacts known secret fields", () => {
    const output = redactSecrets({
      api_key: "api",
      client_secret: "secret",
      refresh_token: "refresh",
      message: "safe"
    });

    expect(output).toEqual({
      api_key: "[REDACTED]",
      client_secret: "[REDACTED]",
      refresh_token: "[REDACTED]",
      message: "safe"
    });
  });
});
```

- [ ] **Step 2: Run logger test and verify failure**

Run:

```powershell
pnpm --filter @d2-service/core test -- --run packages/core/test/logger.test.ts
```

Expected: FAIL because `redactSecrets` does not exist.

- [ ] **Step 3: Implement redaction**

Create `packages/core/src/logging/logger.ts`:

```ts
const secretKeys = new Set([
  "api_key",
  "client_secret",
  "access_token",
  "refresh_token",
  "AI_API_KEY",
  "BUNGIE_API_KEY",
  "BUNGIE_CLIENT_SECRET"
]);

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        secretKeys.has(key) ? "[REDACTED]" : redactSecrets(nested)
      ])
    ) as T;
  }

  return value;
}
```

Modify `packages/core/src/index.ts`:

```ts
export * from "./config/defaults";
export * from "./config/env";
export * from "./config/schema";
export * from "./config/store";
export * from "./health/health";
export * from "./logging/logger";
export * from "./oauth/callbackServer";
export * from "./startup/startupState";
```

- [ ] **Step 4: Run logger test**

Run:

```powershell
pnpm --filter @d2-service/core test -- --run packages/core/test/logger.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add packages/core/src/logging packages/core/test/logger.test.ts
git commit -m "feat: redact secrets in diagnostics"
```

## Task 10: Phase 0 Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Create README for local bootstrap**

Create `README.md`:

````markdown
# d2-service

Windows local Destiny 2 assistant.

## Development

```powershell
pnpm install
pnpm test
pnpm typecheck
pnpm --filter @d2-service/desktop build
```

## Run the GUI in development

Terminal 1:

```powershell
pnpm --filter @d2-service/desktop dev
```

Terminal 2:

```powershell
pnpm --filter @d2-service/desktop build
pnpm --filter @d2-service/desktop dev:electron
```

## User data

Runtime data is stored under `%APPDATA%\d2-service`.

Do not commit `.env`, `config.json`, token files, SQLite databases, logs, or packaged release artifacts.
````

- [ ] **Step 2: Run full verification**

Run:

```powershell
pnpm test
pnpm typecheck
pnpm --filter @d2-service/desktop build
pnpm package:win
```

Expected:

- Tests pass.
- Typecheck passes.
- Desktop build exits with code 0.
- A Windows zip artifact is produced under `release/`.

- [ ] **Step 3: Check working tree**

Run:

```powershell
git status --short
```

Expected: only intentional README or build config changes are present. Do not commit generated release archives unless the project owner explicitly wants binary artifacts in Git.

- [ ] **Step 4: Commit**

```powershell
git add README.md
git commit -m "docs: add phase 0 bootstrap instructions"
```

## Self-Review Checklist

- Spec coverage:
  - Electron GUI first: Tasks 6, 7, 8.
  - Green package: Tasks 1 and 8.
  - First-run configuration wizard: Tasks 2, 3, 7.
  - Config variables and precedence: Task 2.
  - OAuth callback listener explanation and stub: Task 4.
  - Health checks: Tasks 3 and 5.
  - Logging and secret redaction: Task 9.
- Placeholder scan:
  - The plan contains no open implementation blanks.
  - Any future Bungie/Manifest/AI features are explicitly out of phase 0 scope.
- Type consistency:
  - `D2Config`, `loadConfig`, `saveConfig`, `computeStartupState`, `startOAuthCallbackServer`, and `startHealthServer` names are consistent across tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-phase-0-local-gui-bootstrap.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
