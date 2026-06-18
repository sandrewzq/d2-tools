import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("desktop config help copy", () => {
  it("explains how Bungie application fields map to d2-service fields", () => {
    const wizardPage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "WizardPage.tsx"),
      "utf8"
    );

    expect(wizardPage).toContain("不知道填哪个");
    expect(wizardPage).toContain("应用程序介面金钥");
    expect(wizardPage).toContain("Bungie API Key");
    expect(wizardPage).toContain("开放授权 client_id");
    expect(wizardPage).toContain("Bungie Client ID");
    expect(wizardPage).toContain("开放授权 client_secret");
    expect(wizardPage).toContain("Bungie Client Secret");
    expect(wizardPage).toContain("不要填写");
    expect(wizardPage).toContain("https://127.0.0.1:28780/oauth/callback");
  });
});
