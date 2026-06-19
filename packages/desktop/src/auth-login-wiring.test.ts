import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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
    const apiClient = readFileSync(
      join(desktopRoot, "src", "renderer", "api", "client.ts"),
      "utf8"
    );
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.cts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");

    expect(homePage).toContain("loginBungie()");
    expect(homePage).toContain("loadAccountSummary()");
    expect(homePage).toContain("props.onConfigure");
    expect(app).toContain("setIsConfiguring(true)");
    expect(wizardPage).toContain("api.getConfig()");
    expect(apiClient).toContain("loginBungie(): Promise");
    expect(apiClient).toContain("getAccountSummary(): Promise");
    expect(preload).toContain('ipcRenderer.invoke("auth:login")');
    expect(preload).toContain('ipcRenderer.invoke("account:summary")');
    expect(ipc).toContain('ipcMain.handle("auth:login"');
    expect(ipc).toContain('ipcMain.handle("account:summary"');
    expect(ipc).toContain('ipcMain.handle("startup:get", async');
    expect(ipc).toContain("getStartupAuthStatus(config)");
    expect(ipc).toContain("loadFreshOAuthToken");
    expect(ipc).toContain("refreshBungieOAuthToken");
  });
});
