```yaml
metadata:
  artifact: User Journey Map
  version: 1.0
  owner: technical-product-manager
  status: draft
```

# User Journey Map — Coffeeshop E-Catalog (Clickable Frontend)

Project: `ecatalog-coffeeshop`
Workflow: `clickable-frontend` — Stage 1: Requirement Discovery
Prepared by: Technical Product Manager Agent (`tpm-ecatalog-coffeeshop-clickable-fe`)
Companion document: `Feature-List.md` (feature IDs referenced below as `F-xxx`)

## 1. Personas

### 1.1 Guest Customer
- **Goal:** Order coffee/food quickly without friction, ideally without creating an account.
- **Context:** Mostly mobile, time-pressured (e.g., ordering ahead before arriving), first-time or occasional visitor.
- **Technical proficiency:** Low to medium — expects a standard e-commerce pattern (browse → cart → checkout).
- **Primary risk:** Any forced-login wall or confusing checkout step causes abandonment.

### 1.2 Registered Customer
- **Goal:** Faster repeat ordering (reorder favorites), track order status, view history.
- **Context:** Regular/loyal visitor, desktop or mobile, values convenience over discovery.
- **Technical proficiency:** Medium — comfortable with accounts, saved preferences.
- **Primary risk:** Losing saved data (favorites, address) or a reorder that silently fails on unavailable items.

### 1.3 Catalog Admin
- **Goal:** Keep the product catalog accurate — add seasonal items, retire discontinued ones, fix pricing/category errors quickly.
- **Context:** Desktop-first, back-office tool, used in short focused sessions, not customer-facing polish but must be reliable and unambiguous.
- **Technical proficiency:** Medium-high — comfortable with admin/CMS-style tables and forms.
- **Primary risk:** Deleting a category/product that's still referenced elsewhere without warning; unclear validation causing bad data (negative price, duplicate category).

### 1.4 Fulfillment Staff
- **Goal:** See new orders the moment they arrive and move them through prep states without confusion, ideally on a shared counter device.
- **Context:** Fast-paced, possibly tablet at the counter, glanceable UI needed.
- **Technical proficiency:** Low-medium — needs a simple, low-click status-update flow, not full catalog access.
- **Primary risk:** Missing a new order, or accidentally reverting a status and losing track of real prep state.

---

## 2. Journey: Guest Customer — Browse to Order Confirmation

**Entry point:** Home (`/`), typically via direct link, QR code at the counter, or search engine.

| Step | Action | Screen(s) | Decision Point | Related Feature(s) |
|---|---|---|---|---|
| 1 | Lands on Home, sees featured items/categories | `/` | Browse by category vs. search directly | F-001, F-003 |
| 2 | Browses category (e.g., "Hot Coffee") | `/menu/:categorySlug` | Apply filter/sort, or open a product | F-001, F-004, F-005 |
| 3 | Opens a product | `/product/:productId` | Customize (size/milk/add-ons) before adding | F-002, F-027 |
| 4 | Adds item to cart | (stays on Product Detail, cart badge updates) | Continue shopping vs. go to cart | F-006, F-027 |
| 5 | Repeats steps 2–4 for additional items (optional) | Catalog / Product Detail | — | F-001–F-006 |
| 6 | Opens Cart | `/cart` | Adjust quantity, remove item, apply promo, or proceed | F-007, F-008, F-009, F-010, F-026 |
| 7 | Proceeds to Checkout — Details | `/checkout/details` | Choose fulfillment method (pickup/dine-in/delivery); guest fills contact info | F-011, F-012 |
| 8 | Proceeds to Checkout — Payment | `/checkout/payment` | Select mocked payment method | F-013 |
| 9 | Proceeds to Checkout — Review | `/checkout/review` | Confirm, or go back to edit any prior step | F-014 |
| 10 | Places order | (submits from Review) | — | F-015 |
| 11 | Sees Order Confirmation | `/order/confirmation/:orderId` | Follow tracking link, or leave | F-016 |
| 12 | (Optional) Opens Order Tracking | `/orders/:orderId/track` | — | F-017 |

**Error / edge cases along this journey:**
- Step 2: Category has zero products → empty state, not blank grid (F-001).
- Step 3: Product is out of stock → "Add to Cart" disabled with explanation (F-006).
- Step 4: Adding a customized item with no size/milk selected → inline validation blocks add (F-027).
- Step 6: Cart is emptied by removing the last item → empty-cart state with a "Browse menu" CTA, not an error (F-008).
- Step 6: Invalid promo code entered → inline error, does not block proceeding (F-026).
- Step 7 (direct nav edge case): User bookmarks/navigates directly to `/checkout/*` with an empty cart → redirected to Cart with a message (F-024).
- Between steps 6–9: An item in the cart becomes unavailable (mocked stock change) → flagged in Cart/Review, checkout blocked until resolved (F-025).
- Step 9: User uses "Edit" to jump back to Checkout — Details from Review → previously entered data must persist, not reset (F-014).
- Step 10: Mocked API failure on order submission → non-blocking error toast, order not falsely confirmed (F-046).
- Step 11 (direct nav edge case): User navigates to a nonexistent `orderId` → 404 screen, not a broken confirmation page (F-047).

**Open question:** Should the guest be prompted (soft, dismissible) to create an account at Order Confirmation, to convert into a Registered Customer for next time? Not currently a scoped feature — flagged for Stage 2 UX Flow decision.

---

## 3. Journey: Registered Customer — Login, Reorder, and Track

**Entry point:** Login (`/login`), or Home with an existing session.

| Step | Action | Screen(s) | Decision Point | Related Feature(s) |
|---|---|---|---|---|
| 1 | Logs in | `/login` | Invalid credentials → retry | F-019 |
| 2 | Lands on Account Home | `/account` | Go to Order History, Favorites, or straight to Menu | — |
| 3 | Opens Order History | `/account/orders` | Reorder a past order, or view tracking on an active one | F-020, F-017 |
| 4 | Reorders from history | `/account/orders` → Cart | Some items may now be unavailable | F-021, F-025 |
| 5 | Reviews/adjusts the pre-filled cart | `/cart` | Same as Guest journey steps 6–12 from here | F-007–F-017 |
| (alt) | Opens Favorites instead | `/account/favorites` | Add a favorite to cart directly, or remove a favorite | F-022, F-006 |

**Error / edge cases:**
- Step 1: Wrong password → inline error, account not locked after a single attempt (mocked; lockout policy is out of scope for this demo) (F-019).
- Step 3: New account with no past orders → empty-state message with a "Browse menu" CTA, not a blank table (F-020).
- Step 4: One or more reordered items no longer exist/are unavailable → those items are flagged and excluded (or held for user decision) rather than silently dropped (F-021, F-025).
- Step (alt): Favoriting a product while not logged in (from a Guest session) → prompt to log in/register rather than a silent no-op (F-022).

**Registration sub-journey (new user path):**

| Step | Action | Screen(s) | Decision Point | Related Feature(s) |
|---|---|---|---|---|
| 1 | Clicks "Create account" from Login or Checkout | `/register` | Duplicate email → inline error | F-018 |
| 2 | Registers successfully | `/register` → `/account` | — | F-018 |

**Open question:** Does registering mid-checkout (from Checkout — Details) preserve the in-progress cart/order draft and return the user to where they left off? Recommended yes; flagged for Stage 2 to confirm as a hard requirement rather than an assumption.

---

## 4. Journey: Catalog Admin — Product & Category CRUD

**Entry point:** Admin Login (`/admin/login`), separate from the customer-facing site.

### 4.1 Sub-journey: Manage Products

| Step | Action | Screen(s) | Decision Point | Related Feature(s) |
|---|---|---|---|---|
| 1 | Logs in as Catalog Admin | `/admin/login` | Wrong role/credentials → access-denied or inline error | F-029 |
| 2 | Views Admin Dashboard | `/admin` | Navigate to Products or Categories | F-030 |
| 3 | Opens Product List | `/admin/products` | Search/filter, or create new, or edit existing, or toggle availability | F-031, F-035 |
| 4a | Creates a new product | `/admin/products/new` | Validation: name required, category required, price > 0 | F-032 |
| 4b | Edits an existing product | `/admin/products/:id/edit` | Save changes, or delete | F-033, F-034 |
| 5 | Deletes a product | (confirm dialog from List or Edit) | Confirm vs. cancel | F-034 |

**Error / edge cases:**
- Step 4a/4b: Submitting price ≤ 0 or a missing required field → inline validation, form not submitted (F-032, F-033).
- Step 4a/4b: Assigning a product to a category that was just deleted elsewhere (stale dropdown) → category list should refresh or the mismatch should surface clearly, not silently save an orphaned reference.
- Step 5: Deleting a product referenced in existing (mocked) order history → decision needed: block delete, or soft-delete so history stays intact (flagged as open question in Feature-List §5).
- Step 3: Toggling availability off → immediately reflected on the customer-facing catalog (mocked shared state) so Catalog Admin can verify the change took effect without needing a second admin action (F-035).

### 4.2 Sub-journey: Manage Categories

| Step | Action | Screen(s) | Decision Point | Related Feature(s) |
|---|---|---|---|---|
| 1 | Opens Category List | `/admin/categories` | Create new, edit, or delete | F-036 |
| 2a | Creates a category | `/admin/categories/new` | Duplicate name (case-insensitive) → inline error | F-037 |
| 2b | Edits a category (rename) | `/admin/categories/:id/edit` | Save | F-038 |
| 3 | Deletes a category | (confirm dialog) | **If products are still assigned:** must reassign or force-delete with explicit warning, not a silent cascade | F-039 |

**Error / edge cases:**
- Step 2a: Duplicate category name → inline validation error naming the conflict (F-037).
- Step 3: Category has ≥1 assigned product → deletion is blocked or requires an explicit "reassign products to..." step before proceeding; this is the single highest-risk gap called out in Feature-List §5 and must not be left ambiguous going into Stage 2 (F-039).

**Open question:** Does Catalog Admin have any bulk-action capability (bulk availability toggle, bulk category reassignment)? Not currently scoped; treated as P2/out-of-scope-for-demo unless the business specifies otherwise.

---

## 5. Journey: Fulfillment Staff — Process Incoming Orders

**Entry point:** Admin Login (`/admin/login`), same shared entry as Catalog Admin but routed to a narrower role-based view.

| Step | Action | Screen(s) | Decision Point | Related Feature(s) |
|---|---|---|---|---|
| 1 | Logs in as Fulfillment Staff | `/admin/login` | Role-based redirect to Order List, not full catalog admin | F-029 |
| 2 | Views incoming Order List | `/admin/orders` | Filter by status (new/preparing/ready), open an order | F-041 |
| 3 | Opens Order Detail | `/admin/orders/:orderId` | Review line items, customizations, fulfillment method | F-042 |
| 4 | Updates order status | `/admin/orders/:orderId` | Move forward one stage at a time (received → preparing → ready → completed) | F-043 |
| 5 | Logs out / session ends | (any admin screen) | Session expiry mid-task | F-045 |

**Error / edge cases:**
- Step 2: No incoming orders → empty-queue state, not a blank/broken table (mirrors F-020 pattern for admin context).
- Step 4: Attempting to skip a status stage (e.g., received → completed directly) → blocked unless an explicit override control exists; default is sequential-only (F-043).
- Step 4 (cross-persona effect): Status change here must be reflected on the Customer's Order Tracking screen (F-017) — this is the shared-state link between the Fulfillment Staff and Customer journeys and is explicitly called out as an open question in Feature-List §5 (item 2: does this require a timed auto-progression fallback for solo demos, or is a live second session always available?).
- Step 5: Session expires mid status-update → in-progress change should not be lost silently; user is redirected to Admin Login with a clear reason, ideally without discarding an already-submitted status update (F-045).

---

## 6. Cross-Cutting Edge Case Matrix

| Edge Case | Affected Journeys | Required Behavior |
|---|---|---|
| Empty cart on direct checkout nav | Guest, Registered | Redirect to Cart with message (F-024) |
| Empty search results | Guest, Registered | Zero-result state with browse suggestion (F-003) |
| Empty category | Guest, Registered | Empty state, not blank grid (F-001) |
| Empty order history | Registered | Empty state with CTA (F-020) |
| Empty admin order queue | Fulfillment Staff | Empty-queue state (F-041) |
| Product goes out-of-stock while in cart | Guest, Registered | Flagged in cart, blocks checkout until resolved (F-025) |
| Category deletion with assigned products | Catalog Admin | Blocked or explicit reassignment flow (F-039) |
| Invalid/nonexistent ID in URL (`productId`, `orderId`, `categorySlug`) | All | 404 screen (F-047) |
| Mocked API failure | All | Non-blocking toast/banner, no silent failure or crash (F-046) |
| Wrong-role login at `/admin/login` | Catalog Admin, Fulfillment Staff | Access-denied message, role-based redirect, not a crash (F-029) |
| Session expiry mid-task | Registered, Catalog Admin, Fulfillment Staff | Redirect to appropriate login, no silent data loss |

## 7. Open Questions (carried from Feature-List §5, journey-specific framing)

1. Should Order Tracking support a demo-friendly auto-progression of status (timer-based) so a single user can observe the full journey without operating two sessions (Customer + Fulfillment Staff)?
2. Does registering mid-checkout preserve the in-progress order draft?
3. Is there a soft account-creation prompt at Guest Order Confirmation?
4. Does Catalog Admin need bulk actions, or is single-item CRUD sufficient for this demo's scope?
5. Category deletion policy when products are still assigned — reassignment flow vs. hard block vs. cascading force-delete (highest-priority open item; blocks Stage 2 API Contract design for the category endpoints).

These must be answered (by the user/business stakeholder or by an explicit assumption
carried forward) before Stage 2 (UX Flow) proceeds, since several directly affect route
structure and API contract shape.
