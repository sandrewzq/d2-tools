import { describe, expect, it } from "vitest";
import { normalizeUpdateError } from "../src/shared/updateError";

describe("app update error messages", () => {
  it.each([
    ["net::ERR_PROXY_CONNECTION_FAILED", "代理连接失败"],
    ["Proxy Authentication Required (HTTP 407)", "代理连接失败"],
    ["net::ERR_CERT_DATE_INVALID", "安全连接验证失败"],
    ["unable_to_verify_leaf_signature", "安全连接验证失败"],
    ["Cannot find latest.yml in the latest release artifacts", "没有找到适用于当前版本的更新信息"],
    ["net::ERR_CONNECTION_TIMED_OUT", "更新服务连接失败"]
  ])("maps %s to an actionable message", (technicalMessage, expectedMessage) => {
    const result = normalizeUpdateError(new Error(technicalMessage));

    expect(result.userMessage).toContain(expectedMessage);
    expect(result.technicalMessage).toBe(technicalMessage);
  });
});
