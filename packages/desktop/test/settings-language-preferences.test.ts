import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const desktopRoot = join(repoRoot, "packages", "desktop");
const coreRoot = join(repoRoot, "packages", "core");
const uiRoot = join(repoRoot, "packages", "ui");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("settings language preferences", () => {
  it("persists interface locale and manifest locale through the desktop config contract", () => {
    const schema = read(join(coreRoot, "src", "config", "schema.ts"));
    const defaults = read(join(coreRoot, "src", "config", "defaults.ts"));
    const configApi = read(join(desktopRoot, "src", "renderer", "api", "configApi.ts"));
    const diagnosticsModel = read(join(desktopRoot, "src", "renderer", "features", "settings", "diagnosticsModel.ts"));

    expect(schema).toContain('interface_locale: "zh-CN" | "en-US"');
    expect(schema).toContain("manifest_language_follows_interface: boolean");
    expect(defaults).toContain('interface_locale: "zh-CN"');
    expect(defaults).toContain("manifest_language_follows_interface: true");
    expect(configApi).toContain('interface_locale: "zh-CN" | "en-US"');
    expect(diagnosticsModel).toContain("saveLanguagePreferences");
    expect(diagnosticsModel).toContain("manifest_language_follows_interface");
  });

  it("renders language controls in settings and wires shell locale from saved preferences", () => {
    const settingsPage = [
      read(join(uiRoot, "src", "settings", "SettingsPageContentView.tsx")),
      read(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"))
    ].join("\n");
    const diagnosticsHook = read(join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettings.ts"));
    const homePage = read(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"));
    const productShell = read(join(desktopRoot, "src", "renderer", "pages", "useDesktopProductShell.tsx"));

    expect(settingsPage).toContain('type SettingsSectionKey = "overview" | "language"');
    expect(settingsPage).toContain('id="settings-language"');
    expect(settingsPage).toContain("界面语言");
    expect(settingsPage).toContain("资料库语言");
    expect(settingsPage).toContain("跟随界面语言");
    expect(settingsPage).toContain("onLanguagePreferencesChange");
    expect(diagnosticsHook).toContain("languagePreferences");
    expect(diagnosticsHook).toContain("saveLanguagePreferences");
    expect(productShell).toContain("const productPreferences: ProductPreferences");
    expect(homePage).toContain("preferences={shell.productPreferences}");
    expect(productShell).toContain("handleProductPreferencesChange");
    expect(productShell).toContain("diagnostics.saveLanguagePreferences");
  });
});
