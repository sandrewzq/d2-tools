import { describe, expect, it } from "vitest";
import { navItems } from "../../ui/src/shell/navigation";

describe("desktop shell navigation", () => {
  it("defines the first public navigation entries", () => {
    expect(navItems.map((item) => item.key)).toEqual([
      "home",
      "account",
      "vault",
      "library",
      "vendors",
      "directory",
      "settings"
    ]);
  });
});
