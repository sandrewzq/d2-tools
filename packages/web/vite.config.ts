import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const appSourceDir = resolve(__dirname, "../app/src");
const appDomains = ["account", "assistant", "home", "items", "library", "loadouts", "settings", "vault", "vendors"];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      ...appDomains.map((domain) => ({ find: `@d2-tools/app/${domain}`, replacement: resolve(appSourceDir, `${domain}.ts`) })),
      { find: "@d2-tools/app", replacement: resolve(appSourceDir, "index.ts") },
      { find: "@d2-tools/ui/styles.css", replacement: resolve(__dirname, "../ui/src/styles.css") },
      { find: "@d2-tools/ui", replacement: resolve(__dirname, "../ui/src/index.ts") }
    ]
  }
});
