import { describe, expect, test } from "vitest";

import { uiPackageName } from "./index";

describe("@d2-tools/ui scaffold", () => {
  test("exports the ui package marker", () => {
    expect(uiPackageName).toBe("@d2-tools/ui");
  });
});
