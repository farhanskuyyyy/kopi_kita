```yaml
metadata:
  artifact: Architecture Review
  version: 1.1
  owner: software-architect
  status: final
```

# Architecture Review — Coffeeshop E-Catalog (Clickable Frontend)

Project: `ecatalog-coffeeshop`
Workflow: `clickable-frontend` — Stage 4: Architecture Review Gate
Reviewer: Software Architect Agent (`sw-architect-ecatalog-coffe-clickable-fe`)
Subject: `Frontend-Architecture.md` v1.1 (owner: `web-frontend-developer-lead`)

**Review history:** v1.0 of this review (against Architecture v1.0) returned
PASS-WITH-CONDITIONS with two blocking changes (RC-1, RC-2) and three recommended
(RC-3/4/5). Architecture v1.1 applied all five. This v1.1 review re-verifies each and
upgrades the verdict to PASS. Change detail is in the re-verification note at the end of §7
and the updated §8.
References: `Frontend-Specification.md` v1.0, `.claude-flow/system/nfr-checklist.md`,
`ARCHITECTURE-PATTERNS.md`, `STACK-STANDARDS.md`

**Evidence limitation (recorded, not silently passed over):** GitNexus code-graph analysis
is not applicable at this stage — no application source code exists yet (design-only
artifact, Stage 3 output). In addition, the GitNexus MCP server is unavailable this
session. This review is therefore based entirely on static document analysis against the
specification and factory standards, not on any code-graph evidence. This limitation does
not block the gate (there is no code to graph), but is recorded per the Gate Status
Reporting rule rather than omitted.

---

## 1. Summary

`Frontend-Architecture.md` is a well-structured, disciplined design that maps cleanly onto
the 28-screen specification and enforces a genuinely one-directional
UI → React Query → adapter → httpClient → MSW → in-memory db layering. State management is
deliberately partitioned (server cache vs. persisted client state vs. URL vs. ephemeral UI)
with an explicit no-duplication rule, which directly defuses the "state duplication between
server and client" anti-pattern called out in `ARCHITECTURE-PATTERNS.md`. The document also
proactively names and mitigates its two highest-risk areas (dual auth/role gating leak risk;
order-status desync between customer tracking and staff override) rather than leaving them
implicit.

Verdict: **PASS-WITH-CONDITIONS**. Two required changes (guard-composition ambiguity on
admin role-scoped routes; missing explicit NFR classification section) must be closed
before Stage 6 implementation begins. Three additional items are recommended/minor and do
not block progression but should be tracked.

---

## 2. Spec Coverage

Cross-checked all 28 screens / 27 routes in `Frontend-Specification.md` §4 against the
route table in `Frontend-Architecture.md` §1.2, route-by-route:

- All 27 routed screens (1–27) have a matching row: route path, shell, and guard all trace
  correctly (e.g., Checkout Payment's `RequireNonEmptyCart + RequireDetailsDraft` matches
  spec §3.4 exactly; admin role sub-trees match spec §3.2's Catalog Admin vs. Fulfillment
  Staff split).
- Screen 28 (shared empty/error component pattern, spec §4 "Screen 28") is correctly
  **not** given a route — architecture §1.2 explicitly notes "27 routes total (screen 28 has
  no route...)" and §7's `EmptyState`/`ErrorBanner` components are the named owning
  mechanism. This matches spec A7's treatment of it as a non-route pattern.
- All 13 cross-cutting rules in spec §3 have a named owning mechanism in architecture §2–§7,
  with two partial exceptions noted below (§7 of this review, minor items).
- All 12 resolved product decisions (D1–D8) and 12 ambiguity resolutions (A1–A12) are
  either directly referenced (D1/A1 category-delete guard, D3/A2/A3 order state machine,
  D5 checkout draft persistence, D7 shared admin login, D8 promo discount) or are
  data-shape/mock-data concerns correctly deferred to Stage 5 (Mock Backend Engineer) per
  §5's explicit scoping note.

**Verdict: Spec coverage is complete.** No screen, route, or cross-cutting rule is
unaccounted for. See §7 below for two minor documentation gaps (not coverage gaps) in how
two spec rules are cross-referenced.

---

## 3. Layering & Boundaries

**Service/adapter/MSW chain (§4–§5):** Sound and strictly one-directional as documented:
`Page → React Query hook → adapter (owns HTTP + Zod parse) → httpClient (base URL + error
normalization) → MSW handler → mocks/data/db.ts`. The stated invariant — "a page component
never calls `fetch` or an adapter directly, and an adapter never imports React Query" — is
the correct boundary for this workflow's core principle ("frontend never depends on real
backend"; swapping MSW for a real API later only touches `mocks/` + `httpClient`'s base
URL). This is the standard adapter/gateway seam and is the simplest valid pattern for this
scale (`ARCHITECTURE-PATTERNS.md` Pattern Selection Rule: prefer simplest valid, proven,
operationally maintainable).

**Zod-typed adapter boundary:** Sound. Every adapter return is validated at runtime
(`ProductSchema.parse(res.data)`), which is the correct place to absorb a future real-API
contract change (R4's mitigation is credible — the blast radius of a shape change is
`lib/api` + `features/*/api` + `mocks/handlers`, never a page rewrite).

**Route guarding / dual auth domains — REQUIRED CHANGE (see §7, RC-1):** The *intent* is
sound — two independent session stores, one centralized `lib/auth/guards.tsx`, guards
composed rather than re-implemented per page. However, the route table's notation is
inconsistent between the customer-checkout guards and the admin-role guards in a way that
creates a real ambiguity, not just a cosmetic one: checkout rows explicitly show composed
guards (`RequireNonEmptyCart + RequireDetailsDraft + RequirePaymentDraft`), but admin
role-sub-tree rows (`/admin/products*`, `/admin/categories*`, `/admin/orders*`) show only
`RequireStaffRole('catalog-admin')` / `RequireStaffRole('fulfillment-staff')` — with no
`RequireStaffAuth +` prefix. §1.3's guard-behavior description for `RequireStaffRole`
only defines behavior for "authenticated staff but wrong role" and is silent on the
unauthenticated case. Read literally, this document does not establish that an
unauthenticated user hitting `/admin/products` directly is caught by session-check at all —
only by role-check, which per its own definition presumes an existing session. This is
exactly the defect class the document's own R1 risk names ("a route left ungated... a
leaked admin route is a meaningful defect class"), and R1's mitigation ("composed from the
route table in §1.2, not re-implemented per page") is undermined if the route table itself
doesn't show the composition. See RC-1.

---

## 4. Dependency Decisions (including Zustand ruling)

**Zustand is not in the workflow's default stack** (`STACK-STANDARDS.md` Web Frontend
Standards names Vite+React+Shadcn only at the standards level; the workflow's stated
default additionally names React Query/Zod/RHF/MSW but no client-state library). This is
correctly an architecture-level decision requiring judgment, not a rubber-stamp.

**Ruling: APPROVE, with a documentation note (not a rejection).**

Rationale:
- The three use cases (cart contents, two independent auth sessions, checkout draft) share
  two properties that make plain Context a materially worse fit: (a) they need
  persistence middleware (`localStorage`/`sessionStorage`) with rehydration on load, and
  (b) they are read from many unrelated subtrees (header badge, guards in the route root,
  checkout steps) — a Context implementation would need either one broad provider causing
  wide re-renders on every cart mutation, or several hand-split contexts plus a hand-rolled
  persistence effect per context, which is more code and more surface area for bugs than a
  vanilla `zustand` store + its built-in `persist` middleware.
- The document does not commit the anti-pattern of one shared blob store: it explicitly
  keeps three/four **separate** stores (`cartStore`, `customerSessionStore`,
  `staffSessionStore`, `checkoutDraftStore`) rather than one global "app state" store, and
  explicitly justifies keeping customer/staff sessions un-merged ("never merged into one
  'auth store'") — this is the correct analog of avoiding "shared database across bounded
  contexts" applied to client state.
- Server-derived data explicitly stays out of Zustand and in React Query, with a
  stated no-duplication rule (§2 table header) — so Zustand is not being used as a general
  substitute for the query layer, only for the narrow class of state that is genuinely
  client-owned and must persist/cross-cut.
- Bundle/complexity cost is low (Zustand is a ~1KB dependency with no provider-tree
  boilerplate), consistent with the Pattern Selection Rule's "avoid unnecessary
  complexity" — the alternative (Context + hand-rolled persistence + memoized selectors)
  would be *more* code to reach the same guarantees, not less.

**Condition on this approval:** Because `STACK-STANDARDS.md` is silent on a client-state
library, this addition should be recorded as an explicit, citable stack decision (e.g. an
ADR or an addendum note in `Frontend-Architecture.md` itself) rather than left as an
implicit choice inside §2 — future projects in this factory will otherwise re-litigate the
same question with no precedent to point to. This is folded into RC-2 below (NFR/decision
documentation gap) rather than raised as a separate blocking item.

---

## 5. NFR Assessment

Adapted from `nfr-checklist.md`'s 12 categories to what is meaningful for a frontend-only,
fully-mocked (MSW-backed) SPA with no real backend, no real data-at-rest, and no real
users yet:

| Category | Classification | Assessment |
|---|---|---|
| Availability | Not Applicable | Static SPA + client-side mock backend; no server uptime SLA applies at this stage. |
| Performance | Recommended — **gap found** | No route-level code-splitting/lazy-loading is mentioned anywhere in §1–§7, despite the app having two largely-disjoint bundles by usage (customer-facing: screens 1–16; admin: screens 17–26, gated by role). A customer session never needs the admin bundle and vice versa. This is a low-cost, standard Vite/React improvement (`React.lazy` + route-level `Suspense`) that is currently unaddressed — not a blocker for a demo, but should be named explicitly rather than silently absent. See RC-3 (recommended, non-blocking). |
| Throughput & Capacity | Not Applicable | No concurrent-load target applies to a mocked, single-tab demo. |
| Scalability | Not Applicable | N/A at this tier; feature-module structure (§3) already leaves room to grow without restructuring, which is the only scalability concern relevant here. |
| Reliability | Recommended — satisfied | Non-optimistic mutations for Place Order and admin status update (§2.2) directly satisfy "duplicate/false-success prevention" for the two mutations where a wrong assumption would be user-visible and confusing (F-015, F-043). |
| Disaster Recovery | Not Applicable | No real persistence tier exists; mocked `db.ts` is in-memory/session-scoped by design (§5). |
| Security | Recommended — largely satisfied | Two independent auth domains, centralized guard composition (module design sound; see RC-1 for the one real gap), no secrets in a mocked app, default JSX escaping is a sufficient XSS baseline (no `dangerouslySetInnerHTML` or raw HTML rendering is described anywhere in the doc). |
| Observability | Not Applicable (recorded, not silently passed) | No client-side error/log capture beyond the crash boundary (`AppErrorBoundary`) is described — acceptable for a mocked demo with no telemetry backend to send to, but this should be stated as N/A explicitly rather than left unaddressed, per Gate Status Reporting discipline. |
| Data Integrity & Consistency | Mandatory — satisfied | §2.2's non-optimistic-update rule and R2's single-source-of-truth mitigation (`mocks/data/db.ts` is the only writer; no persona-side cache is allowed to diverge) directly address the order-status shared-state consistency risk this app actually has. |
| Maintainability | Mandatory — satisfied | Feature-based module boundary (§3) with `api/hooks/components/pages/schemas` per feature, one Zod-schema-per-form convention (§6), shared generic form/table primitives (`FormField`, skeleton variants) — this meets the checklist's "can a new engineer understand the service in a day" bar for a project this size. |
| Deployment & Operations | Mandatory — satisfied | Static SPA deployable to Vercel; MSW service worker shipped as the permanent mocked backend in the build (§5) is the correct, explicitly-stated fit for this project's actual deployment target (no real backend, ever, per Feature-List §1). |
| Compliance & Auditability | Not Applicable | No regulated data class in a mocked demo catalog/cart/order flow. |

**Gap: the architecture document itself contains no explicit NFR classification section.**
`nfr-checklist.md`'s Architecture Review Gate criterion is "all mandatory NFR defined,
measurable targets exist, mitigation plans documented" — the table above had to be
constructed *by this review*, not read out of the document. See RC-2.

---

## 6. Anti-Pattern Check

Checked against `ARCHITECTURE-PATTERNS.md`'s Anti-Patterns list (the backend-oriented items
— chatty microservices, N parallel repository implementations, compile-time-only backend
selection — are not applicable to a frontend-only design):

- **Business logic in components:** Not found. Validation lives in Zod schemas, pricing
  math is specified as a pure computation (base + Σ deltas, §3.12/D4) rather than described
  as scattered inline JSX logic, and mutation side-effects (cache invalidation, cart
  clearing) are specified at the hook/mutation layer, not the component layer.
- **Prop-drilling:** Actively avoided — cross-tree reads (cart badge, guards, checkout
  steps) are the explicit justification given for using Zustand instead of prop-threading
  or a single broad Context.
- **Over-abstraction:** Not found — the adapter/hook pattern is applied uniformly and is
  proportionate to 28 screens across ~10 feature modules; no generic layer is introduced
  beyond what's used.
- **State duplication between server and client:** Explicitly and correctly avoided — §2's
  table header states "no overlap, no duplicated source of truth" and the mechanism
  assignment (React Query for all server-derived data; Zustand only for genuinely
  client-owned/persisted state; URL for filter/sort/pagination state) enforces it.
  Catalog/search filters correctly living in the URL rather than a store is the right call
  and avoids a classic duplicate-source-of-truth bug (back/forward button state loss).
- **Shared-order-status desync risk:** Identified by the document itself (R2) with a
  concrete mitigation (single writer in `mocks/data/db.ts`, no optimistic divergence,
  Override permanently disables the timer at the data layer not in UI state). This is the
  correct place to fix it — reviewed and accepted.
- **"Shared database across bounded contexts" (client-state analog):** Not found — the two
  session stores are explicitly kept independent rather than merged, and cart/session/draft
  each get their own store rather than one shared blob.

No anti-patterns from the approved list were found unaddressed, aside from the guard-
composition ambiguity already raised in §3/RC-1, which is a boundary-clarity issue rather
than a listed anti-pattern per se.

---

## 7. Risks & Required Changes

### Required (blocking — must be closed before Stage 6 implementation)

**RC-1 — Admin route-guard composition must be made explicit.**
Update `Frontend-Architecture.md` §1.2's route table so every `/admin/products*`,
`/admin/categories*`, and `/admin/orders*` row shows the composed guard explicitly, e.g.
`RequireStaffAuth + RequireStaffRole('catalog-admin')`, mirroring the notation already used
for the checkout guards. Update §1.3 to state directly that `RequireStaffRole(role)` does
not by itself establish session presence — it must be composed after (or must internally
call) the session check, with the "no session" case redirecting to `/admin/login` exactly
like `RequireStaffAuth`. This closes a real ambiguity that could otherwise produce an
under-guarded admin route (the exact defect class the document's own R1 risk names), and
directly de-risks Stage 8's planned screen-by-screen gating walkthrough.

**RC-2 — Add an explicit NFR classification section.**
Add a short section (or table, as constructed in §5 of this review) to
`Frontend-Architecture.md` explicitly classifying each `nfr-checklist.md` category as
Mandatory / Recommended / Optional / Not Applicable for this project, with a one-line
rationale per item, per the Architecture Review Gate criterion in `nfr-checklist.md`
("all mandatory NFR defined... documented"). This should also be the place the Zustand
stack addition (§4 of this review) is recorded as an explicit, citable decision, since
`STACK-STANDARDS.md` does not name a client-state library and this project sets the
precedent.

### Recommended (non-blocking, should be tracked for Stage 6/8)

**RC-3 — Route-level code-splitting.** Add `React.lazy`/`Suspense` boundaries at least at
the `PublicLayout`/`AccountLayout` vs. `AdminLayout` split, since customer and admin
sessions never need each other's bundle. Low cost, standard Vite/React practice, currently
unaddressed.

**RC-4 (minor, documentation only) — §3.12 (customization pricing, D4) has no named owning
mechanism in the architecture document.** It's implicitly covered (cart line schemas would
need to store the computed unit price at add-time to satisfy "historical order lines keep
their price"), but unlike every other cross-cutting rule in spec §3, it has no explicit
line in architecture §2–§7. Add one sentence, e.g. to §6 (Forms) or §3 (folder structure,
`features/cart/schemas`), naming where the "compute live, freeze at add-time" rule is owned.

**RC-5 (minor, documentation only) — §3.5's date/time format rule has no owning row in
§7's cross-cutting table.** `lib/format/date.ts` exists in the folder structure (§3) but,
unlike currency, isn't named in §7's table. Add a one-line row for consistency; trivial,
does not affect behavior since the file is already planned.

None of RC-3/4/5 individually or together justify a FAIL — they are gaps in documentation
completeness/optimization, not in the architecture's soundness. RC-1 and RC-2 are the
conditions for the PASS.

### Re-verification against Architecture v1.1 (all five items closed)

- **RC-1 — RESOLVED.** §1.2's admin role-scoped rows (screens 19–26) now show the composed
  guard `RequireStaffAuth + RequireStaffRole('catalog-admin' | 'fulfillment-staff')`,
  matching the checkout-guard notation. §1.3 is rewritten to define `RequireStaffRole` as
  authorization-only (checks role, never session presence) and mandates the ordered
  composition `RequireStaffAuth` then `RequireStaffRole` on every role-scoped route, with an
  explicit case table: an unauthenticated hit on any `/admin/*` protected route (incl.
  `/admin/products*`, `/admin/categories*`, `/admin/orders*`) is caught by
  `RequireStaffAuth` and redirected to `/admin/login?returnTo=<path>` before role checking,
  so it never falls through to render. `/admin` (dashboard) correctly stays plain
  `RequireStaffAuth` (any role). The ambiguity — and the R1 leaked-admin-route defect class
  it created — is closed.
- **RC-2 — RESOLVED.** New §9 NFR Classification tags all 12 `nfr-checklist.md` categories
  with a rationale, and the three Mandatory rows (Data Integrity & Consistency,
  Maintainability, Deployment & Operations) each carry a measurable target — satisfying the
  Architecture Review Gate criterion ("all mandatory NFR defined, measurable targets
  exist"). §9.1 records the Zustand client-state decision explicitly (decision,
  justification vs. Context, separate-stores rationale, server-state scope boundary),
  closing the documentation condition on the §4 Zustand approval.
- **RC-3 — RESOLVED.** New §1.5 specifies `React.lazy` + route-level `<Suspense>` splitting
  customer (screens 1–16) from admin (screens 17–26) bundles.
- **RC-4 — RESOLVED.** `features/cart/lib/pricing.ts` is now named (§3 folder tree + note)
  as the owner of D4 additive pricing (base + Σ deltas, computed at add-time and frozen).
- **RC-5 — RESOLVED.** §7's cross-cutting table now has a dedicated Date/time row naming
  `lib/format/date.ts`, mirroring the currency row.

---

## 8. Final Verdict

**PASS**

- Spec coverage: complete (28/28 screens, 27/27 routes, all cross-cutting rules owned).
- Layering (service/adapter/MSW): sound, one-directional, Zod-validated boundary.
- Zustand dependency: **approved**, justified for cart/session/checkout-draft client state
  with persistence + cross-tree-read requirements; documentation condition satisfied by §9.1.
- Anti-patterns: none.
- Blocking conditions from v1.0: **RC-1 RESOLVED**, **RC-2 RESOLVED** (see re-verification
  note above). Recommended items RC-3/4/5 also all resolved. No remaining blockers.
- Cleared for Stage 6 implementation (`web-frontend-developer-lead`). Stage 8 fidelity/QA
  should still walk the §3.2 access-gating table screen by screen per R1 — a standing QA
  recommendation, not an open gate item.
- Evidence limitation (unchanged): GitNexus code-graph evidence is N/A (no source code
  exists yet — design-only) and the GitNexus MCP was unavailable this session — recorded per
  Gate Status Reporting, not silently omitted. Does not affect the PASS; no code to graph at
  Stage 4.
