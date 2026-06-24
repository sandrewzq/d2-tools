export type AssistantChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type AssistantHistoryEntry = {
  id: string;
  title: string;
  page_label: string;
  messages: AssistantChatMessage[];
  updated_at?: string;
};

export type AssistantStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const historyStorageKey = "d2-tools.ai.chat-history";
const maxHistoryEntries = 20;

export function loadAssistantHistory(storage = getDefaultStorage()): AssistantHistoryEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(historyStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<AssistantHistoryEntry>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeHistoryEntry)
      .filter((entry): entry is AssistantHistoryEntry => Boolean(entry))
      .slice(0, maxHistoryEntries);
  } catch {
    return [];
  }
}

export function addAssistantHistoryEntry(
  storage: AssistantStorageLike | undefined,
  entry: AssistantHistoryEntry
): AssistantHistoryEntry[] {
  return saveAssistantSession(storage, entry);
}

export function saveAssistantSession(
  storage: AssistantStorageLike | undefined,
  entry: AssistantHistoryEntry
): AssistantHistoryEntry[] {
  const normalized = normalizeHistoryEntry(entry);
  if (!storage || !normalized) return [];
  const next = [
    {
      ...normalized,
      updated_at: normalized.updated_at ?? new Date().toISOString()
    },
    ...loadAssistantHistory(storage).filter((current) => current.id !== normalized.id)
  ].slice(0, maxHistoryEntries);
  try {
    storage.setItem(historyStorageKey, JSON.stringify(next));
  } catch {
    return next;
  }
  return next;
}

export function clearAssistantHistory(storage = getDefaultStorage()): AssistantHistoryEntry[] {
  if (!storage) return [];
  try {
    storage.removeItem(historyStorageKey);
  } catch {
    return [];
  }
  return [];
}

function normalizeHistoryEntry(entry: Partial<AssistantHistoryEntry> | null | undefined): AssistantHistoryEntry | null {
  if (!entry?.id || !entry.title || !Array.isArray(entry.messages)) {
    return null;
  }
  return {
    id: String(entry.id),
    title: String(entry.title),
    page_label: entry.page_label ? String(entry.page_label) : "未知页面",
    messages: entry.messages
      .filter((message) => message?.role === "user" || message?.role === "assistant")
      .map((message) => ({
        role: message.role,
        text: String(message.text ?? "")
      })),
    updated_at: entry.updated_at ? String(entry.updated_at) : undefined
  };
}

function getDefaultStorage(): AssistantStorageLike | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}
