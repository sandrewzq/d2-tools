import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readItemDetailSources, readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const uiRoot = join(desktopRoot, "..", "ui", "src");

describe("local target rules wiring", () => {
  it("wires persisted local target rules through desktop and renderer layers", () => {
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc", "targets.ts"), "utf8");
    const ipcRegister = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const apiContracts = readRendererApiContracts(desktopRoot);
    const productShell = readFileSync(join(desktopRoot, "src", "renderer", "pages", "useDesktopProductShell.tsx"), "utf8");
    const accountHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "account", "useAccountWorkspace.ts"),
      "utf8"
    );
    const vaultPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "VaultPage.tsx"), "utf8");
    const vaultContent = readFileSync(join(uiRoot, "vault", "VaultPageContentView.tsx"), "utf8");
    const targetPanel = readFileSync(join(uiRoot, "vault", "VaultTargetRulesPanel.tsx"), "utf8");

    expect(preload).toContain('ipcRenderer.invoke("targets:get")');
    expect(preload).toContain('ipcRenderer.invoke("targets:save"');
    expect(preload).toContain('ipcRenderer.invoke("targets:clear")');
    expect(ipc).toContain('ipcMain.handle("targets:get"');
    expect(ipc).toContain('ipcMain.handle("targets:save"');
    expect(ipc).toContain('ipcMain.handle("targets:clear"');
    expect(ipcRegister).toContain("registerTargetRulesIpcHandlers()");
    expect(apiContracts).toContain("getLocalTargetRules");
    expect(apiContracts).toContain("saveLocalTargetRules");
    expect(apiContracts).toContain("clearLocalTargetRules");
    expect(productShell).toContain("localTargetRules");
    expect(productShell).not.toContain("loadPersistedTargetRules");
    expect(productShell).not.toContain("api.getLocalTargetRules()");
    expect(accountHook).toContain("loadAccountWorkspace(services)");
    expect(accountHook).toContain("targetRules");
    expect(vaultContent).toContain("VaultTargetRulesPanel");
    expect(vaultPage).toContain("targetRulesActions");
    expect(vaultPage).toContain("api.searchPerks");
    expect(targetPanel).toContain("本地目标规则");
    expect(targetPanel).toContain("武器 perk 目标");
    expect(targetPanel).toContain("selectedWeaponHash");
    expect(targetPanel).toContain("availableWeaponTargets");
    expect(targetPanel).toContain("onSearchPerks");
    expect(targetPanel).toContain("perkSearchResults");
    expect(targetPanel).toContain("从资料库搜索 perk");
    expect(targetPanel).toContain("添加到目标");
    expect(targetPanel).toContain("添加属性条件");
    expect(targetPanel).toContain("添加 perk 条件");
    expect(targetPanel).toContain("最低值");
    expect(targetPanel).toContain("命中后处理策略");
    expect(targetPanel).toContain("只提示，不自动写入");
  });

  it("surfaces local target matches in vault cards, filters and item detail", () => {
    const vaultPanel = readFileSync(join(desktopRoot, "src", "renderer", "components", "VaultPanel.tsx"), "utf8");
    const vaultContent = readFileSync(join(uiRoot, "vault", "VaultPageContentView.tsx"), "utf8");
    const vaultListWorkspace = readFileSync(join(desktopRoot, "..", "app", "src", "workspaces", "vaultList.ts"), "utf8");
    const vaultFiltersBarrel = readFileSync(join(desktopRoot, "src", "renderer", "features", "vault", "vaultFilters.ts"), "utf8");
    const vaultListItem = readFileSync(join(uiRoot, "vault", "VaultListItem.tsx"), "utf8");
    const itemDetailSources = readItemDetailSources(desktopRoot);

    expect(vaultPanel).toContain("VaultPageContentView as VaultPanel");
    expect(vaultContent).toContain("targetSummaryCount");
    expect(vaultListWorkspace).toContain("evaluateLocalTargets");
    expect(vaultListWorkspace).toContain('target: "目标命中"');
    expect(vaultFiltersBarrel).toContain('from "@d2-tools/app"');
    expect(vaultContent).toContain("createVaultListWorkspace");
    expect(vaultListItem).toContain("target-hit-badge");
    expect(vaultListItem).toContain("本地目标");
    expect(itemDetailSources).toContain("本地目标命中");
    expect(itemDetailSources).toContain("evaluateLocalTargets");
    expect(itemDetailSources).toContain("localTargetRules");
  });
});
