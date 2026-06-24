import { describe, expect, test } from "vitest";

import { corePackageName } from "./index";

describe("@d2-tools/core scaffold", () => {
  test("exports the core package marker", () => {
    expect(corePackageName).toBe("@d2-tools/core");
  });
});
