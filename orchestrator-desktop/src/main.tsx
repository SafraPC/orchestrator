import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./ui/App";

function dismissSplash() {
  const el = document.getElementById("splash");
  if (!el) return;
  el.classList.add("hide");
  setTimeout(() => el.remove(), 500);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App onReady={dismissSplash} />
  </React.StrictMode>,
);
