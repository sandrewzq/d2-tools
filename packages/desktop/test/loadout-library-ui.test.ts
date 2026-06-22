import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("loadout library UI", () => {
  it("wires rename support and a richer local loadout library section", () => {
    const apiClient = readFileSync(join(desktopRoot, "src", "renderer", "api", "client.ts"), "utf8");
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc", "loadouts.ts"), "utf8");
    const ipcRegister = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");

    expect(apiClient).toContain("renameLoadoutTemplate");
    expect(preload).toContain('ipcRenderer.invoke("loadouts:rename"');
    expect(ipc).toContain('ipcMain.handle("loadouts:rename"');
    expect(ipcRegister).toContain("registerLoadoutIpcHandlers()");
    expect(loadoutsPage).toContain("onRenameTemplate");
    expect(loadoutsPage).toContain("本地方案库");
  });

  it("includes a lightweight compare view for saved loadouts", () => {
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const viewModel = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "loadoutViewModel.ts"), "utf8");

    expect(loadoutsPage).toContain("compareTemplateId");
    expect(viewModel).toContain("buildLoadoutCompareRows");
    expect(loadoutsPage).toContain("showDiffOnly");
  });

  it("renders compare rows as side-by-side item, frame, and perk details", () => {
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const viewModel = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "loadoutViewModel.ts"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(loadoutsPage).toContain("loadout-compare-grid");
    expect(loadoutsPage).toContain("loadout-compare-row");
    expect(loadoutsPage).toContain("loadout-compare-side");
    expect(viewModel).toContain("formatLoadoutComparePerks");
    expect(styles).toContain(".loadout-compare-grid");
    expect(styles).toContain(".loadout-compare-side");
  });

  it("shows richer status labels for each saved loadout item", () => {
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const helper = readFileSync(join(desktopRoot, "src", "renderer", "utils", "loadoutItemStatus.ts"), "utf8");

    expect(loadoutsPage).toContain("buildLoadoutItemStatus");
    expect(loadoutsPage).toContain("loadout-status-badge");
    expect(helper).toContain('key: "current-inventory"');
    expect(helper).toContain('key: "vault"');
    expect(helper).toContain('key: "other-character-inventory"');
    expect(helper).toContain('key: "postmaster"');
  });

  it("shows where each saved loadout item is currently located", () => {
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const viewModel = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "loadoutViewModel.ts"), "utf8");

    expect(loadoutsPage).toContain("status.location_label");
    expect(viewModel).toContain("findBestTemplateSourceItem");
  });

  it("adds actionable controls for missing loadout items", () => {
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const loadoutWriteHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutWriteActions.ts"), "utf8");
    const viewModel = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "loadoutViewModel.ts"), "utf8");
    const helper = readFileSync(join(desktopRoot, "src", "renderer", "utils", "loadoutActionFeedback.ts"), "utf8");

    expect(loadoutsPage).toContain("onCopyMissingItems");
    expect(viewModel).toContain("buildMissingLoadoutItemsText");
    expect(loadoutWriteHook).toContain("buildMissingLoadoutTransferPlan");
    expect(loadoutsPage).toContain("describeMissingLoadoutBlockedReason");
    expect(loadoutWriteHook).toContain("executeSingleLoadoutItemTransfer");
    expect(loadoutWriteHook).toContain("equipSingleLoadoutItem");
    expect(helper).toContain("只补这一件");
    expect(helper).toContain("只装备这一件");
  });

  it("adds a compact status summary for local loadout review", () => {
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(loadoutsPage).toContain("summarizeLoadoutItemStatuses");
    expect(loadoutsPage).toContain("loadout-status-summary");
    expect(loadoutsPage).toContain("loadout-status-chip");
    expect(styles).toContain(".loadout-status-summary");
    expect(styles).toContain(".loadout-status-chip");
  });

  it("shows inline pending and success feedback for single-item loadout actions", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const loadoutsPage = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "LoadoutsPage.tsx"), "utf8");
    const feedbackHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "loadouts", "useLoadoutActionFeedback.ts"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");
    const helper = readFileSync(join(desktopRoot, "src", "renderer", "utils", "loadoutActionFeedback.ts"), "utf8");

    expect(homePage).toContain("useLoadoutActionFeedback()");
    expect(homePage).not.toContain("setLoadoutActionFeedback");
    expect(feedbackHook).toContain("export function useLoadoutActionFeedback");
    expect(feedbackHook).toContain("LOADOUT_ACTION_FEEDBACK_TIMEOUT_MS");
    expect(feedbackHook).toContain("setSingleActionFeedback");
    expect(feedbackHook).toContain("window.clearTimeout");
    expect(loadoutsPage).toContain("getLoadoutActionButtonLabel");
    expect(helper).toContain("已补齐");
    expect(helper).toContain("已装备");
    expect(styles).toContain(".inline-action.is-pending");
    expect(styles).toContain(".inline-action.is-success");
  });

  it("mounts loadouts as its own navigation page instead of hiding the library inside HomePage", () => {
    const shellLayout = readFileSync(join(desktopRoot, "src", "renderer", "components", "ShellLayout.tsx"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");

    expect(shellLayout).toContain('"loadouts"');
    expect(shellLayout).toContain('label: "配装"');
    expect(homePage).toContain("<LoadoutsPage");
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

    expect(hook).toContain("export function useLoadoutTemplateActions");
    expect(hook).toContain("createTemplateTransferPlan");
    expect(hook).toContain("copyMissingLoadoutItems");
    expect(hook).toContain("api.createLoadoutTemplateTransferPlan");
    expect(hook).toContain("buildMissingLoadoutItemsText");
    expect(homePage).toContain("useLoadoutTemplateActions");
    expect(homePage).not.toContain("async function createTemplateTransferPlan");
    expect(homePage).not.toContain("async function copyMissingLoadoutItems");
    expect(homePage).not.toContain("buildMissingLoadoutItemsText");
  });
});
