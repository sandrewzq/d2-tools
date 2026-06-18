import { describe, expect, it } from "vitest";
import { startHealthServer } from "../src/server";

describe("health server", () => {
  it("responds on /api/v1/health", async () => {
    const server = await startHealthServer({ host: "127.0.0.1", port: 0 });
    try {
      const response = await fetch(`${server.origin}/api/v1/health`);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.service).toBe("d2-service");
    } finally {
      await server.close();
    }
  });
});
