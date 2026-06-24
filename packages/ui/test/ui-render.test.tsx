import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AiConversationList,
  AppShell,
  ManifestStatusView,
  SettingsSummary
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
});
