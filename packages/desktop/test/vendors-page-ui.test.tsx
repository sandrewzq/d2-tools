import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VendorsPageContentView } from "../../ui/src/index";

describe("vendors page UI", () => {
  it("renders a DIM-like vendor rail, item icons, and non-empty evidence details", () => {
    const html = renderToStaticMarkup(<VendorsPageContentView interfaceLocale="zh-CN" showInternalHeading />);

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
    const html = renderToStaticMarkup(<VendorsPageContentView interfaceLocale="zh-CN" showInternalHeading />);

    expect(html).toContain("重点库存");
    expect(html).toContain("仪式声望");
    expect(html).toContain("周末活动");
    expect(html).toContain("外观 / 服务");
    expect(html).not.toContain("特殊 / 活动");
  });

  it("renders a compact unread empty state for vendors without readable inventory", () => {
    const html = renderToStaticMarkup(
      <VendorsPageContentView
        interfaceLocale="zh-CN"
        vendors={[
          {
            id: "tess",
            name: "外观商人",
            description: "外观和光尘轮换。",
            badge: "周更",
            source: "本地商人目录",
            resetLabel: "距离每日重置还有 2 小时",
            category: "特殊 / 活动",
            iconLabel: "EV",
            statusLabel: "等待实时库存",
            featured: true,
            items: []
          }
        ]}
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
        vendors={[
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
        ]}
        showInternalHeading
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
        vendors={[
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
        ]}
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
