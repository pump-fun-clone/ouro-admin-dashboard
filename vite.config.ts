import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    // Dev API is the Hono process (tsx watch server/index.ts). Vite is only used for `build`.
    middlewareMode: false,
  },
});
