```yaml
metadata:
  artifact: Security Review
  version: 1.0
  owner: security-audit
  status: final
```

# Security Review — Coffeeshop E-Catalog (Clickable Frontend)

Project: `ecatalog-coffeeshop` ("Kopi Kita")
Workflow: `clickable-frontend` — Stage 9: Security Review Gate (governance floor)
Reviewer: Security Audit Agent (`sec-audit-ecatalog-coffeesh-clickable-fe`)
Subject: `/app` at commit tip of `main` (working tree)
References: `.claude-flow/system/ai-quality-gates.md`, `OUTPUT-STANDARDS.md` Security Review Standard, OWASP Top 10 (frontend-applicable subset)

**Scoping note (load-bearing for verdict):** This is a frontend-only clickable demo. There
is no real backend, no real database, and no real payment processor — all "server" behavior
is simulated in-browser by MSW (`src/mocks/`). Findings below are judged against that
reality: mock "auth" tokens, mock passwords, and client-side role gates are demo artifacts,
not production credentials or an authorization boundary that could be strengthened at this
stage without a real backend to enforce it. They are recorded as **accepted demo
properties**, not vulnerabilities, and do not count against the release gate. Any issue that
would remain a real risk even for a deployed static demo (leaked real secrets, XSS, unsafe
DOM injection, vulnerable dependencies, source maps/`.env` leaking into the shipped bundle)
is scored as a genuine finding.

---

## 1. Threat Summary

Threat surface for a static SPA + in-browser mock backend, reasoned via a lightweight
STRIDE pass:

| STRIDE category | Applicability | Notes |
|---|---|---|
| Spoofing | Low | No real identity provider; mock session tokens are client-generated (`src/mocks/db.ts:542`) and only meaningful within the browser tab's MSW instance. Not exploitable against a real system. |
| Tampering | Low | All "persisted" state (cart, checkout draft, sessions) lives in `localStorage`/`sessionStorage` and is trivially editable by the user themselves — this only affects their own client, not other users or a shared backend. |
| Repudiation | N/A | No audit log / no real backend to repudiate actions against. |
| Information Disclosure | Checked | Reviewed for secret leakage into source, git history, and build output (§2, §3). No real disclosure found. |
| Denial of Service | Out of scope | Static Vercel deployment; no server compute to exhaust. |
| Elevation of Privilege | Checked, accepted | Admin/staff route gating is enforced only client-side (`src/lib/auth/guards.tsx:51`). Since the "admin" data behind it is also mock data with no real confidentiality boundary, this is an inherent property of the architecture, not a fixable defect in this review's scope (see §3). |

No critical threat vectors apply beyond standard static-site hygiene: secret hygiene, XSS,
and dependency supply-chain risk, all covered below.

---

## 2. Vulnerabilities

**None found at Critical or High severity.** Full evidence trail:

### 2.1 Secret scanning — CLEAN
- Grepped `src/` for API key / secret / password / private-key literal patterns, and for
  vendor key signatures (`sk-…`, `AKIA…`, `ghp_…`, `AIza…`) across the whole repo
  (excluding `node_modules`, `dist`, `.git`): **0 real secrets found.**
- The only `password:` literals are intentional mock seed accounts in `src/mocks/db.ts:251-259`
  (`Admin123!`, `Staff123!`, `Passw0rd!` x2) — demo fixtures for a mock in-browser DB, not
  real credentials for any live system. Accepted, noted below in Security Hotspots.
- `.gitignore` correctly excludes `node_modules`, `dist`, `.env`, `.env.*`, `*.tsbuildinfo`,
  `*.local` — verified via `cat .gitignore`.
- `git ls-files | grep -i "\.env"` → no tracked `.env` files. No `.env*` files present on
  disk at all.
- `dist/assets/*.js` contains the string `SECRET` four times — verified each occurrence is
  React's own internal API name `__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED`
  (React/ReactDOM's actual exported symbol name), not an application secret. **False
  positive, confirmed by inspection.**

### 2.2 XSS — CLEAN
- `grep -rn "dangerouslySetInnerHTML" src/` → **0 occurrences.**
- No `eval(`, `new Function(`, or `document.write(` usage anywhere in `src/`.
- All dynamic `href`/`src` usages inspected:
  - `StoreInfoPage.tsx:49,64` — `tel:${data.phone}` (static app data, not user input).
  - `StoreInfoPage.tsx:56` — `https://maps.google.com/?q=${encodeURIComponent(data.address)}`
    — properly encoded, fixed destination host.
  - `EmptyState.tsx:26` — `href={ctaHref}` — internal component prop, not raw user input.
  - No case of unsanitized user-controlled string rendered as HTML or used to construct a
    `javascript:` URL.

### 2.3 Dependency risk — CLEAN
- `npm audit --production`: **0 vulnerabilities.**
- `npm audit` (full, incl. devDependencies): **0 vulnerabilities.**
- No known-vuln packages flagged.

### 2.4 Build output — CLEAN
- `find dist -iname "*.map"` → **0 source map files.** Vite's production build does not
  emit source maps here (`vite.config.ts` does not set `build.sourcemap`, and default is
  off), so no source-level secret/logic leakage via maps.
- No `.env` content present in `dist/` (none exists on disk to leak in the first place).
- `dist/` contains only `index.html`, `assets/`, and MSW's `mockServiceWorker.js`, as
  expected for a static SPA + mock worker build.

**Net result: 0 Critical, 0 High, 0 Medium vulnerabilities. Secret leak count: 0.**

---

## 3. Security Hotspots

Items worth recording explicitly — not vulnerabilities under this review's release gate,
but relevant to reviewers and to the eventual "connect a real backend" migration:

1. **Mock seed credentials in source** (`src/mocks/db.ts:251-259`) — plaintext demo
   passwords (`Admin123!`, `Staff123!`, `Passw0rd!`). Fine for a mock in-browser DB with no
   real backend; would need to be removed/replaced entirely (not "secured") once a real
   auth backend exists — these are demo fixtures, not a hardening target.
2. **Bearer token storage in localStorage** (`useCustomerSessionStore`,
   `useStaffSessionStore` in `src/features/auth/store/*SessionStore.ts`, via Zustand
   `persist` middleware) — standard pattern for SPA demos; acceptable here because the
   token only unlocks mock data in the same browser's MSW instance. Flag for future work:
   a real backend should consider httpOnly cookies or short-lived tokens + refresh instead
   of long-lived localStorage tokens, to mitigate XSS-driven token theft in production.
   No XSS vector currently exists in this codebase (§2.2), so this is not exploitable today.
3. **Checkout draft in sessionStorage** (`checkoutDraftStore.ts`) — holds delivery details
   and a `PaymentMethod` enum (`demo_credit_card`, `demo_cash_on_pickup`,
   `demo_e_wallet`, `demo_declined_card`, per `order.schemas.ts:14`). No real card
   number/CVV fields exist anywhere in the schema or codebase — confirmed via grep for
   `cardNumber|cvv|cvc|creditCard` (0 matches). No PCI-scope data is ever collected, even
   as a demo convenience. Good practice, noted positively.
4. **Client-side-only admin/staff authorization** (`src/lib/auth/guards.tsx:51`,
   `staffUser.role !== role`) — this is an inherent property of a frontend-only demo with
   no real backend to enforce authorization server-side; it is not a fixable defect in this
   review's scope, and is explicitly not counted as a vulnerability. It must be re-reviewed
   the moment a real backend/data store is introduced, since at that point client-side-only
   gating would become a genuine elevation-of-privilege vulnerability.
5. **Console logging** — only one `console.error` call in the whole `src/` tree
   (`src/app/providers/AppErrorBoundary.tsx:23`, `"Unhandled render error"`), logging the
   generic caught error object. No credentials, tokens, or PII are logged anywhere.

---

## 4. Severity Table

| ID | Finding | Severity | Status |
|---|---|---|---|
| — | Real secret leaks (API keys, credentials to live systems) | — | 0 found |
| — | XSS via `dangerouslySetInnerHTML` / unsanitized HTML | — | 0 found |
| — | Vulnerable dependencies (npm audit) | — | 0 Critical / 0 High / 0 Medium / 0 Low |
| — | Source maps or `.env` leaking into `dist/` | — | 0 found |
| HS-1 | Mock seed passwords in `src/mocks/db.ts` | Informational | Accepted demo property |
| HS-2 | Bearer token in localStorage (Zustand persist) | Informational | Accepted demo property; revisit if real backend added |
| HS-3 | Client-side-only admin/staff role gating | Informational | Accepted demo property; must be re-reviewed if real backend added |

No entries reach Medium/High/Critical. Release-blocking count: **0**.

---

## 5. Remediation

No blocking remediation required for this release. Recommended (non-blocking) follow-ups:

1. **Deployment security headers** — the current Vercel static deployment has no explicit
   header configuration checked into the app. Recommend adding a `vercel.json` (or
   equivalent) with:
   - `Content-Security-Policy`: at minimum `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'` (tune `style-src`/`connect-src` as Tailwind/MSW/query needs dictate — MSW's service worker registration is same-origin so `connect-src 'self'` should suffice).
   - `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`, redundant but defense-in-depth).
   - `X-Content-Type-Options: nosniff`.
   - `Referrer-Policy: strict-origin-when-cross-origin`.
   - `Permissions-Policy: geolocation=(), camera=(), microphone=()` (none of these are used by the app).
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (Vercel serves HTTPS by default; explicit HSTS pins it).
2. When/if a real backend replaces MSW, revisit HS-2 (token storage strategy) and HS-3
   (server-side authorization enforcement) as mandatory hardening items at that time — they
   are correctly out of scope today only because there is no real backend to secure.
3. Continue running `npm audit` in CI on each dependency bump; currently clean (0
   vulnerabilities) but this is a point-in-time result.

---

## 6. Final Verdict

**PASS**

Release rule applied: Critical/High vulnerabilities = 0 and secret leaks = 0 →
**PASS**. 0 Critical, 0 High, 0 Medium, 0 Low vulnerabilities found; 0 real secret leaks;
0 `dangerouslySetInnerHTML` occurrences; `npm audit` clean (production and full). Three
informational hotspots recorded (HS-1/2/3) are accepted properties of a frontend-only mock
demo, explicitly not counted against the gate, with follow-up conditions attached for the
day a real backend is introduced. Recommended (non-blocking) deployment security headers
listed in §5 for the Vercel static deploy.
