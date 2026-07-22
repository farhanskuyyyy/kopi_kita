```yaml
metadata:
  artifact: Frontend Specification
  version: 1.0
  owner: functional-analyst
  status: draft
```

# Frontend Specification — Coffeeshop E-Catalog (Clickable Frontend)

Project: `ecatalog-coffeeshop`
Workflow: `clickable-frontend` — Stage 2: Frontend Specification
Prepared by: Functional Analyst Agent (`functional-analyst-ecatalog-clickable-fe`)
Upstream inputs: `Feature-List.md` (47 features, 28-screen inventory), `User-Journey-Map.md` (4 personas)

This document specifies *behavior* — screen-by-screen inputs, outputs, states, interactions,
and exception flows — for all 28 screens in the Screen Inventory. It does not select
technology or design infrastructure (owned by later stages); it removes ambiguity about
what the frontend must do.

---

## 1. Resolved Product Decisions (given, binding on this spec)

These were decided upstream and are treated as fixed constraints throughout:

| # | Decision |
|---|---|
| D1 | Category delete is **blocked** (hard guard) while any product is still assigned to it — no cascade, no force-delete. |
| D2 | Product delete is **soft delete** — the product remains referenceable from historical orders; it is hidden from the customer catalog and from the default admin list. |
| D3 | Order status uses a **demo timed auto-progression** (received → preparing → ready) **plus manual staff override** at any point. |
| D4 | Customization pricing (size / milk / add-ons) is **additive** — each selected option adds a price delta on top of the product's base price. |
| D5 | Guest checkout is supported end-to-end; **mid-checkout registration preserves the in-progress draft** (cart + entered checkout fields) and returns the user to the step they were on. |
| D6 | Delivery is a fulfillment option alongside pickup/dine-in. |
| D7 | Admin login is a **single shared entry point** (`/admin/login`) with **role-based redirect/gating** (Catalog Admin vs. Fulfillment Staff). |
| D8 | Promo codes apply a **real discount** (percent or fixed amount) computed against a mocked valid-code list — not purely cosmetic. |

## 2. Ambiguities Resolved by This Agent

Items flagged as open in Stage 1 (`Feature-List.md` §4, `User-Journey-Map.md` §7) that were
not covered by the upstream decisions above. Resolved here per persona mandate to "remove
ambiguity"; each is referenced from its screen section.

| # | Ambiguity | Resolution |
|---|---|---|
| A1 | Category-delete guard mechanics when blocked (D1 doesn't say *how* the admin resolves it) | Delete control is disabled with an inline message stating the assigned-product count, plus a link that opens Admin Product List pre-filtered to that category so the admin can reassign products one at a time via Admin Product Edit. No bulk-reassignment UI (F-040 bulk actions are out of scope/P2). |
| A2 | Auto-progression vs. manual override conflict | Once Fulfillment Staff manually changes/overrides an order's status, that order's auto-timer stops permanently (does not resume auto-advancing) — prevents the timer fighting a deliberate staff correction. |
| A3 | Does auto-progression reach "completed" unattended? | No. Auto-progression only carries received → preparing → ready. Ready → completed always requires an explicit staff action (Advance or Override), since "completed" implies a real-world pickup/delivery/dine-in-served confirmation. |
| A4 | Reorder (F-021) when some items are unavailable | Available items are added to the cart; unavailable items are **not** added and are listed in a dismissible notice ("N item(s) were no longer available and were not added: …") shown on redirect to Cart. Nothing is silently dropped without explanation. |
| A5 | Soft prompt to register at Guest Order Confirmation | Included: a dismissible, non-blocking banner ("Create an account to track orders faster next time") shown only to guest (unauthenticated) viewers of Order Confirmation. |
| A6 | Delivery address form depth | Moderately structured: address line 1 (required), address line 2 (optional), city (required), postal code (required, numeric format check). No full address-validation service (out of scope, mocked demo). |
| A7 | Cart mini-preview/drawer (candidate screen, not in the 28) | Not a separate screen/route. Implemented as a persistent header cart badge (item count) with a dropdown mini-cart summary, part of the global navigation cross-cutting rule (§3.7), not counted against the 28-screen gate. |
| A8 | Admin order status audit log (candidate screen, not in the 28) | Not included as a screen. Admin Order Detail (screen 26) shows only a lightweight "last status change" timestamp, not a full audit trail. |
| A9 | Currency / number format | Indonesian Rupiah (Rp), integer amounts, dot as thousands separator (e.g., `Rp 45.000`). Applied globally per §3.5. |
| A10 | Guest order-history retrieval path | Confirmed per Stage 1 assumption: guests retrieve tracking only via the bookmarkable Order Confirmation/Tracking URL (`orderId`) — no guest order list exists. |
| A11 | Cart identity across login | The mocked local-storage cart is device/browser-scoped, not account-scoped. Logging in or registering does not replace or merge a separate "account cart" — the same local cart simply continues to be used, now attached to the authenticated session for checkout pre-fill purposes. |
| A12 | Restoring a soft-deleted product | Included as a light-touch affordance on Admin Product Edit (screen 21) so a concurrently-deleted product isn't a dead end for the editing admin — not a separate screen or workflow. |

## 3. Cross-Cutting Rules (stated once, referenced by screens below)

### 3.1 Authentication & Session Domains
Two independent identity spaces:
- **Customer** (Guest / Registered) — `/login`, `/register`, session covers `/account*`.
- **Staff** (Catalog Admin / Fulfillment Staff) — `/admin/login`, session covers `/admin*` (D7).

### 3.2 Route Access Gating
| Route group | Requirement | Failure behavior |
|---|---|---|
| Public customer routes (`/`, `/menu*`, `/search`, `/product/:id`, `/cart`, `/checkout/*`, `/order/*`, `/orders/:id/track`, `/store-info`, `/login`, `/register`, `/404`) | None | N/A |
| `/account*` | Registered-customer session | Redirect to `/login?returnTo=<path>` |
| `/admin`, and both admin role sub-trees | Any staff session | Redirect to `/admin/login` |
| `/admin/products*`, `/admin/categories*` | Catalog Admin role | Access-denied message + redirect to that user's own default landing (`/admin`) — never a crash |
| `/admin/orders*` | Fulfillment Staff role | Access-denied message + redirect to that user's own default landing (`/admin`) — never a crash |

Session expiry (either domain), mid-task: redirect to the domain's login with an explicit
"Session expired, please log in again" message. Any action that had already round-tripped
successfully to the mock backend before expiry was detected is **not** rolled back; only
unsaved in-progress form input is lost (F-045).

### 3.3 Cart Persistence
Cart is persisted via mocked local storage, survives page reload, and is device/browser-
scoped (A11). Cleared only on successful order placement (F-015) or explicit item removal.

### 3.4 Empty-Cart / Draft Guards on Checkout
Direct navigation to any `/checkout/*` step with an empty cart redirects to `/cart` with a
message (F-024). Direct navigation to `/checkout/payment` or `/checkout/review` without a
completed prior step's draft data redirects back to the first incomplete step.

### 3.5 Currency, Number & Date Format
Currency: Indonesian Rupiah, formatted `Rp 45.000` (dot thousands separator, no decimals)
(A9). Dates: `DD MMM YYYY`. Times: 24-hour `HH:mm`. Tax is a mocked flat percentage, always
labeled explicitly (e.g., "Estimated tax (10%)") — never presented as a real jurisdictional
calculation.

### 3.6 Toast / Banner Conventions (F-046)
- **Toast (transient, non-blocking):** success/info auto-dismiss after ~4s; error/warning
  persist until dismissed or ~8s. Stacked, most recent on top, max 3 visible at once.
- **Inline banner (section/page-level failure):** used when a whole section or screen
  fails to load; always paired with a **Retry** action.
- Every mocked network failure surfaces one of the above — never a silent no-op, never an
  unhandled blank page (screen 28 formalizes this).

### 3.7 Loading / Empty / Error State Pattern (applies to every data-driven screen)
- **Loading:** skeleton placeholders for lists/detail content; inline spinner for
  button-level actions (submit, status update). No route ever renders a blank white page
  while loading.
- **Empty:** icon/illustration + one-line message + a primary CTA where one makes sense
  (e.g., "Browse menu"). Distinct wording for "genuinely no data" vs. "filters too narrow."
- **Error:** inline banner with Retry for page/section-level failures; toast for
  background/transient failures (§3.6). Never falls through to a blank page.

### 3.8 Global Navigation / Persistent Elements
Header (customer-facing screens) always shows: logo → Home, category shortcuts, search
box (debounced ~300ms), cart badge with item count and mini-cart dropdown preview (A7),
account/login entry point. Admin screens show a role-scoped side nav (§3.2).

### 3.9 404 / Invalid ID Handling (F-047)
Any dynamic-segment route (`productId`, `orderId`, `categorySlug`, admin `productId` /
`categoryId` / `orderId`) that the mock backend confirms does not exist renders the `/404`
screen (screen 27) — distinct from a *reachability* failure (mocked API down), which
renders an inline error banner with Retry instead (the ID might still be valid).

### 3.10 Validation Conventions
- Required-field errors render inline, adjacent to the field, on blur and on submit —
  never only as a toast.
- Email: standard format check. Phone: 8–15 digits, optional leading `+`. Postal code:
  numeric, 4–10 digits. Price: numeric, `> 0`. Quantity: integer, `>= 1`.
- Duplicate/uniqueness checks (category name, account email) are case-insensitive and
  surfaced inline naming the conflict.

### 3.11 Order Status State Machine (F-043, D3, A2, A3)
States, strictly forward by default: `received → preparing → ready → completed`.
- **Auto-progression:** timer-driven advance through `received → preparing → ready` only
  (A3), on a demo-configurable interval (exact seconds owned by implementation, not this
  spec).
- **Advance (staff, one step):** default action button, moves exactly one step forward;
  disabled at `completed`.
- **Override (staff, explicit control):** opens a confirmation dialog to jump to any
  status directly (correction, or skip). Using Override permanently stops that order's
  auto-timer (A2).
- Customer Order Tracking (screen 10) reflects the current status near-immediately
  (mocked shared state) regardless of whether the change came from the timer or staff.

### 3.12 Customization Pricing (D4)
Displayed unit price = base price + Σ(selected option deltas). Recomputed live on every
selection change (Product Detail) and stored per cart line so historical order lines keep
their price even if the product's base price later changes.

### 3.13 Soft Delete (D2)
Soft-deleted products: excluded from customer catalog/search results, excluded from the
default Admin Product List view (visible via an explicit "show deleted" toggle), but still
resolvable by ID for historical order line display (Order History, Admin Order Detail).

---

## 4. Screen Specifications

### Screen 1 — Home / Landing
- **Route:** `/`
- **Purpose:** Entry point; hero banner, featured/promoted products, category shortcuts.
- **Access:** Public (§3.2).
- **Inputs:** None required.
- **Outputs:** Hero content (mocked/static); featured products (name, image, price per §3.5, promo badge if applicable); category shortcut tiles (name, link to `/menu/:categorySlug`).
- **Loading:** Skeleton hero block + skeleton featured-product cards.
- **Empty:** If mock returns zero featured products, the "Featured" section is simply omitted (not shown as an empty grid); category shortcuts still render.
- **Error:** Featured-products fetch failure → non-blocking toast + section shows Retry (§3.6). Category-fetch failure (core nav) → inline banner + Retry, since browsing depends on it.
- **Interactions:** Click category tile → `/menu/:categorySlug`; click featured product → `/product/:productId`; use header search → `/search?q=`; cart badge → mini-cart (§3.8).
- **Exceptions:** None dynamic-segment specific.

### Screen 2 — Catalog / Menu (by category)
- **Route:** `/menu` and `/menu/:categorySlug`
- **Purpose:** Browse products; filter/sort (F-001, F-004, F-005).
- **Access:** Public.
- **Inputs:** Path param `categorySlug` (optional). Query: `price_min`, `price_max` (non-negative numbers; if `min > max`, filter resets with an inline note), `tags[]`, `availability` (in-stock-only toggle), `sort` (`price_asc` \| `price_desc` \| `popularity`; invalid value falls back to `popularity`).
- **Validation:** `categorySlug` must match an existing category or → 404 (§3.9). Filters combine with AND logic (F-004); sort persists while filters are active (F-005).
- **Outputs:** Product grid/list (name, image, price, "Out of stock" badge if unavailable), active category label/breadcrumb, applied-filter chips, result count.
- **Loading:** Skeleton grid (e.g., 8 placeholder cards).
- **Empty:** Zero products in category or after filtering → empty state, message distinguishes "category has no products" vs. "no matches for current filters," + "Clear filters" CTA (F-001).
- **Error:** Inline banner + Retry (§3.7); toast per §3.6.
- **Interactions:** Apply filter/sort (refetch, updates query params); click product card → `/product/:productId`.
- **Exceptions:** Invalid/nonexistent `categorySlug` → 404 (F-047).

### Screen 3 — Search Results
- **Route:** `/search?q=`
- **Purpose:** Keyword search across products (F-003).
- **Access:** Public.
- **Inputs:** Query param `q` (string). Header search box debounced ~300ms before navigating/refetching.
- **Validation:** `q` trimmed; needs ≥1 non-whitespace character to execute a search. Missing/empty `q` (e.g., direct nav to `/search`) shows a prompt state, not an error.
- **Outputs:** Result list (same card shape as Catalog), result count, echoed query term.
- **Loading:** Skeleton result list.
- **Empty:** Zero results → "No results for '{q}'" + suggestion to browse categories (F-003).
- **Error:** Inline banner + Retry; toast per §3.6.
- **Interactions:** Click result → `/product/:productId`; retype query re-triggers debounced search.
- **Exceptions:** Missing `q` → prompt/empty state, not an error.

### Screen 4 — Product Detail
- **Route:** `/product/:productId`
- **Purpose:** Full product info, customization, add-to-cart (F-002, F-006, F-027).
- **Access:** Public.
- **Inputs:** Path param `productId`. Customization: size (single-select, required if the product defines a size group), milk type (single-select, required if defined), add-ons (multi-select, optional), quantity stepper (integer ≥ 1, default 1).
- **Validation:** Add-to-Cart is blocked, with inline validation on the unselected group, until every *required* customization group has a selection (F-027 edge case). Quantity must be a positive integer.
- **Outputs:** Name, image gallery, description, base price, live computed price preview (base + selected deltas, §3.12), availability flag.
- **Loading:** Skeleton image/text blocks.
- **Empty:** N/A — if the product has no customization groups, that section is simply omitted.
- **Error:** Fetch failure → inline banner "Couldn't load this product" + Retry (distinct from 404 — see Exceptions).
- **Interactions:** Select customization (updates price preview live); adjust quantity; Add to Cart (disabled + "Out of stock" label if unavailable, F-006); Favorite toggle (requires login; guest sees login/register prompt, F-022).
- **Exceptions:** Nonexistent `productId` → 404 (F-047, mock backend confirms not-found). Out-of-stock → disabled Add to Cart with explanatory label, customization still viewable. Adding without a required selection → inline validation, item not added.

### Screen 5 — Cart
- **Route:** `/cart`
- **Purpose:** Manage line items, promo, proceed to checkout (F-007–F-010, F-025, F-026).
- **Access:** Public; cart persisted per §3.3.
- **Inputs:** Per-line quantity stepper (integer ≥ 1; decrementing below 1 opens a remove-confirmation dialog rather than silently zeroing, F-007); remove button per line; promo code text field (non-empty required to submit).
- **Validation:** Promo code checked against a mocked valid-code list; real percent/fixed discount applied on match (D8); no match → inline error, does not block checkout (F-026).
- **Outputs:** Line items (name, customization summary, unit price incl. deltas, quantity, line total), subtotal, tax (§3.5), discount line if promo applied, total, per-line "unavailable" flags.
- **Loading:** Skeleton lines while cart hydrates and stock is re-checked.
- **Empty:** No items → "Your cart is empty" + "Browse menu" CTA (F-008); this is a destination state, not a redirect target from elsewhere.
- **Error:** Promo-check or stock-recheck failure → inline error near the control + toast; rest of cart remains usable.
- **Interactions:** Change quantity (recompute totals); remove line (last removal → empty state); apply promo; Proceed to Checkout → `/checkout/details` (blocked with an inline banner "Resolve unavailable items" if any line is flagged out-of-stock, F-025, until removed/replaced).
- **Exceptions:** Item becomes unavailable after being added → flagged inline, Proceed to Checkout disabled until resolved (F-025).

### Screen 6 — Checkout — Details
- **Route:** `/checkout/details`
- **Purpose:** Contact info + fulfillment method (F-011, F-012).
- **Access:** Public; empty-cart guard applies (§3.4).
- **Inputs:** Full name (required), email (required, format), phone (required, format §3.10), fulfillment method (`pickup` \| `dine-in` \| `delivery`, required, default `pickup`). If `delivery` selected: address line 1 (required), address line 2 (optional), city (required), postal code (required, numeric §3.10) (A6).
- **Outputs:** Pre-filled fields if registered customer (from mocked profile); order draft summary sidebar carried across all checkout steps.
- **Loading:** Skeleton on pre-filled fields while fetching registered-customer profile.
- **Empty:** N/A (form screen).
- **Error:** Profile pre-fill failure → toast, fields simply start blank (non-blocking). Mocked validation-service failure → falls back to client-side validation only.
- **Interactions:** Selecting `delivery` reveals the address sub-form (F-012); Continue → validates required fields, on success advances to `/checkout/payment`, retaining entered data in the order draft; "Create account" mid-checkout → inline register; on success, returns to this same step with the draft intact (D5).
- **Exceptions:** Empty-cart guard (§3.4); inline field-level validation errors, never only a toast; navigating back from Payment preserves this step's data (F-014).

### Screen 7 — Checkout — Payment
- **Route:** `/checkout/payment`
- **Purpose:** Mocked payment method selection (F-013).
- **Access:** Public; empty-cart guard (§3.4); redirected to `/checkout/details` if Details draft is missing/incomplete.
- **Inputs:** Payment method (required single-select among mocked demo options, e.g., "Demo Credit Card," "Demo Cash on Pickup," "Demo E-Wallet"). Any cosmetic masked-card fields accept lenient input (no real card validation, clearly labeled "Demo Payment — no real charge will occur").
- **Outputs:** Order draft summary sidebar carried over from Details.
- **Loading:** N/A (static options).
- **Empty:** N/A.
- **Error:** If the deliberately-triggerable mock-failure option (F-013 acceptance note) is selected and submitted, a mocked payment-failure toast/banner appears and the flow does **not** advance to Review; user may retry.
- **Interactions:** Select method; Continue → `/checkout/review`; Back → `/checkout/details` (data preserved).
- **Exceptions:** Empty-cart guard; incomplete-Details guard; mocked payment failure path above.

### Screen 8 — Checkout — Review
- **Route:** `/checkout/review`
- **Purpose:** Final review before submission (F-014, F-015).
- **Access:** Public; empty-cart guard; redirected to the first incomplete step if Details/Payment draft is missing.
- **Inputs:** "Place Order" action (no other required input).
- **Outputs:** Full line items with customizations, fulfillment method + address (if delivery), payment method, subtotal/tax/discount/total, "Edit" links per section (Details, Payment, Items → Cart).
- **Loading:** Skeleton while assembling the summary from draft + cart state.
- **Empty:** N/A (guarded upstream).
- **Error:** Mocked submission failure on Place Order → non-blocking error toast/banner; stays on Review; order is **not** falsely confirmed; cart is **not** cleared; user may retry (F-015, F-046).
- **Interactions:** Edit → returns to the relevant step with data intact (F-014); Place Order → re-checks stock, then submits; on success clears cart, generates an order ID, navigates to `/order/confirmation/:orderId`.
- **Exceptions:** A cart item becomes unavailable while sitting on Review → submission is blocked, item flagged, user routed to Cart to resolve (same as F-025).

### Screen 9 — Order Confirmation
- **Route:** `/order/confirmation/:orderId`
- **Purpose:** Order number, summary, estimated ready time, next steps (F-016).
- **Access:** Public; guest-accessible via bookmarkable URL, no login required (A10).
- **Inputs:** Path param `orderId`.
- **Outputs:** Order number, line-item summary, fulfillment method, estimated ready time (mocked offset by method), link to Order Tracking; for guest/unauthenticated viewers only — a dismissible banner prompting account creation (A5).
- **Loading:** Skeleton while fetching the order by ID.
- **Empty:** N/A.
- **Error:** Fetch/reachability failure → inline banner + Retry (distinct from an unknown ID — see Exceptions).
- **Interactions:** Click tracking link → `/orders/:orderId/track`; dismiss the account-creation banner (persists for the session).
- **Exceptions:** Nonexistent/invalid `orderId` → 404 (F-047), never a broken confirmation page.

### Screen 10 — Order Tracking
- **Route:** `/orders/:orderId/track`
- **Purpose:** Mocked status progression display (F-017).
- **Access:** Public via bookmarkable link (guest) or from Order History (registered).
- **Inputs:** Path param `orderId`.
- **Outputs:** Current status (§3.11) with progress indicator, per-stage timestamps reached, estimated ready time, collapsed order summary.
- **Loading:** Skeleton progress indicator while fetching.
- **Empty:** N/A.
- **Error:** Fetch failure → inline banner + Retry.
- **Interactions:** Auto-refresh/poll to reflect timer or staff-override status changes (§3.11) without full reload; manual "Refresh status" fallback control.
- **Exceptions:** Nonexistent `orderId` → 404 (F-047).

### Screen 11 — Login
- **Route:** `/login`
- **Purpose:** Registered-customer auth (F-019).
- **Access:** Public; already-authenticated customer → redirect to `/account`.
- **Inputs:** Email (required, format), password (required, min length per mocked policy), "remember me" (optional).
- **Outputs:** Link to Register; forgot-password stub (mocked/disabled, out of scope for real logic).
- **Loading:** Button spinner during mocked auth call.
- **Empty:** N/A.
- **Error:** Invalid credentials → inline error "Incorrect email or password," not silent (F-019); no lockout after a single failed attempt (explicitly out of scope). Mocked API unreachable → toast + banner, distinct wording from "wrong credentials."
- **Interactions:** Submit → on success, sets session, redirects to `returnTo` or `/account`; if reached mid-checkout, returns to that checkout step with the draft intact (same rule as Register, D5).
- **Exceptions:** As above.

### Screen 12 — Register
- **Route:** `/register`
- **Purpose:** New customer account creation (F-018).
- **Access:** Public; already-authenticated customer → redirect to `/account`.
- **Inputs:** Name (required), email (required, format, uniqueness checked case-insensitively against mocked user list), password (required, min length), confirm password (must match).
- **Outputs:** N/A beyond form.
- **Loading:** Button spinner during mocked create-account call.
- **Empty:** N/A.
- **Error:** Duplicate email → inline field error "An account with this email already exists" (F-018); password mismatch → inline error; mocked API failure → toast.
- **Interactions:** Submit → on success, auto-login, redirect to `/account`; if initiated mid-checkout, redirect back to the in-progress checkout step with the order draft/cart intact (D5, resolved hard requirement).
- **Exceptions:** As above.

### Screen 13 — Account Home
- **Route:** `/account`
- **Purpose:** Profile summary, links to Orders/Favorites (per §3.2 gating).
- **Access:** Registered-customer session required.
- **Inputs:** Inline profile edit (name/phone) as a minor sub-action; same field validation as Register minus password.
- **Outputs:** Name, email, member-since (mocked), quick links (Order History, Favorites).
- **Loading:** Skeleton profile card.
- **Empty:** N/A.
- **Error:** Fetch failure → inline banner + Retry.
- **Interactions:** Navigate to Order History / Favorites; Logout (clears session, redirects to `/`).
- **Exceptions:** Session expired mid-visit → redirect to `/login` with expiry message (§3.2).

### Screen 14 — Order History
- **Route:** `/account/orders`
- **Purpose:** List past orders, reorder, tracking link (F-020, F-021).
- **Access:** Registered-customer session required.
- **Inputs:** Optional filter by status (all/active/completed).
- **Outputs:** Order rows (order #, date, status, total, item count), Reorder button, Track link on active orders.
- **Loading:** Skeleton rows.
- **Empty:** No past orders → "No orders yet" + "Browse menu" CTA (F-020).
- **Error:** Fetch failure → inline banner + Retry.
- **Interactions:** Reorder → available items added to current cart; unavailable items are **not** added and are listed in a dismissible notice on redirect to `/cart` (A4, F-021/F-025); Track → `/orders/:orderId/track`.
- **Exceptions:** Reordering an order whose items are all now unavailable → cart may end up unchanged, but the notice still explains why — never a silent no-op.

### Screen 15 — Favorites / Wishlist
- **Route:** `/account/favorites`
- **Purpose:** Saved products for quick reorder (F-022).
- **Access:** Registered-customer session required (favoriting itself requires login wherever triggered).
- **Inputs:** Remove-favorite action per item.
- **Outputs:** Grid of favorited products (name, image, price, availability flag).
- **Loading:** Skeleton grid.
- **Empty:** No favorites → "No favorites yet" + "Browse menu" CTA.
- **Error:** Fetch failure → inline banner + Retry.
- **Interactions:** Add to Cart directly (disabled if out-of-stock, same rule as F-006); Remove favorite (immediate, no confirmation — low-risk/reversible).
- **Exceptions:** A favorited product later becomes unavailable/deleted → shown with an "unavailable" badge, add-to-cart disabled, remains listed rather than silently vanishing.

### Screen 16 — Store Info
- **Route:** `/store-info`
- **Purpose:** Hours, location, contact — static/mocked (F-023).
- **Access:** Public.
- **Inputs:** None.
- **Outputs:** Hours table, address, phone, map placeholder.
- **Loading:** Brief skeleton if content is fetched rather than hardcoded.
- **Empty:** N/A — content is always present (static/mocked, not user-generated).
- **Error:** Fetch failure (if applicable) → inline banner + Retry.
- **Interactions:** "Get directions" (external link stub), "Call" (`tel:` link).
- **Exceptions:** None beyond generic fetch failure.

### Screen 17 — Admin Login
- **Route:** `/admin/login`
- **Purpose:** Shared staff auth entry (F-029, D7).
- **Access:** Public; already-authenticated staff → redirect to `/admin`.
- **Inputs:** Username/email (required), password (required).
- **Outputs:** N/A beyond form.
- **Loading:** Button spinner during mocked auth call.
- **Empty:** N/A.
- **Error:** Invalid credentials → inline error, not silent (F-029). Mocked API failure → toast + inline banner.
- **Interactions:** Submit → on success, redirect to `/admin`; subsequent nav is role-scoped (§3.2); reaching a route outside the authenticated role's set (nav or direct URL) → access-denied message + redirect to `/admin`, never a crash (F-029).
- **Exceptions:** As above.

### Screen 18 — Admin Dashboard
- **Route:** `/admin`
- **Purpose:** Counts, quick links (F-030).
- **Access:** Any authenticated staff (§3.2).
- **Inputs:** None.
- **Outputs:** Counts (products, categories, open/incoming orders), quick links scoped by role (Catalog Admin: Products/Categories; Fulfillment Staff: Orders).
- **Loading:** Skeleton count tiles.
- **Empty:** A count of 0 is a valid value ("0"), not an empty state — the dashboard itself is never "empty."
- **Error:** Per-tile fetch failure → "—" placeholder + retry icon on that tile only, non-blocking for the rest.
- **Interactions:** Click a tile → navigates to the respective list (subject to role gating).
- **Exceptions:** Role-gating per §3.2; session expiry → redirect to `/admin/login`.

### Screen 19 — Admin Product List
- **Route:** `/admin/products`
- **Purpose:** Table of products, search/filter, CRUD entry points (F-031, F-035).
- **Access:** Catalog Admin only (§3.2).
- **Inputs:** Search text (name match), category filter, availability filter (in-stock/out-of-stock/all), "show deleted" toggle (default off, §3.13).
- **Outputs:** Rows (name, category, price, availability status, "deleted" badge if shown), row actions (Edit, Delete, Toggle availability).
- **Loading:** Skeleton rows.
- **Empty:** No matches for search/filter → "No products found" + "Clear filters" CTA; zero products at all → "Create your first product" CTA.
- **Error:** Fetch failure → inline banner + Retry.
- **Interactions:** Create → `/admin/products/new`; Edit → `/admin/products/:id/edit`; Delete → confirmation dialog → soft-delete (D2, F-034); Toggle availability → immediate mocked shared-state update, reflected on customer catalog without further action (F-035).
- **Exceptions:** None beyond soft-delete resolution eliminating the historical-order-reference conflict (§3.13).

### Screen 20 — Admin Product Create
- **Route:** `/admin/products/new`
- **Purpose:** Create product form (F-032).
- **Access:** Catalog Admin only.
- **Inputs:** Name (required), category (required, select from active categories), price (required, numeric, `> 0`), description (required), image (optional, mocked upload to data URL, accepted types e.g. jpg/png, soft size limit e.g. 5MB), customization option groups (optional: size/milk/add-ons, each option with its own price delta, D4), availability toggle (default: available).
- **Outputs:** N/A (form).
- **Loading:** Button spinner on submit.
- **Empty:** No categories exist yet → inline message "Create a category first" + link to `/admin/categories/new`; Save disabled until at least one category exists.
- **Error:** Inline validation per field (name, price > 0, description, category); mocked create failure → toast, form data retained for retry.
- **Interactions:** Fill form; dynamically add/remove customization option rows; Save → creates product, redirects to `/admin/products` with success toast; Cancel → back to list (confirmation if fields were touched).
- **Exceptions:** Selected category deleted by another session before submit → inline error at submit time rather than silently saving an orphaned reference (journey edge case).

### Screen 21 — Admin Product Edit
- **Route:** `/admin/products/:productId/edit`
- **Purpose:** Edit product form, delete action (F-033, F-034).
- **Access:** Catalog Admin only.
- **Inputs:** Same fields as Create, pre-filled with existing values; same validation.
- **Outputs:** Pre-filled form; "Last updated" timestamp (mocked).
- **Loading:** Skeleton form fields while fetching existing product.
- **Empty:** N/A.
- **Error:** Same validation as Create; fetch-existing failure → error state with Retry (form withheld until loaded); mocked update failure → toast, edits retained.
- **Interactions:** Edit fields, Save → updates, redirects to list with success toast; Delete → confirmation dialog ("remains referenced in past orders") → soft-delete, redirect with success toast (D2, F-034).
- **Exceptions:** Nonexistent `productId` → 404 (F-047); stale category reference as in Create; product concurrently soft-deleted by another session → conflict banner "This product was deleted" with a Restore option (A12) or return to list — not a dead end.

### Screen 22 — Admin Category List
- **Route:** `/admin/categories`
- **Purpose:** Table of categories, product count, CRUD entry points (F-036).
- **Access:** Catalog Admin only.
- **Inputs:** Optional search by name.
- **Outputs:** Rows (name, product count, actions: Edit, Delete).
- **Loading:** Skeleton rows.
- **Empty:** No categories yet → "Create your first category" CTA.
- **Error:** Fetch failure → inline banner + Retry.
- **Interactions:** Create → `/admin/categories/new`; Edit → `/admin/categories/:id/edit`; Delete → if product count is 0, confirm-and-delete; if `> 0`, Delete is disabled with an inline message stating the count, plus a link to the filtered Admin Product List for reassignment (D1, A1, F-039).
- **Exceptions:** Renaming propagates everywhere referenced (catalog nav, product list, product forms) as mocked shared state.

### Screen 23 — Admin Category Create
- **Route:** `/admin/categories/new`
- **Purpose:** Create category form (F-037).
- **Access:** Catalog Admin only.
- **Inputs:** Name (required, unique case-insensitive).
- **Outputs:** N/A.
- **Loading:** Button spinner on submit.
- **Empty:** N/A.
- **Error:** Duplicate name → inline error naming the conflict, e.g. "A category named '{name}' already exists" (F-037); empty name → required error; mocked create failure → toast.
- **Interactions:** Save → creates, redirects to `/admin/categories` with success toast; Cancel → back to list.
- **Exceptions:** None beyond above.

### Screen 24 — Admin Category Edit
- **Route:** `/admin/categories/:categoryId/edit`
- **Purpose:** Edit category form, guarded delete (F-038, F-039).
- **Access:** Catalog Admin only.
- **Inputs:** Name (pre-filled, same uniqueness check excluding itself).
- **Outputs:** Pre-filled form; product count shown alongside Delete.
- **Loading:** Skeleton while fetching existing category.
- **Empty:** N/A.
- **Error:** Same validation as Create; fetch failure → inline banner + Retry.
- **Interactions:** Save → renames, propagates everywhere referenced, redirect with success toast; Delete → same guard logic as List (D1, A1).
- **Exceptions:** Nonexistent `categoryId` → 404 (F-047).

### Screen 25 — Admin Order List
- **Route:** `/admin/orders`
- **Purpose:** Incoming orders queue (F-041).
- **Access:** Fulfillment Staff only (§3.2).
- **Inputs:** Status filter (all/received/preparing/ready/completed), sort newest/oldest first.
- **Outputs:** Rows (order #, placed time, fulfillment method, status badge, customer name).
- **Loading:** Skeleton rows.
- **Empty:** No incoming orders → "No orders right now" empty-queue state, not a blank/broken table.
- **Error:** Fetch failure → inline banner + Retry.
- **Interactions:** Click row → `/admin/orders/:orderId`; sort/filter refetch. Reflects timed auto-progression/staff overrides live or on next refresh (§3.11).
- **Exceptions:** None beyond generic fetch failure.

### Screen 26 — Admin Order Detail
- **Route:** `/admin/orders/:orderId`
- **Purpose:** Line items, customer info, status control (F-042, F-043).
- **Access:** Fulfillment Staff only.
- **Inputs:** Advance-status action (one step forward, disabled at `completed`); Override-status action (any target, confirmation required) — see §3.11.
- **Outputs:** Order #, placed time, customer name/contact, fulfillment method (+ address if delivery), line items with customizations and per-item price, subtotal/tax/total, current status with progress indicator, last-status-change timestamp (A8 — no full audit log).
- **Loading:** Skeleton while fetching order detail.
- **Empty:** N/A.
- **Error:** Fetch failure → inline banner + Retry; mocked status-update failure → toast, status reverts to last known-good value (not left ambiguous).
- **Interactions:** Advance status; Override status (confirmation dialog, stops that order's auto-timer per A2); status change reflected on customer Order Tracking near-immediately.
- **Exceptions:** Nonexistent `orderId` → 404 (F-047); session expiry mid-update does not discard an update that already succeeded (§3.2, F-045).

### Screen 27 — Not Found / Error
- **Route:** `/404`
- **Purpose:** Generic not-found for invalid routes/IDs (F-047).
- **Access:** Public.
- **Inputs:** None (catch-all).
- **Outputs:** Friendly message; "Back to Home" CTA (or "Back to Admin Dashboard" if reached from a staff-session context).
- **Loading:** N/A (static).
- **Empty:** N/A.
- **Error:** This screen *is* the terminal error/not-found state; it has no further error sub-state.
- **Interactions:** CTA navigation.
- **Exceptions:** Reached via: unmatched route, invalid `productId`, invalid `orderId`, invalid `categorySlug`, invalid admin entity id.

### Screen 28 — Empty / Error States (in-page, no dedicated route)
- **Purpose:** Documents the shared empty/error components reused across screens rather than a standalone route.
- **Applies to:** Empty cart (5), empty search (3), empty order history (14), empty favorites (15), empty admin product/category/order lists (19/22/25), and the global mocked-API-failure toast (F-046).
- **Access:** N/A — inherits the parent screen's access rule.
- **Inputs:** N/A.
- **Outputs:** Empty-state pattern (icon + one-line message + CTA where applicable) and error-state pattern (inline banner + Retry, plus toast for background/transient failures) as defined in §3.6–§3.7.
- **Loading:** N/A — this entry documents the other two states; loading pattern is skeleton-first per §3.7.
- **Interactions:** Retry (re-fetch); CTA navigation (e.g., "Browse menu").
- **Exceptions:** No data-driven screen may render a truly blank page on failure — every such screen resolves to loading, populated, empty, or error, never an unhandled blank state. This is the app-wide enforcement mechanism for F-046/F-047.

---

## 5. Traceability Summary

All 47 features from `Feature-List.md` §3 are covered by the screen specifications above.
All 5 open questions in `User-Journey-Map.md` §7 and all 10 items in `Feature-List.md` §4
are resolved either by the upstream Resolved Product Decisions (§1) or by this agent's
Ambiguity Resolutions (§2).

## 6. Gate Status

Screen coverage: 28 / 28 screens specified (100%). Every data-driven screen has explicit
loading, empty, and error states. Cross-cutting rules (auth/role gating, cart persistence,
currency/format, toast/banner conventions, order-status state machine, soft-delete,
category-delete guard, customization pricing) are each stated once (§3) and referenced by
screen.
