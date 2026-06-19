import { describe, expect, it } from "vitest";
import { startHealthServer } from "../src/server";

describe("tool http server", () => {
  it("lists safe d2 tool definitions", async () => {
    const server = await startHealthServer({ host: "127.0.0.1", port: 0 });
    try {
      const response = await fetch(`${server.origin}/api/v1/tools`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.tools.map((tool: { name: string }) => tool.name)).toContain("d2.search_items");
      expect(JSON.stringify(body).toLocaleLowerCase()).not.toContain("client_secret");
      expect(JSON.stringify(body).toLocaleLowerCase()).not.toContain("access_token");
    } finally {
      await server.close();
    }
  });

  it("executes only explicitly injected tool handlers", async () => {
    const server = await startHealthServer({
      host: "127.0.0.1",
      port: 0,
      toolHandlers: {
        "d2.search_items": async (input) => ({ echoed: input })
      }
    });
    try {
      const ok = await fetch(`${server.origin}/api/v1/tools/d2.search_items/call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "Riskrunner" })
      });
      expect(ok.status).toBe(200);
      await expect(ok.json()).resolves.toEqual({ ok: true, result: { echoed: { query: "Riskrunner" } } });

      const blocked = await fetch(`${server.origin}/api/v1/tools/d2.create_action_plan/call`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "transfer" })
      });
      await expect(blocked.json()).resolves.toMatchObject({
        ok: false,
        error_code: "TOOL_HANDLER_NOT_CONFIGURED"
      });
      expect(blocked.status).toBe(501);
    } finally {
      await server.close();
    }
  });
});
