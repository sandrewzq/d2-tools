import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("weekly summary desktop wiring", () => {
  it("passes objective definitions and logged-in token into weekly live data", () => {
    const weeklyIpc = readFileSync(join(desktopRoot, "src", "main", "ipc", "weekly.ts"), "utf8");

    expect(weeklyIpc).toContain("loadFreshOAuthToken");
    expect(weeklyIpc).toContain('"DestinyObjectiveDefinition"');
    expect(weeklyIpc).toContain("const token = await loadFreshOAuthToken(config).catch(() => null)");
    expect(weeklyIpc).toContain("fetchWeeklyLiveData({ config, token, definitions })");
  });
});
