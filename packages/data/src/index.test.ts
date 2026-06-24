import { describe, expect, test } from "vitest";

import { dataPackageName } from "./index";

describe("@d2-tools/data scaffold", () => {
  test("exports the data package marker", () => {
    expect(dataPackageName).toBe("@d2-tools/data");
  });
});
