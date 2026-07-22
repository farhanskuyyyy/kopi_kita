```yaml
metadata:
  artifact: Code Review
  version: 1.0
  owner: code-reviewer
  status: final
```

# Code Review — Coffeeshop E-Catalog (Clickable Frontend)

Project: `ecatalog-coffeeshop` ("Kopi Kita")
Workflow: `clickable-frontend` — Stage 9: Code Review
Reviewer: Code Reviewer Agent (`code-reviewer-ecatalog-coff-clickable-fe`)
Scope: `app/src` (95 source files, ~6,670 LOC excl. `mocks/`), reviewed against
`docs/Frontend-Architecture.md` v1.1, `STACK-STANDARDS.md` Web Frontend Standards, and
`ARCHITECTURE-PATTERNS.md` anti-patterns.

---

## 1. Summary

- **Overall Quality Score: 9/10**
- **Files Analyzed:** 95 (`.ts`/`.tsx` under `src/`, excluding `mocks/` internals)
- **Issues Found:** 6 (0 High, 2 Medium, 4 Low)
- **Technical Debt Estimate:** ~3 hours
- **`tsc --noEmit`:** **PASS** — zero errors, zero warnings on full run.
- **Architecture compliance:** **Yes** — folder tree, layering, guards, code-splitting,
  and the adapter→httpClient→MSW chain all match Frontend-Architecture.md v1.1 as designed.

This is one of the cleanest clickable-frontend implementations reviewed under this
factory's conventions: no dead code, no `console.log` debris, no unjustified escape
hatches, and a genuinely consistent layering discipline across ~30 feature modules.

---

## 2. Architecture Compliance

| Check | Result | Evidence |
|---|---|---|
| Folder tree matches §3 (`app/`, `layouts/`, `components/{ui,feedback,layout,form}`, `features/*/{api,hooks,components,pages,schemas,store,lib}`, `lib/`, `mocks/`) | **Yes** | `find src -type f` output matches the documented tree exactly, including feature-owned `store/` (cart, auth×2, checkout) and `lib/` (cart pricing). |
| UI never imports `mocks/*` outside bootstrap | **Yes** | `grep -rn "from ['\"].*mocks" features components lib app layouts` → 0 hits. Only `src/main.tsx` imports `./mocks/browser`, exactly as designed and documented inline there. |
| Adapter is the only fetch layer; page components never call `fetch`/adapters directly | **Yes** | Every real `fetch(` call in `src/` outside `mocks/` and `lib/api/httpClient.ts` is `refetch(`/`prefetch(` (React Query API), not a raw network call — verified per-file. |
| Zod parsing at the boundary | **Yes, with 2 low-severity nits** | 11 of 11 `features/*/api/*.ts` files parse every entity-shaped response; the only unparsed responses are (a) primitive `{count:number}`/`{valid:boolean}` shapes in `admin-dashboard` and `checkout.validatePaymentMethod`, and (b) `void`-returning mutations (`logout`, `removeFavorite`) with nothing to validate. See Findings F-1. |
| Route guards centralized, composed not re-implemented | **Yes** | `lib/auth/guards.tsx` is the single source; `RequireStaffAuth` → `RequireStaffRole` ordering matches §1.3's RC-1 fix; `app/routes.tsx` composes rather than inlining checks. |
| Code-splitting (customer vs. admin bundle) | **Yes** | `app/routes.tsx` uses `React.lazy` for every route component with a route-level `<Suspense>` (`withSuspense`), matching §1.5. |
| State split (React Query vs. Zustand vs. URL vs. local) | **Yes** | Cart/session×2/checkout-draft are independent `persist`-backed Zustand stores (never merged); catalog filters use `useSearchParams`; server data stays in React Query. No duplicated source of truth found. |
| React Query key factories, typed, not hand-stringified | **Mostly — 1 Medium finding** | 9 of 11 hook files use a typed key-factory (`productKeys.list(...)`, etc.). `admin-dashboard/hooks/useAdminDashboard.ts` and `store-info/hooks/useStoreInfo.ts` hand-stringify keys (`["admin","dashboard","products"]`, `["store-info"]`), deviating from §2.1's explicit "never hand-stringified at call sites" rule. See Findings F-2. |
| Non-optimistic mutations for Place Order / admin status update | **Yes** | `createOrder` (checkout) and admin order-status mutation wait for the mocked response before touching cache/cart — no optimistic `onMutate` found on either path. |

---

## 3. Code Quality

- **Typing:** effectively `any`-free. Only 2 occurrences of `any` in the entire source
  tree, both in one file (`CustomizationGroupsEditor.tsx:20,101`), both on the same
  `setValue` prop signature. See Findings F-3.
- **`dangerouslySetInnerHTML`:** 0 occurrences — matches the architecture's explicit XSS
  baseline claim (§9, NFR-7).
- **`@ts-ignore` / `@ts-expect-error`:** 0 occurrences.
- **`eslint-disable`:** 1 occurrence (`AppErrorBoundary.tsx:22`), justified — suppresses
  the no-console rule for the one intentional `console.error` in a render-crash boundary.
- **React Query usage:** query keys are consistently factory-based (except F-2); mutations
  correctly use `onSuccess`/`onError` with `toast` + selective `invalidateQueries`, matching
  §2.2's cross-persona invalidation rule (e.g. `useToggleAvailability` invalidates both
  `adminProductKeys` and customer-facing `productKeys`).
- **Form patterns:** RHF + `zodResolver` used uniformly; schemas co-located per feature
  (`schemas/detailsSchema.ts`, `schemas/productSchema.ts`, etc.) exactly per §6. Shared
  `FormField` wraps label/error/`aria-describedby` wiring consistently.
- **`useEffect` usage:** all 4 occurrences found are legitimate (ref-guarded one-time toast
  on error in `HomePage.tsx`; async profile-prefill into a controlled RHF form in
  `CheckoutDetailsPage.tsx`; equivalent patterns in `AdminCategoryEditPage.tsx` and
  `AccountHomePage.tsx`) — no effect-as-event-handler or missing-dependency smells observed.
- **Error handling:** `httpClient.ts` cleanly separates `UnreachableError` (network/fetch
  failure) from typed API errors (`NotFoundError`, `SessionExpiredError`,
  `ForbiddenRoleError`, generic `ApiError`) via a single `mapError`, matching §1.4's
  "loader distinguishes reachability failure from 404, never conflates them" requirement.

---

## 4. Maintainability

- **Naming/consistency:** uniform `xxxApi.ts` / `useXxx.ts` / `xxx.schemas.ts` naming
  across all 12 feature modules; a new engineer can find any layer by convention alone,
  satisfying §9's Mandatory Maintainability NFR target.
- **UI kit reuse:** all list/detail screens reuse `EmptyState`, `ErrorBanner`, and the
  `*Skeleton` variants from `components/feedback/` rather than ad hoc per-page markup —
  confirmed across catalog, account, and both admin feature modules.
- **Componentization:** cart pricing (`features/cart/lib/pricing.ts`) is a clean, pure,
  independently-testable module (`computeUnitPrice`, `summarizeSelection`) — no business
  logic leaked into `CartLineItem.tsx` or `CartPage.tsx`.
- **Minor duplication:** `AdminProductListPage.tsx` (198 LOC) and
  `AdminCategoryListPage.tsx` (142 LOC) independently re-implement the same
  filter-bar + table + delete-confirmation-dialog shape. Not a correctness issue, but a
  `ConfirmDeleteDialog` or list-page shell abstraction would remove ~40 lines of
  near-identical JSX per page and is the most valuable refactor opportunity here (see
  Refactoring Opportunities).
- **Testability:** adapters/hooks/schemas are cleanly separated, so unit tests could target
  `lib/`/`schemas/`/pure `lib/cart/pricing.ts` functions without React — no test suite
  exists in the repo today (no `.test.ts`/`.spec.ts` files found), which is a gap but is
  out of this review's stated scope (no test-strategy gate was requested here — flag as
  **NOT EVALUATED** for any test-coverage gate elsewhere in the pipeline).

---

## 5. Risks

- **R1 (Low):** The two hand-stringified query keys (F-2) are currently harmless (no
  competing key ever collides), but if a future feature introduces a real `["admin",
  "dashboard", ...]` or `["store-info", ...]` key elsewhere, silent cache collisions become
  possible because these two are invisible to the rest of the codebase's key factories.
- **R2 (Low):** `CustomizationGroupsEditor`'s `any`-typed `setValue` (F-3) means a future
  edit that passes the wrong value type for `customizationGroups.${number}.type` vs.
  `.required` will not be caught by `tsc`, contradicting the project's otherwise-clean
  typing bar.
- **R3 (Informational):** No test suite exists in this repository at any layer (unit,
  integration, or e2e). This is a real gap for a project of this size, but it is a
  pre-existing condition across all reviewed files, not something introduced by this
  change — surfacing it here so it is not silently absorbed into a PASS verdict for a
  "Test Coverage" gate elsewhere in the pipeline (that gate should be reported
  **NOT EVALUATED**, not PASS, if no test-execution evidence exists).

---

## 6. Findings

| # | Severity | File:Line | Finding | Suggested Fix |
|---|---|---|---|---|
| F-1 | Low | `features/admin-dashboard/api/adminDashboardApi.ts:1-12`, `features/checkout/api/checkoutApi.ts:19-22` | Primitive-shaped responses (`{count:number}`, `{valid:boolean}`) are trusted via the `httpClient<T>` generic without a Zod `.parse()`, unlike every other adapter in the codebase. | Add a one-line `z.object({ count: z.number() }).parse(data)` (and equivalent for `valid`) for full consistency with §4's "runtime-validates the mock payload shape" rule — low risk today since shapes are trivial, but cheap to close. |
| F-2 | Medium | `features/admin-dashboard/hooks/useAdminDashboard.ts:6,10,14`, `features/store-info/hooks/useStoreInfo.ts:5` | Query keys are hand-stringified (`["admin","dashboard","products"]`, `["store-info"]`) instead of going through a typed key factory, contradicting Frontend-Architecture.md §2.1's explicit rule that keys are "never hand-stringified at call sites." | Introduce `adminDashboardKeys` and `storeInfoKeys` factories colocated with these hooks, matching the pattern already used by all 9 other feature modules. |
| F-3 | Low | `features/admin-catalog/components/CustomizationGroupsEditor.tsx:20,101` | `setValue` prop typed as `(name: ..., value: any) => void` — the only 2 `any` occurrences in the entire source tree. | Narrow to a union matching the two call sites, e.g. `(name: \`customizationGroups.${number}.type\`, value: "single" | "multi") => void) & ((name: \`customizationGroups.${number}.required\`, value: boolean) => void)`, or simpler: split into two distinct callback props (`onTypeChange`, `onRequiredChange`) each strongly typed. |
| F-4 | Low | `features/admin-catalog/pages/AdminProductListPage.tsx` (198 LOC) vs. `features/admin-catalog/pages/AdminCategoryListPage.tsx` (142 LOC) | Duplicated filter-bar/table/delete-dialog shape across both admin list pages (near-identical `deleteTarget` state + `Dialog` markup + `useState` filters). | Extract a shared `ConfirmDeleteDialog` component (and optionally a generic `AdminListPageShell`) into `components/` or an `admin-catalog`-shared location to remove ~40 duplicated lines per page. |
| F-5 | Informational | Repo-wide | No unit/integration/e2e test files (`*.test.ts`, `*.spec.ts`) exist anywhere in `src/`. | Not blocking for this review's scope, but any downstream gate claiming "Test Coverage: PASS" without evidence should instead read **NOT EVALUATED** per the Gate Status Reporting rule — flagging here so it surfaces upstream. |
| F-6 | Informational | `features/orders/pages/OrderTrackingPage.tsx` | Manual "Refresh status" button (`onClick={() => orderQuery.refetch()}`) sits alongside the documented `refetchInterval` short-poll (§2.2) — functionally harmless (React Query dedupes), but slightly redundant UI given polling is already active while non-terminal. | No action required; note only in case a future reviewer wonders why both exist. |

No High-severity or correctness-blocking findings were identified.

---

## 7. Verdict

**PASS-WITH-NITS**

Rationale: `tsc --noEmit` is clean, architecture compliance is fully verified against
Frontend-Architecture.md v1.1 (folder tree, layering, guards, code-splitting, state split,
adapter/Zod boundary), and there are zero High-severity findings, zero
`dangerouslySetInnerHTML`, zero `@ts-ignore`, and only 2 stray `any`s in the whole tree.
The 2 Medium/Low findings (F-2 hand-stringified keys, F-3 `any` in one prop signature) are
small, isolated, and do not block merge — they are recommended follow-ups, not release
blockers. F-5 (no test suite) is surfaced as a pipeline-level gate concern, not a code
defect, and should be reported as **NOT EVALUATED** wherever a Test Coverage gate is
claimed for this release, per the factory's Gate Status Reporting rule.
