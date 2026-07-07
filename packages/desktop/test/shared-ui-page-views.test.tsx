import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AccountPageView,
  HomePageContentView,
  HomePageView,
  LibraryPageView,
  LoadoutsPageContentView,
  LoadoutsPageView,
  SettingsPageView,
  VendorsPageView
} from "../../ui/src/index";
import { selectLoadoutsPageModel } from "../../app/src/workspaces/loadoutsPage";
import type { AccountItemSummary, AccountSummary } from "@d2-tools/core/account/summary";
import type { LoadoutTemplate } from "@d2-tools/core/loadouts/templates";

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

  it("renders the loadouts workbench from the page model contract instead of source-string assertions", () => {
    const html = renderToStaticMarkup(
      <LoadoutsPageContentView
        interfaceLocale="zh-CN"
        model={selectLoadoutsPageModel({
          accountSummary: loadoutsAccountSummary(),
          templates: [targetLoadoutTemplate()],
          selectedTemplateId: "target",
          selectedEntryId: "in-game-char-target-0",
          compareTemplateId: "",
          showDiffOnly: false
        })}
        actions={loadoutsActions()}
        compareTemplateId=""
        renameDraft="Grandmaster"
        showDiffOnly={false}
        message=""
        isRunningItemAction={false}
        actionFeedback={{}}
      />
    );

    expect(html).toContain("loadout-workbench-shell");
    expect(html).toContain("配装工作台");
    expect(html).toContain("Grandmaster");
    expect(html).toContain("Raid slot");
    expect(html).toContain("游戏内配装详情");
    expect(html).toContain("Kinetic Ready");
    expect(html).toContain("应用到角色");
    expect(html).toContain("用当前装备覆盖");
  });

  it("renders saved loadout compare rows from the page model contract", () => {
    const html = renderToStaticMarkup(
      <LoadoutsPageContentView
        interfaceLocale="zh-CN"
        model={selectLoadoutsPageModel({
          accountSummary: loadoutsAccountSummary(),
          templates: [targetLoadoutTemplate(), compareLoadoutTemplate()],
          selectedTemplateId: "target",
          selectedEntryId: "local-template-target",
          compareTemplateId: "compare",
          showDiffOnly: true
        })}
        actions={loadoutsActions()}
        compareTemplateId="compare"
        renameDraft="Grandmaster"
        showDiffOnly
        message=""
        isRunningItemAction={false}
        actionFeedback={{}}
      />
    );

    expect(html).toContain("loadout-compare-grid");
    expect(html).toContain("loadout-compare-row changed");
    expect(html).toContain("Grandmaster");
    expect(html).toContain("Raid");
    expect(html).toContain("Energy Weapons");
    expect(html).toContain("Energy Missing");
    expect(html).toContain("Different Energy");
    expect(html).toContain("框架：精准框架");
    expect(html).toContain("Perk：快速命中");
    expect(html).toContain("Perk：丰盈满溢");
  });
});

function loadoutsActions() {
  return {
    selectEntry: () => undefined,
    selectTemplate: () => undefined,
    selectCompareTemplate: () => undefined,
    renameDraftChange: () => undefined,
    showDiffOnlyChange: () => undefined,
    renameTemplate: () => undefined,
    deleteTemplate: () => undefined,
    createTransferPlan: () => undefined,
    copyMissingItems: () => undefined,
    executeMissingTransfer: () => undefined,
    executeSingleItemTransfer: () => undefined,
    equipSingleItem: () => undefined,
    equipSavedLoadout: () => undefined,
    snapshotCurrentLoadout: () => undefined,
    openTemplateSourceItem: () => undefined
  };
}

function targetLoadoutTemplate(): LoadoutTemplate {
  return {
    id: "target",
    name: "Grandmaster",
    character_id: "char-target",
    class_name: "Titan",
    created_at: "2026-07-02T00:00:00.000Z",
    items: [
      { hash: 100, instance_id: "target-equipped", name: "Kinetic Ready", bucket_name: "Kinetic Weapons" },
      {
        hash: 200,
        instance_id: "vault-energy",
        name: "Energy Missing",
        bucket_name: "Energy Weapons",
        weapon_frame_name: "精准框架",
        perk_names: ["快速命中"]
      }
    ]
  };
}

function compareLoadoutTemplate(): LoadoutTemplate {
  return {
    id: "compare",
    name: "Raid",
    character_id: "char-target",
    class_name: "Titan",
    created_at: "2026-07-02T00:00:00.000Z",
    items: [
      { hash: 100, instance_id: "target-equipped", name: "Kinetic Ready", bucket_name: "Kinetic Weapons" },
      {
        hash: 201,
        instance_id: "other-energy",
        name: "Different Energy",
        bucket_name: "Energy Weapons",
        weapon_frame_name: "适配框架",
        perk_names: ["丰盈满溢"]
      }
    ]
  };
}

function loadoutsAccountSummary(): AccountSummary {
  return {
    account_name: "Guardian",
    destiny_membership_id: "membership",
    membership_type: 3,
    characters: [
      {
        character_id: "char-target",
        class_name: "Titan",
        light: 2010,
        equipped_items: [loadoutsItem("target-equipped", 100, "Kinetic Ready", "Kinetic Weapons")],
        equipment_groups: [],
        inventory_items: [],
        inventory_groups: [],
        postmaster_items: [],
        loadout_slots: [
          {
            index: 0,
            name: "Raid slot",
            item_count: 10,
            items: [
              { instance_id: "target-equipped", name: "Kinetic Ready", bucket_name: "Kinetic Weapons" }
            ]
          }
        ],
        activities: []
      }
    ],
    vault: {
      item_count: 1,
      items: [loadoutsItem("vault-energy", 200, "Energy Missing", "Energy Weapons")],
      sample_items: []
    },
    materials: {
      item_count: 0,
      items: []
    }
  };
}

function loadoutsItem(
  instanceId: string,
  hash: number,
  name: string,
  bucketName: string
): AccountItemSummary {
  return {
    hash,
    instance_id: instanceId,
    name,
    bucket_name: bucketName,
    group_key: "weapons",
    socket_plugs: []
  };
}
