import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("loadout library UI", () => {
  it("wires rename support and a richer local loadout library section", () => {
    const apiClient = readFileSync(join(desktopRoot, "src", "renderer", "api", "client.ts"), "utf8");
    const preload = readFileSync(join(desktopRoot, "src", "preload", "preload.ts"), "utf8");
    const ipc = readFileSync(join(desktopRoot, "src", "main", "ipc.ts"), "utf8");
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");

    expect(apiClient).toContain("renameLoadoutTemplate");
    expect(preload).toContain('ipcRenderer.invoke("loadouts:rename"');
    expect(ipc).toContain('ipcMain.handle("loadouts:rename"');
    expect(homePage).toContain("renameLoadoutTemplate");
  });

  it("includes a lightweight compare view for saved loadouts", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");

    expect(homePage).toContain("compareLoadoutTemplateId");
    expect(homePage).toContain("buildLoadoutCompareRows");
    expect(homePage).toContain("showLoadoutDiffOnly");
  });

  it("renders compare rows as side-by-side item, frame, and perk details", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(homePage).toContain("loadout-compare-grid");
    expect(homePage).toContain("loadout-compare-row");
    expect(homePage).toContain("loadout-compare-side");
    expect(homePage).toContain("formatLoadoutComparePerks");
    expect(styles).toContain(".loadout-compare-grid");
    expect(styles).toContain(".loadout-compare-side");
  });

  it("shows richer status labels for each saved loadout item", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const helper = readFileSync(join(desktopRoot, "src", "renderer", "utils", "loadoutItemStatus.ts"), "utf8");

    expect(homePage).toContain("buildLoadoutItemStatus");
    expect(homePage).toContain("loadout-status-badge");
    expect(helper).toContain('key: "current-inventory"');
    expect(helper).toContain('key: "vault"');
    expect(helper).toContain('key: "other-character-inventory"');
    expect(helper).toContain('key: "postmaster"');
  });

  it("shows where each saved loadout item is currently located", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");

    expect(homePage).toContain("status.location_label");
    expect(homePage).toContain("findBestTemplateSourceItem");
  });

  it("adds actionable controls for missing loadout items", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const helper = readFileSync(join(desktopRoot, "src", "renderer", "utils", "loadoutActionFeedback.ts"), "utf8");

    expect(homePage).toContain("copyMissingLoadoutItems");
    expect(homePage).toContain("buildMissingLoadoutTransferPlan");
    expect(homePage).toContain("describeMissingLoadoutBlockedReason");
    expect(homePage).toContain("executeSingleLoadoutItemTransfer");
    expect(homePage).toContain("equipSingleLoadoutItem");
    expect(helper).toContain("只补这一件");
    expect(helper).toContain("只装备这一件");
  });

  it("adds a compact status summary for local loadout review", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");

    expect(homePage).toContain("summarizeLoadoutItemStatuses");
    expect(homePage).toContain("loadout-status-summary");
    expect(homePage).toContain("loadout-status-chip");
    expect(styles).toContain(".loadout-status-summary");
    expect(styles).toContain(".loadout-status-chip");
  });

  it("shows inline pending and success feedback for single-item loadout actions", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");
    const styles = readFileSync(join(desktopRoot, "src", "renderer", "styles.css"), "utf8");
    const helper = readFileSync(join(desktopRoot, "src", "renderer", "utils", "loadoutActionFeedback.ts"), "utf8");

    expect(homePage).toContain("loadoutActionFeedback");
    expect(homePage).toContain("setLoadoutActionFeedback");
    expect(homePage).toContain("getLoadoutActionButtonLabel");
    expect(helper).toContain("已补齐");
    expect(helper).toContain("已装备");
    expect(styles).toContain(".inline-action.is-pending");
    expect(styles).toContain(".inline-action.is-success");
  });
});
