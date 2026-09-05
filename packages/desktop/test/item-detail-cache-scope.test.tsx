// @vitest-environment jsdom

import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountItemDetail, AccountItemSummary, ItemDefinitionDetail } from "../src/renderer/api/types.js";
import { useItemDetail } from "../src/renderer/shared/hooks/useItemDetail.js";

const apiMocks = vi.hoisted(() => ({
  addRecentItem: vi.fn(),
  getAccountItemDetail: vi.fn(),
  getItemDetail: vi.fn()
}));

vi.mock("../src/renderer/api/client.js", () => ({
  api: apiMocks
}));

describe("item detail cache scope", () => {
  beforeEach(() => {
    apiMocks.addRecentItem.mockReset();
    apiMocks.getAccountItemDetail.mockReset();
    apiMocks.getItemDetail.mockReset();
    apiMocks.addRecentItem.mockResolvedValue({ items: [] });
    apiMocks.getAccountItemDetail.mockResolvedValue(accountDetail("account"));
  });

  it("reloads definition and account detail when the account or manifest scope changes", async () => {
    apiMocks.getItemDetail
      .mockResolvedValueOnce(definitionDetail("manifest-a"))
      .mockResolvedValueOnce(definitionDetail("manifest-b"));
    apiMocks.getAccountItemDetail
      .mockResolvedValueOnce(accountDetail("account-a"))
      .mockResolvedValueOnce(accountDetail("account-b"));
    const { result, rerender } = renderHook(
      ({ scopeKey }) => useItemDetail({ cacheScopeKey: scopeKey }),
      { initialProps: { scopeKey: "account-a\u0000manifest-a" } }
    );

    await act(async () => result.current.openItemDetail(accountItem));
    await act(async () => result.current.loadSelectedItemFullDetail());
    expect(result.current.selectedItem?.description).toBe("manifest-a");
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("account-a");

    rerender({ scopeKey: "account-b\u0000manifest-b" });
    await waitFor(() => expect(result.current.selectedItem).toBeNull());
    await act(async () => result.current.openItemDetail(accountItem));
    await act(async () => result.current.loadSelectedItemFullDetail());

    expect(apiMocks.getItemDetail).toHaveBeenCalledTimes(2);
    expect(apiMocks.getAccountItemDetail).toHaveBeenCalledTimes(2);
    expect(result.current.selectedItem?.description).toBe("manifest-b");
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("account-b");
  });

  it("does not let an older request for the same item overwrite the latest response", async () => {
    const first = deferred<ItemDefinitionDetail>();
    const second = deferred<ItemDefinitionDetail>();
    apiMocks.getItemDetail
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { result } = renderHook(() => useItemDetail({ cacheScopeKey: "account-a\u0000manifest-a" }));
    let firstRequest!: Promise<void>;
    let secondRequest!: Promise<void>;

    await act(async () => result.current.openItemDetail(accountItem));
    act(() => {
      firstRequest = result.current.loadSelectedItemFullDetail();
    });
    await act(async () => result.current.openItemDetail(accountItem));
    act(() => {
      secondRequest = result.current.loadSelectedItemFullDetail();
    });
    await act(async () => {
      second.resolve(definitionDetail("latest"));
      await secondRequest;
    });
    await act(async () => {
      first.resolve(definitionDetail("stale"));
      await firstRequest;
    });

    expect(result.current.selectedItem?.description).toBe("latest");
  });

  it("drops cached large details and ignores a response that arrives after close", async () => {
    const first = deferred<ItemDefinitionDetail>();
    apiMocks.getItemDetail
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValueOnce(definitionDetail("fresh-after-close"));
    const { result } = renderHook(() => useItemDetail({ cacheScopeKey: "account-a\u0000manifest-a" }));
    let firstRequest!: Promise<void>;

    await act(async () => result.current.openItemDetail(accountItem));
    act(() => {
      firstRequest = result.current.loadSelectedItemFullDetail();
    });
    act(() => result.current.closeSelectedItemDetail());
    await act(async () => {
      first.resolve(definitionDetail("stale-after-close"));
      await firstRequest;
    });
    expect(result.current.selectedItem).toBeNull();

    await act(async () => result.current.openItemDetail(accountItem));
    await act(async () => result.current.loadSelectedItemFullDetail());
    expect(apiMocks.getItemDetail).toHaveBeenCalledTimes(2);
    expect(result.current.selectedItem?.description).toBe("fresh-after-close");
  });

  it("forces the account item detail request when refreshing after a write", async () => {
    apiMocks.getItemDetail.mockResolvedValue(definitionDetail("manifest"));
    apiMocks.getAccountItemDetail
      .mockResolvedValueOnce(accountDetail("before-write"))
      .mockResolvedValueOnce(accountDetail("after-write"));
    // 使用独立 scope，避免进程级缓存跨测试复用导致 mock 响应顺序失真。
    const { result } = renderHook(() => useItemDetail({ cacheScopeKey: "account-refresh\u0000manifest-a" }));

    await act(async () => result.current.openItemDetail(accountItem));
    await act(async () => result.current.loadSelectedItemFullDetail());
    await act(async () => result.current.refreshSelectedItemDetail());

    expect(apiMocks.getAccountItemDetail).toHaveBeenLastCalledWith("instance-1", { force: true });
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("after-write");
  });
});

const accountItem = {
  hash: 1001,
  instance_id: "instance-1",
  name: "测试武器",
  group_key: "weapons",
  socket_plugs: []
} as AccountItemSummary;

function definitionDetail(description: string): ItemDefinitionDetail {
  return {
    hash: 1001,
    name: "测试武器",
    description,
    group_key: "weapons",
    intrinsic_traits: [],
    source: { status: "ready", label: "资料库", description }
  } as ItemDefinitionDetail;
}

function accountDetail(plugName: string): AccountItemDetail {
  return {
    ...accountItem,
    instance_id: "instance-1",
    socket_plugs: [{ hash: 2001, name: plugName }],
    sockets: []
  } as AccountItemDetail;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
