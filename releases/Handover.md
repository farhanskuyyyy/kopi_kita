```yaml
metadata:
  artifact: Handover
  version: 1.0
  owner: release-manager
  status: final
```

# Handover — Kopi Kita (ecatalog-coffeeshop)

## 1. Running Locally

```bash
cd app
npm install
npm run dev
```

- Vite dev server starts (default `http://localhost:5173`).
- The MSW mock service worker (`public/mockServiceWorker.js`) auto-registers in the
  browser on load — no external backend, database, or network access required. All
  `/api/v1/*` calls are intercepted client-side.

## 2. Building

```bash
cd app
npm run build
```

- Type-checks (`tsc --noEmit`) then builds the static SPA into `app/dist/`.
- `public/mockServiceWorker.js` is copied verbatim into `dist/mockServiceWorker.js` (static
  asset, not bundled).
- Build was verified successful during this release (`frontend-build-success`: PASS).

To preview the production build locally: `npm run preview` (if defined in
`app/package.json`) or serve `app/dist/` with any static file server.

## 3. Deploying (when ready — requires human approval)

**Deploy was explicitly deferred for this release. Do not run these commands without a
distinct, explicit human approval naming the target URL/environment** (CLAUDE.md
Deployment Approval Rule), plus valid Vercel authentication/credentials.

### Primary target: Vercel

Config already prepared in `app/vercel.json` (framework `vite`, build command
`npm run build`, output `dist`, SPA rewrites, and the full security header set —
CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS).

Once `VERCEL_TOKEN` (and `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` if not already linked) are
available and approval has been given:

```bash
npx vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
npx vercel build --prod --token="$VERCEL_TOKEN"
npx vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
```

Or interactively, from a machine already authenticated via `vercel login`:

```bash
vercel --prod
```

### Portable alternative: Docker + nginx

```bash
docker build -t kopi-kita .
docker run -p 8080:8080 kopi-kita
```

Then browse `http://localhost:8080`. Note: `docker build` was **not** exercised
successfully in the build environment used for this release (Docker daemon was not
running) — validate this path in CI or locally with Docker Desktop before relying on it.

Full details, including the CSP `img-src` decision (`picsum.photos` only), MSW-in-production
notes, and the `.gitlab-ci.yml` pipeline stages/required CI variables (`VERCEL_TOKEN`,
`VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`), are documented in `app/DEPLOYMENT.md`.

## 4. Mock Backend (MSW)

- Implementation: `app/src/mocks/` — `browser.ts` (worker bootstrap), `db.ts` (in-memory
  seed data + request/response shaping), `handlers.ts` (40 endpoint handlers matching
  `contracts/API-Contract.yaml`), `scenarios.ts` (failure/edge-case toggles), `types.ts`.
- Full scenario catalog and trigger mechanics documented in `docs/Mock-Scenarios.md`.

### Seed credentials (mock data only — not real accounts)

| Role | Identifier | Password |
|---|---|---|
| Customer | `sari@example.com` | `Passw0rd!` |
| Customer | `andi@example.com` | `Passw0rd!` |
| Catalog-admin (staff) | username `admin.catalog` | `Admin123!` |

(Source: `app/src/mocks/db.ts`. Two seeded orders' guest customers also exist as
`guest1@example.com` / `guest2@example.com` for guest-checkout scenarios, no login.)

### Scenario toggles

Deterministic failure/edge-case scenarios can be forced either globally (via the
`scenarios` object exported from `app/src/mocks/scenarios.ts`, e.g. from the browser
console) or per-request (via an `x-mock-scenario` request header or `_scenario` query
param). Available toggles: `forceServerError` (500 on every endpoint), `forcePaymentFailed`
(checkout payment declined), `forceStockUnavailable` (cart/order lines report
out-of-stock), plus configurable artificial latency (`latencyEnabled`,
`latencyMinMs`/`latencyMaxMs`, default 150–500ms). Full trigger list: `docs/Mock-Scenarios.md`.

## 5. Architecture / Artifact Index

| Artifact | Location |
|---|---|
| Feature List | `docs/Feature-List.md` |
| User Journey Map | `docs/User-Journey-Map.md` |
| Frontend Specification | `docs/Frontend-Specification.md` |
| Frontend Architecture | `docs/Frontend-Architecture.md` |
| Mock Scenarios | `docs/Mock-Scenarios.md` |
| QA Report | `docs/QA-Report.md` |
| API Contract | `contracts/API-Contract.yaml` |
| Architecture Review | `reviews/architecture-review.md` |
| Code Review | `reviews/code-review.md` |
| Security Review | `reviews/security-review.md` |
| Deployment Config / Notes | `app/DEPLOYMENT.md` |
| Release Notes | `releases/Release-Notes.md` |
| Handover (this document) | `releases/Handover.md` |
| Frontend source | `app/src/` |
| Mock backend source | `app/src/mocks/` |

## 6. Outstanding Items to Reach Full Workflow Completion

The `clickable-frontend` workflow treats production deployment and repository push as
mandatory completion conditions. Both were explicitly deferred by the user for this
release. To close out full workflow completion:

1. **Production deploy** — obtain explicit human approval naming the target
   URL/environment, obtain/verify Vercel credentials (`VERCEL_TOKEN` etc.), then run the
   deploy commands in §3. Closes gate: `deployment-success`.
2. **Remote push** — add a git remote (e.g. GitHub/GitLab) and push the local `master`
   branch (commit `d304455bebbef4c6311aeb71994f6ae4d57df301`). Closes gate:
   `git-push-success`.
3. **CI/CD pipeline** — register/start a GitLab Runner (requires its own separate,
   explicit approval per CLAUDE.md Runner Provisioning Approval Rule — this is a distinct
   decision from deploy approval), configure the required masked/protected CI variables
   (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`), and run the pipeline defined in
   `app/.gitlab-ci.yml` (install → lint → build → container (manual) → deploy (manual)).
   Closes gate: `pipeline-green`.
4. **Automated test suite** — no Jest/Vitest/RTL/Playwright test files are committed;
   QA for this release relied on manual/scripted verification only (`app/.qa-scratch/`,
   not committed as a repeatable suite). Adding automated tests would close the
   `test-coverage` gate, currently NOT EVALUATED under a frontend-only substitution.

## 7. Known Issues

- 1 serious axe color-contrast violation on the Order History screen (non-blocking, not
  yet fixed).
- No automated/CI-executable test suite exists.
- Code-review advisory nits recorded in `reviews/code-review.md` (non-blocking, not
  independently re-verified as fixed).
- `docker build` for the packaged nginx image has not been exercised successfully in any
  environment used so far (Docker daemon unavailable) — validate before relying on it.
