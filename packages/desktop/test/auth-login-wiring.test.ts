import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("desktop Bungie login wiring", () => {
  it("wires the account card through preload to the main auth handler", () => {
    const productShell = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "useDesktopProductShell.tsx"),
      "utf8"
    );
    const app = readFileSync(join(desktopRoot, "src", "renderer", "App.tsx"), "utf8");
    const wizardPage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "WizardPage.tsx"),
      "utf8"
    );
    const statusOverview = readFileSync(join(desktopRoot, "src", "renderer", "components", "StatusOverview.tsx"), "utf8");
    const apiClient = readRendererApiContracts(desktopRoot);
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const authIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "auth.ts"), "utf8");
    const accountIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "account.ts"), "utf8");
    const startupIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "startup.ts"), "utf8");
    const authSession = readFileSync(join(desktopRoot, "src", "main", "ipc", "authSession.ts"), "utf8");

    expect(productShell).toContain("loginBungie()");
    expect(productShell).toContain("loadAccountSummary()");
    expect(productShell).toContain("props.onConfigure");
    expect(app).toContain("setIsConfiguring(true)");
    expect(app).toContain("if (isConfiguring)");
    expect(app).not.toContain('state.nextStep === "bungie-config"');
    expect(statusOverview).toContain('props.state.cards.bungieConfig.status !== "ready"');
    expect(statusOverview).toContain("先配置 Bungie");
    expect(statusOverview).toContain("accountActionHandler");
    expect(statusOverview).toContain("props.onLoadAccount");
    expect(statusOverview).toContain("读取账号");
    expect(statusOverview).toContain("重试读取");
    expect(wizardPage).toContain("api.getConfig()");
    expect(apiClient).toContain("loginBungie(): Promise");
    expect(apiClient).toContain("getAccountSummary(): Promise");
    expect(preload).toContain('ipcRenderer.invoke("auth:login")');
    expect(preload).toContain('ipcRenderer.invoke("account:summary")');
    expect(authIpc).toContain('ipcMain.handle("auth:login"');
    expect(accountIpc).toContain('ipcMain.handle("account:summary"');
    expect(startupIpc).toContain('ipcMain.handle("startup:get", async');
    expect(startupIpc).toContain("getStartupAuthStatus(config)");
    expect(startupIpc).toContain("hasRequiredDefinitionCacheFiles");
    expect(startupIpc).toContain("loadManifestMetadataCache");
    expect(startupIpc).not.toContain("hasRequiredDefinitionComponents");
    expect(startupIpc).not.toContain("getManifestStatus");
    expect(authSession).toContain("loadFreshOAuthToken");
    expect(authSession).toContain("refreshBungieOAuthToken");
  });

  it("shows a recoverable startup error instead of staying on the splash text forever", () => {
    const app = readFileSync(join(desktopRoot, "src", "renderer", "App.tsx"), "utf8");

    expect(app).toContain("startupError");
    expect(app).toContain("启动状态读取失败");
    expect(app).toContain("重试启动检查");
    expect(app).toContain("catch");
  });

  it("keeps Bungie login single-flight and translates callback port conflicts", () => {
    const authIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "auth.ts"), "utf8");

    expect(authIpc).toContain("authLoginPromise");
    expect(authIpc).toContain("runBungieLogin");
    expect(authIpc).toContain("normalizeAuthLoginStartupError");
    expect(authIpc).toContain("EADDRINUSE");
    expect(authIpc).toContain("Bungie 登录回调端口");
    expect(authIpc).toContain("已被占用");
    expect(authIpc).not.toContain("async () => {\n    const config = loadConfig()");
  });
});
