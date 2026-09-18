// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyLocalTargetRules } from "@d2-tools/core/analysis/targets";
import type {
  AccountItemDetail,
  AccountItemPlugSummary,
  AccountItemSocketSummary,
  AccountItemSummary,
  AccountSummary,
  ItemActionResult,
  VaultTags
} from "../src/renderer/api/types.js";
import { useItemDetail } from "../src/renderer/shared/hooks/useItemDetail.js";
import {
  useItemDetailWorkspace,
  type ItemWriteActionOutcome
} from "../src/renderer/shared/hooks/useItemDetailWorkspace.js";
import { resetAcceptedSocketPlugs } from "../src/renderer/shared/stores/acceptedSocketPlugs.js";

/**
 * T77 / T78 的复现：Bungie 写接口已经受理，但实例详情读回来**还是旧配置**
 * （实测：受理后 26 秒仍读到旧值，2 分 45 秒读到新值；上界没测出来）。
 *
 * 这里让 `getAccountItemDetail` 永远吐旧配置，然后走一次换 Perk：
 * 详情必须显示新 Perk、不能进任何失败态，**关掉再打开也还得是新 Perk**。
 */
const apiMocks = vi.hoisted(() => ({
  addRecentItem: vi.fn(),
  getAccountItemDetail: vi.fn(),
  getItemDetail: vi.fn(),
  recordActionDebugTrace: vi.fn(),
  searchItems: vi.fn(),
  getLiveItemAvailability: vi.fn(),
  getCommunityPerkRecommendations: vi.fn(),
  getCommunityVaultItemMatchEvidence: vi.fn()
}));

vi.mock("../src/renderer/api/client.js", () => ({ api: apiMocks }));

beforeEach(() => {
  for (const mock of Object.values(apiMocks)) {
    mock.mockReset();
  }
  // 受理状态是模块级的，活得比弹框久 —— 用例之间必须清干净，否则互相串。
  resetAcceptedSocketPlugs();
  apiMocks.addRecentItem.mockResolvedValue({ items: [] });
  apiMocks.getItemDetail.mockResolvedValue(definitionDetail());
  apiMocks.getAccountItemDetail.mockResolvedValue(staleAccountDetail());
  apiMocks.recordActionDebugTrace.mockResolvedValue(undefined);
  apiMocks.searchItems.mockResolvedValue([]);
  apiMocks.getLiveItemAvailability.mockResolvedValue({ items: {} });
  apiMocks.getCommunityPerkRecommendations.mockResolvedValue(null);
  apiMocks.getCommunityVaultItemMatchEvidence.mockResolvedValue(null);
});

describe("换 Perk 受理后的详情状态", () => {
  it("受理即落地：服务器还吐旧配置时，详情显示的是新 Perk", async () => {
    const { result } = renderHook(() => useItemDetail({ cacheScopeKey: "socket-accept-detail manifest" }));

    await act(async () => result.current.openItemDetail(accountItem));
    await act(async () => result.current.loadSelectedItemFullDetail());
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("旧 Perk 200");

    await act(async () => result.current.applyAcceptedSocketPlugs("instance-1", [
      { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }
    ]));

    // 四份并行视图必须一起动，否则同一屏的不同区域会互相打架。
    expect(result.current.selectedItem?.sockets?.[0]?.selected_plug?.hash).toBe(300);
    // 槽内至多一条选中：漏了这份，界面上就是「新旧两项同时显示当前启用」。
    expect(plugStates(result.current.selectedItem?.sockets?.[0]?.reusable_plugs)).toEqual([
      [200, false],
      [300, true]
    ]);
    expect(result.current.selectedItem?.socket_plugs[0]).toMatchObject({ hash: 300, name: "新 Perk" });
    expect(result.current.selectedItem?.weapon_roll?.sockets[0]?.current_plug?.hash).toBe(300);
    expect(plugStates(result.current.selectedItem?.weapon_roll?.sockets[0]?.owned_plugs)).toEqual([
      [200, false],
      [300, true]
    ]);
  });

  it("关掉详情再打开：受理状态还在，仍然显示新 Perk", async () => {
    const { result } = renderHook(() => useItemDetail({ cacheScopeKey: "socket-accept-reopen manifest" }));

    await act(async () => result.current.openItemDetail(accountItem));
    await act(async () => result.current.loadSelectedItemFullDetail());
    await act(async () => result.current.applyAcceptedSocketPlugs("instance-1", [
      { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }
    ]));

    await act(async () => result.current.closeSelectedItemDetail());
    expect(result.current.selectedItem).toBeNull();

    // 服务器仍然只吐旧配置。受理状态要是只活在弹框里，这里就会打回旧 Perk —— 用户正是这么撞见的。
    await act(async () => result.current.openItemDetail(accountItem));
    await act(async () => result.current.loadSelectedItemFullDetail());

    expect(result.current.selectedItem?.socket_plugs[0]).toMatchObject({ hash: 300, name: "新 Perk" });
    expect(result.current.selectedItem?.sockets?.[0]?.selected_plug?.hash).toBe(300);
  });

  it("后台探针读到旧配置时只留痕：不回退界面、不置加载态、不报错", async () => {
    const { result } = renderHook(() => useItemDetail({ cacheScopeKey: "socket-probe manifest" }));

    await act(async () => result.current.openItemDetail(accountItem));
    await act(async () => result.current.loadSelectedItemFullDetail());
    await act(async () => result.current.applyAcceptedSocketPlugs("instance-1", [
      { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }
    ]));

    // 后台探针照旧强制走网络，但拿到的是旧配置 —— 它没有资格改写用户正在看的界面。
    await act(async () => {
      await result.current.refreshSelectedItemDetail({ mode: "probe" });
    });

    expect(apiMocks.getAccountItemDetail).toHaveBeenLastCalledWith("instance-1", { force: true });
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("新 Perk");
    expect(result.current.selectedItem?.detail_loading).toMatchObject({ definition: false, instance: false });
    expect(result.current.itemDetailError).toBe("");
  });
});

describe("换 Perk 写操作不再等写后读回", () => {
  it("写接口受理就返回成功：读回永远读不到也不阻塞", async () => {
    const input = workspaceInput("socket-accept-write manifest");
    const { result } = renderHook(() => useItemDetailWorkspace(input));

    await act(async () => result.current.openItemDetail(accountItem, { source_character_id: "character-1" }));
    await act(async () => result.current.loadSelectedItemFullDetail());
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("旧 Perk 200");

    // 从现在起服务器永远读不到新配置：门闸还在的话这里会一直等下去。
    apiMocks.getAccountItemDetail.mockImplementation(() => new Promise(() => undefined));

    const captured: { outcome?: ItemWriteActionOutcome } = {};
    await act(async () => {
      captured.outcome = await result.current.runItemWriteAction(
        "应用武器配置",
        () => Promise.resolve(writeResult()),
        {
          acceptedSocketChanges: {
            instance_id: "instance-1",
            changes: [{ socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }]
          }
        }
      );
    });

    expect(captured.outcome).toMatchObject({ ok: true, refreshed: true });
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("新 Perk");
    // 面板拿到的必须是成功态，而不是「写入成功，详情同步失败」。文案只说「提交了」——
    // 服务器认没认，这个位置不知道（T78）。
    expect(input.setItemActionMessage).toHaveBeenLastCalledWith("武器配置更改已提交。");
    expect(input.setAccountOperationFeedback).toHaveBeenCalledWith(expect.objectContaining({
      tone: "success",
      phase: "confirmed"
    }));
    expect(input.setAccountError).not.toHaveBeenCalled();
  });

  it("后台核对只留痕：对上不改文案、不改界面、不报错", async () => {
    const input = workspaceInput("socket-verify-write manifest");
    const { result } = renderHook(() => useItemDetailWorkspace(input));

    await act(async () => result.current.openItemDetail(accountItem, { source_character_id: "character-1" }));
    await act(async () => result.current.loadSelectedItemFullDetail());

    await act(async () => {
      await result.current.runItemWriteAction(
        "应用武器配置",
        () => Promise.resolve(writeResult()),
        {
          acceptedSocketChanges: {
            instance_id: "instance-1",
            changes: [{ socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }]
          },
          backgroundVerification: {
            // 第一次探测即对上：核对链条就地结束，不给收尾留一串几秒钟的定时器。
            verify: () => true,
            describeAttempt: () => ({ expected_count: 1, matched_count: 1 })
          }
        }
      );
    });

    await waitFor(() => {
      expect(apiMocks.recordActionDebugTrace).toHaveBeenCalledWith(
        expect.objectContaining({ phase: "verification-complete", reflected: true })
      );
    });
    // 核对结果不上屏：面板只说「已提交」，不会因为核对对了就改口说「已确认」。
    expect(input.setItemActionMessage).toHaveBeenLastCalledWith("武器配置更改已提交。");
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("新 Perk");
    expect(input.setAccountError).not.toHaveBeenCalled();
  });
});

/**
 * T80 的中性态：Bungie 用 ErrorCode 1679 说「这件装备还有变更在处理中」，主进程重发用尽后
 * 如实回「本次没有提交」。这不是失败 —— 用户没做错什么，也不该看到红条（2026-09-18 那次
 * 「武器配置未更新 / 需要处理」就是被这个状态触发的）。
 */
describe("写没被受理时走中性态", () => {
  it("全部槽位都被推迟：不报错、不落地、保留待应用选择", async () => {
    const input = workspaceInput("socket-deferred-write manifest");
    const { result } = renderHook(() => useItemDetailWorkspace(input));

    await act(async () => result.current.openItemDetail(accountItem, { source_character_id: "character-1" }));
    await act(async () => result.current.loadSelectedItemFullDetail());

    const captured: { outcome?: ItemWriteActionOutcome } = {};
    await act(async () => {
      captured.outcome = await result.current.runItemWriteAction(
        "应用武器配置",
        () => Promise.resolve(writeResult({
          message: "这件装备还有变更正在 Bungie 那边处理，本次没有提交。请稍后重新读取配置再试。",
          deferred_socket_indexes: [1]
        })),
        {
          acceptedSocketChanges: {
            instance_id: "instance-1",
            changes: [{ socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }]
          }
        }
      );
    });

    expect(captured.outcome).toMatchObject({ ok: false, refreshed: false, deferred: true });
    // 没被受理就不能装作改了：详情必须还是旧 Perk，否则用户会以为切换成功了。
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("旧 Perk 200");
    expect(input.setAccountOperationFeedback).toHaveBeenLastCalledWith(expect.objectContaining({
      tone: "pending",
      phase: "submitting"
    }));
    expect(input.setAccountError).not.toHaveBeenCalled();
  });

  it("只有部分槽位被推迟：收下的那条落地，文案如实说几条没提交", async () => {
    const input = workspaceInput("socket-partial-deferred manifest");
    const { result } = renderHook(() => useItemDetailWorkspace(input));

    await act(async () => result.current.openItemDetail(accountItem, { source_character_id: "character-1" }));
    await act(async () => result.current.loadSelectedItemFullDetail());

    const message = "已提交 1 项；其余 1 项因这件装备仍有变更在处理中而未提交。";
    const captured: { outcome?: ItemWriteActionOutcome } = {};
    await act(async () => {
      captured.outcome = await result.current.runItemWriteAction(
        "应用武器配置",
        () => Promise.resolve(writeResult({ message, deferred_socket_indexes: [2] })),
        {
          acceptedSocketChanges: {
            instance_id: "instance-1",
            changes: [
              { socket_index: 1, plug_hash: 300, plug_name: "新 Perk" },
              { socket_index: 2, plug_hash: 400, plug_name: "未收下的 Perk" }
            ]
          }
        }
      );
    });

    expect(captured.outcome).toMatchObject({ ok: true, refreshed: true });
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("新 Perk");
    expect(input.setItemActionMessage).toHaveBeenLastCalledWith(message);
  });
});

/**
 * 写响应体只当旁证：它回什么都**不改界面**，只把「意图 vs 服务器回的 plugHash」写进留痕。
 * 这是「受理但被静默拒绝」唯一的第一手证据，也是唯一能发现它的地方。
 */
describe("写响应体与写入意图对账", () => {
  it("服务器回的是另一个 Perk：留痕，但界面仍按用户选的那条走", async () => {
    const input = workspaceInput("socket-response-mismatch manifest");
    const { result } = renderHook(() => useItemDetailWorkspace(input));

    await act(async () => result.current.openItemDetail(accountItem, { source_character_id: "character-1" }));
    await act(async () => result.current.loadSelectedItemFullDetail());

    await act(async () => {
      await result.current.runItemWriteAction(
        "应用武器配置",
        () => Promise.resolve(writeResult({
          accepted_socket_plugs: [{ socket_index: 1, plug_hash: 200 }]
        })),
        {
          acceptedSocketChanges: {
            instance_id: "instance-1",
            changes: [{ socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }]
          }
        }
      );
    });

    expect(apiMocks.recordActionDebugTrace).toHaveBeenCalledWith(expect.objectContaining({
      phase: "socket-plug-response-mismatch",
      message: "插槽 1：写响应体回 200，意图是 300"
    }));
    // 读路径实测会陈旧几分钟，响应体没有更强的保证 —— 显示仍按意图走，不在这里倒戈。
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("新 Perk");
    expect(input.setAccountError).not.toHaveBeenCalled();
  });

  it("服务器回的就是用户选的那条：不产生对账留痕", async () => {
    const input = workspaceInput("socket-response-agree manifest");
    const { result } = renderHook(() => useItemDetailWorkspace(input));

    await act(async () => result.current.openItemDetail(accountItem, { source_character_id: "character-1" }));
    await act(async () => result.current.loadSelectedItemFullDetail());

    await act(async () => {
      await result.current.runItemWriteAction(
        "应用武器配置",
        () => Promise.resolve(writeResult({
          accepted_socket_plugs: [{ socket_index: 1, plug_hash: 300 }]
        })),
        {
          acceptedSocketChanges: {
            instance_id: "instance-1",
            changes: [{ socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }]
          }
        }
      );
    });

    const phases = apiMocks.recordActionDebugTrace.mock.calls.map(([entry]) => entry.phase);
    expect(phases).not.toContain("socket-plug-response-mismatch");
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("新 Perk");
  });

  it("响应体没带插槽状态：跳过对账，不误报不一致", async () => {
    const input = workspaceInput("socket-response-absent manifest");
    const { result } = renderHook(() => useItemDetailWorkspace(input));

    await act(async () => result.current.openItemDetail(accountItem, { source_character_id: "character-1" }));
    await act(async () => result.current.loadSelectedItemFullDetail());

    await act(async () => {
      await result.current.runItemWriteAction(
        "应用武器配置",
        () => Promise.resolve(writeResult({ accepted_socket_plugs: null })),
        {
          acceptedSocketChanges: {
            instance_id: "instance-1",
            changes: [{ socket_index: 1, plug_hash: 300, plug_name: "新 Perk" }]
          }
        }
      );
    });

    const phases = apiMocks.recordActionDebugTrace.mock.calls.map(([entry]) => entry.phase);
    expect(phases).not.toContain("socket-plug-response-mismatch");
    expect(result.current.selectedItem?.socket_plugs[0]?.name).toBe("新 Perk");
  });
});

/** `[hash, selected]` 的扁平视图：直接比对整槽的选中分布，才看得出「是不是两条都选中了」。 */
function plugStates(plugs?: readonly { hash: number; selected?: boolean }[]): [number, boolean][] {
  return (plugs ?? []).map((plug) => [plug.hash, plug.selected === true]);
}

function workspaceInput(detailCacheScopeKey: string) {
  return {
    accountSummary: accountSummary(),
    detailCacheScopeKey,
    vaultTags: { items: {} } as VaultTags,
    setVaultTags: vi.fn(),
    localTargetRules: emptyLocalTargetRules,
    diagnostics: { loadActionLog: vi.fn(async () => undefined) },
    setAccountError: vi.fn(),
    setAccountOperationFeedback: vi.fn(),
    setIsRunningItemAction: vi.fn(),
    setItemActionMessage: vi.fn(),
    applyAcceptedAccountActionPatches: vi.fn(),
    onRecentHistoryChanged: vi.fn()
  };
}

const accountItem: AccountItemSummary = {
  hash: 1001,
  instance_id: "instance-1",
  name: "测试武器",
  group_key: "weapons",
  socket_plugs: []
};

/** 服务器那边的实例详情：插槽 1 上挂着的是**旧** Perk，但两个 Perk 都在候选里。 */
function staleAccountDetail(): AccountItemDetail {
  return {
    ...accountItem,
    instance_id: "instance-1",
    sockets: [socket(1, 200)],
    socket_plugs: [{ hash: 200, socket_index: 1, name: "旧 Perk 200" }],
    weapon_roll: {
      fingerprint: "roll-v1-stale:0",
      complete: true,
      incomplete_reasons: [],
      sockets: [{
        socket_index: 1,
        slot: "perk1",
        label: "槽位 1",
        current_plug: { hash: 200, name: "旧 Perk 200", selected: true },
        owned_plugs: [
          { hash: 200, name: "旧 Perk 200", selected: true },
          { hash: 300, name: "新 Perk", selected: false }
        ],
        complete: true,
        incomplete_reasons: []
      }]
    }
  };
}

function socket(index: number, hash: number): AccountItemSocketSummary {
  return {
    socket_index: index,
    is_visible: true,
    is_enabled: true,
    enable_fail_indexes: [],
    selected_plug: { hash, socket_index: index, name: `旧 Perk ${hash}` },
    reusable_plugs: [
      reusablePlug(index, 200, true),
      reusablePlug(index, 300, false)
    ]
  };
}

function reusablePlug(index: number, hash: number, selected: boolean): AccountItemPlugSummary {
  return {
    hash,
    socket_index: index,
    name: hash === 200 ? "旧 Perk 200" : "新 Perk",
    selected,
    insert_fail_indexes: [],
    enable_fail_indexes: [],
    sources: ["instance"]
  };
}

function definitionDetail() {
  return {
    hash: 1001,
    name: "测试武器",
    description: "测试武器说明",
    group_key: "weapons" as const,
    intrinsic_traits: [],
    source: { status: "ready" as const, label: "资料库", description: "测试武器说明" }
  };
}

function writeResult(overrides: Partial<ItemActionResult> = {}): ItemActionResult {
  return { ok: true, message: "Bungie 已受理", ...overrides };
}

function accountSummary(): AccountSummary {
  return {
    account_name: "测试账号",
    destiny_membership_id: "membership-1",
    membership_type: 3,
    characters: [{
      character_id: "character-1",
      class_name: "术士",
      light: 2000,
      equipped_items: [],
      equipment_groups: [],
      inventory_items: [],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }],
    vault: { item_count: 0, items: [], sample_items: [] },
    materials: { item_count: 0, items: [] }
  };
}
