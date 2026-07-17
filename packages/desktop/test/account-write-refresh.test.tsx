// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AccountSummary,
  ItemActionResult,
  LoadoutTemplate
} from "../src/renderer/api/types.js";
import { useVaultWriteActions } from "../src/renderer/features/vault/useVaultWriteActions.js";
import { useLoadoutWriteActions } from "../src/renderer/features/loadouts/useLoadoutWriteActions.js";

const apiMock = vi.hoisted(() => ({
  getConfig: vi.fn(),
  setItemLockState: vi.fn(),
  equipItem: vi.fn()
}));

vi.mock("../src/renderer/api/client.js", () => ({ api: apiMock }));

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.getConfig.mockResolvedValue({ features: { write_actions_enabled: true } });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("account write refresh strategy", () => {
  it("Vault 写操作有 patch 时立即局部更新且不完整刷新", async () => {
    apiMock.setItemLockState.mockResolvedValue(lockResult(true));
    const applyPatches = vi.fn();
    const loadAccountSummary = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useVaultWriteActions(vaultInput({
      applyPatches,
      loadAccountSummary
    })));

    await act(async () => {
      await result.current.handleVaultCleanupUnlock([vaultItem()], "character-1");
    });

    expect(applyPatches).toHaveBeenCalledWith([lockResult(true).account_patch]);
    expect(loadAccountSummary).not.toHaveBeenCalled();
  });

  it("Vault 写操作成功但缺 patch 时完整刷新兜底", async () => {
    apiMock.setItemLockState.mockResolvedValue(lockResult(false));
    const loadAccountSummary = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useVaultWriteActions(vaultInput({
      applyPatches: vi.fn(),
      loadAccountSummary
    })));

    await act(async () => {
      await result.current.handleVaultCleanupUnlock([vaultItem()], "character-1");
    });

    await waitFor(() => expect(loadAccountSummary).toHaveBeenCalledTimes(1));
  });

  it("Loadouts 单件装备有 patch 时不完整刷新", async () => {
    apiMock.equipItem.mockResolvedValue(equipResult(true));
    const applyPatches = vi.fn();
    const loadAccountSummary = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useLoadoutWriteActions(loadoutInput({
      applyPatches,
      loadAccountSummary
    })));

    await act(async () => {
      await result.current.equipSingleLoadoutItem(loadoutTemplate(), loadoutTemplate().items[0]!);
    });

    expect(applyPatches).toHaveBeenCalledWith([equipResult(true).account_patch]);
    expect(loadAccountSummary).not.toHaveBeenCalled();
  });

  it("Loadouts 单件装备缺 patch 时完整刷新兜底", async () => {
    apiMock.equipItem.mockResolvedValue(equipResult(false));
    const loadAccountSummary = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useLoadoutWriteActions(loadoutInput({
      applyPatches: vi.fn(),
      loadAccountSummary
    })));

    await act(async () => {
      await result.current.equipSingleLoadoutItem(loadoutTemplate(), loadoutTemplate().items[0]!);
    });

    await waitFor(() => expect(loadAccountSummary).toHaveBeenCalledTimes(1));
  });
});

function vaultInput(input: {
  applyPatches: ReturnType<typeof vi.fn>;
  loadAccountSummary: ReturnType<typeof vi.fn>;
}) {
  return {
    accountSummary: accountSummary(),
    applyAccountActionPatches: input.applyPatches,
    diagnostics: {
      setWriteActionsEnabled: vi.fn(),
      loadActionLog: vi.fn().mockResolvedValue(undefined)
    },
    setVaultTags: vi.fn(),
    setAccountError: vi.fn(),
    setIsRunningItemAction: vi.fn(),
    setItemActionMessage: vi.fn(),
    loadAccountSummary: input.loadAccountSummary
  };
}

function loadoutInput(input: {
  applyPatches: ReturnType<typeof vi.fn>;
  loadAccountSummary: ReturnType<typeof vi.fn>;
}) {
  return {
    accountSummary: accountSummary(),
    applyAccountActionPatches: input.applyPatches,
    loadoutLibrary: {
      reloadTemplates: vi.fn().mockResolvedValue(undefined),
      renameTemplate: vi.fn(),
      deleteTemplate: vi.fn()
    },
    diagnostics: {
      setWriteActionsEnabled: vi.fn(),
      loadActionLog: vi.fn().mockResolvedValue(undefined)
    },
    loadoutActionFeedback: { setSingleActionFeedback: vi.fn() },
    setLoadoutMessage: vi.fn(),
    setItemActionMessage: vi.fn(),
    setIsRunningItemAction: vi.fn(),
    loadAccountSummary: input.loadAccountSummary,
    openItemDetail: vi.fn()
  };
}

function lockResult(withPatch: boolean): ItemActionResult {
  return {
    ok: true,
    message: "ok",
    ...(withPatch ? {
      account_patch: {
        kind: "lock" as const,
        item_instance_id: "item-1",
        locked: false
      }
    } : {})
  };
}

function equipResult(withPatch: boolean): ItemActionResult {
  return {
    ok: true,
    message: "ok",
    ...(withPatch ? {
      account_patch: {
        kind: "equip" as const,
        item_instance_id: "item-1",
        character_id: "character-1"
      }
    } : {})
  };
}

function vaultItem() {
  return accountSummary().vault.items[0]!;
}

function loadoutTemplate(): LoadoutTemplate {
  return {
    id: "loadout-1",
    name: "Test",
    character_id: "character-1",
    class_name: "猎人",
    created_at: "2026-01-01T00:00:00.000Z",
    items: [{ hash: 1001, instance_id: "item-1", name: "Test Item" }]
  };
}

function accountSummary(): AccountSummary {
  const item = {
    hash: 1001,
    instance_id: "item-1",
    name: "Test Item",
    locked: true,
    group_key: "weapons" as const,
    socket_plugs: []
  };
  return {
    account_name: "Guardian",
    destiny_membership_id: "destiny-1",
    membership_type: 3,
    characters: [{
      character_id: "character-1",
      class_name: "猎人",
      equipped_items: [],
      equipment_groups: [],
      inventory_items: [item],
      inventory_groups: [],
      postmaster_items: [],
      loadout_slots: []
    }],
    vault: { item_count: 1, items: [item], sample_items: [] },
    materials: { item_count: 0, items: [] }
  };
}
