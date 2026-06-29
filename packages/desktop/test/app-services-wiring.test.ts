import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const servicesRoot = join(process.cwd(), "packages", "services");

describe("app services desktop bridge wiring", () => {
  it("forwards activity and community matching through the profile service", () => {
    const appServices = readFileSync(join(servicesRoot, "src", "appServices.ts"), "utf8");
    const desktopBridge = readFileSync(join(servicesRoot, "src", "desktopBridge.ts"), "utf8");

    expect(appServices).toContain("return createDesktopBridgeServices(api)");
    expect(desktopBridge).toContain("getActivitySummary: (input) => api.getActivitySummary(input)");
    expect(desktopBridge).toContain("matchCommunityVaultItems: (items) => api.matchCommunityVaultItems(items)");
  });
});
