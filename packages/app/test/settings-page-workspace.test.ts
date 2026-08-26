import { describe, expect, it } from "vitest";
import { selectSettingsPageModel } from "../src/workspaces/settingsPage";

describe("settings page workspace", () => {
  it("exposes a settings page model selector for platform shells", () => {
    const appUpdateSnapshot = { status: "idle", currentVersion: "0.0.11" };
    const backgroundTask = { id: "manifest", label: "资料库更新" };
    const actionLogEntry = { id: "action-1", type: "equip", result: "success" };

    const model = selectSettingsPageModel({
      interfaceLocale: "zh-CN",
      initialSection: "library",
      message: "已保存",
      error: "",
      diagnosticDataDir: "D:/data",
      appUpdateSnapshot,
      manifestStatus: {
        status: "ready",
        version: "2026.07.07",
        definitions: {},
        missing_required_components: []
      },
      manifestStatusError: "",
      isLoadingManifestStatus: false,
      isInitializingManifest: false,
      accountSummary: null,
      accountError: "未登录",
      accountWarning: "",
      isLoadingAccount: false,
      lastAccountLoadedAt: null,
      isAiConfigured: true,
      backgroundTasks: [backgroundTask],
      actionLog: [actionLogEntry],
      actionLogResultFilter: "success",
      actionLogTypeFilter: "equip",
      languagePreferences: {
        interfaceLocale: "zh-CN",
        bungieLocale: "zh-chs",
        followInterfaceLocaleForBungie: true
      }
    });

    expect(model.initialSection).toBe("library");
    expect(model.message).toBe("已保存");
    expect(model.diagnosticDataDir).toBe("D:/data");
    expect(model.appUpdateSnapshot).toBe(appUpdateSnapshot);
    expect(model.backgroundTasks).toEqual([backgroundTask]);
    expect(model.actionLog).toEqual([actionLogEntry]);
    expect(model.actionLogResultFilter).toBe("success");
    expect(model.actionLogTypeFilter).toBe("equip");
    expect(model.languagePreferences.bungieLocale).toBe("zh-chs");
  });
});
