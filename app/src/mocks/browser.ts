/**
 * Browser MSW entry point. Per Frontend-Architecture.md §5, this is started from
 * `main.tsx` behind a flag (`import.meta.env.DEV` or `VITE_ENABLE_MSW`) — the app never
 * imports `mocks/*` from `features/*`, only from this bootstrap file. This project ships
 * MSW as its permanent mocked "backend" (no real API exists), so this file is also
 * imported by the production build, and `public/mockServiceWorker.js` must be present
 * (Stage 6 owns generating it via `npx msw init public/ --save`).
 */

import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
