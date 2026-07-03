import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const uiRoot = join(repoRoot, "packages", "ui");

describe("global AI assistant sidebar wiring", () => {
  it("moves AI assistant out of the main page navigation into a right-side drawer", () => {
    const shellLayout = [
      readFileSync(join(uiRoot, "src", "shell", "AppShell.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "shell", "navigation.ts"), "utf8")
    ].join("\n");
    const shellCopy = readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8");
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(shellLayout).toContain("assistantMode");
    expect(shellLayout).toContain("shell-tool-ai");
    expect(shellLayout).toContain("global-assistant-drawer");
    expect(shellLayout).not.toContain("global-assistant-rail");
    expect(shellLayout).toContain("copy.tools.openAiAssistant");
    expect(shellLayout).toContain("copy.tools.aiAssistant");
    expect(shellLayout).toContain("copy.assistantPanelAriaLabel");
    expect(shellCopy).toContain("打开 AI 助手抽屉");
    expect(shellCopy).toContain("AI 助手");
    expect(shellCopy).toContain('settings: "设置"');
    expect(shellLayout).not.toContain("brand-block");
    expect(shellLayout).not.toContain("工作区");
    expect(shellLayout).not.toContain("任务助手");
    expect(shellLayout).not.toContain('{ key: "ai", label: "AI 助手" }');
    expect(homePage).toContain("<GlobalAssistantSidebar");
    expect(homePage).not.toContain('activePage === "ai"');
    expect(homePage).not.toContain("pageTitle(activePage)");
  });

  it("keeps task context inside the global sidebar", () => {
    const assistantSidebar = readFileSync(
      join(desktopRoot, "src", "renderer", "components", "GlobalAssistantSidebar.tsx"),
      "utf8"
    );

    expect(assistantSidebar).toContain("任务 / 攻略上下文");
    expect(assistantSidebar).toContain("assistant-task-tree");
    expect(assistantSidebar).toContain("<AiPage");
  });

  it("uses a Codex-style AI chat workbench with drawers instead of a permanent side column", () => {
    const aiPanel = readFileSync(
      join(desktopRoot, "src", "renderer", "components", "AiAnalysisPanel.tsx"),
      "utf8"
    );
    const uiAssistant = readFileSync(
      join(uiRoot, "src", "assistant", "AiAssistantPanelView.tsx"),
      "utf8"
    );
    const combined = `${aiPanel}\n${uiAssistant}`;

    expect(aiPanel).toContain("isSessionDrawerOpen");
    expect(aiPanel).toContain("isContextDrawerOpen");
    expect(aiPanel).toContain("<AiAssistantPanelView");
    expect(combined).toContain("ai-conversation-header");
    expect(combined).toContain("ai-conversation-toolbar");
    expect(combined).toContain("ai-conversation-log");
    expect(combined).toContain("ai-composer");
    expect(combined).toContain("ai-session-drawer");
    expect(combined).toContain("ai-context-drawer");
    expect(combined).toContain("ai-chat-history");
    expect(combined).toContain("会话列表");
    expect(combined).toContain("删除");
    expect(combined).toContain("恢复");
    expect(combined).toContain("清空历史");
    expect(combined).toContain("历史记录仍可查看和恢复");
    expect(combined).not.toContain("ai-chat-sidebar");
    expect(aiPanel).not.toContain("if (!props.items.length)");
  });

  it("keeps the assistant header title readable when the sidebar is narrow", () => {
    const styles = readFileSync(
      join(desktopRoot, "..", "ui", "src", "styles.css"),
      "utf8"
    );

    const headerBlock = styles.match(/\.ai-conversation-header\s*{[^}]*}/)?.[0] ?? "";
    const toolbarBlock = styles.match(/\.ai-conversation-toolbar\s*{[^}]*}/)?.[0] ?? "";
    const actionsBlock = styles.match(/\.ai-conversation-actions,\s*[\r\n\s]*\.ai-composer-actions\s*{[^}]*}/)?.[0] ?? "";

    expect(headerBlock).toContain("grid-template-columns: minmax(0, 1fr) auto;");
    expect(toolbarBlock).toContain("overflow-x: auto;");
    expect(actionsBlock).toContain("justify-content: flex-start;");
    expect(styles).toMatch(/\.global-assistant-sidebar \.ai-conversation-actions button\s*{[\s\S]*?min-height:\s*32px;/);
  });

  it("keeps the unconfigured AI fallback visible inside the global sidebar", () => {
    const styles = readFileSync(
      join(desktopRoot, "..", "ui", "src", "styles.css"),
      "utf8"
    );
    const aiPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "ai", "AiPage.tsx"),
      "utf8"
    );
    const uiAssistant = readFileSync(
      join(uiRoot, "src", "assistant", "AiAssistantPanelView.tsx"),
      "utf8"
    );

    expect(uiAssistant).toContain("去设置配置 AI");
    expect(aiPage).toContain("AiAssistantPanelView");
    expect(styles).toContain(".global-assistant-sidebar .ai-chat-panel > .section-heading");
    expect(styles).not.toContain(".global-assistant-sidebar .section-heading {\n  display: none;");
  });

  it("wires a persistent light and dark color mode toggle into the desktop shell", () => {
    const shellLayout = [
      readFileSync(join(uiRoot, "src", "shell", "AppShell.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "product", "ProductShellHost.tsx"), "utf8"),
      readFileSync(join(uiRoot, "src", "i18n", "copy.ts"), "utf8")
    ].join("\n");
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );
    const diagnosticsHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettings.ts"),
      "utf8"
    );
    const diagnosticsStateHook = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "settings", "useDiagnosticsSettingsState.ts"),
      "utf8"
    );
    const diagnosticsModel = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "settings", "diagnosticsModel.ts"),
      "utf8"
    );
    const configApi = readFileSync(
      join(desktopRoot, "src", "renderer", "api", "configApi.ts"),
      "utf8"
    );
    const manifestApi = readFileSync(
      join(desktopRoot, "src", "renderer", "api", "manifestApi.ts"),
      "utf8"
    );
    const styles = readFileSync(
      join(desktopRoot, "..", "ui", "src", "styles.css"),
      "utf8"
    );

    expect(configApi).toContain('color_mode: "light" | "dark"');
    expect(manifestApi).toContain('colorMode: "light" | "dark"');
    expect(shellLayout).toContain("colorMode");
    expect(shellLayout).toContain("onColorModeToggle");
    expect(shellLayout).toContain('data-color-mode={props.colorMode}');
    expect(shellLayout).toContain("shell-tool-theme");
    expect(shellLayout).toContain("切换为暗色");
    expect(shellLayout).toContain("切换为亮色");
    expect(homePage).toContain("preferences={productPreferences}");
    expect(homePage).toContain("setColorMode: (mode: \"light\" | \"dark\") => window.d2?.setWindowColorMode?.(mode)");
    expect(homePage).toContain("initialColorMode: visualColorMode ?? props.state.colorMode");
    expect(homePage).toContain("VITE_D2_VISUAL_THEME");
    expect(homePage).toContain("handleProductPreferencesChange");
    expect(diagnosticsHook).toContain('initialColorMode?: "light" | "dark"');
    expect(diagnosticsHook).toContain("useColorModeState(input.initialColorMode)");
    expect(diagnosticsStateHook).toContain("export function useColorModeState");
    expect(diagnosticsStateHook).toContain("initialColorMode ?? initialState.colorMode");
    expect(diagnosticsHook).toContain("toggleColorMode");
    expect(diagnosticsModel).toContain("saveColorMode");
    expect(diagnosticsModel).toContain("color_mode: mode");
    expect(styles).toContain('.app-shell[data-color-mode="light"]');
    expect(styles).toContain('.app-shell[data-color-mode="dark"]');
  });
});
