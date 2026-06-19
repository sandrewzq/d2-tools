import { describe, expect, it } from "vitest";
import { findD2ToolDefinition, listD2ToolDefinitions } from "../src/tools/registry.js";

describe("d2 tool registry", () => {
  it("publishes GUI/AI-safe d2 tool definitions without secret-shaped inputs", () => {
    const tools = listD2ToolDefinitions();

    expect(tools.map((tool) => tool.name)).toEqual([
      "d2.search_items",
      "d2.search_perks",
      "d2.get_account_summary",
      "d2.analyze_vault",
      "d2.get_daily_summary",
      "d2.create_action_plan",
      "d2.get_activity_summary",
      "d2.export_diagnostics"
    ]);
    expect(tools.every((tool) => tool.ai_safe)).toBe(true);
    expect(tools.find((tool) => tool.name === "d2.create_action_plan")?.write_mode).toBe("plan-only");

    const serialized = JSON.stringify(tools).toLocaleLowerCase();
    expect(serialized).not.toContain("client_secret");
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("refresh_token");
    expect(serialized).not.toContain("api_key");
  });

  it("returns a defensive copy of tool metadata", () => {
    const first = listD2ToolDefinitions();
    first[0].description = "changed";

    expect(findD2ToolDefinition("d2.search_items")?.description).not.toBe("changed");
    expect(findD2ToolDefinition("d2.missing")).toBeUndefined();
  });
});
