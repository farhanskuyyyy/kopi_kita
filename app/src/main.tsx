import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./index.css";

/**
 * MSW is the permanent mocked "backend" for this clickable demo (Frontend-Architecture §5) —
 * there is no real API, so the worker is started unconditionally, before the first render,
 * and this file is the ONLY place `mocks/*` is imported outside `mocks/` itself.
 */
async function bootstrap() {
  const { worker } = await import("./mocks/browser");
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: { url: "/mockServiceWorker.js" },
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
