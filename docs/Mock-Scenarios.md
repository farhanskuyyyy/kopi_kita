```yaml
metadata:
  artifact: Mock Scenarios
  version: 1.0
  owner: mock-api-engineer
  status: draft
```

# Mock Scenarios — Coffeeshop E-Catalog (Clickable Frontend)

Project: `ecatalog-coffeeshop`
Workflow: `clickable-frontend` — Stage 5: Mock Backend Development
Prepared by: Mock API Engineer Agent (`mock-api-engineer-ecatalog--clickable-fe`)
Upstream inputs: `contracts/API-Contract.yaml` (40 endpoints), `docs/Frontend-Architecture.md`
v1.1 (mock integration, §4–5), `docs/Frontend-Specification.md` (screens, cross-cutting
rules §3, resolved decisions D1–D8/A1–A12).

Implementation: `app/src/mocks/{types.ts, db.ts, handlers.ts, scenarios.ts, browser.ts}`.
All 40 contract endpoints are mocked with stateful CRUD against an in-memory store
(`db.ts`), reset on full page reload only (Frontend-Architecture §5).

---

## 1. Seed Data Summary

| Entity | Count | Notes |
|---|---|---|
| Categories | 7 | Espresso, Brewed Coffee, Non-Coffee, Tea, Pastries, Breakfast, Merchandise |
| Products | 34 | 33 active/visible + 1 soft-deleted (`Seasonal Pumpkin Latte`, D2 demo) |
| Customers | 2 | Registered accounts (see credentials below) |
| Staff users | 2 | 1 Catalog Admin + 1 Fulfillment Staff |
| Orders | 4 | One per status: `received`, `preparing`, `ready` (auto-timer stopped), `completed` |
| Promo codes | 3 | 2 active (percent + fixed), 1 inactive (simulates an expired code) |
| Favorites | 1 seeded set | `user_1` (Sari) favorites Latte + Butter Croissant |

### Demo credentials

| Role | Identifier | Password |
|---|---|---|
| Customer | `sari@example.com` | `Passw0rd!` |
| Customer | `andi@example.com` | `Passw0rd!` |
| Catalog Admin | `admin.catalog` | `Admin123!` |
| Fulfillment Staff | `staff.fulfillment` | `Staff123!` |

### Promo codes

| Code | Type | Value | Active |
|---|---|---|---|
| `COFFEE10` | percent | 10% | yes |
| `FLAT15K` | fixed | Rp 15.000 | yes |
| `OLDPROMO` | percent | 20% | **no** — use to exercise the "invalid/expired code" path |

### Product edge cases baked into seed data (no scenario flag needed)

| Product | Condition | Exercises |
|---|---|---|
| `prod_nitro_cold_brew`, `prod_turmeric_latte`, `prod_cheese_danish` | `available: false` | "Out of stock" badge (Catalog, Product Detail, Favorites), disabled Add-to-Cart (F-006) |
| `prod_pumpkin_latte` | `isDeleted: true`, referenced by seeded order `order_4` | D2 soft-delete: hidden from `/products`, `/categories` counts, and default `/admin/products`; still resolvable via `/orders/order_4` (Order History / Admin Order Detail) and via `/admin/products?includeDeleted=true` |
| Order `order_3` | `autoProgressionStopped: true`, status `ready` | A2 — demonstrates a staff-overridden order whose timer will never auto-advance again |
| Order `order_4` | status `completed` | A3 — demonstrates the terminal state auto-progression can never reach unattended |

---

## 2. Global Scenario Toggles

Exposed at runtime via `window.__mockScenarios` (attached by `scenarios.ts` whenever a
`window` exists) — usable from the browser console or an optional Stage-6/8 QA panel:

```js
window.__mockScenarios.forceServerError(true);      // every request -> 500 SERVER_ERROR
window.__mockScenarios.forcePaymentFailed(true);     // payment endpoints behave as declined
window.__mockScenarios.forceStockUnavailable(true);  // cart/order/reorder lines report unavailable
window.__mockScenarios.setLatency(2000, 4000);       // widen the artificial delay window (ms)
window.__mockScenarios.disableLatency();             // instant responses (useful for CI/E2E)
window.__mockScenarios.reset();                      // back to defaults (150–500ms latency, no forced failures)
```

Defaults: latency **enabled**, randomized 150–500ms per request (Frontend-Architecture §5
— "feel real"); no forced failures.

## 3. Per-Request Scenario Overrides

For deterministic, single-call triggers in a Playwright/QA scenario without touching
global state, send either header:

```
x-mock-scenario: force-500 | force-payment-failed | force-stock-unavailable | force-network-error
x-mock-latency: <milliseconds>
```

or the equivalent query string params on the same request: `?_scenario=force-500` /
`?_latencyMs=3000`. Both mechanisms are read in `scenarios.ts` (`getRequestScenario`,
`getRequestLatencyOverrideMs`) and consumed by every handler via the shared
`withCommonBehavior` wrapper in `handlers.ts`, so no handler special-cases scenarios
individually.

`force-network-error` returns `HttpResponse.error()` — a true network-level failure the
`httpClient` should surface as `UnreachableError`, distinct from a 500 (§3.7/§3.9 —
reachability failures render differently from confirmed-error responses).

---

## 4. Scenario-by-Endpoint Reference

| # | Endpoint | How to trigger | Expected response | Spec state exercised |
|---|---|---|---|---|
| 1 | Any endpoint | `forceServerError(true)` or header `x-mock-scenario: force-500` | `500 SERVER_ERROR` | Error (§3.7) — inline banner/toast + Retry |
| 2 | Any endpoint | default behavior (no flag) | 150–500ms random delay before response | Loading (§3.7) — skeletons must render, not a blank flash |
| 3 | Any endpoint | header `x-mock-scenario: force-network-error` | Network-level failure (`HttpResponse.error()`) | Error, reachability variant (§3.9) — distinct from 404/500 |
| 4 | `POST /auth/customer/register` | email = `sari@example.com` (already seeded) | `409 EMAIL_EXISTS` | Screen 12 duplicate-email inline error |
| 5 | `POST /auth/customer/register` | `password !== confirmPassword`, or password < 8 chars, or invalid email | `422 VALIDATION_ERROR` with `fieldErrors` | Screen 12 inline field validation |
| 6 | `POST /auth/customer/login` | wrong email/password combo | `401 INVALID_CREDENTIALS` | Screen 11 "Incorrect email or password" |
| 7 | `POST /auth/staff/login` | wrong username/password | `401 INVALID_CREDENTIALS` | Screen 17 invalid staff credentials |
| 8 | `GET /auth/me?domain=customer\|staff` | no/expired Bearer token | `401 SESSION_EXPIRED` | §3.2 session-expiry redirect + toast |
| 9 | `GET /products` | `price_min > price_max` | `200 OK`, filters reset server-side, `meta.filterNotice` set | Screen 2 inline filter-reset note |
| 10 | `GET /products` | `sort=<invalid>` | Falls back to `popularity` silently | Screen 2 sort fallback rule |
| 11 | `GET /products/:id` | nonexistent id, or id of a soft-deleted product | `404 NOT_FOUND` | Screen 4 → `/404` (F-047) |
| 12 | `POST /cart/validate` | include a line with `productId` of an out-of-stock/deleted/unknown product, OR `forceStockUnavailable(true)` | `200 OK`, that line `available:false` with `unavailableReason` | Screen 5 unavailable-line flag (F-025), never a 4xx |
| 13 | `POST /promo/validate` | `code: "BADCODE"` or `code: "OLDPROMO"` (seeded inactive) | `200 OK`, `valid:false`, explanatory `message` | Screen 5 invalid-promo inline note (F-026), does not block checkout |
| 14 | `POST /promo/validate` | `code: "COFFEE10"` or `code: "FLAT15K"` | `200 OK`, `valid:true`, computed `discountAmount` | Screen 5 real discount applied (D8) |
| 15 | `POST /checkout/payment/validate` | `paymentMethod: "demo_declined_card"`, or `forcePaymentFailed(true)` | `402 PAYMENT_FAILED` | Screen 7 mocked decline, flow does not advance to Review |
| 16 | `POST /orders` | any line's product currently unavailable/deleted, OR `forceStockUnavailable(true)` | `409 STOCK_UNAVAILABLE` with `details.unavailableLines` | Screen 8 final stock re-check failure (F-025) |
| 17 | `POST /orders` | missing/invalid required fields (email, phone, postal code when `fulfillmentMethod=delivery`, empty `lines`) | `422 VALIDATION_ERROR` with `fieldErrors` | Screen 6/8 inline validation |
| 18 | `POST /orders` | valid payload | `201 Created`, order created with status `received`, auto-progression timer started | Screen 9 confirmation, cart-clear (F-015) |
| 19 | `GET /orders/:orderId` | nonexistent id | `404 NOT_FOUND` | Screens 9/10 → `/404` |
| 20 | `GET /orders/:orderId` (poll) | any seeded/created order not yet `completed` | Status advances `received → preparing → ready` automatically every ~15s, then stops (never reaches `completed` unattended) | Screen 10 near-immediate shared-state polling (§3.11, A3) |
| 21 | `GET/PUT /account/profile`, `GET /account/orders`, `POST .../reorder`, `GET/POST/DELETE /account/favorites` | no/expired customer Bearer token | `401 SESSION_EXPIRED` | §3.2 redirect-to-login |
| 22 | `POST /account/orders/:orderId/reorder` | order contains a line whose product is now unavailable/deleted, OR `forceStockUnavailable(true)` | `200 OK`, item placed in `unavailableItems`, available ones in `addedLines` | Screen 14 reorder partial-availability notice (A4) |
| 23 | `POST /account/favorites` | `productId` does not exist | `404 NOT_FOUND` | Defensive edge case — favoriting a stale product id |
| 24 | `GET /admin/dashboard/*`, `GET/POST/PUT/DELETE /admin/products*`, `/admin/categories*` | no staff Bearer token | `401 SESSION_EXPIRED` | §3.2 unauthenticated admin hit → `/admin/login` |
| 25 | `/admin/products*`, `/admin/categories*` | staff token present but `role = fulfillment-staff` | `403 FORBIDDEN_ROLE` | §3.2 wrong-role access-denied (never a crash) |
| 26 | `/admin/orders*` | staff token present but `role = catalog-admin` | `403 FORBIDDEN_ROLE` | §3.2 wrong-role access-denied |
| 27 | `POST /admin/products` | `categoryId` does not exist | `404 NOT_FOUND` | Screen 20 stale-category-race exception |
| 28 | `PUT /admin/products/:id` | product's `isDeleted = true` (e.g. concurrently deleted in another tab) | `409 PRODUCT_DELETED` | Screen 21 concurrent-delete conflict banner (A12) |
| 29 | `DELETE /admin/products/:id` | any existing product id | `200 OK`, `isDeleted: true` (soft delete, D2) | Screen 19/21 delete confirmation |
| 30 | `POST /admin/products/:id/restore` | a soft-deleted product id | `200 OK`, `isDeleted: false` | Screen 21 Restore affordance (A12) |
| 31 | `PATCH /admin/products/:id/availability` | toggle `available` | `200 OK`; immediately reflected by `GET /products` (shared mutable store) | Screen 19 availability toggle → customer catalog (F-035) |
| 32 | `POST /admin/categories` | `name` already exists (case-insensitive) | `409 CATEGORY_NAME_EXISTS` | Screen 23 duplicate-name inline error |
| 33 | `PUT /admin/categories/:id` | rename to an existing (other) category's name | `409 CATEGORY_NAME_EXISTS` | Screen 24 duplicate-name inline error |
| 34 | `DELETE /admin/categories/:id` | category still has ≥1 non-deleted product assigned | `409 CATEGORY_HAS_PRODUCTS` with `details.assignedProductCount` | Screen 22/24 hard delete guard (D1, A1, F-039) |
| 35 | `DELETE /admin/categories/:id` | category has 0 assigned products | `200 OK`, `deleted:true` | Screen 22/24 guard-cleared delete |
| 36 | `PATCH /admin/orders/:id/status` `{action:"advance"}` | order already `completed` | `422` invalid transition | Screen 26 Advance disabled-at-completed rule |
| 37 | `PATCH /admin/orders/:id/status` `{action:"override", targetStatus:"ready"}` (etc.) | any order | `200 OK`, jumps directly, `autoProgressionStopped` set `true` permanently | Screen 26 Override + timer-stop (A2) |
| 38 | `GET /admin/orders`, `GET /admin/orders/:id` | nonexistent order id (detail only) | `404 NOT_FOUND` | Screen 26 → `/404` |

---

## 5. Loading / Empty States Reference

| Scenario | How to reach it with seed data |
|---|---|
| Empty cart | Not seeded server-side (cart lives client-side per Frontend-Architecture §2) — reachable by clearing localStorage or removing all lines |
| Empty search results | `GET /products?q=doesnotexist123` |
| Empty category | Not present in seed (every seeded category has ≥3 products) — create a new category via Admin Category Create and do not assign products to reach this state |
| Empty favorites | Log in as `andi@example.com` (has no seeded favorites) |
| Empty admin order queue (filtered) | `GET /admin/orders?status=completed` while no seeded order is `completed` other than `order_4` — filter to a status with zero matches, e.g. after advancing all seeded orders past `received` |
| Dashboard zero-count tile | Not naturally reachable from seed (all counts > 0) — soft-delete/restore products or delete all categories transiently to observe the "0 is valid" rule (§ Screen 18) |

---

## 6. Implementation Notes / Deviations Recorded for Stage 6 & 8

- **Session transport:** the contract's `securitySchemes` model customer/staff sessions as
  cookies (`csess` / `ssess`). This mock instead uses a bearer token
  (`Authorization: Bearer <token>`) returned as `sessionToken` from the login/register
  endpoints, per this stage's explicit brief. Stage 6's session stores
  (`customerSessionStore` / `staffSessionStore`, Frontend-Architecture §2) should persist
  `sessionToken` and the adapter/httpClient layer should attach it as a header on every
  request — this is an intentional, documented substitution of the mock's session
  mechanism, not a contract violation of the *shape* of any response body.
- **Reorder pricing:** `POST /account/orders/:orderId/reorder` re-prices added lines at the
  product's **current** `basePrice` rather than replaying the historical frozen
  `unitPrice`. D4/§3.12 only freezes price on the original line at add-to-cart time; a
  reorder is a new cart addition, not a redisplay of the past order, so repricing at
  current cost was judged the more realistic simulation. Selected customization option ids
  are not stored on `OrderLine` (only a display summary string, per the contract's
  `OrderLine` schema), so a reorder cannot losslessly restore the exact prior
  customization selection either — it carries over the summary text for display but
  recomputes price from base only. Flagged here rather than silently decided.
  Frontend/QA should treat this as expected mock behavior, not a bug.
  Bulk-reassignment UI for category deletion is out of scope per A1/F-040 — not a mock gap.
- **Soft-deleted product direct detail fetch:** `GET /products/:productId` returns `404`
  for a soft-deleted product (not just omission from list/search). §3.13 only explicitly
  requires exclusion from catalog/search and the default admin list; direct-URL access to a
  deleted product's public detail page was not explicitly specified. Treating it as 404
  (consistent with "hidden from customer catalog") was chosen over silently serving stale
  product data — flagged as a mock-layer business-rule call for architecture/QA review
  rather than assumed silently.
- **Category rename & slug stability:** renaming a category (`PUT /admin/categories/:id`)
  updates `name` only; `slug` is intentionally left unchanged so existing
  `/menu/:categorySlug` bookmarks and links keep working. `categoryName` on every `Product`
  DTO is computed live from the current category record, so renames propagate everywhere
  referenced (F-038) without a fan-out write.
- **Auto-progression interval:** 15 seconds per step (`received → preparing → ready`),
  chosen for a demo-friendly cadence to observe the transition without an unreasonably long
  wait; exact seconds are explicitly implementation-owned per D3/§3.11.
- **Tax:** flat 10%, applied identically wherever `subtotal`/`tax`/`total` are computed
  (cart validate, order create) — always presented as a mocked flat percentage, never a
  real jurisdictional calculation (§3.5).
- **Persistence:** all state is in-memory only; a hard reload fully resets to the seed
  snapshot in `db.ts` (Frontend-Architecture §5 explicitly leaves this decision to Stage 5;
  localStorage-mirroring was not implemented since the cart/session stores already persist
  independently at the Zustand layer, and re-seeding on reload keeps demo behavior
  predictable for QA).

---

## 7. Gate Status

All 40 API-Contract.yaml endpoints are mocked with real CRUD mutations against `db.ts`,
the full error-code set from the contract's `responses` section, pagination, sorting,
filtering, and the demo-timed order-status state machine. TypeScript compilation could not
be verified in this stage — no Vite/React/`msw` package scaffold exists yet
(`app/package.json` is Stage 6's deliverable); these are hand-written standalone `.ts`
modules with only internal cross-imports (`types.ts` ↔ `db.ts` ↔ `handlers.ts` ↔
`scenarios.ts` ↔ `browser.ts`) and no other project dependencies, for Stage 6 to compile
once the app is scaffolded.
