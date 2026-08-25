import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/preload",
    emptyOutDir: false,
    target: "node24",
    lib: {
      entry: fileURLToPath(new URL("src/preload/preload.ts", import.meta.url)),
      formats: ["cjs"]
    },
    rollupOptions: {
      external: ["electron"],
      output: {
        entryFileNames: "preload.cjs",
        inlineDynamicImports: true
      }
    }
  }
});
