import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildAiChatContext } from "@d2-tools/core/ai/chat";
import {
  addAssistantHistoryEntry,
  clearAssistantHistory,
  loadAssistantHistory,
  removeAssistantHistoryEntry,
  saveAssistantSession,
  type AssistantStorageLike
} from "../src/renderer/utils/assistantHistory";
import { buildAssistantPageContext } from "../src/renderer/shared/domain/assistant/assistantContext";

describe("assistant page context and history", () => {
  it("adds current page context to AI chat context", () => {
    const context = buildAiChatContext({
      account: null,
      tags: { items: {} },
      daily: null,
      activity: null,
      pageContext: {
        page_key: "vault",
        page_label: "仓库",
        focus: "当前正在查看仓库页，应优先分析仓库筛选、标签和装备保留问题。",
        facts: ["仓库 42 件", "当前配装：电弧猎人"]
      }
    });

    expect(context).toContain('"current_page"');
    expect(context).toContain('"page_key": "vault"');
    expect(context).toContain("当前正在查看仓库页");
    expect(context).toContain("仓库 42 件");
  });

  it("builds different assistant context summaries for account, vault, loadouts and library pages", () => {
    const account = {
      account_name: "player",
      destiny_membership_id: "1",
      membership_type: 3,
      characters: [
        { character_id: "c1", class_name: "猎人", light: 2000, equipped_items: [], inventory_items: [], postmaster_items: [], loadout_slots: [] }
      ],
      vault: { item_count: 2, items: [] },
      materials: { item_count: 1, items: [] }
    } as never;

    expect(buildAssistantPageContext({ activePage: "account", account, selectedCharacterId: "c1" }).focus).toContain("当前正在查看账号页");
    expect(buildAssistantPageContext({ activePage: "vault", account, selectedCharacterId: "c1" }).focus).toContain("当前正在查看仓库页");
    expect(buildAssistantPageContext({ activePage: "loadouts", account, selectedCharacterId: "c1", activeLoadoutName: "PVE 方案" }).facts).toContain("当前配装方案：PVE 方案");
    expect(buildAssistantPageContext({ activePage: "library", account, selectedCharacterId: "c1", libraryRecentNames: ["金枪"] }).facts).toContain("最近查看资料：金枪");
  });

  it("persists assistant chat history in local storage and keeps newest entries first", () => {
    const storage = createMemoryStorage();
    clearAssistantHistory(storage);

    addAssistantHistoryEntry(storage, {
      id: "old",
      title: "旧问题",
      page_label: "首页",
      messages: [{ role: "user", text: "旧问题" }]
    });
    addAssistantHistoryEntry(storage, {
      id: "new",
      title: "新问题",
      page_label: "仓库",
      messages: [{ role: "user", text: "新问题" }]
    });

    const history = loadAssistantHistory(storage);

    expect(history.map((entry) => entry.id)).toEqual(["new", "old"]);
    expect(history[0]?.page_label).toBe("仓库");
    expect(storage.getItem("d2-tools.ai.chat-history")).toContain("新问题");
  });

  it("removes a single assistant history entry without affecting the others", () => {
    const storage = createMemoryStorage();
    clearAssistantHistory(storage);

    saveAssistantSession(storage, {
      id: "first",
      title: "第一个会话",
      page_label: "首页",
      messages: [{ role: "user", text: "第一个问题" }]
    });
    saveAssistantSession(storage, {
      id: "second",
      title: "第二个会话",
      page_label: "仓库",
      messages: [{ role: "user", text: "第二个问题" }]
    });

    const nextHistory = removeAssistantHistoryEntry(storage, "first");

    expect(nextHistory.map((entry) => entry.id)).toEqual(["second"]);
    expect(loadAssistantHistory(storage).map((entry) => entry.id)).toEqual(["second"]);
  });

  it("shows explicit session controls in the AI panel", () => {
    const aiPanel = readSource("src/renderer/components/AiAnalysisPanel.tsx");

    expect(aiPanel).toContain("activeSessionId");
    expect(aiPanel).toContain("startNewSession");
    expect(aiPanel).toContain("switchSession");
    expect(aiPanel).toContain("删除");
    expect(aiPanel).toContain("新会话");
    expect(aiPanel).toContain("会话列表");
    expect(aiPanel).toContain("恢复");
  });

  it("guards AI chat context against missing vault tags during startup", () => {
    const aiPanel = readSource("src/renderer/components/AiAnalysisPanel.tsx");

    expect(aiPanel).toContain("const safeTags = props.tags ?? { items: {} }");
    expect(aiPanel).toContain("tags: safeTags");
    expect(aiPanel).not.toContain(" as never");
  });
});

function createMemoryStorage(): AssistantStorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    }
  };
}

function readSource(path: string): string {
  return readFileSync(`packages/desktop/${path}`, "utf8");
}
