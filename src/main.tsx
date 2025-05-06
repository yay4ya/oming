import App from "@/App";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";

// biome-ignore lint/style/noNonNullAssertion: root must exist
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
