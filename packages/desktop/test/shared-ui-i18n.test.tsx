import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AppShell,
  defaultProductPreferences,
  getEffectiveBungieLocale,
  getLocaleCopy,
  getLocalizedNavItems,
  HomePageView,
  type ProductPreferences
} from "../../ui/src/index";

describe("shared UI i18n", () => {
  it("keeps shell copy keys complete across supported interface locales", () => {
    const zhCopy = getLocaleCopy("zh-CN");
    const enCopy = getLocaleCopy("en-US");

    expect(Object.keys(enCopy.shell)).toEqual(Object.keys(zhCopy.shell));
    expect(Object.keys(enCopy.shell.tools)).toEqual(Object.keys(zhCopy.shell.tools));
    expect(Object.keys(enCopy.home)).toEqual(Object.keys(zhCopy.home));
    expect(Object.keys(enCopy.home.sections)).toEqual(Object.keys(zhCopy.home.sections));
    expect(Object.keys(enCopy.home.actions)).toEqual(Object.keys(zhCopy.home.actions));
    expect(getLocalizedNavItems("zh-CN").map((item) => item.label)).toEqual([
      "首页",
      "账号",
      "仓库",
      "配装",
      "资料库",
      "设置"
    ]);
    expect(getLocalizedNavItems("en-US").map((item) => item.label)).toEqual([
      "Home",
      "Account",
      "Vault",
      "Loadouts",
      "Library",
      "Settings"
    ]);
  });

  it("derives Bungie manifest locale from interface locale when follow mode is enabled", () => {
    const preferences: ProductPreferences = {
      ...defaultProductPreferences,
      interfaceLocale: "en-US",
      bungieLocale: "zh-chs",
      followInterfaceLocaleForBungie: true
    };

    expect(getEffectiveBungieLocale(preferences)).toBe("en");
    expect(getEffectiveBungieLocale({ ...preferences, followInterfaceLocaleForBungie: false })).toBe("zh-chs");
  });

  it("renders AppShell navigation and language switch from locale copy", () => {
    const html = renderToStaticMarkup(
      <AppShell
        activePage="home"
        assistantMode={null}
        colorMode="light"
        interfaceLocale="en-US"
        shellStatus={[{ label: "Bungie", value: "Ready", tone: "ready" }]}
        assistantPanel={<p>AI</p>}
        platformActions={{ openExternal: () => undefined }}
        onNavigate={() => {}}
        onAssistantModeChange={() => {}}
        onColorModeToggle={() => {}}
        onInterfaceLocaleToggle={() => {}}
      >
        <section>Home content</section>
      </AppShell>
    );

    expect(html).toContain("Home");
    expect(html).toContain("Settings");
    expect(html).toContain("Switch to Chinese");
    expect(html).toContain("EN");
    expect(html).not.toContain(">首页<");
  });

  it("renders shared home view static labels from interface locale copy", () => {
    const html = renderToStaticMarkup(
      <HomePageView
        interfaceLocale="en-US"
        diagnosticRows={[{ tone: "ready" }]}
        onCopyDailySummary={() => undefined}
        onRefreshDiagnostics={() => undefined}
      />
    );

    expect(html).toContain("Weekly rewards and rotations");
    expect(html).toContain("Today to verify");
    expect(html).toContain("Pending data");
    expect(html).not.toContain("本周奖励与轮换");
    expect(html).not.toContain("今天可确认");
  });
});
