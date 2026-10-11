import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { StoreProvider } from "./lib/store";

const container = document.getElementById("root");
if (!container) throw new Error("找不到 #root 容器");

createRoot(container).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
