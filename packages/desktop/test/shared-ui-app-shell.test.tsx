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

  it("renders background tasks in a floating dock instead of the top status strip", () => {
    const html = renderToStaticMarkup(
      <AppShell
        activePage="home"
        assistantMode={null}
        colorMode="dark"
        shellStatus={[
          { key: "bungie", label: "Bungie", value: "已配置", tone: "ready" },
          { key: "background", label: "后台任务", value: "1 个运行中", tone: "warning" }
        ]}
        backgroundTasks={[
          {
            task_id: "account-sync:test",
            title: "读取账号数据",
            status: "running",
            message: "正在读取角色和仓库。",
            updated_at: "2026-07-03T14:18:00+08:00"
          }
        ]}
        assistantPanel={<p>AI 助手</p>}
        platformActions={{ openExternal: vi.fn() }}
        onNavigate={() => {}}
        onAssistantModeChange={() => {}}
        onColorModeToggle={() => {}}
        onOpenBackgroundTasks={() => {}}
      >
        <section>首页内容</section>
      </AppShell>
    );

    expect(html).toContain("background-task-dock");
    expect(html).toContain("1 个后台任务");
    expect(html).toContain("读取账号数据");
    expect(html).toContain("正在读取角色和仓库。");
    expect(html).toContain("查看全部");
    expect(html).toContain("Bungie");
    expect(html).not.toContain("1 个运行中");
  });

  it("does not keep the floating dock visible after every background task has failed", () => {
    const html = renderToStaticMarkup(
      <AppShell
        activePage="account"
        assistantMode={null}
        colorMode="dark"
        shellStatus={[{ key: "account", label: "账号", value: "已读取", tone: "ready" }]}
        backgroundTasks={[
          {
            task_id: "account-activity:test",
            title: "读取最近活动",
            status: "failed",
            error: "fetch failed",
            updated_at: "2026-07-10T09:16:00+08:00"
          }
        ]}
        assistantPanel={<p>AI 助手</p>}
        platformActions={{ openExternal: vi.fn() }}
        onNavigate={() => {}}
        onAssistantModeChange={() => {}}
        onColorModeToggle={() => {}}
        onOpenBackgroundTasks={() => {}}
      >
        <section>账号内容</section>
      </AppShell>
    );

    expect(html).not.toContain("background-task-dock");
    expect(html).not.toContain("1 个后台任务");
    expect(html).not.toContain("读取最近活动");
  });

  it("keeps completed tasks out of an active task dock", () => {
    const html = renderToStaticMarkup(
      <AppShell
        activePage="vault"
        assistantMode={null}
        colorMode="dark"
        shellStatus={[{ key: "account", label: "账号", value: "已读取", tone: "ready" }]}
        backgroundTasks={[
          {
            task_id: "app-update-check:test",
            title: "检查应用更新",
            status: "retrying",
            error: "net::ERR_CONNECTION_TIMED_OUT",
            next_retry_at: "2026-07-10T22:08:00+08:00"
          },
          {
            task_id: "community-analysis:test",
            title: "分析仓库推荐",
            status: "success",
            message: "任务已完成"
          }
        ]}
        assistantPanel={<p>AI 助手</p>}
        platformActions={{ openExternal: vi.fn() }}
        onNavigate={() => {}}
        onAssistantModeChange={() => {}}
        onColorModeToggle={() => {}}
        onOpenBackgroundTasks={() => {}}
      >
        <section>仓库内容</section>
      </AppShell>
    );

    expect(html).toContain("检查应用更新");
    expect(html).toContain("net::ERR_CONNECTION_TIMED_OUT");
    expect(html).not.toContain("分析仓库推荐");
    expect(html).not.toContain("任务已完成");
  });
});
