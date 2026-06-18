import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const currentDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: currentDir,
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist/renderer",
    emptyOutDir: false,
    rollupOptions: {
      input: fileURLToPath(new URL("index.html", import.meta.url))
    }
  }
});
