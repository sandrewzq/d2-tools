import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("new feature UI polish", () => {
  it("keeps new GUI features understandable for non-technical players", () => {
    const accountPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"), "utf8");
    const libraryPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "library", "LibraryPage.tsx"), "utf8");
    const settingsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "SettingsPage.tsx"), "utf8");
    const itemDetailModal = readFileSync(join(desktopRoot, "src", "renderer", "shared", "components", "ItemDetailModal.tsx"), "utf8");
    const itemDetailHook = readFileSync(join(desktopRoot, "src", "renderer", "shared", "hooks", "useItemDetailWorkspace.ts"), "utf8");

    expect(libraryPage).toContain("未找到匹配结果");
    expect(accountPage).toContain("保存当前装备为模板");
    expect(settingsPage).toContain("复制脱敏诊断");
    expect(itemDetailModal).toContain("复制转移计划");
    expect(itemDetailHook).toContain("说明：这只是计划，不会执行 Bungie 写操作。");
    expect(libraryPage).toContain("别名会保存在本机");
  });
});
