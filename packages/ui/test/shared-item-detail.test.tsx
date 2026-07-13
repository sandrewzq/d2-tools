import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SharedItemDetailDialog } from "../src/item-detail/SharedItemDetailDialog.js";

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
