import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const copyPath = fileURLToPath(new URL("../src/renderer/shared/copy.ts", import.meta.url));

describe("renderer copy rules", () => {
  it("defines Chinese-first copy without exposing a language switcher", () => {
    expect(existsSync(copyPath)).toBe(true);

    const source = readFileSync(copyPath, "utf8");

    expect(source).toContain('defaultLocale = "zh-CN"');
    expect(source).toContain("copyRules");
    expect(source).toContain("用户可见文案默认使用中文");
    expect(source).not.toContain("en-US");
    expect(source).not.toMatch(/language\s*switcher|locale\s*switcher/i);
  });
});
