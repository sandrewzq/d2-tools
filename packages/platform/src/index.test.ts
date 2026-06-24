import { describe, expect, test } from "vitest";

import { platformPackageName } from "./index";

describe("@d2-tools/platform scaffold", () => {
  test("exports the platform package marker", () => {
    expect(platformPackageName).toBe("@d2-tools/platform");
  });
});
