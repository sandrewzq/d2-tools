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
        renderPage={(page) => <section>route:{page}</section>}
      />
    );

    expect(html).toContain("app-shell");
    expect(html).toContain("data-color-mode=\"dark\"");
    expect(html).toContain("Settings");
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
});
