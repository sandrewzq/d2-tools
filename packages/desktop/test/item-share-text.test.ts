import { describe, expect, it } from "vitest";
import { buildItemChatGuideText, buildItemShareText } from "../src/renderer/utils/itemShare";

describe("item share text", () => {
  it("formats item facts, local score, tag, roll, and AI advice for sharing", () => {
    const text = buildItemShareText({
      item: {
        name: "Riskrunner",
        tier: "Exotic",
        item_type: "Submachine Gun",
        bucket_name: "能量武器",
        power: 2000,
        locked: true,
        socket_plugs: [
          { hash: 1, name: "Arrowhead Brake" },
          { hash: 2, name: "Voltshot" }
        ]
      },
      score: {
        item_key: "weapon-1",
        name: "Riskrunner",
        score: 92,
        grade: "keep",
        reasons: ["已锁定", "有实用 perk"],
        warnings: ["异域装备需要按场景复查"]
      },
      tag: "keep",
      note: "留给电猎清怪，等队友确认 PVP 手感",
      aiText: "结论：值得保留。\n适用场景：清怪。"
    });

    expect(text).toContain("【Riskrunner】");
    expect(text).toContain("Exotic / Submachine Gun / 能量武器 / 光等 2000 / 已锁定");
    expect(text).toContain("本地评分：92 / keep / 标记：保留");
    expect(text).toContain("实际 Roll：Arrowhead Brake / Voltshot");
    expect(text).toContain("本地备注：留给电猎清怪，等队友确认 PVP 手感");
    expect(text).toContain("评分原因：已锁定；有实用 perk");
    expect(text).toContain("风险提示：异域装备需要按场景复查");
    expect(text).toContain("AI 解读：");
    expect(text).toContain("结论：值得保留。");
  });

  it("omits empty optional sections", () => {
    const text = buildItemShareText({
      item: {
        name: "Unknown Item"
      },
      tag: "none"
    });

    expect(text).toBe("【Unknown Item】\n标记：未标记");
  });

  it("formats a short chat guide for group sharing", () => {
    const text = buildItemChatGuideText({
      item: {
        name: "Riskrunner",
        tier: "Exotic",
        item_type: "Submachine Gun",
        bucket_name: "能量武器",
        locked: false,
        socket_plugs: [
          { hash: 1, name: "Arrowhead Brake" },
          { hash: 2, name: "Voltshot" }
        ]
      },
      score: {
        item_key: "weapon-1",
        name: "Riskrunner",
        score: 88,
        grade: "keep",
        reasons: ["清怪强", "适合电弧配装"],
        warnings: []
      },
      tag: "keep",
      note: "新手可以先留着",
      aiText: "适合清怪，PVP 不优先。"
    });

    expect(text).toContain("群聊说明：Riskrunner");
    expect(text).toContain("定位：Exotic / Submachine Gun / 能量武器");
    expect(text).toContain("建议：保留（88分）");
    expect(text).toContain("Roll：Arrowhead Brake / Voltshot");
    expect(text).toContain("备注：新手可以先留着");
    expect(text).toContain("AI：适合清怪，PVP 不优先。");
  });
});
