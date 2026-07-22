import type { NavigateFunction } from "react-router-dom";

/**
 * Module-level ref to the router's navigate function, populated once from inside the
 * Router by <NavigationRefBinder/> (app/App.tsx). Lets the query client's global
 * session-expiry handler (lib/query/queryClient.ts) redirect imperatively without a full
 * page reload — a full reload would also wipe the mocked in-memory db (Mock-Scenarios §6).
 */
export const navigationRef: { current: NavigateFunction | null } = { current: null };
