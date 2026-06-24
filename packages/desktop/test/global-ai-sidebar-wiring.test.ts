import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("global AI assistant sidebar wiring", () => {
  it("moves AI assistant out of the main page navigation into a global sidebar", () => {
    const shellLayout = readFileSync(
      join(desktopRoot, "src", "renderer", "components", "ShellLayout.tsx"),
      "utf8"
    );
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(shellLayout).toContain("assistantMode");
    expect(shellLayout).toContain("global-assistant-rail");
    expect(shellLayout).toContain("AI 助手");
    expect(shellLayout).toContain("任务助手");
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

    expect(aiPanel).toContain("isSessionDrawerOpen");
    expect(aiPanel).toContain("isContextDrawerOpen");
    expect(aiPanel).toContain("ai-conversation-header");
    expect(aiPanel).toContain("ai-conversation-log");
    expect(aiPanel).toContain("ai-composer");
    expect(aiPanel).toContain("ai-session-drawer");
    expect(aiPanel).toContain("ai-context-drawer");
    expect(aiPanel).toContain("ai-chat-history");
    expect(aiPanel).toContain("会话列表");
    expect(aiPanel).toContain("上下文");
    expect(aiPanel).toContain("恢复");
    expect(aiPanel).toContain("清空历史");
    expect(aiPanel).toContain("历史记录仍可查看和恢复");
    expect(aiPanel).not.toContain("ai-chat-sidebar");
    expect(aiPanel).not.toContain("if (!props.items.length)");
  });

  it("keeps the unconfigured AI fallback visible inside the global sidebar", () => {
    const styles = readFileSync(
      join(desktopRoot, "src", "renderer", "styles.css"),
      "utf8"
    );
    const aiPage = readFileSync(
      join(desktopRoot, "src", "renderer", "features", "ai", "AiPage.tsx"),
      "utf8"
    );

    expect(aiPage).toContain("去设置配置 AI");
    expect(styles).toContain(".global-assistant-sidebar .ai-chat-panel > .section-heading");
    expect(styles).not.toContain(".global-assistant-sidebar .section-heading {\n  display: none;");
  });
});
