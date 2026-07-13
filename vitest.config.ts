import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environmentMatchGlobs: [["packages/ui/test/**/*.test.tsx", "jsdom"]],
    setupFiles: ["packages/ui/test/setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/.worktrees/**",
      "**/dist/**"
    ]
  }
});
