import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AccountPageContentView,
  AccountPageView,
  HomePageContentView,
  HomePageView,
  getLibraryRandomPerkGroups,
  getLibraryWeaponPerkColumns,
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

  it("keeps weekly activity priority cards pending until weekly summary confirms them", () => {
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
            weekly_report: {
              status: "ready",
              message: "本周周报已读取。",
              items: [
                { title: "玻璃小径", subtitle: "先锋行动 · 宗师先锋警戒", description: "奖励武器：热头" },
                { title: "国王的陨落", subtitle: "本周轮换突袭", description: "可反复刷取轮换奖励" },
                { title: "守望者尖塔", subtitle: "本周轮换地牢", description: "可反复刷取轮换奖励" },
                { title: "先锋声望加成", subtitle: "本周加成", description: "先锋声望额外奖励" },
                { title: "曙光节", subtitle: "特殊活动", description: "限时活动已确认" }
              ]
            },
            rotations: {
              status: "ready",
              message: "公共轮换已读取。",
              items: [
                { title: "国王的陨落: 标准", subtitle: "活动轮换", description: "公共活动列表", source: "Bungie", weeklyActivityKind: "rotating_raid" },
                { title: "守望者尖塔: 标准", subtitle: "活动轮换", description: "公共活动列表", source: "Bungie", weeklyActivityKind: "rotating_dungeon" },
                { title: "Bungie 公共里程碑", subtitle: "公共线索：活动轮换待核对" }
              ]
            },
            vendors: {
              status: "ready",
              message: "奇异商人库存已读取。",
              items: [{ title: "仄 / Xur", subtitle: "关键库存 8 件已读取" }]
            },
            lost_sector: { status: "ready", message: "遗失区域已确认。" }
          },
          checklist: []
        }}
        hasAccountData
      />
    );
    const weeklyPanel = html.slice(html.indexOf("home-weekly-panel"));

    expect(weeklyPanel).toContain("先锋行动 · 宗师先锋警戒");
    expect(weeklyPanel).toContain("本周轮换突袭");
    expect(weeklyPanel).toContain("本周轮换地牢");
    expect(weeklyPanel).toContain("宗师先锋警戒待确认");
    expect(weeklyPanel).toContain("轮换突袭待确认");
    expect(weeklyPanel).toContain("轮换地牢待确认");
    expect(weeklyPanel).not.toContain("玻璃小径");
    expect(weeklyPanel).not.toContain("奖励武器：热头");
    expect(weeklyPanel).not.toContain("国王的陨落");
    expect(weeklyPanel).not.toContain("守望者尖塔");
    expect(weeklyPanel).not.toContain("本周加成");
    expect(weeklyPanel).not.toContain("先锋声望加成");
    expect(weeklyPanel).not.toContain("特殊活动");
    expect(weeklyPanel).not.toContain("曙光节");
    expect(weeklyPanel).toContain("奇异商人");
    expect(weeklyPanel).toContain("关键库存 8 件已读取");
    expect(weeklyPanel).toContain("公共线索");
    expect(weeklyPanel).toContain("活动轮换待核对");
    expect(weeklyPanel).not.toContain("勇士：");
    expect(weeklyPanel).not.toContain("护盾：");
    expect(weeklyPanel).not.toContain("威胁：");
    expect(weeklyPanel).not.toContain("试炼");
    expect(weeklyPanel).not.toContain("铁旗");
    expect(weeklyPanel).not.toContain("周末窗口");
    expect(weeklyPanel).not.toContain("Bungie 公共里程碑");
  });

  it("keeps Bungie-shaped weekly milestones as clues and keeps compact Xur inventory on the home page", () => {
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
            time_remaining_label: "距离每周重置还有 129 小时 28 分钟"
          },
          sources: {
            weekly_report: {
              status: "ready",
              message: "本周活动线索已读取。",
              items: [
                { title: "玻璃小径：专家", subtitle: "日落", description: "奖励武器：热头" },
                { title: "Bungie 公共里程碑：轮换突袭", subtitle: "非完整掉落地图；国王的陨落：标准 / 克洛塔的末日：标准", description: "国王万岁..." },
                { title: "Bungie 公共里程碑：轮换地牢", subtitle: "非完整掉落地图；守望者尖塔：标准", description: "可反复刷取轮换奖励" }
              ]
            },
            rotations: {
              status: "ready",
              message: "公共轮换已读取。",
              items: [
                { title: "克洛塔的末日：标准", subtitle: "Bungie 公共里程碑", description: "他在深渊之暗中等待" },
                { title: "深岩墓室", subtitle: "Bungie 公共里程碑", description: "传承的锁链必须被打破" }
              ]
            },
            vendors: {
              status: "ready",
              message: "奇异商人库存已读取。",
              items: [
                {
                  title: "每日武器商人",
                  subtitle: "登录角色商人库存",
                  description: "试验性武器 / 传说武器",
                  vendorHash: 672118013
                },
                {
                  title: "仄 / Xur",
                  subtitle: "奇异商人库存",
                  description: "关键库存已读取",
                  vendorHash: 2190858386,
                  items: [
                    { title: "透视之眼", subtitle: "异域武器", iconUrl: "/common/destiny2_content/icons/xur-weapon.png" },
                    { title: "圣火之心", subtitle: "泰坦胸甲", iconUrl: "/common/destiny2_content/icons/xur-armor.png" }
                  ]
                }
              ]
            },
            lost_sector: { status: "ready", message: "遗失区域已确认。" }
          },
          checklist: []
        }}
        hasAccountData
      />
    );
    const weeklyPanel = html.slice(html.indexOf("home-weekly-panel"));

    expect(weeklyPanel).toContain("宗师先锋警戒待确认");
    expect(weeklyPanel).toContain("轮换突袭待确认");
    expect(weeklyPanel).toContain("轮换地牢待确认");
    expect(weeklyPanel).not.toContain("玻璃小径：专家");
    expect(weeklyPanel).not.toContain("奖励武器：热头");
    expect(weeklyPanel).not.toContain("国王的陨落：标准");
    expect(weeklyPanel).not.toContain("守望者尖塔：标准");
    expect(weeklyPanel).not.toContain("Bungie 公共里程碑：轮换突袭");
    expect(weeklyPanel).not.toContain("非完整掉落地图");
    expect(weeklyPanel).toContain("克洛塔的末日：标准");
    expect(weeklyPanel).toContain("深岩墓室");
    expect(weeklyPanel).toContain("home-xur-spotlight");
    expect(weeklyPanel).toContain("home-xur-item-grid");
    expect(weeklyPanel).toContain("仄 / Xur");
    expect(weeklyPanel).toContain("透视之眼");
    expect(weeklyPanel).toContain("圣火之心");
    expect(weeklyPanel).toContain("xur-weapon.png");
    expect(weeklyPanel).toContain("xur-armor.png");
    expect(weeklyPanel).not.toContain("每日武器商人");
    expect(weeklyPanel).not.toContain("试验性武器");
  });

  it("renders weekly briefing from the weekly summary instead of daily summary weekly report", () => {
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
            weekly_report: { status: "pending", message: "日报不再提供本周主数据。" },
            rotations: { status: "pending", message: "日报轮换不提供本周主数据。" },
            vendors: { status: "pending", message: "等待商人数据。" },
            lost_sector: { status: "ready", message: "遗失区域已确认。" }
          },
          checklist: []
        }}
        weeklySummary={{
          weekly_reset: {
            label: "每周三 01:00 重置",
            time_remaining_label: "距离每周重置还有 5 天 14 小时"
          },
          priorities: {
            nightfall: {
              status: "ready",
              title: "玻璃小径：大师",
              detail: "奖励武器：热头",
              evidence: "Bungie 周维度数据"
            },
            rotating_raid: {
              status: "ready",
              title: "国王的陨落",
              detail: "轮换突袭可反复刷取",
              evidence: "Bungie 周维度数据",
              entries: [
                { title: "救赎的边缘", detail: "周常突袭挑战" },
                { title: "门徒誓约", detail: "周常突袭挑战" }
              ]
            },
            rotating_dungeon: {
              status: "ready",
              title: "守望者尖塔",
              detail: "轮换地牢可反复刷取",
              evidence: "Bungie 周维度数据",
              entries: [
                { title: "晚星之主", detail: "周常地牢挑战" },
                { title: "二象性", detail: "周常地牢挑战" }
              ]
            },
            weekly_bonus: {
              status: "ready",
              title: "先锋声望加成",
              detail: "本周声望额外奖励",
              evidence: "Bungie 周维度数据"
            },
            special_event: {
              status: "ready",
              title: "曙光节",
              detail: "限时活动已确认",
              evidence: "Bungie 周维度数据"
            }
          },
          public_clues: []
        }}
        hasAccountData
      />
    );
    const weeklyPanel = html.slice(html.indexOf("home-weekly-panel"));

    expect(weeklyPanel).toContain("玻璃小径：大师");
    expect(weeklyPanel).toContain("救赎的边缘 / 门徒誓约");
    expect(weeklyPanel).toContain("晚星之主 / 二象性");
    expect(weeklyPanel).not.toContain("先锋声望加成");
    expect(weeklyPanel).not.toContain("曙光节");
    expect(weeklyPanel).not.toContain("宗师先锋警戒待确认");
    expect(weeklyPanel).not.toContain("轮换突袭待确认");
    expect(weeklyPanel).not.toContain("轮换地牢待确认");
    expect(weeklyPanel).not.toContain("奖励加成待确认");
    expect(weeklyPanel).not.toContain("暂无可确认特殊活动");
  });

  it("keeps public raid milestones out of fallback weekly raid priority cards", () => {
    const html = renderToStaticMarkup(
      <HomePageContentView
        interfaceLocale="zh-CN"
        dailySummary={{
          daily_reset: {
            label: "Daily reset",
            time_remaining_label: "距离每日重置还有 5 小时"
          },
          weekly_reset: {
            label: "Weekly reset",
            time_remaining_label: "距离每周重置还有 5 天"
          },
          sources: {
            weekly_report: { status: "pending", message: "Waiting for confirmed weekly data." },
            rotations: {
              status: "ready",
              message: "Public milestones loaded.",
              items: [
                {
                  title: "Bungie public milestone: raid portal",
                  subtitle: "Non-drop-map clue; King's Fall: Standard / Last Wish: Standard",
                  description: "Public milestone only",
                  source: "Bungie public milestone",
                  weeklyActivityKind: "rotating_raid"
                }
              ]
            },
            vendors: { status: "pending", message: "Waiting for vendors." },
            lost_sector: { status: "pending", message: "Waiting for lost sectors." }
          },
          checklist: []
        }}
        hasAccountData
      />
    );
    const weeklyPanel = html.slice(html.indexOf("home-weekly-panel"));
    const primaryGrid = weeklyPanel.slice(
      weeklyPanel.indexOf("home-weekly-primary-grid"),
      weeklyPanel.indexOf("home-weekly-support")
    );

    expect(primaryGrid).not.toContain("King&#x27;s Fall");
    expect(primaryGrid).not.toContain("Last Wish");
    expect(weeklyPanel).toContain("King&#x27;s Fall");
    expect(weeklyPanel).toContain("Last Wish");
  });

  it("renders all confirmed world lost sectors and keeps vendor/account noise out of daily briefing", () => {
    const lostSectorItems = [
      {
        title: "采石场",
        destinationName: "欧洲无人区",
        championTypes: ["屏障", "势不可挡"],
        shieldTypes: ["烈日", "虚空"],
        threatType: "虚空",
        expertSoloRewards: ["异域记忆水晶（稀有）", "传说武器（罕见）"],
        masterSoloRewards: ["异域记忆水晶（普通）", "传说武器（普通）"]
      },
      {
        title: "萃取地",
        destinationName: "萨瓦图恩的王座世界",
        championTypes: ["过载", "势不可挡"],
        shieldTypes: ["电弧", "虚空"],
        expertSoloRewards: ["异域臂甲（稀有）", "异域胸甲（稀有）", "异域头盔（稀有）", "异域腿甲（稀有）"],
        masterSoloRewards: ["异域臂甲（常见）", "异域胸甲（常见）", "异域头盔（常见）", "异域腿甲（常见）"]
      },
      {
        title: "地堡E15",
        destinationName: "木卫二",
        championTypes: ["屏障", "过载"],
        shieldTypes: ["电弧", "虚空"],
        threatType: "电弧",
        expertSoloRewards: ["异域记忆水晶（稀有）", "传说武器（罕见）"],
        masterSoloRewards: ["异域记忆水晶（普通）", "传说武器（普通）"]
      },
      {
        title: "镀金箴言",
        destinationName: "内欧姆那",
        championTypes: ["屏障", "势不可挡"],
        shieldTypes: ["烈日", "电弧"],
        threatType: "烈日",
        expertSoloRewards: ["传说武器（罕见）"],
        masterSoloRewards: ["传说武器（普通）"]
      },
      {
        title: "繁盛深渊",
        destinationName: "苍白之心",
        championTypes: ["过载", "势不可挡"],
        shieldTypes: ["虚空", "缚丝"],
        threatType: "缚丝",
        expertSoloRewards: ["异域记忆水晶（稀有）"],
        masterSoloRewards: ["异域记忆水晶（普通）"]
      },
      {
        title: "黑色移民号花园2A",
        destinationName: "涅索斯",
        championTypes: ["屏障", "过载"],
        shieldTypes: ["电弧", "烈日"],
        expertSoloRewards: ["传说武器（罕见）"],
        masterSoloRewards: ["传说武器（普通）"]
      },
      {
        title: "汇流",
        destinationName: "涅索斯",
        championTypes: ["屏障", "势不可挡"],
        shieldTypes: ["虚空", "烈日"],
        threatType: "虚空",
        expertSoloRewards: ["异域记忆水晶（稀有）", "传说武器（罕见）"],
        masterSoloRewards: ["异域记忆水晶（普通）", "传说武器（普通）"]
      },
      {
        title: "惊颤竞速",
        destinationName: "月球",
        championTypes: ["过载", "势不可挡"],
        shieldTypes: ["电弧", "虚空"],
        threatType: "电弧",
        expertSoloRewards: ["传说武器（罕见）"],
        masterSoloRewards: ["传说武器（普通）"]
      },
      {
        title: "空坦克",
        destinationName: "纷争海岸",
        championTypes: ["屏障", "过载"],
        shieldTypes: ["烈日", "虚空"],
        expertSoloRewards: ["异域记忆水晶（稀有）"],
        masterSoloRewards: ["异域记忆水晶（普通）"]
      }
    ] as any;

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
            rotations: {
              status: "ready",
              message: "公共轮换已读取。",
              items: [{ title: "国王的陨落：标准", subtitle: "Bungie 公共里程碑" }]
            },
            vendors: {
              status: "ready",
              message: "今日商人变化已读取。",
              items: [{ title: "每日武器商人", subtitle: "枪匠库存" }]
            },
            lost_sector: {
              status: "ready",
              message: "已找到 9 个世界遗失区域。",
              items: lostSectorItems
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
    for (const item of lostSectorItems) {
      expect(dailyPanel).toContain(item.title);
    }
    expect(dailyPanel).not.toContain("另有 6 个区域");
    expect(dailyPanel).not.toContain("进入日报");
    expect(dailyPanel).toContain("欧洲无人区");
    expect(dailyPanel).toContain("勇士：屏障、势不可挡");
    expect(dailyPanel).not.toContain("护盾：");
    expect(dailyPanel).not.toContain("威胁：");
    expect(dailyPanel).toContain("专家：");
    expect(dailyPanel).toContain("异域记忆水晶（稀有）、传说武器（罕见）");
    expect(dailyPanel).toContain("大师：");
    expect(dailyPanel).toContain("异域记忆水晶（普通）、传说武器（普通）");
    expect(dailyPanel).not.toContain("单人奖励：");
    expect(dailyPanel).not.toContain("通关奖励");
    expect(dailyPanel).not.toContain("单人掉落");
    expect(dailyPanel).not.toContain("强化核心");
    expect(dailyPanel).not.toContain("推荐光等");
    expect(dailyPanel).not.toContain("Manifest");
    expect(dailyPanel).not.toContain("重点商人");
    expect(dailyPanel).not.toContain("规则整理中");
    expect(dailyPanel).not.toContain("预留");
    expect(dailyPanel).not.toContain("账号提醒");
    expect(dailyPanel).not.toContain("只显示会影响今天游玩决策的账号提醒");
    expect(dailyPanel).not.toContain("每日武器商人");
    expect(dailyPanel).not.toContain("国王的陨落：标准");
    expect(html).toContain("国王的陨落：标准");
  });

  it("does not render lost sector name-only rows as completed daily briefing", () => {
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
                { title: "采石场" },
                { title: "萃取地" },
                { title: "地堡E15" },
                { title: "镀金箴言" },
                { title: "繁盛深渊" },
                { title: "黑色移民号花园2A" },
                { title: "汇流" },
                { title: "惊颤竞速" },
                { title: "空坦克" }
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
    expect(dailyPanel).toContain("遗失区域详情暂不可读");
    expect(dailyPanel).toContain("请先更新或修复资料库");
    expect(dailyPanel).not.toContain('class="home-summary-list-item"');
    expect(dailyPanel).not.toContain(">采石场</strong>");
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
    expect(html).toContain("library-equipment-browser");
    expect(html).toContain("library-equipment-list");
    expect(html).toContain("查看详情");
    expect(html).not.toContain("library-definition-dialog");
  });

  it("filters library definition sockets down to random perk candidates", () => {
    const groups = getLibraryRandomPerkGroups([
      {
        socket_index: 0,
        plugs: [
          { hash: 1, name: "轻质弓弦", description: "略微提高操控性。" }
        ]
      },
      {
        socket_index: 6,
        plugs: [
          { hash: 2, name: "玻璃纪念", description: "使用此着色器更改装备配色。" }
        ]
      },
      {
        socket_index: 8,
        plugs: [
          { hash: 3, name: "1阶：稳定性", description: "将其铸造为大师杰作物品。" }
        ]
      },
      {
        socket_index: 10,
        plugs: [
          { hash: 4, name: "击杀记录器", description: "记录使用武器消灭敌人的数量。" }
        ]
      }
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.plugs.map((plug) => plug.name)).toEqual(["轻质弓弦"]);
  });

  it("maps library weapon sockets to readable weapon definition columns", () => {
    const columns = getLibraryWeaponPerkColumns([
      {
        socket_index: 0,
        plugs: [
          { hash: 1, name: "轻质框架", description: "反曲弓。" }
        ]
      },
      {
        socket_index: 1,
        plugs: [
          { hash: 2, name: "灵活弓弦", description: "更轻，更快。" }
        ]
      },
      {
        socket_index: 2,
        plugs: [
          { hash: 3, name: "碳质箭杆", description: "提高稳定性。" }
        ]
      },
      {
        socket_index: 3,
        plugs: [
          { hash: 4, name: "潜匿弓箭", description: "提高充能时间。" }
        ]
      },
      {
        socket_index: 4,
        plugs: [
          { hash: 5, name: "爆炸箭头", description: "箭矢延迟爆炸。" }
        ]
      },
      {
        socket_index: 6,
        plugs: [
          { hash: 6, name: "碎裂箭杆", description: "箭杆候选。" },
          { hash: 7, name: "专家稳定性", description: "武器模组。" }
        ]
      },
      {
        socket_index: 5,
        plugs: [
          { hash: 8, name: "伏特寻踪", description: "起源特性。" }
        ]
      },
      {
        socket_index: 7,
        plugs: [
          { hash: 9, name: "6阶：稳定性", description: "大幅提升的属性。" }
        ]
      }
    ], "战斗弓箭");

    expect(columns.map((column) => column.label)).toEqual([
      "框架 / 固有",
      "弓弦",
      "箭矢",
      "第 4 列",
      "第 5 列",
      "起源特性"
    ]);
    expect(columns.flatMap((column) => column.plugs.map((plug) => plug.name))).toEqual([
      "轻质框架",
      "灵活弓弦",
      "碳质箭杆",
      "潜匿弓箭",
      "爆炸箭头",
      "伏特寻踪"
    ]);
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
    weapon_frame: {
      key: "adaptive-frame",
      name: "适配框架"
    },
    source: {
      status: "ready",
      label: "来源可确认",
      description: sourceDescription
    },
    definition_stats: [
      { hash: 4284893193, name: "射速", value: 600, display_maximum: 1000 },
      { hash: 4043523819, name: "伤害", value: 29, display_maximum: 100 },
      { hash: 155624089, name: "稳定性", value: 66, display_maximum: 100 }
    ],
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
