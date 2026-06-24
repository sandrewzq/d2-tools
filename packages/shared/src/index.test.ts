import { describe, expect, test } from "vitest";

import { sharedPackageName } from "./index";

describe("@d2-tools/shared scaffold", () => {
  test("exports the shared package marker", () => {
    expect(sharedPackageName).toBe("@d2-tools/shared");
  });
});
