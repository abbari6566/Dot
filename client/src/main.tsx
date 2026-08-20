import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./radius.css";

try {
  const stored = localStorage.getItem("dot-theme");
  document.documentElement.dataset.theme = stored === "light" ? "light" : "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
