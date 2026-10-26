import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppProvider } from "@/lib/app-context";
import { installDebugMarkers } from "@/lib/debugMarkers";
import "@/index.css";

// dev 模式下的元素标记（按 d 开关，生产构建自动剔除）
if (import.meta.env.DEV) installDebugMarkers();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);