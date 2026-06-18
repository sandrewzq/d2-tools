import { describe, expect, it } from "vitest";
import { redactSecrets } from "../src/logging/logger.js";

describe("logger redaction", () => {
  it("redacts known secret fields recursively", () => {
    const output = redactSecrets({
      api_key: "api",
      client_secret: "secret",
      refresh_token: "refresh",
      message: "safe",
      nested: {
        access_token: "access",
        value: "visible"
      }
    });

    expect(output).toEqual({
      api_key: "[REDACTED]",
      client_secret: "[REDACTED]",
      refresh_token: "[REDACTED]",
      message: "safe",
      nested: {
        access_token: "[REDACTED]",
        value: "visible"
      }
    });
  });
});
