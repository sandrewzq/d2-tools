import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: currentDir,
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@d2-tools/ui/styles.css": fileURLToPath(new URL("../ui/src/styles.css", import.meta.url)),
      "@d2-tools/ui": fileURLToPath(new URL("../ui/src/index.ts", import.meta.url))
    }
  },
  build: {
    outDir: "dist/renderer",
    emptyOutDir: false,
    target: "es2022",
    rollupOptions: {
      input: fileURLToPath(new URL("index.html", import.meta.url)),
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"]
        }
      }
    }
  }
});
