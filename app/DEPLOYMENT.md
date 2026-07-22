# Deployment Configuration — Kopi Kita (ecatalog-coffeeshop)

- Artifact: Deployment Config
- Owner: devops
- Workflow: clickable-frontend, Stage 10 — Packaging
- Status: draft (packaging only — **not deployed**)

This document describes how to build and serve the built static SPA. It does
not authorize, and was not used to perform, a production deploy. Production
deploy requires human approval (CLAUDE.md Deployment Approval Rule) and
release-manager's own Vercel authentication/credentials.

## App shape

- Vite + React + TypeScript, compiled to a fully static SPA (`npm run build`
  → `dist/`).
- Client-side mock backend via MSW (`msw` v2). `public/mockServiceWorker.js`
  is copied verbatim into `dist/mockServiceWorker.js` by the Vite build (it's
  a static public asset, not bundled/transformed).
- All API calls are same-origin `/api/v1/*`, intercepted by the service
  worker in the browser. There is no real backend origin to reach — nothing
  in this app calls out to a remote API.
- No external script/style/font CDNs. Confirmed via `grep -rE "https?://"
  src/` — the only external URLs found are (a) image URLs in the seed data
  (`src/mocks/db.ts`, `picsum.photos`) fetched as `<img>` sources, and (b) a
  plain `<a href="https://maps.google.com/...">` user-navigation link in
  `StoreInfoPage.tsx`, which CSP `src` directives don't govern (it's a
  normal outbound link the user clicks, not a fetched subresource).

## Image host decision

Seed data (`src/mocks/db.ts`) generates product/store images exclusively
from `https://picsum.photos/seed/<id>/<w>/<h>`. No other image host, and no
local `/img` path, is used. Final CSP:

```
img-src 'self' data: https://picsum.photos;
```

If seed data is later changed to add another image provider, this directive
must be updated in both `vercel.json` and `nginx.conf` or production images
will silently fail to load (CSP blocks them, it does not fall back).

## Primary target: Vercel (`vercel.json`)

- `framework: "vite"`, `buildCommand: "npm run build"`,
  `outputDirectory: "dist"`, `installCommand: "npm install"`.
- SPA routing: `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]`.
  This is Vercel's documented catch-all SPA pattern. It is safe for
  `/mockServiceWorker.js` and `/assets/*` because Vercel's routing order
  checks the deployment's static output for a literal file match **before**
  applying `rewrites`: since `dist/mockServiceWorker.js` and every hashed
  file under `dist/assets/` physically exist in the build output, those
  requests are served as-is and never reach the rewrite rule. Only paths
  with no matching file (client-side routes like `/menu`, `/cart`,
  `/account/orders/123`) fall through to `index.html`. No negative-lookahead
  regex is needed or reliably supported by Vercel's rewrite matcher, so the
  plain catch-all is the correct, standard config here.
- Security headers (matches the security review) applied via a single
  `headers` block matching `/(.*)`:
  - `Content-Security-Policy`: `default-src 'self'; script-src 'self';
    style-src 'self' 'unsafe-inline'; img-src 'self' data:
    https://picsum.photos; connect-src 'self'; worker-src 'self';
    frame-ancestors 'none'`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), camera=(), microphone=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `worker-src 'self'` explicitly permits registering the MSW service
    worker from the same origin; `connect-src 'self'` covers the
    same-origin `/api/v1/*` fetches the SW intercepts. No relaxation beyond
    `'self'` was needed anywhere for MSW to keep working.

## MSW in production

MSW only runs because `public/mockServiceWorker.js` ships as a real static
file at the site root and the app registers it client-side. Nothing about
the Vercel or nginx config transforms, proxies, or rewrites that file — both
configs explicitly special-case it (Vercel: filesystem-first as above;
nginx: an exact `location = /mockServiceWorker.js` block, see below) so it
is always served byte-for-byte with the right content type, never swapped
for `index.html`.

## Portable alternative: Docker + nginx

Files: `Dockerfile`, `nginx.conf`, `.dockerignore`.

- Stage 1 (`node:20.18-alpine3.20`): `npm ci || npm install`, `npm run
  build`.
- Stage 2 (`nginx:1.27-alpine`): copies `dist/` into
  `/usr/share/nginx/html`, runs as the image's existing non-root `nginx`
  user (uid/gid 101) on port `8080` (unprivileged, so no root needed to
  bind), with a `HEALTHCHECK` hitting `http://127.0.0.1:8080/`.
- `nginx.conf`:
  - `location = /mockServiceWorker.js` — exact match, served as a literal
    file, `Service-Worker-Allowed: /` (so its scope covers the whole
    origin), `Cache-Control: no-cache`.
  - `location /assets/` — Vite's hashed output, long-cached and immutable.
  - `location = /index.html` — `no-cache`, so new deploys are always picked
    up.
  - `location /` — `try_files $uri $uri/ /index.html;` SPA fallback for
    everything else (client-side routes).
  - Same CSP/security header set as `vercel.json`, applied via `add_header
    ... always;` at the server level.
- `.dockerignore` excludes `node_modules`, `dist`, `.git`, `.env*`,
  `.qa-scratch`, build caches, and this file itself — none of that belongs
  in the build context.

Run locally: `docker build -t kopi-kita . && docker run -p 8080:8080
kopi-kita`, then browse `http://localhost:8080`.

**Validation status**: `docker build` was NOT executed successfully in this
environment — the Docker CLI is installed (`Docker version 29.4.2`) but the
Docker daemon is not running here, so the build could not be exercised.
This should be validated in CI or locally with Docker Desktop/daemon
running before relying on the image.

## CI (`.gitlab-ci.yml`)

Stages: `install` → `lint` (`tsc --noEmit`, this project's only configured
lint — no ESLint config present) → `build` (`npm run build`, artifact
`dist/`) → `container` (manual, optional Docker image build) → `deploy`
(manual, placeholder Vercel deploy). Lint/build failures fail the pipeline
by ordinary job exit code — no failure is swallowed.

Required CI/CD variables (must be configured as masked/protected GitLab
project variables — none are present in this repo or in the pipeline
file):

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Ownership: release-manager owns triggering and monitoring this pipeline
(pipeline-green is a release gate it evaluates), and the pipeline needs a
registered GitLab Runner to execute at all — provisioning/starting that
runner is a separate devops action requiring its own explicit approval
before being started (CLAUDE.md Runner Provisioning Approval Rule); this
packaging stage does not start one.

## Manual deploy command (for release-manager, after approval)

Once `VERCEL_TOKEN` (and, if not already linked, `VERCEL_ORG_ID` /
`VERCEL_PROJECT_ID`) are available and a human has explicitly approved a
production deploy naming the target environment/URL:

```bash
npx vercel pull --yes --environment=production --token="$VERCEL_TOKEN"
npx vercel build --prod --token="$VERCEL_TOKEN"
npx vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
```

(or interactively, from a machine already authenticated via `vercel login`:
`vercel --prod`).

## Explicit statement

This stage produced packaging/deploy **configuration** artifacts only
(`vercel.json`, `Dockerfile`, `nginx.conf`, `.dockerignore`,
`.gitlab-ci.yml`, this document). No deploy command was run, no Vercel
project was created or linked, and no GitLab Runner was registered or
started. Production deployment requires a distinct human approval naming
the target URL/environment (CLAUDE.md Deployment Approval Rule) plus valid
Vercel authentication, both of which are release-manager's responsibility
at a later stage.
