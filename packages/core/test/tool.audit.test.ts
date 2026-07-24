import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendToolAuditLog, buildToolAuditDiagnosticText, loadToolAuditLog } from "../../services/src/tools/audit.js";

describe("tool audit log", () => {
  it("appends tool calls newest first and limits diagnostics data", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-tool-audit-"));

    appendToolAuditLog(dir, {
      tool: "d2.search_items",
      caller: "gui",
      ok: true,
      duration_ms: 12,
      input_summary: "query=Riskrunner api_key=secret",
      result_summary: "1 result"
    });
    appendToolAuditLog(dir, {
      tool: "d2.create_action_plan",
      caller: "ai",
      ok: false,
      duration_ms: 5,
      error_code: "PLAN_ONLY",
      input_summary: "access_token=secret item=Riskrunner"
    });

    const entries = loadToolAuditLog(dir);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      tool: "d2.create_action_plan",
      caller: "ai",
      ok: false,
      error_code: "PLAN_ONLY"
    });
    expect(entries[0].input_summary).toBe("[redacted] item=Riskrunner");
    expect(entries[1].input_summary).toBe("query=Riskrunner [redacted]");
  });

  it("builds a token-safe diagnostic text for tool calls", () => {
    const text = buildToolAuditDiagnosticText({
      id: "1",
      created_at: "2026-06-19T00:00:00.000Z",
      tool: "d2.analyze_vault",
      caller: "http",
      ok: false,
      duration_ms: 100,
      input_summary: "client_secret=secret vault=loaded",
      error_code: "BAD_INPUT"
    });

    expect(text).toContain("d2.analyze_vault");
    expect(text).toContain("BAD_INPUT");
    expect(text).not.toContain("secret");
    expect(text).toContain("[redacted] vault=loaded");
  });
});
