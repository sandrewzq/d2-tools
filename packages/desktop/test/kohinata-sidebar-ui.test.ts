import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("kohinata sidebar UI", () => {
  it("renders the full guide workflow instead of a one-shot task summary", () => {
    const sidebar = readFileSync("packages/desktop/src/renderer/components/GlobalAssistantSidebar.tsx", "utf8");
    const viewModel = readFileSync("packages/desktop/src/renderer/shared/domain/assistant/kohinataViewModel.ts", "utf8");

    expect(sidebar).toContain("小日向");
    expect(sidebar).toContain("解析攻略");
    expect(sidebar).toContain("对照账号");
    expect(sidebar).toContain("生成草稿");
    expect(sidebar).toContain("保存草稿");
    expect(sidebar).toContain("查看缺口");
    expect(viewModel).toContain("formatKohinataTaskGroups");
    expect(viewModel).toContain("待确认");
  });
});
