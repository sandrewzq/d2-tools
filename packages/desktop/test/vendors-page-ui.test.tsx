import React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VendorsPageContentView } from "../../ui/src/index";
import { selectVendorsPageModel } from "../../app/src/workspaces/vendorsPage";

describe("vendors page UI", () => {
  it("keeps the content view boundary at model and actions", () => {
    const source = readFileSync(join(process.cwd(), "packages/ui/src/vendors/VendorsPageContentView.tsx"), "utf8");

    expect(source).toContain("model: VendorsPageModelView");
    expect(source).toContain("actions: VendorsPageActions");
    expect(source).not.toContain("model?: VendorsPageModelView");
    expect(source).not.toContain("actions?: VendorsPageActions");
    expect(source).not.toContain("vendors?: VendorInventoryGroupView[]");
    expect(source).not.toContain("railSections?: VendorRailSectionView[]");
    expect(source).not.toContain("updatedLabel?: string");
    expect(source).not.toContain("getDefaultVendorWorkspace");
  });

  it("keeps vendor stock title and status chips from overlapping", () => {
    const styles = readFileSync(join(process.cwd(), "packages/ui/src/styles.css"), "utf8");

    expect(styles).toContain(".vendor-detail-panel .vendor-stock-title");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) max-content");
    expect(styles).toContain(".vendor-stock-title strong");
    expect(styles).toContain("min-width: 0");
    expect(styles).toContain("-webkit-line-clamp: 2");
    expect(styles).toContain(".vendor-stock-title .app-chip");
    expect(styles).toContain("max-width: 88px");
  });

  it("renders a DIM-like vendor rail, item icons, and non-empty evidence details", () => {
    const html = renderToStaticMarkup(
      <VendorsPageContentView
        interfaceLocale="zh-CN"
        model={selectVendorsPageModel(createVendorDailySummary())}
        actions={{}}
      />
    );

    expect(html).toContain("vendor-workbench-layout");
    expect(html).toContain("vendor-rail");
    expect(html).toContain("vendor-rail-item");
    expect(html).toContain("vendor-avatar");
    expect(html).toContain("vendor-item-art");
    expect(html).toContain("data:image/svg+xml");
    expect(html).toContain("vendor-cost-row");
    expect(html).toContain("vendor-evidence-grid");
    expect(html).toContain("vendor-detail-toolbar");
    expect(html).toContain("vendor-inventory-grid");
    expect(html).toContain("公共商人证据");
    expect(html).toContain("每日武器商人");
    expect(html).toContain("护甲合成商人");
    expect(html).toContain("试炼商人");
    expect(html).toContain("先锋商人");
    expect(html).toContain("熔炉商人");
    expect(html).toContain("智谋商人");
    expect(html).toContain("记忆水晶商人");
    expect(html).toContain("外观商人");
    expect(html).not.toContain("Banshee-44");
    expect(html).not.toContain("Ada-1");
    expect(html).not.toContain("Saint-14");
    expect(html).not.toContain("塔楼");
    expect(html).not.toContain("实时");
  });

  it("groups vendors by player task instead of raw live source", () => {
    const html = renderToStaticMarkup(
      <VendorsPageContentView
        interfaceLocale="zh-CN"
        model={selectVendorsPageModel(null)}
        actions={{}}
      />
    );

    expect(html).toContain("重点库存");
    expect(html).toContain("仪式声望");
    expect(html).toContain("周末活动");
    expect(html).toContain("外观 / 服务");
    expect(html).not.toContain("特殊 / 活动");
  });

  it("renders vendor rail sections and toolbar labels from the workspace model", () => {
    const vendor = {
      id: "custom-weekend",
      name: "资料库周末商人",
      description: "模型已整理的周末商人。",
      badge: "内部状态",
      source: "Bungie 登录角色商人",
      resetLabel: "距离每日重置还有 2 小时",
      category: "不会被 UI 解释",
      iconLabel: "周",
      statusLabel: "等待库存读取",
      displayStatusLabel: "模型未读取",
      inventoryState: "not_read" as const,
      inventoryStateLabel: "模型未读取库存",
      railStatusLabel: "模型未读取 · 0 件物品",
      detailToolbar: {
        taskCategory: "模型周末活动",
        inventoryStateLabel: "模型未读取库存",
        statusLabel: "模型未读取",
        itemCountLabel: "模型 0 件物品"
      },
      featured: true,
      items: []
    };
    const model = {
      vendors: [vendor],
      railSections: [
        {
          id: "weekend",
          title: "模型分组",
          vendors: [vendor]
        }
      ],
      defaultVendorId: "custom-weekend",
      updatedLabel: "模型更新",
      sourceLabel: "模型来源",
      nextResetLabel: "模型重置",
      recommendationCount: 0,
      verifiedItemCount: 0
    };
    const html = renderToStaticMarkup(
      <VendorsPageContentView
        interfaceLocale="zh-CN"
        model={model}
        actions={{}}
      />
    );

    expect(html).toContain("模型分组");
    expect(html).toContain("模型未读取 · 0 件物品");
    expect(html).toContain("模型周末活动");
    expect(html).toContain("模型未读取库存");
    expect(html).not.toContain("其他商人");
    expect(html).not.toContain("等待实时库存");
  });

  it("renders a compact unread empty state for vendors without readable inventory", () => {
    const vendor = {
      id: "tess",
      name: "外观商人",
      description: "外观和光尘轮换。",
      badge: "周更",
      source: "本地商人目录",
      resetLabel: "距离每日重置还有 2 小时",
      category: "特殊 / 活动",
      iconLabel: "EV",
      statusLabel: "等待库存读取",
      displayStatusLabel: "未读取",
      inventoryState: "not_read" as const,
      inventoryStateLabel: "未读取库存",
      railStatusLabel: "未读取 · 0 件物品",
      detailToolbar: {
        taskCategory: "外观 / 服务",
        inventoryStateLabel: "未读取库存",
        statusLabel: "未读取",
        itemCountLabel: "0 件物品"
      },
      featured: true,
      items: []
    };
    const html = renderToStaticMarkup(
      <VendorsPageContentView
        interfaceLocale="zh-CN"
        model={{
          vendors: [vendor],
          railSections: [{ id: "cosmetic", title: "外观 / 服务", vendors: [vendor] }],
          defaultVendorId: "tess",
          updatedLabel: "模型更新",
          sourceLabel: "模型来源",
          nextResetLabel: "模型重置",
          recommendationCount: 0,
          verifiedItemCount: 0
        }}
        actions={{}}
      />
    );

    expect(html).toContain("vendor-empty-card");
    expect(html).toContain("未读取");
    expect(html).not.toContain("等待实时库存");
    expect(html).not.toContain("实时");
  });

  it("selects the featured vendor as the initial detail target", () => {
    const html = renderToStaticMarkup(
      <VendorsPageContentView
        interfaceLocale="zh-CN"
        model={{
          vendors: [
            {
              id: "xur",
              name: "仄",
              description: "周末库存",
              badge: "周末",
              source: "仄样本",
              resetLabel: "周末",
              category: "重点",
              iconLabel: "X",
              statusLabel: "已确认",
              items: []
            },
            {
              id: "saint",
              name: "试炼商人",
              description: "试炼奖励",
              badge: "周末",
              source: "试炼商人样本",
              resetLabel: "周末",
              category: "周末",
              iconLabel: "S14",
              statusLabel: "原型样本",
              featured: true,
              items: [
                {
                  id: "saint-engram",
                  name: "试炼记忆水晶聚焦",
                  itemType: "聚焦奖励",
                  summary: "周末优先查看。",
                  cost: "试炼记忆水晶",
                  iconLabel: "试",
                  tone: "weapon",
                  status: "recommended"
                }
              ]
            }
          ],
          railSections: [
            {
              id: "weekend",
              title: "周末活动",
              vendors: [
                {
                  id: "saint",
                  name: "试炼商人",
                  description: "试炼奖励",
                  badge: "周末",
                  source: "试炼商人样本",
                  resetLabel: "周末",
                  category: "周末",
                  iconLabel: "S14",
                  statusLabel: "原型样本",
                  featured: true,
                  items: [
                    {
                      id: "saint-engram",
                      name: "试炼记忆水晶聚焦",
                      itemType: "聚焦奖励",
                      summary: "周末优先查看。",
                      cost: "试炼记忆水晶",
                      iconLabel: "试",
                      tone: "weapon",
                      status: "recommended"
                    }
                  ]
                }
              ]
            }
          ],
          defaultVendorId: "saint",
          updatedLabel: "模型更新",
          sourceLabel: "模型来源",
          nextResetLabel: "模型重置",
          recommendationCount: 1,
          verifiedItemCount: 1
        }}
        actions={{}}
      />
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("试炼商人样本");
    expect(html).toContain("试炼记忆水晶聚焦");
  });

  it("renders real vendor and currency icons when provided", () => {
    const html = renderToStaticMarkup(
      <VendorsPageContentView
        interfaceLocale="zh-CN"
        model={{
          vendors: [
            {
              id: "xur",
              name: "资料库周末商人",
              description: "周末库存",
              badge: "已确认",
              source: "Bungie 公共商人",
              resetLabel: "每日",
              category: "重点",
              iconUrl: "https://www.bungie.net/common/destiny2_content/icons/xur.jpg",
              statusLabel: "已确认",
              featured: true,
              items: [
                {
                  id: "xur-oathkeeper",
                  name: "守誓者",
                  itemType: "臂铠，异域",
                  summary: "Bungie 公共商人",
                  cost: "23 奇异硬币",
                  costIconUrl: "https://www.bungie.net/common/destiny2_content/icons/strange-coin.jpg",
                  iconLabel: "守",
                  iconUrl: "https://www.bungie.net/common/destiny2_content/icons/oathkeeper.jpg",
                  tone: "exotic",
                  status: "recommended"
                }
              ]
            }
          ],
          railSections: [
            {
              id: "featured",
              title: "重点库存",
              vendors: [
                {
                  id: "xur",
                  name: "资料库周末商人",
                  description: "周末库存",
                  badge: "已确认",
                  source: "Bungie 公共商人",
                  resetLabel: "每日",
                  category: "重点",
                  iconUrl: "https://www.bungie.net/common/destiny2_content/icons/xur.jpg",
                  statusLabel: "已确认",
                  featured: true,
                  items: [
                    {
                      id: "xur-oathkeeper",
                      name: "守誓者",
                      itemType: "臂铠，异域",
                      summary: "Bungie 公共商人",
                      cost: "23 奇异硬币",
                      costIconUrl: "https://www.bungie.net/common/destiny2_content/icons/strange-coin.jpg",
                      iconLabel: "守",
                      iconUrl: "https://www.bungie.net/common/destiny2_content/icons/oathkeeper.jpg",
                      tone: "exotic",
                      status: "recommended"
                    }
                  ]
                }
              ]
            }
          ],
          defaultVendorId: "xur",
          updatedLabel: "模型更新",
          sourceLabel: "模型来源",
          nextResetLabel: "模型重置",
          recommendationCount: 1,
          verifiedItemCount: 1
        }}
        actions={{}}
      />
    );

    expect(html).toContain("https://www.bungie.net/common/destiny2_content/icons/xur.jpg");
    expect(html).toContain("https://www.bungie.net/common/destiny2_content/icons/oathkeeper.jpg");
    expect(html).toContain("https://www.bungie.net/common/destiny2_content/icons/strange-coin.jpg");
    expect(html).toContain("23 奇异硬币");
    expect(html).not.toContain("待确认");
    expect(html).not.toContain("费用待确认");
  });
});

function createVendorDailySummary(): Parameters<typeof selectVendorsPageModel>[0] {
  return {
    date_label: "2026-07-07",
    daily_reset: {
      label: "每日重置：2026-07-08 01:00 Asia/Shanghai",
      next_reset_iso: "2026-07-07T17:00:00.000Z",
      time_remaining_label: "距离每日重置还有 7 小时 30 分钟"
    },
    weekly_reset: {
      label: "每周重置：2026-07-08 01:00 Asia/Shanghai",
      next_reset_iso: "2026-07-07T17:00:00.000Z",
      time_remaining_label: "距离每周重置还有 7 小时 30 分钟"
    },
    sources: {
      vendors: {
        status: "ready",
        label: "商人库存",
        message: "已读取公共商人库存。",
        items: [
          {
            title: "周末异域商人",
            subtitle: "周末商人库存",
            description: "守誓者（臂铠，异域；23 奇异硬币）",
            source: "公共商人证据",
            vendorHash: 2190858386,
            iconUrl: "/common/destiny2_content/icons/xur.jpg",
            items: [
              {
                title: "守誓者",
                subtitle: "臂铠，异域",
                description: "23 奇异硬币",
                source: "公共商人证据",
                iconUrl: "/common/destiny2_content/icons/oathkeeper.jpg",
                costIconUrl: "/common/destiny2_content/icons/strange-coin.jpg"
              }
            ]
          }
        ]
      },
      rotations: { status: "pending", label: "今日轮换", message: "" },
      lost_sector: { status: "pending", label: "遗失区域", message: "" },
      weekly_report: { status: "pending", label: "本周活动线索", message: "" }
    },
    checklist: [],
    recommendations: []
  };
}
