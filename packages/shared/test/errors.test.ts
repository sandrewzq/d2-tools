import { describe, expect, it } from "vitest";
import { createAppError, err, ok, parseIsoDate } from "../src/index";

describe("shared error and result helpers", () => {
  it("creates typed app errors", () => {
    const error = createAppError("platform.unavailable", "平台能力不可用", {
      command: "secure_get"
    });

    expect(error.code).toBe("platform.unavailable");
    expect(error.message).toBe("平台能力不可用");
    expect(error.cause).toEqual({ command: "secure_get" });
  });

  it("creates result values", () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    const failure = createAppError("data.read_failed", "读取失败");
    expect(err(failure)).toEqual({ ok: false, error: failure });
  });

  it("parses iso dates safely", () => {
    expect(parseIsoDate("2026-06-24T00:00:00.000Z")?.toISOString()).toBe(
      "2026-06-24T00:00:00.000Z"
    );
    expect(parseIsoDate("bad-date")).toBeNull();
  });
});
