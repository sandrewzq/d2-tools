import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("DIM-style tools wiring", () => {
  it("surfaces actionable transfer queue and farming helpers in the GUI", () => {
    const homePage = readFileSync(join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"), "utf8");

    expect(homePage).toContain("createTransferQueue");
    expect(homePage).toContain("createFarmingModePlan");
    expect(homePage).toContain("createBatchTransferPlan");
    expect(homePage).toContain("copyBatchTransferPlanText");
    expect(homePage).toContain("runVaultCleanupWriteAction");
    expect(homePage).toContain('transfer_to_vault: true');
    expect(homePage).toContain("analyzeLoadoutTemplate");
    expect(homePage).toContain("suggestArmorStatSets");
    expect(homePage).toContain("parseDimWishlist");
    expect(homePage).toContain("复制转移计划");
    expect(homePage).toContain("执行转移");
    expect(homePage).toContain("复制腾包计划");
    expect(homePage).toContain("立即腾包");
  });
});
