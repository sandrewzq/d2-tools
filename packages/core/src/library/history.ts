export type LibraryHistoryItem = { hash: number; name: string; icon?: string; viewed_at?: string };
export type LibraryHistory = { recent: LibraryHistoryItem[]; favorites: LibraryHistoryItem[] };
