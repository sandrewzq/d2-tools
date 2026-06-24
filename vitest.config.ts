import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    include: [
      "test/**/*.test.ts",
      "test/**/*.test.tsx",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "apps/**/*.test.{ts,tsx}",
      "packages/**/*.test.{ts,tsx}"
    ],
    exclude: [
      "**/node_modules/**",
      "**/.worktrees/**",
      "**/dist/**"
    ]
  }
});
