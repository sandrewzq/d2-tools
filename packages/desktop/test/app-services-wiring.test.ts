import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const servicesRoot = join(process.cwd(), "packages", "services");

describe("app services desktop bridge wiring", () => {
  it("forwards activity and community matching through the profile service", () => {
    const source = readFileSync(join(servicesRoot, "src", "appServices.ts"), "utf8");

    expect(source).toContain("getActivitySummary: (input) => api.getActivitySummary(input)");
    expect(source).toContain("matchCommunityVaultItems: (items) => api.matchCommunityVaultItems(items)");
  });
});
