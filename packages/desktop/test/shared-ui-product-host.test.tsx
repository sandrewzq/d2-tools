import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductShellHost } from "../../ui/src/index";

describe("shared UI ProductShellHost", () => {
  it("renders shell state and page slots from one cross-platform host contract", () => {
    const html = renderToStaticMarkup(
      <ProductShellHost
        initialPage="settings"
        initialPreferences={{
          interfaceLocale: "en-US",
          bungieLocale: "en",
          followInterfaceLocaleForBungie: true,
          colorMode: "dark"
        }}
        shellStatus={[{ label: "Bungie", value: "Ready", tone: "ready" }]}
        assistantPanel={<p>Assistant slot</p>}
        platformActions={{ openExternal: () => undefined }}
        pageHeader={{
          title: "Settings",
          subtitle: "Manage local configuration.",
          actions: <button type="button">Check</button>
        }}
        renderPage={(page) => <section>route:{page}</section>}
      />
    );

    expect(html).toContain("app-shell");
    expect(html).toContain("data-color-mode=\"dark\"");
    expect(html).toContain("Settings");
    expect(html).toContain("Manage local configuration.");
    expect(html).toContain("Check");
    expect(html).toContain("product-page-header");
    expect(html).toContain("EN");
    expect(html).toContain("route:settings");
  });

  it("can be controlled by a platform shell without owning page or preference state", () => {
    const html = renderToStaticMarkup(
      <ProductShellHost
        activePage="vault"
        assistantMode={null}
        preferences={{
          interfaceLocale: "zh-CN",
          bungieLocale: "zh-chs",
          followInterfaceLocaleForBungie: true,
          colorMode: "light"
        }}
        onPageChange={() => undefined}
        onAssistantModeChange={() => undefined}
        onPreferencesChange={() => undefined}
        shellStatus={[{ label: "账号", value: "12:30", tone: "ready" }]}
        assistantPanel={<p>Assistant slot</p>}
        platformActions={{ openExternal: () => undefined }}
        renderPage={(page) => <section>controlled-route:{page}</section>}
      />
    );

    expect(html).toContain("data-color-mode=\"light\"");
    expect(html).toContain("controlled-route:vault");
    expect(html).toContain("账号");
    expect(html).toContain("中");
  });

  it("renders an actionable library repair status in the shared top bar", () => {
    const html = renderToStaticMarkup(
      <ProductShellHost
        shellStatus={[{
          key: "library",
          label: "资料库",
          value: "需修复",
          tone: "warning",
          actionLabel: "修复资料库",
          onAction: () => undefined
        }]}
        assistantPanel={<p>Assistant slot</p>}
        platformActions={{ openExternal: () => undefined }}
        renderPage={() => <section>route</section>}
      />
    );

    expect(html).toContain('aria-label="修复资料库"');
    expect(html).toContain("资料库");
    expect(html).toContain("需修复");
  });
});
