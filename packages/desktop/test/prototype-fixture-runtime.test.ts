import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function read(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

describe("prototype fixture runtime", () => {
  it("keeps large prototype fixture data out of the app entry", () => {
    const main = read("packages/prototype/src/main.tsx");
    const runtimePath = join(repoRoot, "packages", "prototype", "src", "fixtures", "usePrototypeFixtureRuntime.ts");

    expect(existsSync(runtimePath)).toBe(true);
    expect(main).toContain("usePrototypeFixtureRuntime");
    expect(main).not.toContain("const prototypeAccountSummary");
    expect(main).not.toContain("const prototypeLoadoutTemplates");
    expect(main).not.toContain("const prototypeLibraryItems");
    expect(main).not.toContain("const prototypeLibraryPerks");
    expect(main).not.toContain("function prototypeAccountItem");
  });

  it("keeps prototype page model assembly inside the fixture runtime", () => {
    const main = read("packages/prototype/src/main.tsx");
    const runtime = read("packages/prototype/src/fixtures/usePrototypeFixtureRuntime.ts");
    const pageModelSelectors = [
      "selectHomePageModel",
      "selectAccountPageModel",
      "selectVaultPageModel",
      "selectLoadoutsPageModel",
      "selectLibraryPageModel",
      "selectVendorsPageModel",
      "selectSettingsPageModel"
    ];

    for (const selector of pageModelSelectors) {
      expect(main).not.toContain(selector);
      expect(runtime).toContain(selector);
    }

    expect(main).toContain("fixture.createHomePageModel");
    expect(main).toContain("fixture.createAccountPageModel");
    expect(main).toContain("fixture.createVaultPageModel");
    expect(main).toContain("fixture.createLoadoutsPageModel");
    expect(main).toContain("fixture.createLibraryPageModel");
    expect(main).toContain("fixture.createSettingsPageModel");
    expect(main).toContain("model={fixture.vendorsModel}");
  });

  it("keeps prototype assistant mock content inside the fixture runtime", () => {
    const main = read("packages/prototype/src/main.tsx");
    const runtime = read("packages/prototype/src/fixtures/usePrototypeFixtureRuntime.ts");

    expect(main).toContain("fixture.assistantInitialMessages");
    expect(main).toContain("fixture.assistantQuickPrompts");
    expect(main).toContain("fixture.createAssistantContext");
    expect(main).toContain("fixture.createAssistantContextChip");
    expect(main).toContain("fixture.createAssistantReply");
    expect(main).not.toContain("prototypeAssistantPrompts");
    expect(main).not.toContain("getPrototypeAssistantContext");
    expect(main).not.toContain("getPrototypeAssistantReply");
    expect(main).not.toContain("getPrototypeAssistantFocus");
    expect(main).not.toContain("getPrototypeAssistantBullets");
    expect(main).not.toContain("我已经读取当前页面上下文");
    expect(runtime).toContain("prototypeAssistantQuickPrompts");
    expect(runtime).toContain("createPrototypeAssistantContext");
    expect(runtime).toContain("createPrototypeAssistantReply");
  });
});

describe("web fixture runtime", () => {
  it("keeps large web fixture data out of the web app entry", () => {
    const main = read("packages/web/src/main.tsx");
    const runtimePath = join(repoRoot, "packages", "web", "src", "fixtures", "useWebFixtureRuntime.ts");

    expect(existsSync(runtimePath)).toBe(true);
    expect(main).toContain("useWebFixtureRuntime");
    expect(main).not.toContain("const webAccountSummary");
    expect(main).not.toContain("const webLoadoutTemplates");
    expect(main).not.toContain("const webLibraryItems");
    expect(main).not.toContain("const webLibraryPerks");
  });

  it("keeps web page model assembly inside the fixture runtime", () => {
    const main = read("packages/web/src/main.tsx");
    const runtime = read("packages/web/src/fixtures/useWebFixtureRuntime.ts");
    const pageModelSelectors = [
      "selectHomePageModel",
      "selectAccountPageModel",
      "selectVaultPageModel",
      "selectLoadoutsPageModel",
      "selectLibraryPageModel",
      "selectVendorsPageModel",
      "selectSettingsPageModel"
    ];

    for (const selector of pageModelSelectors) {
      expect(main).not.toContain(selector);
      expect(runtime).toContain(selector);
    }

    expect(main).toContain("fixture.createHomePageModel");
    expect(main).toContain("fixture.createAccountPageModel");
    expect(main).toContain("fixture.createVaultPageModel");
    expect(main).toContain("fixture.createLoadoutsPageModel");
    expect(main).toContain("fixture.createLibraryPageModel");
    expect(main).toContain("fixture.createSettingsPageModel");
    expect(main).toContain("model={fixture.vendorsModel}");
  });

  it("keeps web assistant mock content inside the fixture runtime", () => {
    const main = read("packages/web/src/main.tsx");
    const runtime = read("packages/web/src/fixtures/useWebFixtureRuntime.ts");

    expect(main).toContain("fixture.assistantInitialMessages");
    expect(main).toContain("fixture.assistantQuickPrompts");
    expect(main).toContain("fixture.createAssistantContext");
    expect(main).toContain("fixture.createAssistantContextChip");
    expect(main).toContain("fixture.createAssistantReply");
    expect(main).not.toContain("Web 入口已接入共享 AI 助手界面");
    expect(main).not.toContain("这是 Web adapter 的 mock 回复");
    expect(main).not.toContain("quickPrompts={[");
    expect(main).not.toContain("首页哪些状态需要优先看");
    expect(runtime).toContain("webAssistantQuickPrompts");
    expect(runtime).toContain("createWebAssistantContext");
    expect(runtime).toContain("createWebAssistantReply");
  });
});
