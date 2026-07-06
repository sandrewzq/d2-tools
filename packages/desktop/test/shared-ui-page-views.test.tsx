import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AccountPageView,
  HomePageContentView,
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

  it("renders daily and weekly reset countdowns as panel subtitles", () => {
    const html = renderToStaticMarkup(
      <HomePageContentView
        interfaceLocale="zh-CN"
        dailySummary={{
          daily_reset: {
            label: "每日 01:00 重置",
            time_remaining_label: "距离每日重置还有 5 小时 20 分钟"
          },
          weekly_reset: {
            label: "每周三 01:00 重置",
            time_remaining_label: "距离每周重置还有 5 天 14 小时"
          },
          sources: {
            weekly_report: { status: "ready", message: "本周周报已读取。" },
            rotations: { status: "ready", message: "公共轮换已读取。" },
            vendors: { status: "warning", message: "等待周末商人刷新。" },
            lost_sector: { status: "ready", message: "遗失区域已确认。" }
          },
          checklist: []
        }}
        hasAccountData
      />
    );
    const dailyPanel = html.slice(html.indexOf("home-daily-panel"), html.indexOf("home-weekly-panel"));
    const dailyLead = dailyPanel.slice(dailyPanel.indexOf("home-daily-lead"));

    expect(dailyPanel).toContain("每日重置 · 5 小时 20 分钟");
    expect(dailyLead).not.toContain("<strong>每日重置</strong>");
    expect(html).toContain("home-weekly-panel");
    expect(html).toContain("每周重置 · 5 天 14 小时");
  });

  it("renders confirmed world lost sectors as one expandable daily group", () => {
    const html = renderToStaticMarkup(
      <HomePageContentView
        interfaceLocale="zh-CN"
        dailySummary={{
          daily_reset: {
            label: "每日 01:00 重置",
            time_remaining_label: "距离每日重置还有 5 小时 20 分钟"
          },
          weekly_reset: {
            label: "每周三 01:00 重置",
            time_remaining_label: "距离每周重置还有 5 天 14 小时"
          },
          sources: {
            weekly_report: { status: "ready", message: "本周周报已读取。" },
            rotations: { status: "ready", message: "公共轮换已读取。" },
            vendors: { status: "warning", message: "等待周末商人刷新。" },
            lost_sector: {
              status: "ready",
              message: "已找到 9 个世界遗失区域。",
              items: [
                { title: "遗失区域：英灵日遗失区域", subtitle: "Bungie 公共里程碑" },
                { title: "遗失区域：星光密室", subtitle: "Bungie 公共里程碑" },
                { title: "遗失区域：清道夫洞穴", subtitle: "Bungie 公共里程碑" },
                { title: "遗失区域：永恒深渊", subtitle: "Bungie 公共里程碑" },
                { title: "遗失区域：K1 启示", subtitle: "Bungie 公共里程碑" },
                { title: "遗失区域：镀金戒律", subtitle: "Bungie 公共里程碑" },
                { title: "遗失区域：汇流", subtitle: "Bungie 公共里程碑" },
                { title: "遗失区域：遗忘深渊", subtitle: "Bungie 公共里程碑" },
                { title: "遗失区域：开采", subtitle: "Bungie 公共里程碑" }
              ]
            }
          },
          checklist: []
        }}
        hasAccountData
      />
    );
    const dailyPanel = html.slice(html.indexOf("home-daily-panel"), html.indexOf("home-weekly-panel"));

    expect(dailyPanel).toContain("今日世界遗失区域");
    expect(dailyPanel).toContain("9 个区域");
    expect(dailyPanel).toContain("遗失区域：英灵日遗失区域");
    expect(dailyPanel).toContain("遗失区域：星光密室");
    expect(dailyPanel).toContain("遗失区域：清道夫洞穴");
    expect(dailyPanel).toContain("另有 6 个区域");
  });
});
