import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { getLocaleCopy } from "../src/i18n/copy.js";
import { SharedItemDetailDialog } from "../src/item-detail/SharedItemDetailDialog.js";
import { LibraryDefinitionDialog } from "../src/library/LibraryPageContentView.js";

describe("shared item detail dialog", () => {
  it("renders an accessible shared dialog without vendor context", () => {
    render(
      <SharedItemDetailDialog
        detail={{ name: "鹰月" }}
        closeLabel="关闭装备详情"
        onClose={() => undefined}
        sections={<p>装备主体</p>}
      />
    );

    expect(screen.getByRole("dialog", { name: "鹰月" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "鹰月" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "商人售卖信息" })).toBeNull();
  });

  it("renders optional vendor sale context", () => {
    render(
      <SharedItemDetailDialog
        detail={{ name: "鹰月" }}
        vendorContext={{
          vendorName: "仄",
          costLabel: "41 / 97 奇异硬币",
          affordabilityLabel: "可购买",
          characterLabel: "猎人",
          refreshLabel: "距离刷新 10 小时"
        }}
        closeLabel="关闭装备详情"
        onClose={() => undefined}
        sections={<p>装备主体</p>}
      />
    );

    expect(screen.getByRole("region", { name: "商人售卖信息" })).toHaveTextContent("仄");
  });

  it("closes with Escape and restores focus", async () => {
    const user = userEvent.setup();
    const trigger = document.createElement("button");
    trigger.textContent = "打开装备详情";
    document.body.append(trigger);
    trigger.focus();
    const returnFocusRef = createRef<HTMLElement>();
    returnFocusRef.current = trigger;
    const onClose = vi.fn();
    const view = render(
      <SharedItemDetailDialog
        detail={{ name: "鹰月" }}
        closeLabel="关闭装备详情"
        returnFocusRef={returnFocusRef}
        onClose={onClose}
        sections={<button type="button">详情动作</button>}
      />
    );

    expect(screen.getByRole("button", { name: "关闭装备详情" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});

describe("vendor library definition detail", () => {
  it("shows sale context without vault instance tools", () => {
    render(
      <LibraryDefinitionDialog
        item={{
          hash: 1001,
          name: "鹰月",
          description: "异域手炮",
          group_key: "weapons",
          source: { status: "ready", label: "资料库来源", description: "定义来源" }
        }}
        dropAccess="available"
        acquisitionStatus="current"
        ownership={{ status: "unavailable", totalCount: 0, vaultCount: 0, locations: [] }}
        vendorContext={{
          vendorName: "仄",
          costLabel: "23 奇异硬币",
          affordabilityLabel: "可兑换",
          characterLabel: "猎人",
          refreshLabel: "刚刚刷新"
        }}
        copy={getLocaleCopy("zh-CN").library}
        onClose={() => undefined}
      />
    );

    expect(screen.getByRole("dialog", { name: "定义详情" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "商人售卖信息" })).toHaveTextContent("23 奇异硬币");
    expect(screen.queryByText("本地标记")).toBeNull();
    expect(screen.queryByText("本地备注")).toBeNull();
    expect(screen.queryByText("装备操作")).toBeNull();
  });
});
