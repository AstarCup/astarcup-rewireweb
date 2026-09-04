import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// 从 .env 读取后端地址（loadEnv 才能读到 .env 文件，process.env 读不到）
// Frontend dev server proxies /api + /files to the Rust backend.
// Same-origin requests => auth cookie works naturally, no CORS involved.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const BACKEND = env.VITE_BACKEND || "http://localhost:4000";

  return {
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
  };
});