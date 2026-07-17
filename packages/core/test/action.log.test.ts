import { describe, expect, it } from "vitest";
import { buildActionLogDiagnosticText, filterActionLog } from "../src/actions/log.js";

describe("action log", () => {
  it("filters entries by result and action type", () => {
    const entries = [
      { id: "1", created_at: "2026-06-19T00:00:00.000Z", action: "equip" as const, ok: false },
      { id: "2", created_at: "2026-06-19T00:01:00.000Z", action: "transfer" as const, ok: true }
    ];

    expect(filterActionLog(entries, { ok: false }).map((entry) => entry.id)).toEqual(["1"]);
    expect(filterActionLog(entries, { action: "transfer" }).map((entry) => entry.id)).toEqual(["2"]);
  });

  it("builds token-safe diagnostic text for failed actions", () => {
    const text = buildActionLogDiagnosticText({
      id: "1",
      created_at: "2026-06-19T00:00:00.000Z",
      action: "equip",
      item_name: "Riskrunner",
      item_instance_id: "item-1",
      character_id: "character-1",
      ok: false,
      message: "缺少权限"
    });

    expect(text).toContain("Riskrunner");
    expect(text).toContain("缺少权限");
    expect(text).toContain("不会包含 token、client secret 或 API Key");
  });
});
