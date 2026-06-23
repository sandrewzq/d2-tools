import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("desktop Bungie login wiring", () => {
  it("wires the account card through preload to the main auth handler", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );
    const app = readFileSync(join(desktopRoot, "src", "renderer", "App.tsx"), "utf8");
    const wizardPage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "WizardPage.tsx"),
      "utf8"
    );
    const apiClient = readRendererApiContracts(desktopRoot);
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const authIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "auth.ts"), "utf8");
    const accountIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "account.ts"), "utf8");
    const startupIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "startup.ts"), "utf8");
    const authSession = readFileSync(join(desktopRoot, "src", "main", "ipc", "authSession.ts"), "utf8");

    expect(homePage).toContain("loginBungie()");
    expect(homePage).toContain("loadAccountSummary()");
    expect(homePage).toContain("props.onConfigure");
    expect(app).toContain("setIsConfiguring(true)");
    expect(wizardPage).toContain("api.getConfig()");
    expect(apiClient).toContain("loginBungie(): Promise");
    expect(apiClient).toContain("getAccountSummary(): Promise");
    expect(preload).toContain('ipcRenderer.invoke("auth:login")');
    expect(preload).toContain('ipcRenderer.invoke("account:summary")');
    expect(authIpc).toContain('ipcMain.handle("auth:login"');
    expect(accountIpc).toContain('ipcMain.handle("account:summary"');
    expect(startupIpc).toContain('ipcMain.handle("startup:get", async');
    expect(startupIpc).toContain("getStartupAuthStatus(config)");
    expect(authSession).toContain("loadFreshOAuthToken");
    expect(authSession).toContain("refreshBungieOAuthToken");
  });
});
