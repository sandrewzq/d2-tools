import {
  normalizeAssistantArtifact,
  normalizeAssistantContextSnapshot,
  type AssistantArtifact,
  type AssistantContextSnapshot
} from "@d2-tools/app/capabilities";

export type AssistantChatMessage = {
  role: "user" | "assistant";
  text: string;
  context_snapshot_id?: string;
  artifact?: AssistantArtifact;
};

export type AssistantHistoryEntry = {
  id: string;
  title: string;
  /**
   * 新记录写入页面 key（如 `vault`），渲染前再用 `shell.navigation` 出文案，这样切换界面语言后旧会话也会跟着变。
   * 但历史记录是已落盘数据：老记录里这里可能还是中文页名字面量。读取时只能原样显示，
   * 绝不能拿它当 key 去查表（查不到会渲染成空白或错误页名）。
   */
  page_label: string;
  messages: AssistantChatMessage[];
  context_snapshots: AssistantContextSnapshot[];
  updated_at?: string;
};

export type AssistantHistoryEntryInput = Omit<AssistantHistoryEntry, "context_snapshots"> & {
  context_snapshots?: AssistantContextSnapshot[];
};

export type AssistantStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const historyStorageKey = "d2-tools.ai.chat-history";
const maxHistoryEntries = 20;
const maxContextSnapshotsPerSession = 30;

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
  entry: AssistantHistoryEntryInput
): AssistantHistoryEntry[] {
  return saveAssistantSession(storage, entry);
}

export function saveAssistantSession(
  storage: AssistantStorageLike | undefined,
  entry: AssistantHistoryEntryInput
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

export function removeAssistantHistoryEntry(
  storage: AssistantStorageLike | undefined,
  id: string
): AssistantHistoryEntry[] {
  if (!storage) return [];
  const next = loadAssistantHistory(storage).filter((entry) => entry.id !== id);
  try {
    if (next.length) {
      storage.setItem(historyStorageKey, JSON.stringify(next));
    } else {
      storage.removeItem(historyStorageKey);
    }
  } catch {
    return next;
  }
  return next;
}

function normalizeHistoryEntry(entry: Partial<AssistantHistoryEntryInput> | null | undefined): AssistantHistoryEntry | null {
  if (!entry?.id || !entry.title || !Array.isArray(entry.messages)) {
    return null;
  }
  return {
    id: String(entry.id),
    title: String(entry.title),
    // 只做非空兜底：老记录里的中文页名与新记录里的页面 key 都原样保留，交给渲染层判断能不能查表。
    page_label: entry.page_label ? String(entry.page_label) : "未知页面",
    messages: entry.messages
      .filter((message) => message?.role === "user" || message?.role === "assistant")
      .map((message) => {
        const artifact = normalizeAssistantArtifact(message.artifact);
        return {
          role: message.role,
          text: String(message.text ?? ""),
          ...(message.context_snapshot_id
            ? { context_snapshot_id: String(message.context_snapshot_id) }
            : {}),
          ...(artifact ? { artifact } : {})
        };
      }),
    context_snapshots: normalizeContextSnapshots(entry.context_snapshots),
    updated_at: entry.updated_at ? String(entry.updated_at) : undefined
  };
}

function normalizeContextSnapshots(value: unknown): AssistantContextSnapshot[] {
  if (!Array.isArray(value)) return [];
  const snapshots = value
    .map(normalizeAssistantContextSnapshot)
    .filter((snapshot): snapshot is AssistantContextSnapshot => Boolean(snapshot));
  const unique = new Map(snapshots.map((snapshot) => [snapshot.snapshot_id, snapshot]));
  return [...unique.values()].slice(-maxContextSnapshotsPerSession);
}

function getDefaultStorage(): AssistantStorageLike | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}
