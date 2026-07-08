import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AccountPageContentView,
  AccountPageView,
  HomePageContentView,
  HomePageView,
  LibraryPageContentView,
  LibraryPageView,
  LoadoutsPageContentView,
  LoadoutsPageView,
  SettingsPageView,
  VendorsPageView
} from "../../ui/src/index";
import { selectAccountPageModel } from "../../app/src/workspaces/accountPage";
import {
  defaultLibraryEquipmentFilter,
  defaultLibraryPerkFilter,
  selectLibraryPageModel
} from "../../app/src/workspaces/libraryPage";
import { selectLoadoutsPageModel } from "../../app/src/workspaces/loadoutsPage";
import type { AccountItemSummary, AccountSummary } from "@d2-tools/core/account/summary";
import type { ItemSearchResult } from "@d2-tools/app";
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
    expect(dailyPanel).not.toContain("复制日报");
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

  it("renders library acquisition source groups from the page model contract", () => {
    const html = renderToStaticMarkup(
      <LibraryPageContentView
        interfaceLocale="zh-CN"
        model={selectLibraryPageModel({
          items: [
            libraryItem(700, "可刷武器", "先锋打击掉落。"),
            libraryItem(701, "轮换武器", "每周夜幕轮换奖励。"),
            libraryItem(702, "传承武器", "该来源已下架，暂不可获取。"),
            {
              ...libraryItem(703, "缺来源武器", ""),
              source: {
                status: "missing",
                label: "来源待补",
                description: ""
              }
            }
          ],
          perks: [],
          libraryHistory: { recent: [], favorites: [] },
          libraryCommunityMatch: new Map(),
          liveAvailability: null,
          liveAvailabilityError: "",
          manifestStatus: { initialized: true, version: "2026.07.07.0000" },
          manifestStatusError: ""
        }, {
          libraryViewMode: "equipment",
          equipmentFilters: defaultLibraryEquipmentFilter,
          perkFilters: defaultLibraryPerkFilter,
          equipmentSearchTouched: true,
          perkSearchTouched: false,
          isSearching: false,
          searchError: "",
          aliasDraft: "",
          aliasTargetDraft: "",
          aliasKind: "item",
          aliasMessage: "",
          isLoadingLiveAvailability: false,
          isLoadingManifestStatus: false,
          isInitializingManifest: false,
          itemDetailLoadingKey: ""
        })}
        actions={libraryActions()}
      />
    );

    expect(html).toContain("library-source-groups");
    expect(html).toContain("library-reference-card");
    expect(html).toContain("来源可确认");
    expect(html).toContain("等轮换");
    expect(html).toContain("已下架或待确认");
    expect(html).toContain("来源待补");
    expect(html).toContain("可刷武器");
    expect(html).toContain("轮换武器");
    expect(html).toContain("传承武器");
    expect(html).toContain("缺来源武器");
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

  it("renders logged-in account refresh and reauthorization actions from the page model contract", () => {
    const html = renderToStaticMarkup(
      <AccountPageContentView
        interfaceLocale="zh-CN"
        viewModel={selectAccountPageModel({
          cache: {
            accountSummary: accountPageSummary(),
            activitySummary: null
          },
          pageState: {
            selectedCharacterId: "account-char-1",
            isBungieConfigured: true,
            isAccountLoggedIn: true,
            isLoadingAccount: false,
            writeActionsEnabled: true,
            accountError: "",
            itemDetailError: "",
            activityMessage: "",
            activityError: "",
            loadoutMessage: "",
            itemActionMessage: "",
            isRunningItemAction: false
          }
        })}
        actions={accountActions()}
      />
    );

    expect(html).toContain("account-page-actions");
    expect(html).toContain("刷新账号");
    expect(html).toContain("重新授权");
    expect(html).toContain("Guardian");
    expect(html).toContain("猎人");
  });

  it("renders account equipment, inventory, loadout hits, and materials from the page model contract", () => {
    const html = renderToStaticMarkup(
      <AccountPageContentView
        interfaceLocale="zh-CN"
        viewModel={selectAccountPageModel({
          cache: {
            accountSummary: accountPageSummary(),
            activitySummary: null
          },
          pageState: {
            selectedCharacterId: "account-char-1",
            isBungieConfigured: true,
            isAccountLoggedIn: true,
            isLoadingAccount: false,
            writeActionsEnabled: true,
            accountError: "",
            itemDetailError: "",
            activityMessage: "",
            activityError: "",
            loadoutMessage: "",
            itemActionMessage: "",
            isRunningItemAction: false,
            activeLoadoutTemplateName: "日落配装",
            isLoadoutMatch: (item) => item.instance_id === "account-equipped"
          }
        })}
        actions={accountActions()}
      />
    );

    expect(html).toContain("account-primary-workbench");
    expect(html).toContain("account-slot-comparison-row");
    expect(html).toContain("account-secondary-workbench");
    expect(html).toContain("account-character-summary");
    expect(html).toContain("account-equipped-panel");
    expect(html).toContain("account-inventory-panel");
    expect(html).toContain("equipment-item");
    expect(html).toContain("loadout-highlight");
    expect(html).toContain("loadout-template-badge");
    expect(html).toContain("当前角色装备");
    expect(html).toContain("当前角色背包");
    expect(html).toContain("已装备手炮");
    expect(html).toContain("背包胸甲");
    expect(html).toContain("方案命中");
    expect(html).toContain("材料与消耗品");
    expect(html).toContain("强化核心");
    expect(html).toContain(">27<");
  });

  it("renders bounded account backpack previews from the page model contract", () => {
    const html = renderToStaticMarkup(
      <AccountPageContentView
        interfaceLocale="zh-CN"
        viewModel={selectAccountPageModel({
          cache: {
            accountSummary: accountPageSummaryWithBackpackOverflow(),
            activitySummary: null
          },
          pageState: {
            selectedCharacterId: "account-char-1",
            isBungieConfigured: true,
            isAccountLoggedIn: true,
            isLoadingAccount: false,
            writeActionsEnabled: true,
            accountError: "",
            itemDetailError: "",
            activityMessage: "",
            activityError: "",
            loadoutMessage: "",
            itemActionMessage: "",
            isRunningItemAction: false
          }
        })}
        actions={accountActions()}
      />
    );

    expect(html).toContain("当前角色背包 / 背包候选");
    expect(html).toContain("背包候选 01");
    expect(html).toContain("背包候选 08");
    expect(html).not.toContain("背包候选 09");
    expect(html).toContain("显示全部 10 件");
    expect(html).toContain("还有 2 件未渲染");
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("/icons/backpack-01.png");
  });

  it("renders disconnected account setup actions from the page model contract", () => {
    const html = renderToStaticMarkup(
      <AccountPageContentView
        interfaceLocale="zh-CN"
        viewModel={selectAccountPageModel({
          cache: {
            accountSummary: null,
            activitySummary: null
          },
          pageState: {
            selectedCharacterId: "",
            isBungieConfigured: false,
            isAccountLoggedIn: false,
            isLoadingAccount: false,
            writeActionsEnabled: false,
            accountError: "",
            itemDetailError: "",
            activityMessage: "",
            activityError: "",
            loadoutMessage: "",
            itemActionMessage: "",
            isRunningItemAction: false
          }
        })}
        actions={accountActions()}
      />
    );

    expect(html).toContain("account-empty-state");
    expect(html).toContain("未连接 Bungie");
    expect(html).toContain("去设置 Bungie");
    expect(html).toContain("登录 Bungie");
  });
});

function libraryActions() {
  return {
    onViewModeChange: () => undefined,
    onEquipmentFiltersChange: () => undefined,
    onPerkFiltersChange: () => undefined,
    onSearch: () => undefined,
    onClearFilters: () => undefined,
    onRefreshManifestStatus: () => undefined,
    onInitializeManifest: () => undefined,
    onAliasDraftChange: () => undefined,
    onAliasTargetDraftChange: () => undefined,
    onAliasKindChange: () => undefined,
    onSaveAlias: () => undefined,
    onOpenItemDetail: () => undefined,
    onAddFavorite: () => undefined,
    onRemoveFavorite: () => undefined
  };
}

function libraryItem(hash: number, name: string, sourceDescription: string): ItemSearchResult {
  return {
    hash,
    name,
    description: `${name} 描述`,
    item_type: "自动步枪",
    tier: "传说",
    group_key: "weapons",
    bucket_name: "动能武器",
    source: {
      status: "ready",
      label: "来源可确认",
      description: sourceDescription
    },
    perks: [
      {
        socket_index: 0,
        plugs: [
          {
            hash: hash + 1000,
            name: "测试 Perk",
            description: "测试 Perk 描述"
          }
        ]
      }
    ]
  };
}

function accountActions() {
  return {
    configureBungie: () => undefined,
    loginBungie: () => undefined,
    refreshAccount: () => undefined,
    refreshActivity: () => undefined,
    selectCharacter: () => undefined,
    saveCurrentLoadout: () => undefined,
    equipHighestPower: () => undefined,
    openItem: () => undefined
  };
}

function accountPageSummary(): AccountSummary {
  return {
    account_name: "Guardian",
    destiny_membership_id: "account-membership",
    membership_type: 3,
    characters: [
      {
        character_id: "account-char-1",
        class_name: "猎人",
        light: 2015,
        equipped_items: [loadoutsItem("account-equipped", 300, "已装备手炮", "能量武器")],
        equipment_groups: [],
        inventory_items: [loadoutsItem("account-inventory", 301, "背包胸甲", "胸甲")],
        inventory_groups: [],
        postmaster_items: [],
        loadout_slots: [],
        activities: []
      }
    ],
    vault: {
      item_count: 2,
      items: [],
      sample_items: []
    },
    materials: {
      item_count: 1,
      items: [
        {
          hash: 400,
          name: "强化核心",
          item_type: "消耗品",
          tier: "传说",
          quantity: 27
        }
      ]
    }
  };
}

function accountPageSummaryWithBackpackOverflow(): AccountSummary {
  const summary = accountPageSummary();
  return {
    ...summary,
    characters: summary.characters.map((character) => character.character_id === "account-char-1"
      ? {
          ...character,
          inventory_items: Array.from({ length: 10 }, (_, index) => loadoutsItem(
            `account-inventory-${index + 1}`,
            500 + index,
            `背包候选 ${String(index + 1).padStart(2, "0")}`,
            "能量武器",
            { icon: `/icons/backpack-${String(index + 1).padStart(2, "0")}.png` }
          ))
        }
      : character)
  };
}

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
  bucketName: string,
  options: { icon?: string } = {}
): AccountItemSummary {
  return {
    hash,
    instance_id: instanceId,
    name,
    icon: options.icon,
    bucket_name: bucketName,
    group_key: "weapons",
    socket_plugs: []
  };
}
