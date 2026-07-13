import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@d2-tools/app": resolve(__dirname, "../app/src/index.ts"),
      "@d2-tools/ui/styles.css": resolve(__dirname, "../ui/src/styles.css"),
      "@d2-tools/ui": resolve(__dirname, "../ui/src/index.ts")
    }
  }
});
