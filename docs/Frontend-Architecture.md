```yaml
metadata:
  artifact: Frontend Architecture
  version: 1.1
  owner: web-frontend-developer-lead
  status: reviewed
```

# Frontend Architecture — Coffeeshop E-Catalog (Clickable Frontend)

Project: `ecatalog-coffeeshop`
Workflow: `clickable-frontend` — Stage 3: Frontend Architecture Design
Prepared by: Web Frontend Developer Lead Agent (`web-fe-lead-ecatalog-coffee-clickable-fe`)
Upstream inputs: `Frontend-Specification.md` (28 screens, cross-cutting rules §3), `Feature-List.md` (47 features), `User-Journey-Map.md` (4 personas)

This document is **design only** — no application code. It defines routing, state
management, component hierarchy, the service/adapter/mock chain, forms, and cross-cutting
concerns so that Stage 5 (Mock Backend Engineer) and Stage 6 (Frontend Dev) have an
unambiguous, reviewable structure to build against. It follows the "simplest scalable
pattern" principle — no state library or abstraction is introduced beyond what the 28
screens and cross-cutting rules actually require.

Stack (fixed, per STACK-STANDARDS): Vite + React + TypeScript + Shadcn + Tailwind + React
Query (TanStack Query) + Zod + React Hook Form + MSW. Feature-based modules.

---

## 1. Routing

### 1.1 Layout shells

| Shell | Wraps | Chrome |
|---|---|---|
| `PublicLayout` | Home, Menu, Search, Product Detail, Cart, Checkout*, Order Confirmation/Tracking, Store Info, Account* (nested) | Header (logo/Home, category shortcuts, debounced search, cart badge + mini-cart dropdown, account entry point — §3.8) + footer |
| `AuthLayout` | `/login`, `/register`, `/admin/login` | Minimal centered card, logo, no nav clutter — reduces distraction on auth forms |
| `AccountLayout` | `/account`, `/account/orders`, `/account/favorites` | Nested inside `PublicLayout`; adds a secondary account sub-nav (Profile / Orders / Favorites) |
| `AdminLayout` | All `/admin*` except `/admin/login` | Role-scoped side nav (§3.2): Catalog Admin sees Products/Categories/Dashboard; Fulfillment Staff sees Orders/Dashboard; no public header |

### 1.2 Route table

| # | Screen | Route | Shell | Guard |
|---|---|---|---|---|
| 1 | Home | `/` | Public | none |
| 2 | Catalog / Menu | `/menu`, `/menu/:categorySlug` | Public | none (404 on unknown `categorySlug`) |
| 3 | Search Results | `/search` | Public | none |
| 4 | Product Detail | `/product/:productId` | Public | none (404 on unknown `productId`) |
| 5 | Cart | `/cart` | Public | none |
| 6 | Checkout — Details | `/checkout/details` | Public | `RequireNonEmptyCart` |
| 7 | Checkout — Payment | `/checkout/payment` | Public | `RequireNonEmptyCart` + `RequireDetailsDraft` |
| 8 | Checkout — Review | `/checkout/review` | Public | `RequireNonEmptyCart` + `RequireDetailsDraft` + `RequirePaymentDraft` |
| 9 | Order Confirmation | `/order/confirmation/:orderId` | Public | none (404 on unknown `orderId`) |
| 10 | Order Tracking | `/orders/:orderId/track` | Public | none (404 on unknown `orderId`) |
| 11 | Login | `/login` | Auth | `RedirectIfCustomerAuthed` → `/account` |
| 12 | Register | `/register` | Auth | `RedirectIfCustomerAuthed` → `/account` |
| 13 | Account Home | `/account` | Account | `RequireCustomerAuth` |
| 14 | Order History | `/account/orders` | Account | `RequireCustomerAuth` |
| 15 | Favorites | `/account/favorites` | Account | `RequireCustomerAuth` |
| 16 | Store Info | `/store-info` | Public | none |
| 17 | Admin Login | `/admin/login` | Auth | `RedirectIfStaffAuthed` → `/admin` |
| 18 | Admin Dashboard | `/admin` | Admin | `RequireStaffAuth` (any role) |
| 19 | Admin Product List | `/admin/products` | Admin | `RequireStaffAuth` + `RequireStaffRole('catalog-admin')` |
| 20 | Admin Product Create | `/admin/products/new` | Admin | `RequireStaffAuth` + `RequireStaffRole('catalog-admin')` |
| 21 | Admin Product Edit | `/admin/products/:productId/edit` | Admin | `RequireStaffAuth` + `RequireStaffRole('catalog-admin')` (404 on unknown id) |
| 22 | Admin Category List | `/admin/categories` | Admin | `RequireStaffAuth` + `RequireStaffRole('catalog-admin')` |
| 23 | Admin Category Create | `/admin/categories/new` | Admin | `RequireStaffAuth` + `RequireStaffRole('catalog-admin')` |
| 24 | Admin Category Edit | `/admin/categories/:categoryId/edit` | Admin | `RequireStaffAuth` + `RequireStaffRole('catalog-admin')` (404 on unknown id) |
| 25 | Admin Order List | `/admin/orders` | Admin | `RequireStaffAuth` + `RequireStaffRole('fulfillment-staff')` |
| 26 | Admin Order Detail | `/admin/orders/:orderId` | Admin | `RequireStaffAuth` + `RequireStaffRole('fulfillment-staff')` (404 on unknown id) |
| 27 | Not Found | `/404`, catch-all `*` | Public (bare) | none |

**27 routes total** (screen 28 has no route — it is the shared empty/error component
pattern, documented in §7 below).

### 1.3 Guard behavior (maps to spec §3.2)

- `RequireCustomerAuth` / `RequireStaffAuth`: no session → redirect to that domain's login
  with `?returnTo=<path>`; expired session mid-task → redirect with "Session expired,
  please log in again" (toast + redirect, not a silent bounce).
- `RequireStaffRole(role)` is an **authorization-only** guard — it checks role, not session
  presence, and never by itself catches the unauthenticated case. `RequireStaffAuth`
  (authentication) and `RequireStaffRole(role)` (authorization: Catalog Admin vs.
  Fulfillment Staff) are therefore two distinct, ordered guards, always composed
  `RequireStaffAuth` → `RequireStaffRole(role)` on every role-scoped admin route, exactly as
  shown in §1.2's route table (`RequireStaffAuth` + `RequireStaffRole('catalog-admin' |
  'fulfillment-staff')`). Explicit behavior by case:
  - **No staff session at all** (unauthenticated hit on any `/admin/*` protected route,
    including `/admin/products*`, `/admin/categories*`, `/admin/orders*`, and `/admin`):
    caught by `RequireStaffAuth`, which redirects to `/admin/login?returnTo=<path>` — the
    route never renders, and `RequireStaffRole` is never reached.
  - **Authenticated staff, wrong role**: caught by `RequireStaffRole`, which shows an
    access-denied message and redirects to `/admin` (never a crash, per F-029).
  This closes architecture-review v1.0 RC-1 — an unauthenticated hit on an admin route
  always redirects to `/admin/login`, never falls through to role-checking or render.
- `RequireNonEmptyCart` / `RequireDetailsDraft` / `RequirePaymentDraft`: implement §3.4 —
  redirect to `/cart` or back to the first incomplete checkout step with an inline message.
- All guards are plain wrapper components around `<Outlet/>`, declared once in
  `lib/auth/guards.tsx` and attached in the central route config (`app/routes.tsx`) — not
  re-implemented per page.

### 1.4 404 handling

Any dynamic-segment loader that receives a mock-backend "not found" response throws a
typed `NotFoundError`; a route-level error boundary per §6 catches it and renders the same
`NotFoundPage` used for the catch-all route (F-047, §3.9). A *reachability* failure (mock
API down) is a different, non-404 error path (inline banner + Retry) — the loader
distinguishes the two error shapes explicitly, it never conflates them.

### 1.5 Code-splitting

Customer-facing routes (screens 1–16: `PublicLayout` / `AuthLayout` / `AccountLayout`) and
admin routes (screens 17–26: `AdminLayout`) are lazy-loaded as separate bundles via
`React.lazy` + a route-level `<Suspense>` boundary declared in `app/routes.tsx`, since a
customer session never needs the admin bundle and vice versa. The `Suspense` fallback reuses
the existing skeleton primitives (§7) rather than introducing a separate loading UI. This
addresses architecture-review v1.0 RC-3 (§5 Performance NFR gap).

---

## 2. State Management

Two clearly separated mechanisms — no overlap, no duplicated source of truth:

| Concern | Mechanism | Notes |
|---|---|---|
| All server-derived data (products, categories, cart stock-recheck, promo validation, checkout submission, orders, favorites, account profile, admin CRUD, dashboard counts) | **React Query** | Cache + loading/error states; see query key table below |
| Cart contents (lines, quantities, customizations) | **Zustand store** (`cartStore`), `persist` middleware → `localStorage` | Device/browser-scoped per A11; survives reload; cleared only on order placement or explicit removal (§3.3) |
| Customer session / Staff session | **Two independent Zustand stores** (`customerSessionStore`, `staffSessionStore`), `persist` → `localStorage` | Kept separate because they are independent identity spaces (§3.1) — never merged into one "auth store" |
| Checkout draft (Details + Payment step data) | **Zustand store** (`checkoutDraftStore`), `persist` → `sessionStorage` | Must survive the mid-checkout register/login detour (D5) within the same tab; not device-persistent beyond the session, since a stale draft across days is not meaningful |
| Catalog/search filters, sort, pagination | **URL query params** (`useSearchParams`) | Source of truth is the URL, not client state — enables back/forward, shareable links, and avoids a duplicate store (F-004/F-005) |
| Ephemeral UI (dialog open, dropdown open, active tab, form-in-progress touch state) | **Local component state** (`useState`) | No global store needed |
| Toasts | **Shadcn/`sonner` toast provider**, mounted once in the app shell | Not a data store — an imperative emit API (`toast.success(...)`) per §3.6 timing rules |

Rationale for Zustand over Context for cart/session/draft: these are read from many
unrelated places (header cart badge, guards, checkout steps) and need persistence
middleware; Context would require a hand-rolled persistence layer and cause broader
re-renders. This is the simplest option that satisfies persistence + cross-tree reads.

### 2.1 React Query key strategy

Each feature owns a query-key factory (colocated with its hooks) so keys are typed and
never hand-stringified at call sites:

```
productKeys.list(filters) → ['products', 'list', filters]
productKeys.detail(id)    → ['products', 'detail', id]
categoryKeys.list()       → ['categories', 'list']
cartKeys.stockCheck(ids)  → ['cart', 'stock-check', ids]
orderKeys.detail(id)      → ['orders', 'detail', id]
orderKeys.history()       → ['orders', 'history']
adminProductKeys.list(f)  → ['admin', 'products', 'list', f]
adminOrderKeys.detail(id) → ['admin', 'orders', 'detail', id]
```

### 2.2 Caching / invalidation strategy

- Read-heavy public data (products, categories): `staleTime` ~60s, background refetch on
  window refocus off (demo, not latency-sensitive) to avoid surprising skeleton flashes.
- Order Tracking (`orderKeys.detail`): `refetchInterval` (short poll, e.g. a few seconds)
  while the order is not yet `completed`, to reflect §3.11's "near-immediate" shared-state
  requirement without WebSockets — stopped once status is terminal.
- Admin mutations (product/category/order-status CRUD) invalidate the relevant list +
  detail keys on success (`onSuccess: () => queryClient.invalidateQueries(...)`), and the
  customer-facing catalog query keys where the mocked shared state crosses personas (e.g.
  availability toggle F-035 invalidates `productKeys.list`/`detail` so the customer catalog
  reflects it without a manual customer-side refresh).
- Mutations that must not corrupt state on failure (Place Order F-015, admin status update)
  do **not** use optimistic updates — they wait for the mocked response and only then
  update cache/cart, per the spec's "not falsely confirmed" requirements (F-015, F-043).

---

## 3. Component Hierarchy & Folder Structure

Feature-based modules; shared UI stays generic (no feature imports inside `components/`).

```
src/
  app/
    App.tsx                  # providers + router mount
    routes.tsx                # central route config (table in §1.2), guards attached here
    providers/
      QueryProvider.tsx
      ToastProvider.tsx
      AppErrorBoundary.tsx
  layouts/
    PublicLayout.tsx
    AuthLayout.tsx
    AccountLayout.tsx
    AdminLayout.tsx
  components/                 # shared, feature-agnostic
    ui/                        # shadcn-generated primitives (button, dialog, input, ...)
    feedback/                  # Skeleton variants, EmptyState, ErrorBanner, ToastHelpers
    layout/                    # Header, MiniCart, CategoryShortcuts, SideNav, Breadcrumbs
    form/                      # RHF+Zod shared primitives (FormField, FormMessage wiring)
  features/
    catalog/                   # Home, Menu, Search, Product Detail (F-001–005, 027)
      api/  hooks/  components/  pages/  schemas/
    cart/                       # Cart page + mini-cart (F-006–010, 025, 026)
      store/ (cartStore.ts)  api/  hooks/  components/  pages/
      lib/ (pricing.ts)          # D4 owning mechanism — see note below folder tree
    checkout/                   # Details/Payment/Review (F-011–015, 024, 025)
      store/ (checkoutDraftStore.ts)  api/  hooks/  components/  pages/  schemas/
    orders/                      # Confirmation + Tracking (F-016, 017)
      api/  hooks/  components/  pages/
    auth/                         # Login/Register/Admin Login (F-018, 019, 029)
      store/ (customerSessionStore.ts, staffSessionStore.ts)
      api/  hooks/  components/  pages/  schemas/
    account/                       # Account Home, Order History, Favorites (F-020–022)
      api/  hooks/  components/  pages/
    store-info/                     # F-023
      pages/
    admin-catalog/                    # Catalog Admin: products + categories (F-031–040, 044)
      api/  hooks/  components/  pages/  schemas/
    admin-fulfillment/                 # Fulfillment Staff: orders (F-041–043, 045)
      api/  hooks/  components/  pages/
    admin-dashboard/                    # F-030
      api/  hooks/  pages/
    not-found/                            # F-047
      pages/
  lib/
    api/
      httpClient.ts             # thin fetch wrapper; base URL; error normalization
      ApiError.ts                # typed error incl. NotFoundError vs UnreachableError
    query/
      queryClient.ts
    format/
      currency.ts                 # formatIDR() — Rp 45.000, §3.5
      date.ts                       # DD MMM YYYY / HH:mm, §3.5
    auth/
      guards.tsx                     # RequireCustomerAuth, RequireStaffRole, etc.
  mocks/
    handlers/                          # catalog.ts, cart.ts, checkout.ts, orders.ts, auth.ts, admin.ts
    data/                                # seed fixtures + in-memory mock "db" (mocks/data/db.ts)
    browser.ts                            # setupWorker — dev entry
  main.tsx
  index.css                               # Tailwind entry
```

Folder-tree top level: `app/`, `layouts/`, `components/`, `features/*`, `lib/`, `mocks/`.

**D4 (customization pricing) owning mechanism:** `features/cart/lib/pricing.ts` computes
the unit price as base + Σ(selected option deltas) at add-to-cart time; the resulting price
is written onto the cart line and frozen there — it is never recomputed later, so historical
order lines keep the price they were added at, per D4/§3.12. This addresses
architecture-review v1.0 RC-4.

---

## 4. Service → Adapter → MSW Chain

Strict one-directional layering — a page component never calls `fetch` or an adapter
directly, and an adapter never imports React Query:

```
Page component
  → React Query hook (features/*/hooks/useXxx.ts)     — owns queryKey + caching config
    → adapter function (features/*/api/xxxApi.ts)     — owns the HTTP call + Zod parse
      → lib/api/httpClient (shared fetch wrapper)      — owns base URL + error normalization
        → MSW handler (mocks/handlers/*.ts)            — intercepts at the network layer
          → mocks/data/db.ts (in-memory fake "database")
```

This is the workflow's core principle made concrete: the UI and service layer talk to
`/api/*` paths through the same adapters regardless of whether MSW or a real backend is
behind them — swapping MSW for a real API later touches only `mocks/` and `httpClient`'s
base URL, never `features/*`.

**Adapter contract shape** (typed with Zod-inferred types, illustrative):

```ts
export async function getProduct(id: string): Promise<Product> {
  const res = await httpClient.get(`/api/products/${id}`); // may throw NotFoundError/UnreachableError
  return ProductSchema.parse(res.data); // runtime-validates the mock payload shape
}
```

The React Query hook is a thin wrapper: `useProductQuery(id) = useQuery({ queryKey:
productKeys.detail(id), queryFn: () => getProduct(id) })`. Mutations follow the same
shape with `useMutation`.

---

## 5. MSW Integration

- **Dev**: `mocks/browser.ts` calls `setupWorker(...handlers)`, started in `main.tsx`
  behind a flag (`import.meta.env.DEV` or `VITE_ENABLE_MSW`) so the seam exists even
  though this project always runs mocked — the app never imports `mocks/*` from
  `features/*`, only from the bootstrap file.
- **Build**: `public/mockServiceWorker.js` ships with the built demo (this is a clickable
  frontend with no real backend, per Feature-List §1 — MSW is the permanent "backend" for
  this project, not a dev-only stub).
- **Fake persistence**: handlers read/mutate `mocks/data/db.ts`, an in-memory store
  hydrated from seed fixtures at worker start. Admin CRUD mutations (create/edit/soft-
  delete product/category, order status changes) mutate this store directly so all
  personas observe the same shared state within a session (F-035, §3.11). Whether that
  store also mirrors to `localStorage` for durability across a hard reload is a Stage 5
  (Mock Backend Engineer) implementation decision — this architecture only requires that
  decision stay behind `mocks/data/db.ts`'s existing read/write functions, never leak into
  handlers' calling contract or into `features/*`.
- **Order auto-progression** (D3/A2/A3): owned by `mocks/data/db.ts` (a per-order timer
  advancing `received → preparing → ready` on a demo interval, permanently stopped once a
  staff Override/Advance touches that order). This is backend-shaped behavior and
  deliberately does not live in `features/orders` — Order Tracking only polls the same
  handler everyone else reads from (§2.2).

---

## 6. Forms

React Hook Form + `zodResolver`, one pattern reused everywhere:

- Each feature co-locates its Zod schema with its form: `features/checkout/schemas/
  detailsSchema.ts`, `features/admin-catalog/schemas/productSchema.ts`, etc. — the same
  schema also types the adapter's return/payload where the shapes overlap (e.g. product
  create payload vs. product read model may intentionally differ and get separate schemas).
- Shared primitives in `components/form/`: a `FormField` wrapper binding RHF's
  `register`/`Controller` to Shadcn's label/error/description slots, so inline field-level
  errors (§3.10 — required, format, uniqueness) render consistently without each page
  re-wiring `aria-describedby` and error text by hand.
- Submit buttons use RHF's `formState.isSubmitting` for the button-level spinner (§3.7);
  cross-field errors (e.g. password confirm mismatch, category-just-deleted-on-submit)
  surface via `setError` on the relevant field or a form-level banner, never a silent
  toast-only failure for a field the user needs to fix.
- Multi-step checkout (Details → Payment → Review) keeps each step as its own RHF form
  instance; on successful step submit, validated data is written into
  `checkoutDraftStore` (§2) rather than lifting one giant form across three routes.

---

## 7. Cross-Cutting Concerns

| Concern | Approach |
|---|---|
| **Error boundary** | One `AppErrorBoundary` at the router root catches render-time crashes → a distinct "something went wrong" fallback. This is separate from mocked API failures, which are React Query error states rendered as inline banners/toasts per §3.6–3.7 — a crash boundary is not a substitute for handling a fetch error, and vice versa. |
| **Loading / skeleton** | Shadcn `Skeleton` primitives, one variant per repeated shape (`ProductCardSkeleton`, `TableRowSkeleton`, `FormFieldSkeleton`) in `components/feedback/`; driven by React Query's `isLoading`. Button-level actions use `isPending` for inline spinners. No route ever renders blank while loading (§3.7). |
| **Empty / error state pattern (screen 28)** | Two shared components — `EmptyState` (icon + message + optional CTA) and `ErrorBanner` (message + Retry) — in `components/feedback/`, reused by every list/detail screen instead of ad hoc per-page markup, so wording only diverges where the spec says it should (e.g. "no data" vs. "filters too narrow", §3.7). |
| **Toast layer** | Single provider mounted in `app/providers/ToastProvider.tsx`; a thin `lib/format`-adjacent helper (`lib/toast.ts`) wraps success/info (~4s auto-dismiss) vs. error/warning (~8s/persist-until-dismissed), stacked max 3 (§3.6) — feature code calls the helper, never the raw toast API, so timing rules can't drift per-call-site. |
| **Auth / role gating** | Centralized in `lib/auth/guards.tsx` (§1.3); reads from the two independent session stores; every gated route in `app/routes.tsx` composes a guard rather than checking session state inline in a page component. |
| **Currency (IDR)** | `lib/format/currency.ts` → `formatIDR(amount)` = `Rp 45.000` via `Intl.NumberFormat('id-ID')` with 0 fraction digits; every price/subtotal/tax/total render goes through this — no inline template-string formatting anywhere else (§3.5, A9). |
| **Date / time** | `lib/format/date.ts`, locale `id-ID`: dates render `DD MMM YYYY` (e.g. `22 Jul 2026`), timestamps render `DD MMM YYYY HH:mm` (24-hour clock); every order/date/timestamp render (order history, tracking, admin order detail, dashboard) goes through this — no inline `Date` formatting anywhere else (§3.5). |
| **Responsive / breakpoints** | Tailwind default breakpoints, mobile-first; Catalog/Cart/Checkout explicitly required usable at mobile widths (F-028) — grid/table components collapse to single-column stacked layouts below `sm`/`md`; Shadcn (Radix) primitives are touch- and keyboard-friendly by default. |
| **Accessibility baseline** | Semantic HTML landmarks in layouts; Shadcn/Radix primitives provide focus trap (dialogs), correct `aria-*` on toasts/menus; form errors wired via `aria-describedby` through the shared `FormField`; images require `alt`; a skip-to-content link in `PublicLayout`; color/contrast via the existing Tailwind theme tokens (no ad hoc colors introduced per component). |

---

## 8. Risks & Mitigations

| # | Risk | Mitigation |
|---|---|---|
| R1 | Two independent auth domains plus role sub-gating (Catalog Admin vs. Fulfillment Staff) is easy to get subtly wrong (e.g. a route left ungated, or gated with the wrong role) — a leaked admin route is a meaningful defect class. | All gating logic lives in exactly one place (`lib/auth/guards.tsx`) and is composed from the route table in §1.2, not re-implemented per page; Stage 8 fidelity/QA should specifically walk the §3.2 access-gating table screen by screen. |
| R2 | Order status is "shared mocked state" driving both customer Tracking (polling) and staff Order Detail; without a real backend, an admin's update and the tracking screen's poll cadence could visibly desync or double-apply the auto-timer. | Single source of truth lives in `mocks/data/db.ts`; no persona-side optimistic cache is allowed to diverge from it — Tracking always re-polls the same handler, and Override permanently disables that order's timer at the mock-data layer (A2), not in UI state. |
| R3 | The checkout draft must survive a mid-checkout registration/login detour (D5) — a full route change to `/register`/`/login` and back — without losing entered Details/Payment data. | `checkoutDraftStore` is persisted to `sessionStorage` (not just in-memory Zustand state), and draft rehydration across the detour is called out here explicitly as a required Stage 6/8 test scenario, not an incidental behavior to discover late. |
| R4 | MSW handler/schema shapes are being defined ahead of the formal API Contract stage; a later contract change could ripple through adapters. | The Zod schema + adapter layer is the only place that knows the raw shape — `features/*` UI/hook code depends only on inferred types, so a contract change is a `lib/api`/`features/*/api` + `mocks/handlers` update, never a page-level rewrite. |

---

## 9. NFR Classification

Adapted from `.claude-flow/system/nfr-checklist.md`'s 12 categories for this frontend-only,
fully-mocked (MSW-backed) SPA with no real backend, no real data-at-rest, and no real users
yet. Per the Architecture Review Gate criterion ("all mandatory NFR defined, measurable
targets exist, mitigation plans documented"), every Mandatory row below carries a
measurable target. Addresses architecture-review v1.0 RC-2.

| # | Category | Classification | Rationale / Target |
|---|---|---|---|
| 1 | Availability | Not Applicable | Static SPA + client-side mock backend; no server uptime SLA applies at this stage. |
| 2 | Performance | Recommended | No hard SLA for a demo; route-level code-splitting (customer vs. admin bundle, §1.5) is the concrete improvement made explicit here. |
| 3 | Throughput & Capacity | Not Applicable | No concurrent-load target applies to a mocked, single-tab demo. |
| 4 | Scalability | Not Applicable | Feature-module structure (§3) already leaves room to grow without restructuring; no scalability tier applies at this stage. |
| 5 | Reliability | Recommended | Non-optimistic mutations for Place Order and admin status update (§2.2) prevent duplicate/false-success outcomes (F-015, F-043). |
| 6 | Disaster Recovery | Not Applicable | No real persistence tier exists; `mocks/data/db.ts` is in-memory/session-scoped by design (§5). |
| 7 | Security | Recommended | Two independent auth domains with centralized, ordered guard composition (`RequireStaffAuth` → `RequireStaffRole`, §1.3); default JSX escaping is the XSS baseline (no `dangerouslySetInnerHTML` anywhere in this design). |
| 8 | Observability | Not Applicable | No client-side error/log capture beyond `AppErrorBoundary` — acceptable for a mocked demo with no telemetry backend to send to; recorded explicitly rather than left unaddressed. |
| 9 | Data Integrity & Consistency | **Mandatory** | **Target:** zero divergent order-status reads between Order Tracking and Admin Order Detail — enforced by a single writer (`mocks/data/db.ts`), no persona-side optimistic cache divergence (§2.2, R2). |
| 10 | Maintainability | **Mandatory** | **Target:** a new engineer can add a feature module using only the existing `api/hooks/components/pages/schemas` convention (§3) without modifying shared code — one Zod-schema-per-form (§6), shared generic primitives (`FormField`, skeleton variants). |
| 11 | Deployment & Operations | **Mandatory** | **Target:** static build deployable to Vercel with zero backend provisioning steps; MSW ships as the permanent mocked backend (`public/mockServiceWorker.js` present in the production build, §5). |
| 12 | Compliance & Auditability | Not Applicable | No regulated data class in a mocked demo catalog/cart/order flow. |

### 9.1 Client-state library decision (Zustand)

`STACK-STANDARDS.md` names Vite + React + Shadcn (and the workflow's default additionally
names React Query/Zod/RHF/MSW) but does not name a client-state library — recorded here as
an explicit, citable architecture decision rather than left implicit inside §2:

- **Decision:** use `zustand` (with its `persist` middleware) for the state slices that are
  genuinely client-owned and must survive reload or be read across unrelated subtrees:
  `cartStore`, `customerSessionStore`, `staffSessionStore`, `checkoutDraftStore` (§2).
- **Justification:** these stores are read from many unrelated subtrees (header cart badge,
  route guards, checkout steps) and require persistence middleware
  (`localStorage`/`sessionStorage`) with rehydration on load. Plain Context would need
  either one broad provider (causing wide re-renders on every cart mutation) or several
  hand-split contexts plus a hand-rolled persistence effect per context — strictly more code
  and surface area for bugs than a `zustand` store + its built-in `persist`.
- **Kept separate, not merged:** four independent stores, not one shared "app state" blob —
  customer and staff sessions in particular are never merged into one auth store (§2),
  avoiding the "shared database across bounded contexts" anti-pattern applied to client
  state.
- **Scope boundary:** server-derived data never enters Zustand — it stays in React Query
  (§2's no-duplication rule); Zustand is not a general substitute for the query layer.
- Approved per architecture-review v1.0 §4; this decision sets the precedent for future
  factory projects where `STACK-STANDARDS.md` is silent on client-state.

---

## 10. Gate Readiness

This document is written to be reviewable against an architecture-review gate: every
route in §1.2 traces to a spec screen/route; every cross-cutting rule in
`Frontend-Specification.md` §3 has a named owning mechanism in §2–§7; the service/adapter/
MSW chain in §4–§5 satisfies the workflow's "frontend never depends on real backend"
principle end-to-end.
