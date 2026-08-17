import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@workbuddy/ui/styles.css";
import { App } from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Workbench root element is missing");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
