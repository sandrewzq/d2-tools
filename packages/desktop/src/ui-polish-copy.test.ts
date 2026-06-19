import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const desktopRoot = fileURLToPath(new URL("..", import.meta.url));

describe("new feature UI polish", () => {
  it("keeps new GUI features understandable for non-technical players", () => {
    const homePage = readFileSync(
      join(desktopRoot, "src", "renderer", "pages", "HomePage.tsx"),
      "utf8"
    );

    expect(homePage).toContain("未找到匹配结果");
    expect(homePage).toContain("保存当前装备为模板");
    expect(homePage).toContain("复制脱敏诊断");
    expect(homePage).toContain("这只是计划，不会执行 Bungie 写操作");
    expect(homePage).toContain("别名会保存在本机");
  });
});
