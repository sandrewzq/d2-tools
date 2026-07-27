import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "../../ui/src/index";

describe("shared UI AppShell", () => {
  it("renders platform-neutral shell regions and delegates platform actions", () => {
    const openExternal = vi.fn();
    const html = renderToStaticMarkup(
      <AppShell
        activePage="home"
        assistantMode="ai"
        colorMode="light"
        shellStatus={[{ label: "Bungie", value: "已配置", tone: "ready" }]}
        assistantPanel={<p>AI 助手</p>}
        platformActions={{ openExternal }}
        onNavigate={() => {}}
        onAssistantModeChange={() => {}}
        onColorModeToggle={() => {}}
      >
        <section>首页内容</section>
      </AppShell>
    );

    expect(html).toContain("d2-tools");
    expect(html).toContain("Bungie");
    expect(html).toContain("首页");
    expect(html).toContain("AI 助手");
    expect(html).toContain("首页内容");
    expect(html).toContain("app-shell");
    expect(openExternal).not.toHaveBeenCalled();
  });

  it("keeps application background tasks out of the assistant task view", () => {
    const html = renderToStaticMarkup(
      <AppShell
        activePage="home"
        assistantMode="tasks"
        colorMode="dark"
        shellStatus={[
          { key: "bungie", label: "Bungie", value: "已配置", tone: "ready" },
          { key: "background", label: "后台任务", value: "1 个运行中", tone: "warning" }
        ]}
        assistantPanel={<p>AI 任务助手</p>}
        platformActions={{ openExternal: vi.fn() }}
        onNavigate={() => {}}
        onAssistantModeChange={() => {}}
        onColorModeToggle={() => {}}
      >
        <section>首页内容</section>
      </AppShell>
    );

    expect(html).toContain("AI 任务助手");
    expect(html).toContain("Bungie");
    expect(html).not.toContain("后台任务");
    expect(html).not.toContain("1 个运行中");
  });
});
