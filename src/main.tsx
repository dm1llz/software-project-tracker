import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import App from "./App";
import "./styles/tailwind.css";

export const resolveMountElement = (
  rootId = "app",
  doc: Document = document,
): HTMLElement => {
  const mountElement = doc.getElementById(rootId);
  if (!mountElement) {
    throw new Error(`Missing root container: #${rootId}`);
  }

  return mountElement;
};

export const mountApp = (mountElement: HTMLElement = resolveMountElement()): Root => {
  const root = createRoot(mountElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  return root;
};

if (typeof document !== "undefined" && document.getElementById("app")) {
  mountApp();
}
