import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccountPageView, HomePageView, SettingsPageView } from "../../ui/src/index";

describe("shared UI page views", () => {
  it("renders shared page roots for home, account, and settings", () => {
    expect(renderToStaticMarkup(<HomePageView>首页</HomePageView>)).toContain("home-app-page");
    expect(renderToStaticMarkup(<AccountPageView>账号</AccountPageView>)).toContain("account-dashboard-panel");
    expect(renderToStaticMarkup(<SettingsPageView>设置</SettingsPageView>)).toContain("settings-app-page");
  });
});
