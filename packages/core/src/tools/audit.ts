import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { D2ToolName } from "./registry.js";

export type ToolAuditCaller = "gui" | "ai" | "http" | "mcp";

export type ToolAuditEntry = {
  id: string;
  created_at: string;
  tool: D2ToolName | string;
  caller: ToolAuditCaller;
  ok: boolean;
  duration_ms?: number;
  input_summary?: string;
  result_summary?: string;
  error_code?: string;
};

export type NewToolAuditEntry = Omit<ToolAuditEntry, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

const maxEntries = 300;
const redactionPattern = /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|authorization|bearer)\s*[:=]\s*[^\s,;]+/gi;

export function toolAuditLogPath(dataDir: string): string {
  return join(dataDir, "tool-audit-log.json");
}

export function loadToolAuditLog(dataDir: string, limit?: number): ToolAuditEntry[] {
  const path = toolAuditLogPath(dataDir);
  if (!existsSync(path)) {
    return [];
  }

  const entries = JSON.parse(readFileSync(path, "utf8")) as ToolAuditEntry[];
  const safeEntries = entries.map(redactEntry);
  return typeof limit === "number" ? safeEntries.slice(0, Math.max(0, limit)) : safeEntries;
}

export function appendToolAuditLog(dataDir: string, entry: NewToolAuditEntry): ToolAuditEntry[] {
  mkdirSync(dataDir, { recursive: true });
  const nextEntry: ToolAuditEntry = redactEntry({
    ...entry,
    id: entry.id ?? randomUUID(),
    created_at: entry.created_at ?? new Date().toISOString()
  });
  const entries = [nextEntry, ...loadToolAuditLog(dataDir)].slice(0, maxEntries);
  writeFileSync(toolAuditLogPath(dataDir), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  return entries;
}

export function buildToolAuditDiagnosticText(entry: ToolAuditEntry): string {
  const safeEntry = redactEntry(entry);
  return [
    "d2-tools tool diagnostic",
    `time: ${safeEntry.created_at}`,
    `tool: ${safeEntry.tool}`,
    `caller: ${safeEntry.caller}`,
    `result: ${safeEntry.ok ? "ok" : "failed"}`,
    `duration_ms: ${safeEntry.duration_ms ?? "-"}`,
    `input: ${safeEntry.input_summary ?? "-"}`,
    `output: ${safeEntry.result_summary ?? "-"}`,
    `error_code: ${safeEntry.error_code ?? "-"}`,
    "",
    "This diagnostic does not include tokens, client credentials, or provider keys."
  ].join("\n");
}

function redactEntry<T extends ToolAuditEntry>(entry: T): T {
  return {
    ...entry,
    input_summary: redactText(entry.input_summary),
    result_summary: redactText(entry.result_summary),
    error_code: redactText(entry.error_code)
  };
}

function redactText(value: string | undefined): string | undefined {
  return value?.replace(redactionPattern, "[redacted]");
}
