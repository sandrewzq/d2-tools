import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendActionLog, loadActionLog } from "../src/actions/logStore.js";

describe("action log store", () => {
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
});
