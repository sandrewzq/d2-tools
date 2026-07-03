import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readRendererApiContracts } from "./source-readers";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const uiRoot = join(desktopRoot, "..", "ui");
const appRoot = join(desktopRoot, "..", "app");

describe("loadout library UI", () => {
  it("wires rename support and a richer local loadout library section", () => {
    const apiClient = readRendererApiContracts(desktopRoot);
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc", "loadouts.ts"), "utf8");
    const ipcRegister = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const loadoutsContent = readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8");
    const uiCopy = readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8");

    expect(apiClient).toContain("renameLoadoutTemplate");
    expect(preload).toContain('ipcRenderer.invoke("loadouts:rename"');
    expect(ipc).toContain('ipcMain.handle("loadouts:rename"');
    expect(ipcRegister).toContain("registerLoadoutIpcHandlers()");
    expect(loadoutsPage).toContain("onRenameTemplate");
    expect(loadoutsPage).toContain("LoadoutsPageContentView");
    expect(loadoutsContent).toContain("LoadoutsPageView");
    expect(uiCopy).toContain("本地方案库");
  });

  it("includes a lightweight compare view for saved loadouts", () => {
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const viewModel = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "loadoutViewModel.ts"), "utf8");

    expect(loadoutsPage).toContain("compareTemplateId");
    expect(viewModel).toContain("buildLoadoutCompareRows");
    expect(loadoutsPage).toContain("showDiffOnly");
  });

  it("renders compare rows as side-by-side item, frame, and perk details", () => {
    const loadoutsContent = readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8");
    const loadoutsWorkspace = readFileSync(join(appRoot, "src", "workspaces", "loadoutsPage.ts"), "utf8");
    const viewModel = readFileSync(join(appRoot, "src", "workspaces", "loadoutViewModel.ts"), "utf8");
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(loadoutsContent).toContain("loadout-compare-grid");
    expect(loadoutsContent).toContain("loadout-compare-row");
    expect(loadoutsContent).toContain("loadout-compare-side");
    expect(loadoutsWorkspace).toContain("buildLoadoutCompareRows");
    expect(viewModel).toContain("formatLoadoutComparePerks");
    expect(styles).toContain(".loadout-compare-grid");
    expect(styles).toContain(".loadout-compare-side");
  });

  it("shows richer status labels for each saved loadout item", () => {
    const loadoutsContent = readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8");
    const helper = readFileSync(join(appRoot, "src", "workspaces", "loadoutItemStatus.ts"), "utf8");

    expect(helper).toContain("buildLoadoutItemStatus");
    expect(loadoutsContent).toContain("loadout-status-badge");
    expect(helper).toContain('key: "current-inventory"');
    expect(helper).toContain('key: "vault"');
    expect(helper).toContain('key: "other-character-inventory"');
    expect(helper).toContain('key: "postmaster"');
  });

  it("shows where each saved loadout item is currently located", () => {
    const loadoutsContent = readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8");
    const viewModel = readFileSync(join(desktopRoot, "..", "app", "src", "workspaces", "loadoutViewModel.ts"), "utf8");

    expect(loadoutsContent).toContain("status.location_label");
    expect(viewModel).toContain("findBestTemplateSourceItem");
  });

  it("adds actionable controls for missing loadout items", () => {
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const loadoutWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"), "utf8");
    const loadoutsWorkspace = readFileSync(join(appRoot, "src", "workspaces", "loadoutsPage.ts"), "utf8");
    const viewModel = readFileSync(join(appRoot, "src", "workspaces", "loadoutViewModel.ts"), "utf8");
    const helper = readFileSync(join(desktopRoot, "src", "renderer", "utils", "loadoutActionFeedback.ts"), "utf8");

    expect(loadoutsPage).toContain("onCopyMissingItems");
    expect(viewModel).toContain("buildMissingLoadoutItemsText");
    expect(loadoutWriteHook).toContain("buildMissingLoadoutTransferPlan");
    expect(loadoutsWorkspace).toContain("describeMissingLoadoutBlockedReason");
    expect(loadoutWriteHook).toContain("executeSingleLoadoutItemTransfer");
    expect(loadoutWriteHook).toContain("equipSingleLoadoutItem");
    expect(helper).toContain("只补这一件");
    expect(helper).toContain("只装备这一件");
  });

  it("adds a compact status summary for local loadout review", () => {
    const loadoutsContent = readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8");
    const loadoutsWorkspace = readFileSync(join(appRoot, "src", "workspaces", "loadoutsPage.ts"), "utf8");
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");

    expect(loadoutsWorkspace).toContain("summarizeLoadoutItemStatuses");
    expect(loadoutsContent).toContain("loadout-status-summary");
    expect(loadoutsContent).toContain("loadout-status-chip");
    expect(styles).toContain(".loadout-status-summary");
    expect(styles).toContain(".loadout-status-chip");
  });

  it("shows inline pending and success feedback for single-item loadout actions", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "pages", "useHomePageWriteActions.ts"), "utf8");
    const loadoutsContent = readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8");
    const feedbackHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutActionFeedback.ts"), "utf8");
    const styles = readFileSync(join(desktopRoot, "..", "ui", "src", "styles.css"), "utf8");
    const helper = readFileSync(join(desktopRoot, "src", "renderer", "utils", "loadoutActionFeedback.ts"), "utf8");

    expect(homePage).toContain("useHomePageWriteActions");
    expect(homePage).not.toContain("useLoadoutActionFeedback()");
    expect(homeWriteHook).toContain("useLoadoutActionFeedback()");
    expect(homePage).not.toContain("setLoadoutActionFeedback");
    expect(feedbackHook).toContain("export function useLoadoutActionFeedback");
    expect(feedbackHook).toContain("LOADOUT_ACTION_FEEDBACK_TIMEOUT_MS");
    expect(feedbackHook).toContain("setSingleActionFeedback");
    expect(feedbackHook).toContain("window.clearTimeout");
    expect(loadoutsContent).toContain("getLoadoutActionButtonLabel");
    expect(helper).toContain("已补齐");
    expect(helper).toContain("已装备");
    expect(styles).toContain(".inline-action.is-pending");
    expect(styles).toContain(".inline-action.is-success");
  });

  it("mounts loadouts as its own navigation page instead of hiding the library inside HomePage", () => {
    const shellNavigation = readFileSync(join(uiRoot, "src", "shell", "navigation.ts"), "utf8");
    const shellCopy = readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeRoutes = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePageRoutes.tsx"), "utf8");

    expect(shellNavigation).toContain('"loadouts"');
    expect(shellCopy).toContain('loadouts: "配装"');
    expect(shellCopy).toContain('loadouts: "Loadouts"');
    expect(homePage).toContain("<HomePageRoutes");
    expect(homePage).not.toContain("<LoadoutsPage");
    expect(homeRoutes).toContain("<LoadoutsPage");
    expect(homePage).not.toContain("loadout-compare-grid");
    expect(homePage).not.toContain("loadout-status-summary");
  });

  it("keeps local loadout template state inside the loadouts feature hook", () => {
    const hook = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutTemplates.ts"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");

    expect(hook).toContain("export function useLoadoutTemplates");
    expect(hook).toContain("api.listLoadoutTemplates");
    expect(hook).toContain("api.renameLoadoutTemplate");
    expect(hook).toContain("api.deleteLoadoutTemplate");
    expect(hook).toContain("selectTemplate");
    expect(hook).toContain("activeTemplate");
    expect(homePage).toContain("useLoadoutTemplates()");
    expect(homePage).not.toContain("useState<LoadoutTemplate[]>([])");
    expect(homePage).not.toContain("async function loadLoadoutTemplates()");
    expect(homePage).not.toContain("function applyLoadoutTemplates(");
  });

  it("keeps low-risk local loadout template actions inside the loadouts feature hook", () => {
    const hook = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutTemplateActions.ts"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const homeWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "pages", "useHomePageWriteActions.ts"), "utf8");

    expect(hook).toContain("export function useLoadoutTemplateActions");
    expect(hook).toContain("createTemplateTransferPlan");
    expect(hook).toContain("copyMissingLoadoutItems");
    expect(hook).toContain("api.createLoadoutTemplateTransferPlan");
    expect(hook).toContain("buildMissingLoadoutItemsText");
    expect(homePage).toContain("useHomePageWriteActions");
    expect(homePage).not.toContain("useLoadoutTemplateActions");
    expect(homeWriteHook).toContain("useLoadoutTemplateActions");
    expect(homePage).not.toContain("async function createTemplateTransferPlan");
    expect(homePage).not.toContain("async function copyMissingLoadoutItems");
    expect(homePage).not.toContain("buildMissingLoadoutItemsText");
  });

  it("centralizes in-game loadout slot operations inside the loadouts page", () => {
    const accountPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "account", "AccountPage.tsx"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const loadoutsContent = readFileSync(join(uiRoot, "src", "loadouts", "LoadoutsPageContentView.tsx"), "utf8");

    expect(accountPage).not.toContain("onEquipSavedLoadout");
    expect(accountPage).not.toContain("onSnapshotCurrentLoadout");
    expect(accountPage).not.toContain("accountWorkspace.loadoutSlotRows");
    expect(loadoutsContent).toContain("游戏内配装栏");
    expect(loadoutsContent).toContain("accountSummary.characters");
    expect(loadoutsContent).toContain("character.loadout_slots");
    expect(loadoutsPage).toContain("onEquipSavedLoadout");
    expect(loadoutsPage).toContain("onSnapshotCurrentLoadout");
    expect(homePage).toContain("onEquipSavedLoadout: (character, slot)");
    expect(homePage).toContain("onSnapshotCurrentLoadout: (character, slot)");
  });

  it("keeps prototype loadout surfaces on dark-mode semantic tokens", () => {
    const styles = readFileSync(join(uiRoot, "src", "styles.css"), "utf8");
    const loadoutSurfaceRule = readCssRule(styles, ".in-game-loadout-slots,\n.loadout-template-list,\n.loadout-template-detail,\n.daily-source.source-ready");
    const actionLogOkRule = readCssRule(styles, ".action-log-row.log-ok");

    expect(loadoutSurfaceRule).toContain("background: var(--surface-panel)");
    expect(loadoutSurfaceRule).toContain("color: var(--text-body)");
    expect(actionLogOkRule).toContain("background: var(--status-ready-bg)");
    expect(loadoutSurfaceRule).not.toContain("#ffffff");
    expect(loadoutSurfaceRule).not.toContain("#f8fafc");
  });
});

function readCssRule(styles: string, selector: string): string {
  const needle = selector.includes("\n") ? `${selector} {` : `\n${selector} {`;
  let start = styles.indexOf(needle);
  if (start >= 0 && !selector.includes("\n")) {
    start += 1;
  } else if (start < 0 && styles.startsWith(`${selector} {`)) {
    start = 0;
  }
  expect(start).toBeGreaterThanOrEqual(0);
  const end = styles.indexOf("}", start);
  expect(end).toBeGreaterThan(start);
  return styles.slice(start, end + 1);
}
