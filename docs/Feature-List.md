```yaml
metadata:
  artifact: Feature List
  version: 1.0
  owner: technical-product-manager
  status: draft
```

# Feature List — Coffeeshop E-Catalog (Clickable Frontend)

Project: `ecatalog-coffeeshop`
Workflow: `clickable-frontend` — Stage 1: Requirement Discovery
Prepared by: Technical Product Manager Agent (`tpm-ecatalog-coffeeshop-clickable-fe`)

## 1. Overview

This is a fresh, production-like clickable frontend demo for a coffeeshop e-catalog. No
existing prototype is being replicated. Three external apps (creativetool, linkit360-uiux-scoring,
linkit360-ut-persona) were provided as **UX/interaction inspiration only** — none of their
domain content applies; the product surface below is scoped purely from coffeeshop
e-commerce/catalog fundamentals.

The backend is fully mocked via MSW in a later stage (Mock Backend Engineer's scope, not
this agent's). This document defines *what* must exist and behave correctly, not how the
mock or database is implemented.

Four personas are in scope (full detail in `User-Journey-Map.md`):

1. **Guest Customer** — unauthenticated visitor browsing/ordering.
2. **Registered Customer** — has an account; adds order history, favorites, faster reorder.
3. **Catalog Admin** — staff role that owns product/category CRUD (the "admin/staff side" required by scope).
4. **Fulfillment Staff** — staff role that processes incoming orders (status updates only, no catalog edit rights).

## 2. Screen Inventory

| # | Screen Name | Route | Purpose |
|---|---|---|---|
| 1 | Home / Landing | `/` | Hero banner, featured/promoted products, category shortcuts, entry point to browse |
| 2 | Catalog / Menu (by category) | `/menu` and `/menu/:categorySlug` | Browse products, filter by category, price, tags; grid/list view |
| 3 | Search Results | `/search?q=` | Keyword search across products; zero-result state |
| 4 | Product Detail | `/product/:productId` | Full product info, images, price, customization (size/milk/add-ons), availability, add-to-cart |
| 5 | Cart | `/cart` | Line items, quantity edit, remove, subtotal/tax/total, promo code, proceed to checkout |
| 6 | Checkout — Details | `/checkout/details` | Guest/registered contact info, fulfillment method (pickup/dine-in/delivery), address if delivery |
| 7 | Checkout — Payment | `/checkout/payment` | Mocked payment method selection (no real payment processor) |
| 8 | Checkout — Review | `/checkout/review` | Final order review before submission |
| 9 | Order Confirmation | `/order/confirmation/:orderId` | Order number, summary, estimated ready time, next-step links |
| 10 | Order Tracking | `/orders/:orderId/track` | Mocked status progression (received → preparing → ready → completed/picked up) |
| 11 | Login | `/login` | Registered customer & staff/admin shared-pattern login (mocked auth) |
| 12 | Register | `/register` | New customer account creation |
| 13 | Account Home | `/account` | Profile summary, links to orders, favorites, addresses |
| 14 | Order History | `/account/orders` | List of past orders, reorder action, link to tracking |
| 15 | Favorites / Wishlist | `/account/favorites` | Saved products for quick reorder |
| 16 | Store Info | `/store-info` | Hours, location, contact — static/mocked content |
| 17 | Admin Login | `/admin/login` | Separate mocked auth entry for staff roles |
| 18 | Admin Dashboard | `/admin` | Counts (products, categories, open orders), quick links |
| 19 | Admin Product List | `/admin/products` | Table of products, search/filter, availability toggle, create/edit/delete entry points |
| 20 | Admin Product Create | `/admin/products/new` | Create product form |
| 21 | Admin Product Edit | `/admin/products/:productId/edit` | Edit product form, delete action |
| 22 | Admin Category List | `/admin/categories` | Table of categories, create/edit/delete entry points |
| 23 | Admin Category Create | `/admin/categories/new` | Create category form |
| 24 | Admin Category Edit | `/admin/categories/:categoryId/edit` | Edit category form, delete action (guarded if products still assigned) |
| 25 | Admin Order List | `/admin/orders` | Incoming orders queue for fulfillment staff |
| 26 | Admin Order Detail | `/admin/orders/:orderId` | Order line items, customer info, status update control |
| 27 | Not Found / Error | `/404` | Generic not-found page for invalid routes/IDs |
| 28 | Empty / Error States | (in-page, no dedicated route) | Empty cart, empty search, empty order history, mocked API failure toast |

## 3. Feature Catalog

CRUD legend: **C**reate, **R**ead, **U**pdate, **D**elete. Priority: P0 = must-have for
demo to be considered complete, P1 = expected in a production-like demo, P2 = stretch/nice-to-have.

### 3.1 Customer-Facing — Browsing & Discovery

| ID | Feature | User(s) | CRUD | Primary Screen | Priority | Acceptance Note |
|---|---|---|---|---|---|---|
| F-001 | Browse products by category | Guest, Registered | R | Catalog (`/menu/:categorySlug`) | P0 | Selecting a category filters the grid; category with zero products shows an empty state, not a blank screen |
| F-002 | View product detail | Guest, Registered | R | Product Detail | P0 | Shows name, price, description, image, availability flag, and customization options if applicable |
| F-003 | Keyword search | Guest, Registered | R | Search Results | P0 | Debounced input; zero-result state has a clear message + suggestion to browse categories |
| F-004 | Filter by price/tag/availability | Guest, Registered | R | Catalog | P1 | Filters combine with category selection (AND logic) |
| F-005 | Sort (price asc/desc, popularity) | Guest, Registered | R | Catalog | P2 | Sort persists while filters are active |
| F-023 | View store info/hours/location | Guest, Registered | R | Store Info | P2 | Static mocked content; not tied to a CRUD backend |

### 3.2 Customer-Facing — Cart & Checkout

| ID | Feature | User(s) | CRUD | Primary Screen | Priority | Acceptance Note |
|---|---|---|---|---|---|---|
| F-006 | Add product to cart | Guest, Registered | C (cart item) | Product Detail / Catalog | P0 | Out-of-stock product cannot be added; button is disabled with explanatory label |
| F-027 | Customize item (size, milk type, add-ons) before adding to cart | Guest, Registered | C (cart item variant) | Product Detail | P1 | Customization is coffeeshop-specific and required for realism; each variant priced independently |
| F-007 | Update cart item quantity | Guest, Registered | U | Cart | P0 | Quantity cannot go below 1 via stepper; 0 triggers remove-confirmation instead |
| F-008 | Remove cart item | Guest, Registered | D | Cart | P0 | Removing the last item shows the empty-cart state, not an error |
| F-009 | View cart summary (subtotal/tax/total) | Guest, Registered | R | Cart | P0 | Tax is a mocked flat/percentage calculation, clearly labeled as such |
| F-010 | Cart persists across page reloads (session) | Guest, Registered | — | Cart (cross-cutting) | P1 | Backed by mocked local persistence (e.g., localStorage), not a real backend session |
| F-026 | Apply promo code | Guest, Registered | R (validate) | Cart | P2 | Invalid code shows inline error; does not block continuing to checkout |
| F-011 | Guest checkout — contact & fulfillment details | Guest | C (order draft) | Checkout — Details | P0 | Guest checkout must not require login; required fields validated before proceeding |
| F-012 | Choose fulfillment method (pickup/dine-in/delivery) | Guest, Registered | U (order draft) | Checkout — Details | P1 | Delivery method reveals an address sub-form; pickup/dine-in do not |
| F-013 | Select mocked payment method | Guest, Registered | U (order draft) | Checkout — Payment | P0 | No real payment gateway; clearly labeled "demo payment," always mock-succeeds unless a test failure state is deliberately triggered |
| F-014 | Review order before submission | Guest, Registered | R | Checkout — Review | P0 | Shows full line items, fulfillment method, and total; "Edit" links return to the relevant step without losing entered data |
| F-015 | Place order | Guest, Registered | C (order) | Checkout — Review | P0 | On submit, cart is cleared and an order ID is generated by the mock backend |
| F-016 | Order confirmation | Guest, Registered | R | Order Confirmation | P0 | Displays order number, estimated ready time, and a link to tracking |
| F-017 | Order tracking (status progression) | Guest, Registered | R | Order Tracking | P1 | Status is mocked but must be able to change (e.g., via admin action or timed simulation) and reflect on this screen |
| F-024 | Empty-cart guard on checkout entry | Guest, Registered | — | Checkout (cross-cutting) | P1 | Navigating directly to any checkout step with an empty cart redirects to Cart with a message, never a broken/blank form |
| F-025 | Out-of-stock handling mid-flow | Guest, Registered | R | Cart / Checkout | P1 | If an item becomes unavailable after being added, cart flags it and blocks checkout until resolved (remove or replace) |

### 3.3 Customer Account

| ID | Feature | User(s) | CRUD | Primary Screen | Priority | Acceptance Note |
|---|---|---|---|---|---|---|
| F-018 | Register account | Guest → Registered | C (user) | Register | P1 | Mocked auth; duplicate email shows inline validation error |
| F-019 | Login | Registered | R (auth) | Login | P1 | Invalid credentials show inline error, not a silent failure |
| F-020 | View order history | Registered | R | Order History | P1 | Empty state for a new account with no orders |
| F-021 | Reorder from history | Registered | C (cart from past order) | Order History | P2 | Adds all items from a past order to the current cart; flags any item no longer available |
| F-022 | Save/remove favorite product | Registered | C/D | Product Detail, Favorites | P2 | Favoriting requires login; guest is prompted to log in/register |

### 3.4 Admin/Staff — Catalog Management (Catalog Admin persona)

| ID | Feature | User(s) | CRUD | Primary Screen | Priority | Acceptance Note |
|---|---|---|---|---|---|---|
| F-029 | Admin login | Catalog Admin, Fulfillment Staff | R (auth) | Admin Login | P0 | Mocked role-based auth; wrong role is redirected with an access-denied message, not a crash |
| F-030 | Admin dashboard overview | Catalog Admin, Fulfillment Staff | R | Admin Dashboard | P1 | Shows counts for products, categories, and open orders |
| F-031 | List/search/filter products | Catalog Admin | R | Admin Product List | P0 | Table supports search by name and filter by category/availability |
| F-032 | Create product | Catalog Admin | C | Admin Product Create | P0 | Requires name, category, price (>0), description; image optional |
| F-033 | Edit product | Catalog Admin | U | Admin Product Edit | P0 | Pre-fills existing values; validation matches create |
| F-034 | Delete product | Catalog Admin | D | Admin Product Edit / List | P0 | Confirmation dialog required; soft-delete vs hard-delete decision is an open question (see §5) |
| F-035 | Toggle product availability (in/out of stock) | Catalog Admin | U | Admin Product List | P1 | Reflects immediately on customer-facing catalog (mocked shared state) |
| F-044 | Upload/replace product image | Catalog Admin | C/U | Admin Product Create/Edit | P2 | Mocked upload (e.g., local file → data URL); no real object storage |
| F-036 | List categories | Catalog Admin | R | Admin Category List | P0 | Shows product count per category |
| F-037 | Create category | Catalog Admin | C | Admin Category Create | P0 | Name required and unique (case-insensitive) |
| F-038 | Edit category | Catalog Admin | U | Admin Category Edit | P0 | Renaming updates display everywhere it's referenced |
| F-039 | Delete category | Catalog Admin | D | Admin Category Edit / List | P0 | Must be guarded: deleting a category with assigned products requires reassignment or explicit force-delete confirmation |
| F-040 | Reorder categories/products (display order) | Catalog Admin | U | Admin Category List / Product List | P2 | Drag-and-drop or up/down controls; affects customer-facing ordering |

### 3.5 Admin/Staff — Order Fulfillment (Fulfillment Staff persona)

| ID | Feature | User(s) | CRUD | Primary Screen | Priority | Acceptance Note |
|---|---|---|---|---|---|---|
| F-041 | View incoming orders queue | Fulfillment Staff | R | Admin Order List | P1 | Sorted by newest/oldest first; filter by status |
| F-042 | View order detail | Fulfillment Staff | R | Admin Order Detail | P1 | Shows line items, customizations, fulfillment method, customer contact |
| F-043 | Update order status | Fulfillment Staff | U | Admin Order Detail | P1 | Status transitions are constrained (received → preparing → ready → completed); cannot skip backward without explicit override |
| F-045 | Admin/staff logout & session | Catalog Admin, Fulfillment Staff | — | Admin (cross-cutting) | P1 | Session expiry redirects to Admin Login, preserving no unsaved form state silently |

### 3.6 Cross-Cutting / Platform

| ID | Feature | User(s) | CRUD | Primary Screen | Priority | Acceptance Note |
|---|---|---|---|---|---|---|
| F-028 | Responsive layout (mobile/tablet/desktop) | All | — | All screens | P0 | Catalog, cart, and checkout must be fully usable on mobile viewport widths |
| F-046 | Mocked API failure/toast handling | All | — | All screens | P1 | Any mocked network failure surfaces a non-blocking toast/banner, not a silent no-op or crash |
| F-047 | 404 / invalid ID handling | All | R | Not Found | P1 | Invalid `productId`/`orderId`/`categorySlug` in the URL renders the 404 screen, not a blank/broken page |

## 4. Identified Gaps, Ambiguities & Edge Cases (must be resolved before Stage 2)

These are flagged per the Stage 1 gate ("BLOCK if a major flow is missing") — none of them
block this document, but each must have an answer before UX Flow/API Contract design:

1. **Product customization data model** — is size/milk/add-on pricing additive (delta from base) or does each variant have its own absolute price? Affects both cart math and the API contract.
2. **Order status source of truth** — is fulfillment-staff status update the only way status changes, or does the demo also need a timed auto-progression (e.g., every N seconds) so a solo demo user can see tracking move without a second admin session open?
3. **Category deletion with assigned products** — reassign-required vs. cascade vs. force-delete-with-warning is undecided; F-039 flags this but a product decision is needed.
4. **Soft vs. hard delete for products** — does a deleted product remain referenceable from historical orders (so order history doesn't break), or is delete blocked if the product appears in any past order?
5. **Guest vs. registered order history** — guest orders have no account to attach history to; is order tracking via a direct link/order-number lookup the only retrieval path for guests? (Assumed yes — see Assumptions.)
6. **Multi-role login** — do Catalog Admin and Fulfillment Staff share one admin login screen with role-based redirect, or two distinct admin entry points? (Assumed: one shared login, role-based dashboard — see Assumptions.)
7. **Promo code scope** — is there any actual discount logic, or is F-026 purely cosmetic (accepts any code, shows a mocked discount)? Marked P2 pending answer.
8. **Delivery address validation depth** — full structured address form vs. a single free-text field for the mocked demo. Affects Checkout — Details complexity.
9. **Missing screen candidate — Cart mini-preview/drawer**: not listed as a standalone screen but strongly recommended as a persistent header element across all customer screens; flagged here so Stage 2 (UX Flow) explicitly decides in/out.
10. **Missing screen candidate — Admin order status history/audit log**: not included above; if fulfillment staff needs to see *who* changed status *when*, this is an additional P2 screen not yet scoped.

## 5. Assumptions Made (absent a stated answer)

* Guest checkout is supported end-to-end (no forced registration) — treated as a hard requirement since e-commerce catalogs without guest checkout have materially worse conversion, and this is the more feature-complete assumption for a "production-like demo."
* Admin and Fulfillment Staff share a single `/admin/login` entry point, with role read from the mocked auth response driving which nav items/screens are visible.
* Order tracking for guests is accessible via the confirmation-page link (bookmarkable URL with `orderId`), without requiring login.
* Tax and promo-code logic are intentionally simplified/mocked, not a full tax-jurisdiction engine.
* "Delivery" is in scope as a fulfillment option alongside pickup/dine-in, since coffeeshop e-catalogs commonly support all three; this can be descoped to pickup/dine-in only if the business wants a smaller demo.

## 6. Out of Scope (this workflow)

* Real payment processing / PCI compliance.
* Real backend/database design (owned by Mock Backend Engineer stage; this agent does not design infrastructure or database per persona constraints).
* Real authentication/identity provider integration.
* Multi-store/multi-location catalog management (single storefront assumed).
* Loyalty points/rewards program (not mentioned in scope; flag as future enhancement only).

## 7. Success Metrics (KPIs) for the Demo

| KPI | Definition | Target |
|---|---|---|
| Screen coverage | % of screens in the Screen Inventory (§2) actually implemented and clickable | 100% of P0, ≥90% of P0+P1 |
| End-to-end checkout success | % of scripted demo walkthroughs (browse → cart → checkout → confirmation) completed without a dead end or error | 100% |
| Admin CRUD completeness | % of product/category Create, Read, Update, Delete operations functioning against the mocked backend | 100% |
| Order status reflection | Time/steps for a fulfillment-staff status change to be visible on the customer tracking screen | Reflected without page-breaking delay (mocked, near-immediate) |
| Critical UX defects at Prototype Fidelity Loop (Stage 8) | Count of blocking visual/interaction defects found | 0 blocking defects |
| Mocked API contract coverage | % of endpoints defined in the API Contract stage actually exercised by the frontend | 100% |
| Stakeholder demo sign-off | Reviewer rating of the delivered clickable frontend | ≥ 4 / 5 |
