import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base keeps the built site working from any GitHub Pages sub-path.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    target: "es2022",
    // supabase-js 本身就占了大部分体积，单页工具没必要按默认的 500kB 报警
    chunkSizeWarningLimit: 700,
  },
});
