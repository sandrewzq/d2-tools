import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readItemDetailSources } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const uiRoot = fileURLToPath(new URL("../../ui", import.meta.url));

describe("new feature UI polish", () => {
  it("keeps new GUI features understandable for non-technical players", () => {
    const accountPage = [
      readFileSync(join(uiRoot, "src", "account", "AccountPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"), "utf8")
    ].join("\n");
    const libraryPage = [
      readFileSync(join(uiRoot, "src", "library", "LibraryPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "library", "LibraryPage.tsx"), "utf8")
    ].join("\n");
    const settingsPage = [
      readFileSync(join(uiRoot, "src", "settings", "SettingsPageContentView.tsx"), "utf8"),
      readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"), "utf8")
    ].join("\n");
    const itemDetailModal = readItemDetailSources(desktopRoot);
    const itemDetailHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"), "utf8");

    expect(libraryPage).toContain("未找到匹配结果");
    expect(accountPage).toContain("保存当前装备为模板");
    expect(settingsPage).toContain("复制脱敏诊断");
    expect(itemDetailModal).toContain("复制转移计划");
    expect(itemDetailHook).toContain("说明：这只是计划，不会执行 Bungie 写操作。");
    expect(libraryPage).toContain("别名会保存在本机");
  });
});
