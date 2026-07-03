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
    expect(html).toContain("公共商人证据");
    expect(html).toContain("Saint-14");
    expect(html).toContain("萨瓦拉");
    expect(html).toContain("浪客");
    expect(html).toContain("拉乎尔");
    expect(html).toContain("苔丝");
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
            name: "Saint-14",
            description: "试炼奖励",
            badge: "周末",
            source: "试炼商人样本",
            resetLabel: "周末",
            category: "塔楼",
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
});
