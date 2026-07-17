import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildActionLogDiagnosticText, filterActionLog } from "../src/actions/log.js";
import { appendActionLog, loadActionLog } from "@d2-tools/services/actions/logStore";

describe("action log", () => {
  it("appends write-operation entries newest first", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-action-log-"));

    appendActionLog(dir, {
      action: "set-lock",
      item_name: "Riskrunner",
      item_instance_id: "item-1",
      ok: true,
      message: "锁定成功"
    });
    appendActionLog(dir, {
      action: "equip",
      item_name: "Riskrunner",
      item_instance_id: "item-1",
      character_id: "character-1",
      ok: false,
      message: "缺少权限"
    });

    const entries = loadActionLog(dir);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      action: "equip",
      item_name: "Riskrunner",
      item_instance_id: "item-1",
      character_id: "character-1",
      ok: false,
      message: "缺少权限"
    });
    expect(entries[0].id).toBeTruthy();
    expect(entries[0].created_at).toBeTruthy();
    expect(entries[1].action).toBe("set-lock");
  });

  it("can limit loaded entries", () => {
    const dir = mkdtempSync(join(tmpdir(), "d2-tools-action-log-"));
    appendActionLog(dir, { action: "set-lock", ok: true });
    appendActionLog(dir, { action: "equip", ok: true });

    expect(loadActionLog(dir, 1)).toHaveLength(1);
    expect(loadActionLog(dir, 1)[0].action).toBe("equip");
  });

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
