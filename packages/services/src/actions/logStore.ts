import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import type {
  ActionDebugTraceEntry,
  ActionDebugTraceInput,
  ActionLogEntry,
  NewActionLogEntry
} from "@d2-tools/core/actions/log";

export function actionLogPath(dataDir: string): string {
  return join(dataDir, "action-log.json");
}

export function actionDebugTracePath(dataDir: string): string {
  return join(dataDir, "write-action-debug.json");
}

export function loadActionLog(dataDir: string, limit?: number): ActionLogEntry[] {
  const path = actionLogPath(dataDir);
  if (!existsSync(path)) return [];

  const entries = JSON.parse(readFileSync(path, "utf8")) as ActionLogEntry[];
  return typeof limit === "number" ? entries.slice(0, Math.max(0, limit)) : entries;
}

export function appendActionLog(dataDir: string, entry: NewActionLogEntry): ActionLogEntry[] {
  mkdirSync(dataDir, { recursive: true });
  const nextEntry: ActionLogEntry = {
    ...entry,
    id: entry.id ?? randomUUID(),
    created_at: entry.created_at ?? new Date().toISOString()
  };
  const entries = [nextEntry, ...loadActionLog(dataDir)].slice(0, 200);
  writeFileSync(actionLogPath(dataDir), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  return entries;
}

export function loadActionDebugTrace(dataDir: string, limit?: number): ActionDebugTraceEntry[] {
  const path = actionDebugTracePath(dataDir);
  if (!existsSync(path)) return [];

  const entries = JSON.parse(readFileSync(path, "utf8")) as ActionDebugTraceEntry[];
  return typeof limit === "number" ? entries.slice(0, Math.max(0, limit)) : entries;
}

export function appendActionDebugTrace(
  dataDir: string,
  input: ActionDebugTraceInput
): ActionDebugTraceEntry {
  mkdirSync(dataDir, { recursive: true });
  const entry: ActionDebugTraceEntry = {
    ...input,
    id: randomUUID(),
    created_at: new Date().toISOString()
  };
  const entries = [entry, ...loadActionDebugTrace(dataDir)].slice(0, 500);
  writeFileSync(actionDebugTracePath(dataDir), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  return entry;
}
