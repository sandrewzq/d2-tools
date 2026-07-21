import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type LibraryHistoryItem = {
  hash: number;
  name: string;
  icon?: string;
  viewed_at?: string;
};

export type LibraryHistory = {
  recent: LibraryHistoryItem[];
  favorites: LibraryHistoryItem[];
};

const historyFileName = "library-history.json";

export function loadLibraryHistory(dataDir: string): LibraryHistory {
  const path = historyPath(dataDir);
  if (!existsSync(path)) {
    return { recent: [], favorites: [] };
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<LibraryHistory>;
  return {
    recent: parsed.recent ?? [],
    favorites: parsed.favorites ?? []
  };
}

export function addRecentItem(dataDir: string, item: Omit<LibraryHistoryItem, "viewed_at">, now = new Date()): LibraryHistory {
  const history = loadLibraryHistory(dataDir);
  const next: LibraryHistory = {
    ...history,
    recent: [
      { ...item, viewed_at: now.toISOString() },
      ...history.recent.filter((entry) => entry.hash !== item.hash)
    ].slice(0, 30)
  };
  return writeHistory(dataDir, next);
}

export function addFavoriteItem(dataDir: string, item: Omit<LibraryHistoryItem, "viewed_at">): LibraryHistory {
  const history = loadLibraryHistory(dataDir);
  const next: LibraryHistory = {
    ...history,
    favorites: [
      item,
      ...history.favorites.filter((entry) => entry.hash !== item.hash)
    ].slice(0, 100)
  };
  return writeHistory(dataDir, next);
}

export function removeFavoriteItem(dataDir: string, hash: number): LibraryHistory {
  const history = loadLibraryHistory(dataDir);
  return writeHistory(dataDir, {
    ...history,
    favorites: history.favorites.filter((entry) => entry.hash !== hash)
  });
}

function writeHistory(dataDir: string, history: LibraryHistory): LibraryHistory {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(historyPath(dataDir), `${JSON.stringify(history, null, 2)}\n`, "utf8");
  return history;
}

function historyPath(dataDir: string): string {
  return join(dataDir, historyFileName);
}
