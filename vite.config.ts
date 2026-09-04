import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Frontend dev server proxies /api + /files to the Rust backend (port 3000).
// Same-origin requests => auth cookie works naturally, no CORS involved.
const BACKEND = process.env.VITE_BACKEND || "http://localhost:3000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: BACKEND, changeOrigin: true },
      "/files": { target: BACKEND, changeOrigin: true },
    },
  },
});