```yaml
metadata:
  artifact: Release Notes
  version: 1.0
  owner: release-manager
  status: final
```

# Release Notes — Kopi Kita (ecatalog-coffeeshop)

## 1. Version

**0.1.0** — initial clickable-frontend release (Ruflo V3 `clickable-frontend` workflow)

Commit: `d304455bebbef4c6311aeb71994f6ae4d57df301` (local repository, `master` branch, no remote)

## 2. Features

- Full customer-facing coffeeshop e-catalog SPA: Home, Menu, Search, Product Detail, Cart,
  Checkout (Details → Payment → Review), Order Confirmation, Order Tracking, Login,
  Register, Account Home, Order History, Favorites, Store Info, 404 — 28 screens total.
- Catalog-admin back office: Product List/Create/Edit, Category List/Create/Edit, with
  delete-guard confirmation dialogs.
- Fulfillment-staff back office: Admin Dashboard, Order List, Order Detail.
- Role-gated navigation and route guards separating customer, catalog-admin, and
  fulfillment-staff areas (17/17 admin-gating checks passing).
- Client-side mock backend (MSW v2, 40 endpoints) with deterministic seed data
  (`app/src/mocks/db.ts`), request/response envelope matching `contracts/API-Contract.yaml`,
  and scenario toggles for failure/edge-case testing (`app/src/mocks/scenarios.ts`).
- Full CRUD coverage for cart, checkout, products, and categories (14/14 CRUD flows
  verified in QA).
- Stack: Vite + React + TypeScript + Tailwind CSS + Shadcn/ui + TanStack React Query +
  Zod + React Hook Form + Zustand.
- Optimistic UI, loading/empty/error states across data-bound screens.
- Deployment packaging prepared (not executed): `app/vercel.json`, `app/Dockerfile`,
  `app/nginx.conf`, `app/.gitlab-ci.yml` — see `app/DEPLOYMENT.md`.

## 3. Bug Fixes

N/A — initial release, no prior version to compare against.

## 4. Breaking Changes

N/A — initial release.

## 5. Migration Steps

N/A — initial release. No prior schema, data, or API contract to migrate from.

## 6. Known Issues

- **1 serious axe accessibility finding**: color-contrast violation on the Order History
  screen (non-blocking per QA gate substitution; tracked for a follow-up fix before
  production deploy).
- **No automated test suite** exists in `app/` (no Jest/Vitest/RTL/Playwright test files
  committed). QA validation for this release was performed via manual/scripted browser
  verification (`app/.qa-scratch/`), not a repeatable CI test suite. `test-coverage` gate
  is NOT EVALUATED as a result; a frontend-only QA substitution was applied instead (see
  Gate Status below).
- Code-review nits noted in `reviews/code-review.md` are advisory only; none are
  release-blocking, but none have been re-verified as fixed in a follow-up review pass.
- Deploy and remote push have not occurred — see Gate Status and `releases/Handover.md`
  for outstanding items.

---

## Gate Status

| Gate | Result |
|---|---|
| architecture-review | PASS |
| quality-gate (QA functional substitution) | PASS |
| security-review | PASS |
| code-review | PASS-with-nits (advisory) |
| frontend-build-success | PASS (verified) |
| deployment-success | **NOT EVALUATED** (user explicitly skipped deploy) |
| git-push-success | **NOT EVALUATED** (local repository only, no remote configured) |
| pipeline-green | **NOT EVALUATED** (no CI runner registered/executed) |
| test-coverage | **NOT EVALUATED** (no automated test suite exists; frontend-only QA substitution applied) |

### QA Summary (from `docs/QA-Report.md`)
- Screens verified: 28/28
- CRUD flows verified: 14/14
- Admin-gating checks verified: 17/17
- Accessibility (axe): 0 critical violations, 1 serious (color-contrast, Order History)
- Console errors: 0 uncaught

### Workflow Completion Status

**INCOMPLETE by explicit user waiver.** The `clickable-frontend` workflow marks production
deployment and repository push as mandatory completion conditions. The user explicitly
chose to defer both (local git only, no remote push; deploy skipped for now). All
build/quality-related work for this release is complete and gated PASS; the remaining
gaps (deployment-success, git-push-success, pipeline-green) are NOT EVALUATED as a direct
consequence of that deferral, not as failures. See `releases/Handover.md` for the exact
steps to close them out when the user is ready.
