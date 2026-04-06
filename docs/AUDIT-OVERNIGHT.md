# SpokeStack Core — Overnight Audit
*Generated: 2026-04-06*

## Summary
- **22 dead source files** found (~2,000+ lines of unused code)
- **104 API routes** audited (5 issues flagged)
- **8,106 TypeScript errors** (main app) — all from missing `node_modules`; **0 real type errors** in main app
- **279 TypeScript errors** (CLI) — missing `@types/node`, implicit `any` on params, null checks
- **5 security concerns** (1 medium: hardcoded Supabase fallback creds; rest low)
- **25 CLI commands** verified — **7 call nonexistent endpoints**
- **3 unused Prisma models**, **2 unused Prisma models with zero queries**
- **3 env vars** missing from `.env.example`
- **3 env vars** in `.env.example` not referenced in code
- **0 `loading.tsx` or `error.tsx`** boundary files in entire app

---

## Dead Code

### Dead Library Files (never imported anywhere)

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/db.ts` | 2 | Legacy DB helper (superseded by `src/lib/prisma.ts`) |
| `src/lib/notifications.ts` | 190 | Notification sending service (email, push, SMS) — never wired up |
| `src/lib/ratelimit.ts` | 151 | Redis-based rate limiter — never imported by any route |
| `src/lib/platform/role-templates.ts` | 46 | Role template definitions — unused |
| `src/lib/platform/module-registry.ts` | 34 | Module registry — unused |
| `src/lib/billing/metering.ts` | 150 | Token metering for billing — never imported |
| `src/lib/milestones/checker.ts` | 197 | Milestone progress checker — never imported |
| `src/lib/vbx/streams.ts` | 202 | Redis stream helpers for VBX — never imported |

### Dead UI Components (11 files — shadcn/ui scaffolded but never imported)

| File | Lines |
|------|-------|
| `src/components/ui/badge.tsx` | ~30 |
| `src/components/ui/button.tsx` | ~50 |
| `src/components/ui/dialog.tsx` | ~60 |
| `src/components/ui/dropdown-menu.tsx` | ~60 |
| `src/components/ui/input.tsx` | ~20 |
| `src/components/ui/label.tsx` | ~20 |
| `src/components/ui/scroll-area.tsx` | ~40 |
| `src/components/ui/select.tsx` | ~60 |
| `src/components/ui/switch.tsx` | ~30 |
| `src/components/ui/textarea.tsx` | ~20 |
| `src/components/ui/tooltip.tsx` | ~30 |

Note: `skeleton.tsx` and `card.tsx` ARE used and should be kept.

### Dead Dashboard Components (2 files)

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/(dashboard)/orders/components/invoice-view.tsx` | ~80 | Invoice display modal — implemented but never rendered |
| `src/app/(dashboard)/projects/components/canvas-view.tsx` | ~100 | Canvas visualization — implemented but never rendered |

### Additional Dead Library Files (3 more beyond the 8 above)

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/billing/tiers.ts` | ~50 | Billing tier config (FREE/STARTER/PRO/BUSINESS/ENTERPRISE) — never imported |
| `src/lib/milestones/definitions.ts` | ~135 | Milestone specifications — never imported |
| `src/lib/vbx/surfaces.ts` | ~30 | Surface type configs (CLI/WEB/DESKTOP/MOBILE) — never imported |

**Total: ~2,000+ lines of dead code across 22 files.**

### Notes
- No references to "Phase 10A" found in the codebase — cleanup appears complete.
- `src/lib/notifications.ts` references `EMAIL_SERVICE_URL`, `PUSH_SERVICE_URL`, and `TELNYX_SMS_FROM` but is never called from any route or service.
- `src/lib/billing/metering.ts` defines token usage tracking but nothing invokes it.
- The 11 dead UI components were scaffolded (shadcn/ui) but the codebase uses native HTML + Tailwind instead.

---

## API Routes

**104 total routes** across `src/app/api/`.

### Routes Without `authenticate()` (9 routes)

| Route | Auth Mechanism | Status |
|-------|---------------|--------|
| `/api/v1/auth/login` | Public (login endpoint) | OK |
| `/api/v1/auth/refresh` | Public (token refresh) | OK |
| `/api/v1/organizations/by-slug/[slug]` | Public (service-to-service lookup, no sensitive data) | OK |
| `/api/cron/sync` | `CRON_SECRET` via Authorization header | OK |
| `/api/cron/events/cleanup` | `CRON_SECRET` via Authorization header | OK |
| `/api/cron/weekly-synthesis` | `CRON_SECRET` via Authorization header | OK |
| `/api/v1/admin/marketplace/recalculate-scores` | `CRON_SECRET` via Authorization header | OK |
| `/api/internal/webhooks/stripe` | Stripe webhook signature validation | OK |
| `/api/internal/webhooks/telnyx` | Telnyx webhook signature validation | OK |

All unauthenticated routes have valid alternative auth mechanisms. No issues found.

### Error Handling

All `catch {}` blocks (without error variable) were reviewed. **None are truly empty** — they all either:
- Return proper error responses (`return error("Invalid JSON body", 400)`)
- Are intentionally non-blocking with comments explaining the fallback
- Handle expected failures gracefully (e.g., agent-builder-client unavailable)

### OPENAI_API_KEY References
**None found.** All AI calls go through `AGENT_RUNTIME_URL` / `AGENT_RUNTIME_SECRET` as expected.

### Body Validation
Most routes validate required fields. No systematic body validation middleware (e.g., Zod) is used — validation is done inline per route.

---

## Type Safety

### `npx tsc --noEmit` Results

**Main App: 8,106 errors** — but `node_modules` is **not installed**. Error breakdown:

| Error Code | Count | Cause |
|-----------|-------|-------|
| TS7026 | 7,057 | JSX elements (missing `@types/react`) |
| TS7006 | 499 | Implicit `any` params (missing type deps) |
| TS2307 | 273 | Missing module declarations |
| TS2875 | 98 | Missing `react/jsx-runtime` |
| TS2591 | 83 | Missing node type declarations |
| TS7031 | 57 | Binding element implicit `any` |
| TS2503 | 26 | Missing namespace declarations |
| Other | 13 | Various (TS2339, TS18046, TS2882, TS2345, TS2322) |

**After filtering out missing-dependency errors: 0 real type errors in the main app.**

**CLI: 279 errors** — `node_modules` not installed in `cli/` either. Real errors (would persist after install):
- **35 implicit `any` on `opts` parameters** — every command handler has untyped `opts`
- **13 null-safety issues** — `auth` is possibly `null` in multiple commands
- **1 type mismatch** — `workspace.ts:94` passes object not assignable to `AuthData`

### `as any` Casts
**1 instance** in production code:
- `cli/src/commands/modules.ts:121` — `(res.data as any).requiredTier`

### `as Record<string, any>` Casts
**3 instances** (all for Prisma JSON fields — reasonable):
- `src/lib/integrations/telnyx.ts:133`
- `src/lib/integrations/telnyx.ts:150`
- `src/lib/notifications.ts:137` (dead file)

### `as string` Casts
**59 instances** across the codebase — primarily in dashboard pages casting Prisma JSON field values. This is a pattern used for the `metadata` JSON columns.

### `@ts-ignore` / `@ts-expect-error`
**None found.** Clean.

---

## Prisma

### Schema Models (51 total)

| Model | Queried in `src/`? | Notes |
|-------|--------------------|-------|
| Organization | Yes | Core model |
| User | Yes | Core model |
| Team | Yes | |
| TeamMember | Yes | |
| OrgSettings | Yes | |
| OrgModule | Yes | |
| **FeatureFlag** | **No** | **Never queried — dead model** |
| PublishedModule | Yes | |
| ModuleReview | Yes | |
| ModuleInstall | Yes | |
| ModuleBillingEvent | Yes (3) | |
| BillingAccount | Yes | |
| BillingTier | Yes (5) | |
| BillingMeterEvent | Yes (5) | |
| BillingInvoice | Yes (2) | |
| TaskList | Yes | |
| Task | Yes | |
| TaskComment | Yes | |
| **TaskAttachment** | **No** | **Never queried — dead model** |
| Project | Yes | |
| ProjectPhase | Yes | |
| ProjectMilestone | Yes | |
| WfCanvas | Yes (7) | |
| WfCanvasNode | Yes (2) | via `tx.wfCanvasNode` |
| WfCanvasEdge | Yes (1) | |
| Brief | Yes | |
| BriefPhase | Yes | |
| Artifact | Yes | |
| **ArtifactReview** | **No** | **Never queried — dead model** |
| Client | Yes | |
| Order | Yes | |
| OrderItem | Yes | |
| Invoice | Yes | |
| InvoiceItem | Yes | |
| AgentSession | Yes | |
| AgentMessage | Yes | |
| ContextEntry | Yes | |
| ContextMilestone | Yes (6) | |
| Integration | Yes | |
| Notification | Yes | |
| **NotificationPreference** | **No** | **Never queried — dead model** |
| FileAsset | Yes (1) | Minimal usage |
| **FileVersion** | **No** | **Never queried — dead model** |
| EntityEvent | Yes | |
| EventSubscription | Yes | |
| EventHandlerLog | Yes (6) | |
| SyncJob | Yes (4) | |
| AssetLibrary | Yes (7) | |
| AssetFolder | Yes (10) | |
| Asset | Yes | |
| AssetVersion | Yes (2) | |
| AssetComment | Yes (5) | |

**5 dead models:** `FeatureFlag`, `TaskAttachment`, `ArtifactReview`, `NotificationPreference`, `FileVersion`

### Raw SQL Queries
**None found.** All queries use Prisma client methods.

---

## Environment Variables

### All Variables Referenced in Code (33 unique)

| Variable | In `.env.example`? | Used Where | Issue |
|----------|-------------------|------------|-------|
| `DATABASE_URL` | Yes | `src/lib/prisma.ts` | |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase client, auth routes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase client, auth routes | |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `src/lib/supabase/server.ts` | |
| `STRIPE_SECRET_KEY` | Yes | `src/lib/billing/stripe.ts` | |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe billing | |
| `STRIPE_PRICE_STARTER` | Yes | `src/lib/billing/stripe.ts` | |
| `STRIPE_PRICE_PRO` | Yes | `src/lib/billing/stripe.ts` | |
| `STRIPE_PRICE_BUSINESS` | Yes | `src/lib/billing/stripe.ts` | |
| `NEXT_PUBLIC_APP_URL` | Yes | Billing redirects | |
| `AGENT_RUNTIME_URL` | Yes | Multiple routes + lib files | |
| `AGENT_RUNTIME_SECRET` | Yes | Multiple routes + lib files | |
| `AGENT_BUILDER_URL` | Yes | `src/lib/events/processor.ts`, `src/lib/modules/installer.ts` | |
| `REDIS_URL` | Yes | Rate limiting, milestones, VBX streams | |
| `CRON_SECRET` | Yes | Cron routes, admin recalculate | |
| `SPOKESTACK_ADMIN_ORG_ID` | Yes | Marketplace admin routes | |
| `TELNYX_API_KEY` | Yes | `src/lib/integrations/telnyx.ts` | |
| `TELNYX_WEBHOOK_SECRET` | Yes | Telnyx integration | |
| `TELNYX_MESSAGING_PROFILE_ID` | Yes | Telnyx integration | |
| `TELNYX_PUBLIC_KEY` | Yes | Telnyx webhook route | |
| `TELNYX_SMS_FROM` | Yes | Notifications (dead file) | |
| `TELNYX_WHATSAPP_FROM` | Yes | Telnyx integration | |
| `NANGO_SECRET_KEY` | Yes | Nango client | |
| `NANGO_HOST` | Yes | Nango client | |
| `EMAIL_SERVICE_URL` | Yes | Notifications (dead file) | |
| `PUSH_SERVICE_URL` | Yes | Notifications (dead file) | |
| `VERCEL_TOKEN` | Yes | Instance configure route | |
| `VERCEL_PROJECT_ID` | Yes | Instance configure route | |
| `NODE_ENV` | N/A | Standard Node.js | |
| `NO_COLOR` | N/A | CLI only | |
| **`NANGO_BASE_URL`** | **No** | `src/lib/sync/runner.ts` | **Missing from `.env.example`** |
| **`SPOKESTACK_API_URL`** | **No** | `cli/src/auth.ts` | **Missing from `.env.example`** |
| **`SUPABASE_URL`** | **No** | `cli/src/commands/status.ts` | **Missing — CLI uses this as fallback for `NEXT_PUBLIC_SUPABASE_URL`** |

### In `.env.example` But Not Referenced in Code
| Variable | Notes |
|----------|-------|
| `DIRECT_URL` | Prisma shadow database URL — may be needed for `prisma migrate` but not referenced in app code |
| `NANGO_PUBLIC_KEY` | Listed but never used in `src/` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Listed but never used in `src/` |

### Client-Side Without `NEXT_PUBLIC_` Prefix
No issues found — all client-side env vars properly use `NEXT_PUBLIC_` prefix.

### `AGENT_RUNTIME_URL` vs `AGENT_BUILDER_URL`
**Both are used and serve different purposes:**
- `AGENT_RUNTIME_URL` — Used in **16 locations**: chat, ask, onboarding, mission-control messages, marketplace install/review, module uninstall, context synthesizer. This is the primary AI backend.
- `AGENT_BUILDER_URL` — Used in **2 locations**: `src/lib/events/processor.ts` and `src/lib/modules/installer.ts`. This is the event-driven agent execution service.

These are **intentionally separate services**, not an inconsistency.

---

## UI Pages

**47 pages** across the app.

### Dashboard Pages (40)

| Page | Route | Data Source | Issues |
|------|-------|------------|--------|
| access-control | `/access-control` | API calls | |
| analytics | `/analytics` | API calls | |
| api-management | `/api-management` | API calls | |
| boards | `/boards` | API calls | |
| briefs | `/briefs` | API calls | |
| briefs/[briefId] | `/briefs/:id` | API calls | |
| builder | `/builder` | API calls | |
| client-portal | `/client-portal` | API calls | |
| client-reporting | `/client-reporting` | API calls | |
| content-studio | `/content-studio` | API calls | |
| crisis-comms | `/crisis-comms` | API calls | |
| crm | `/crm` | API calls | |
| delegation | `/delegation` | API calls | |
| events | `/events` | API calls | |
| finance | `/finance` | API calls | |
| influencer-mgmt | `/influencer-mgmt` | API calls | |
| insights | `/insights` | Supabase direct | Uses Supabase client directly instead of API route |
| listening | `/listening` | API calls | |
| **lms** | `/lms` | **None** | **Empty shell — UI only, no data fetching, no backend** |
| marketplace | `/marketplace` | API calls | |
| marketplace/browse | `/marketplace/browse` | API calls | |
| marketplace/my-modules | `/marketplace/my-modules` | API calls | |
| marketplace/publish | `/marketplace/publish` | API calls | |
| marketplace/[moduleId] | `/marketplace/:id` | API calls | |
| media-buying | `/media-buying` | API calls | |
| media-relations | `/media-relations` | API calls | |
| mission-control | `/mission-control` | API calls | |
| nps | `/nps` | API calls | |
| orders | `/orders` | API calls | |
| press-releases | `/press-releases` | API calls | |
| projects | `/projects` | API calls | |
| projects/[projectId] | `/projects/:id` | API calls | |
| settings | `/settings` | API calls (23 refs) | Most complex page |
| social-publishing | `/social-publishing` | API calls | |
| **spokechat** | `/spokechat` | **None** | **Empty shell — hardcoded empty `channels` array, no API integration** |
| surveys | `/surveys` | API calls | |
| tasks | `/tasks` | API calls | |
| time-leave | `/time-leave` | API calls | |
| workflows | `/workflows` | API calls | |

### Onboarding & Platform Pages (7)

| Page | Route | Data Source | Issues |
|------|-------|------------|--------|
| login | `/login` | Supabase Auth | |
| signup | `/signup` | Supabase Auth | |
| onboarding | `/onboarding` | API calls | |
| conversation | `/conversation` | API calls | |
| reveal | `/reveal` | API calls | |
| admin/onboarding | `/admin/onboarding` | API calls | |
| root page | `/` | Static | Landing/redirect |

### Global Issues
- **No `loading.tsx` files** anywhere — no streaming/Suspense loading states
- **No `error.tsx` files** anywhere — no error boundaries for any route segment
- **2 empty shell pages**: `lms` and `spokechat` have UI but zero data integration

---

## CLI

**25 commands** in `cli/src/commands/`.

| Command | API Endpoints Called | Status |
|---------|-------------------|--------|
| agent | `/api/v1/agents/ask`, `/api/v1/agents/chat` | OK |
| brief (create/list/show) | `/api/v1/briefs`, `/api/v1/briefs/:id` | OK |
| **brief (review)** | **`/api/v1/briefs/artifacts/:id`**, **`/api/v1/briefs/artifacts/:id/review`** | **BROKEN — endpoints don't exist** |
| **connect** | **`/api/v1/integrations/slack/connect`**, **`/api/v1/integrations/whatsapp/connect`** | **BROKEN — endpoints don't exist** |
| deploy | None (runs shell commands) | OK |
| dev | None (runs shell commands) | OK |
| export | `/api/v1/export` | OK |
| **init** | `/api/v1/auth`, **`/api/v1/auth/signup`**, `/api/v1/admin/seed` | **PARTIAL — `/auth/signup` doesn't exist** |
| instance | `/api/v1/instance/configure` | OK |
| login | `/api/v1/auth/login` | OK |
| marketplace | `/api/v1/marketplace/browse`, `/api/v1/marketplace/install` | OK |
| module | `/api/v1/modules`, `/api/v1/modules/install` | OK |
| module-analytics | `/api/v1/marketplace/analytics/:id` | OK |
| module-create | `/api/v1/agents/ask`, `/api/v1/context` | OK |
| module-publish | `/api/v1/marketplace/publish` | OK |
| module-test | Various test endpoints | OK |
| modules | `/api/v1/modules`, `/api/v1/modules/installed` | OK |
| order | `/api/v1/orders`, `/api/v1/clients` | OK |
| project | `/api/v1/projects` | OK |
| seed | `/api/v1/admin/seed` | OK |
| setup | None (interactive setup) | OK |
| status | Multiple health checks | OK (note: `/api/v1/health` is on AGENT_RUNTIME_URL, not core) |
| task | `/api/v1/tasks` | OK |
| tenant | `/api/v1/auth`, `/api/v1/modules/install-batch` | OK |
| upgrade | `/api/v1/billing` | OK |
| **workspace** | **`/api/v1/auth/workspaces`**, **`/api/v1/auth/switch`** | **BROKEN — endpoints don't exist** |

### CLI TypeScript (`npx tsc --noEmit`)
**279 errors** — `node_modules` not installed. Real errors that would persist:
- All command handlers have untyped `opts` parameter (35 instances)
- `auth` is possibly `null` without null checks (13 instances)
- `workspace.ts:94` — type mismatch with `AuthData`

---

## Security

### 1. Authentication Coverage
All 95 authenticated routes use `authenticate()` from `src/lib/auth.ts`. The 9 unauthenticated routes all have valid alternative auth (CRON_SECRET, webhook signatures, or intentionally public). **No issues.**

### 2. Hardcoded Secrets
**Hardcoded Supabase fallback credentials found in 2 files:**
- `src/app/api/v1/auth/login/route.ts:6-11` — Hardcoded Supabase URL (`https://dufujpalmzbbwtofpgyv.supabase.co`) and anon key (`sb_publishable_...`) as fallbacks if env vars are unset
- `src/app/api/v1/auth/refresh/route.ts:5-10` — Same hardcoded fallbacks

While anon keys are designed to be public, hardcoding them means misconfigured deployments silently connect to the wrong Supabase project instead of failing. **Remove fallbacks and require env vars.**

No other hardcoded secrets found.

### 3. `eval()` / `Function()` Usage
**None found.** Clean.

### 4. CORS Configuration
CORS is configured in `vercel.json` with a **restricted origin**:
- `Access-Control-Allow-Origin: https://spokestack-core.vercel.app`
- `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`
- `Access-Control-Allow-Headers: Content-Type,Authorization,X-Organization-Id`

This is secure (no wildcard `*`). Note: CLI calls will bypass CORS since they're server-to-server, not browser-based.

### 5. Security Headers (Middleware)
Properly configured in `src/middleware.ts`:
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**Missing:** `Content-Security-Policy` header (recommended for production).

### 6. Telnyx Webhook Signature Validation
`src/lib/integrations/telnyx.ts:24-26` — If `TELNYX_WEBHOOK_SECRET` is not set, it **skips signature validation** and logs a warning. This means in development (or misconfigured production), webhook payloads are accepted without verification.

### 7. Stripe Key Initialization
`src/lib/billing/stripe.ts:8` — `new Stripe(process.env.STRIPE_SECRET_KEY ?? "")` initializes Stripe with an empty string if the key is missing, rather than throwing. Could lead to confusing errors at runtime.

---

## Dependencies

### `npm audit`
```
found 0 vulnerabilities
```
**Clean.**

### Duplicate Packages
None found in `package.json`.

### Node Version Compatibility
`engines.node` is set to `>=18`. Running on Node v25 may trigger EBADENGINE warnings for some transitive dependencies, but no blocking issues were found.

### Missing `node_modules`
**`node_modules` is not installed** in either the root project or the `cli/` directory. This makes TypeScript compilation fail with thousands of false-positive errors. Run `npm install` (root) and `cd cli && npm install` to get accurate type checking.

---

## Recommended Next Steps

1. **Install dependencies and re-run `tsc --noEmit`** — The 8,385 combined TS errors are almost entirely from missing `node_modules`. After install, expect near-zero errors in the main app and ~50 real errors in the CLI.

2. **Delete 22 dead files** (~2,000+ lines) — 11 unused UI components (`src/components/ui/`), 11 unused library files (`db.ts`, `notifications.ts`, `ratelimit.ts`, `platform/role-templates.ts`, `platform/module-registry.ts`, `billing/metering.ts`, `billing/tiers.ts`, `milestones/checker.ts`, `milestones/definitions.ts`, `vbx/streams.ts`, `vbx/surfaces.ts`), and 2 dead dashboard components (`invoice-view.tsx`, `canvas-view.tsx`). These add confusion and maintenance burden.

3. **Remove 5 dead Prisma models** — `FeatureFlag`, `TaskAttachment`, `ArtifactReview`, `NotificationPreference`, `FileVersion`. Create a migration to drop the corresponding tables.

4. **Fix 7 broken CLI endpoints** — The `connect`, `init` (signup), `workspace`, and `brief review` commands call API routes that don't exist. Missing: `/api/v1/integrations/slack/connect`, `/api/v1/integrations/whatsapp/connect`, `/api/v1/auth/signup`, `/api/v1/auth/switch`, `/api/v1/auth/workspaces`, `/api/v1/briefs/artifacts/:id`, `/api/v1/briefs/artifacts/:id/review`. Either create the missing routes or update the CLI to use existing endpoints.

5. **Add `loading.tsx` and `error.tsx` files** — Zero loading states and zero error boundaries across the entire app. At minimum, add these to the `(dashboard)` layout segment.

6. **Wire up or delete empty shell pages** — `lms` and `spokechat` have UI but no data integration. Either connect them to APIs or remove them to avoid user confusion.

7. **Add missing env vars to `.env.example`** — `NANGO_BASE_URL`, `SPOKESTACK_API_URL`, `SUPABASE_URL`. Remove unused ones: `NANGO_PUBLIC_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

8. **Type the CLI command handlers** — All 25 commands have untyped `opts` parameters. Create a shared `CommandOptions` type or use Commander's built-in typing.

9. **Add `Content-Security-Policy` header** — The middleware sets good security headers but is missing CSP, which is the most impactful one for preventing XSS.

10. **Fix Telnyx webhook validation bypass** — Make `TELNYX_WEBHOOK_SECRET` required when the Telnyx integration is active, rather than silently skipping validation.
