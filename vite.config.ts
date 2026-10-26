import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// vditor 运行时会从 `{cdn}/dist/...` 动态加载图标、Lute 引擎、i18n、代码高亮等资源，
// 默认 cdn 是 unpkg（国内不可靠）。这里把需要的子集自托管在 /vendor/vditor 下：
// dev 走中间件，build 拷贝到 dist/vendor/vditor（配合 MarkdownEditor 的 cdn 选项）。
const VDITOR_SUBSET = [
  "js/icons",
  "js/lute",
  "js/i18n",
  "js/highlight.js",
  "images/emoji",
  "css/content-theme",
  "index.css",
  "method.min.js",
];

const VDITOR_MIME: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
};

function vditorVendor(): Plugin {
  const root = path.resolve(__dirname, "node_modules/vditor/dist");
  return {
    name: "vditor-vendor",
    configureServer(server) {
      server.middlewares.use("/vendor/vditor/dist", (req, res, next) => {
        const raw = decodeURIComponent((req.url || "/").split("?")[0]);
        // 兼容 connect 是否剥离挂载前缀两种行为
        const rels = [
          raw.replace(/^\/+/, ""),
          raw.replace(/^\/vendor\/vditor\/dist/, "").replace(/^\/+/, ""),
        ];
        for (const rel of rels) {
          const file = path.join(root, rel);
          if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) {
            res.setHeader(
              "Content-Type",
              VDITOR_MIME[path.extname(file)] || "application/octet-stream",
            );
            fs.createReadStream(file).pipe(res);
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      for (const rel of VDITOR_SUBSET) {
        const src = path.join(root, rel);
        if (!fs.existsSync(src)) continue;
        const dst = path.join(__dirname, "dist/vendor/vditor/dist", rel);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.cpSync(src, dst, { recursive: true });
      }
    },
  };
}

// 从 .env 读取后端地址（loadEnv 才能读到 .env 文件，process.env 读不到）
// Frontend dev server proxies /api + /files to the Rust backend.
// Same-origin requests => auth cookie works naturally, no CORS involved.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, "VITE_");
  const BACKEND = env.VITE_BACKEND || "http://localhost:4000";

  return {
    plugins: [react(), tailwindcss(), vditorVendor()],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "./src"),
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