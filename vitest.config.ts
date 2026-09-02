import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [{
    name: "node-sqlite-compat",
    enforce: "pre",
    resolveId(id) {
      return id === "node:sqlite" || id === "sqlite" ? "\0node-sqlite-compat" : null;
    },
    load(id) {
      if (id !== "\0node-sqlite-compat") return null;
      return `
        import { createRequire } from "node:module";
        const sqlite = createRequire(import.meta.url)("node:sqlite");
        export const DatabaseSync = sqlite.DatabaseSync;
        export const Session = sqlite.Session;
        export const StatementSync = sqlite.StatementSync;
        export const backup = sqlite.backup;
        export const constants = sqlite.constants;
        export default sqlite.default;
      `;
    }
  }],
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
