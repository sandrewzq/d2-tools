import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const desktopRoot = join(process.cwd(), "packages", "desktop");

describe("diagnostics settings split", () => {
  it("delegates diagnostics state shaping to the diagnostics model module", () => {
    const settingsHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettings.ts"), "utf8");
    const stateHooks = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettingsState.ts"), "utf8");
    const diagnosticsModel = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "diagnosticsModel.ts"), "utf8");

    expect(stateHooks).toContain("createDiagnosticsSettingsState");
    expect(settingsHook).not.toContain('enable_lightgg: false');
    expect(stateHooks).toContain('const initialState = createDiagnosticsSettingsState()');
    expect(stateHooks).toContain('initialState.actionLogResultFilter');
    expect(diagnosticsModel).toContain("export function createDiagnosticsSettingsState");
    expect(diagnosticsModel).toContain("actionLogResultFilter");
    expect(diagnosticsModel).toContain("actionLogTypeFilter");
  });

  it("keeps diagnostics, settings and action log state in separate hooks", () => {
    const settingsHook = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettings.ts"), "utf8");
    const stateHooks = readFileSync(join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettingsState.ts"), "utf8");

    expect(settingsHook).toContain("useDiagnosticsStatusState");
    expect(settingsHook).toContain("useAiWriteSettingsState");
    expect(settingsHook).toContain("useActionLogState");
    expect(settingsHook).not.toContain('import { useState } from "react"');
    expect(stateHooks).toContain("export function useDiagnosticsStatusState");
    expect(stateHooks).toContain("export function useAiWriteSettingsState");
    expect(stateHooks).toContain("export function useActionLogState");
  });
});
