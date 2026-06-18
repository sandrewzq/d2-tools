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
    const apiClient = readFileSync(
      join(desktopRoot, "src", "renderer", "api", "client.ts"),
      "utf8"
    );
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.cts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");

    expect(homePage).toContain("loginBungie()");
    expect(apiClient).toContain("loginBungie(): Promise");
    expect(preload).toContain('ipcRenderer.invoke("auth:login")');
    expect(ipc).toContain('ipcMain.handle("auth:login"');
  });
});
