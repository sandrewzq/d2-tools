import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AiConversationList,
  AppShell,
  ManifestStatusView,
  SettingsSummary,
  UpdateStatusView
} from "../src/index";

describe("ui foundation components", () => {
  it("renders app shell without platform dependencies", () => {
    const html = renderToStaticMarkup(
      <AppShell title="d2-tools">
        <span>内容</span>
      </AppShell>
    );

    expect(html).toContain("d2-tools");
    expect(html).toContain("内容");
  });

  it("renders settings summary", () => {
    const html = renderToStaticMarkup(
      <SettingsSummary
        settings={{
          dataDir: "D:/data/d2-tools",
          bungie: { apiKeyConfigured: false },
          ai: { providerConfigured: true, providerId: "openai", model: "gpt-5" }
        }}
      />
    );

    expect(html).toContain("D:/data/d2-tools");
    expect(html).toContain("gpt-5");
  });

  it("renders manifest and conversation state", () => {
    expect(
      renderToStaticMarkup(
        <ManifestStatusView
          status={{
            state: "ready",
            version: "mock-manifest",
            updatedAt: "2026-06-24T00:00:00.000Z",
            errorMessage: null
          }}
        />
      )
    ).toContain("mock-manifest");

    expect(renderToStaticMarkup(<AiConversationList conversations={[]} />)).toContain(
      "暂无会话"
    );
  });

  it("renders update status and actions", () => {
    const html = renderToStaticMarkup(
      <UpdateStatusView
        status={{
          phase: "available",
          version: "0.0.7",
          notes: "修复自动更新"
        }}
        onCheck={() => undefined}
        onInstall={() => undefined}
        onOpenReleasePage={() => undefined}
      />
    );

    expect(html).toContain("自动更新");
    expect(html).toContain("发现新版本：0.0.7");
    expect(html).toContain("修复自动更新");
    expect(html).toContain("安装更新");
    expect(html).toContain("打开发布页");
  });

  it("renders restart requested update state", () => {
    const html = renderToStaticMarkup(
      <UpdateStatusView
        status={{
          phase: "restartRequested",
          version: "0.0.7",
          notes: null,
          errorMessage: null
        }}
        onCheck={() => undefined}
        onInstall={() => undefined}
        onOpenReleasePage={() => undefined}
      />
    );

    expect(html).toContain("更新已安装，正在等待应用重启");
  });

  it("renders install failure as an install error when update metadata is present", () => {
    const html = renderToStaticMarkup(
      <UpdateStatusView
        status={{
          phase: "error",
          version: "0.0.7",
          notes: "修复自动更新",
          errorMessage: "下载失败"
        }}
        onCheck={() => undefined}
        onInstall={() => undefined}
        onOpenReleasePage={() => undefined}
      />
    );

    expect(html).toContain("更新安装失败");
    expect(html).toContain("错误：下载失败");
  });
});
