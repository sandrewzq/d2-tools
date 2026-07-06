import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AccountPageView,
  HomePageView,
  LibraryPageView,
  LoadoutsPageView,
  SettingsPageView,
  VendorsPageView
} from "../../ui/src/index";

describe("shared UI page views", () => {
  it("renders shared page roots for home, account, and settings", () => {
    expect(renderToStaticMarkup(<HomePageView>首页</HomePageView>)).toContain("home-page-preview");
    expect(renderToStaticMarkup(<AccountPageView>账号</AccountPageView>)).toContain("account-product-layout");
    expect(renderToStaticMarkup(<SettingsPageView>设置</SettingsPageView>)).toContain("settings-app-page");
  });

  it("does not keep empty internal heading wrappers when the product shell owns the page title", () => {
    const library = renderToStaticMarkup(
      <LibraryPageView
        manifestVersionLabel="2026/06/16"
        viewMode="equipment"
        showInternalHeading={false}
        onViewModeChange={() => undefined}
      >
        资料库
      </LibraryPageView>
    );
    const loadouts = renderToStaticMarkup(
      <LoadoutsPageView
        missingCount={0}
        readyCount={0}
        actionableCount={0}
        showInternalHeading={false}
      >
        配装
      </LoadoutsPageView>
    );
    const vendors = renderToStaticMarkup(
      <VendorsPageView
        updatedLabel="14:18"
        sourceLabel="mock"
        nextResetLabel="weekly"
        verifiedItemCount={0}
        recommendationCount={0}
        showInternalHeading={false}
      >
        商人
      </VendorsPageView>
    );

    expect(library).not.toContain("library-reference-hero");
    expect(library).not.toContain("library-reference-hero-compact");
    expect(loadouts).not.toContain('class="section-heading"');
    expect(vendors).not.toContain('class="section-heading"');
  });
});
