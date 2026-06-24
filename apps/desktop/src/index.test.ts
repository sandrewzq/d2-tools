import { describe, expect, test } from "vitest";

import { desktopPackageName } from "./index";

describe("@d2-tools/desktop scaffold", () => {
  test("exports the desktop package marker", () => {
    expect(desktopPackageName).toBe("@d2-tools/desktop");
  });
});
