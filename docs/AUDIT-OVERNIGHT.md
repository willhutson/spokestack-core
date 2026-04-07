# SpokeStack Core — Overnight Audit
*Generated: 2026-04-07*

## Summary
- **6 dead library files** found (~800+ lines of unused code)
- **9 dead UI components** (shadcn scaffolded, never imported)
- **139 API routes** audited (23 fire-and-forget empty catches, 0 auth gaps)
- **0 TypeScript errors** (main app, with deps installed)
- **0 TypeScript errors** (CLI, with deps installed)
- **3 `as any` casts** across entire codebase
- **7 unused Prisma models**
- **5 security concerns** (1 medium: hardcoded Supabase fallback creds)
- **25 CLI commands** verified — **4 call nonexistent endpoints**
- **3 env vars** missing from `.env.example`
- **2 env vars** in `.env.example` not referenced in code
- **0 `loading.tsx` or `error.tsx`** boundary files in entire app
- **0 npm vulnerabilities**

---

## Dead Code

### Dead Library Files (never imported anywhere)

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/db.ts` | ~2 | Legacy DB helper (superseded by `src/lib/prisma.ts`) |
| `src/lib/notifications.ts` | ~190 | Notification sending service (email, push, SMS) — never wired up |
| `src/lib/ratelimit.ts` | ~151 | Redis-based rate limiter — never imported by any route |
| `src/lib/platform/role-templates.ts` | ~46 | Role template definitions — unused |
| `src/lib/platform/module-registry.ts` | ~34 | Module registry — superseded by `src/lib/modules/registry.ts` |
| `src/lib/billing/metering.ts` | ~150 | Token metering for billing — never imported |
| `src/lib/billing/tiers.ts` | ~50 | Billing tier config constants — never imported |
| `src/lib/milestones/checker.ts` | ~197 | Milestone progress checker — never imported |
| `src/lib/milestones/definitions.ts` | ~135 | Milestone specifications — never imported |
| `src/lib/vbx/streams.ts` | ~202 | Redis stream helpers for VBX — never imported |
| `src/lib/vbx/surfaces.ts` | ~30 | Surface type configs — never imported |

### Dead UI Components (9 files — shadcn/ui scaffolded but never imported)

| File | Used? |
|------|-------|
| `src/components/ui/breadcrumb.tsx` | No imports found |
| `src/components/ui/card.tsx` | No imports found |
| `src/components/ui/dialog.tsx` | No imports found |
| `src/components/ui/label.tsx` | No imports found |
| `src/components/ui/scroll-area.tsx` | No imports found |
| `src/components/ui/select.tsx` | No imports found |
| `src/components/ui/switch.tsx` | No imports found |
| `src/components/ui/textarea.tsx` | No imports found |
| `src/components/ui/tooltip.tsx` | No imports found |

**Note:** `badge.tsx`, `button.tsx`, `input.tsx`, `skeleton.tsx`, `sidebar.tsx`, and `dropdown-menu.tsx` ARE actively imported and should be kept.

### Dead Dashboard Components (2 files)

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/orders/components/invoice-view.tsx` | Invoice display modal — implemented but never rendered |
| `src/app/(dashboard)/projects/components/canvas-view.tsx` | Canvas visualization — implemented but never rendered |

### Phase 10A
No references to "Phase 10A" found in the codebase — cleanup appears complete.

**Total: ~22 dead files, ~1,200+ lines of unused code.**

---

## API Routes

**139 route files** across `src/app/api/`.

### Routes Without `authenticate()` (11 routes)

| Route | Auth Mechanism | Status |
|-------|---------------|--------|
| `/api/v1/auth/login` | Public (login endpoint) | OK |
| `/api/v1/auth/refresh` | Public (token refresh) | OK |
| `/api/v1/auth/route` (POST/PUT) | Public (registration) | OK |
| `/api/v1/modules` | Public (module listing) | OK |
| `/api/v1/organizations/by-slug/[slug]` | Public (service-to-service lookup) | OK |
| `/api/v1/boards/templates` | Public (static template list) | OK |
| `/api/v1/surveys/templates` | Public (static template list) | OK |
| `/api/cron/sync` | `CRON_SECRET` via Authorization header | OK |
| `/api/cron/events/cleanup` | `CRON_SECRET` via Authorization header | OK |
| `/api/cron/weekly-synthesis` | `CRON_SECRET` via Authorization header | OK |
| `/api/v1/admin/marketplace/recalculate-scores` | `CRON_SECRET` via Authorization header | OK |
| `/api/internal/webhooks/stripe` | Stripe webhook signature validation | OK |
| `/api/internal/webhooks/telnyx` | Telnyx webhook signature validation | OK |

All unauthenticated routes have valid alternative auth mechanisms. **No auth gaps found.**

### Empty Catch Blocks (23 occurrences in 15 files)

All are fire-and-forget patterns for `emitEvent()` and `updateCanvasFromAgentAction()` calls:

| File | Count | Pattern |
|------|-------|---------|
| `src/app/api/v1/tasks/[taskId]/route.ts` | 3 | emitEvent + updateCanvas |
| `src/app/api/v1/projects/[projectId]/route.ts` | 3 | emitEvent + updateCanvas |
| `src/app/api/v1/agents/chat/route.ts` | 2 | emitEvent + updateCanvas |
| `src/app/api/v1/agents/ask/route.ts` | 2 | emitEvent + updateCanvas |
| `src/app/api/v1/briefs/[briefId]/route.ts` | 2 | emitEvent |
| `src/app/api/v1/clients/[clientId]/route.ts` | 2 | emitEvent |
| `src/app/api/v1/briefs/route.ts` | 1 | emitEvent |
| `src/app/api/v1/clients/route.ts` | 1 | emitEvent |
| `src/app/api/v1/orders/[orderId]/route.ts` | 1 | emitEvent |
| `src/app/api/v1/orders/route.ts` | 1 | emitEvent |
| `src/app/api/v1/tasks/route.ts` | 1 | emitEvent |
| `src/app/api/v1/integrations/connect/route.ts` | 1 | emitEvent |
| `src/app/api/v1/integrations/[provider]/route.ts` | 1 | emitEvent |
| `src/app/api/v1/projects/route.ts` | 1 | emitEvent |
| `src/lib/events/emitter.ts` | 1 | event handler |

**Recommendation:** Consider logging errors even for fire-and-forget operations. Silent failures in event emission could hide issues.

### OPENAI_API_KEY References
**None found.** All AI calls go through `AGENT_RUNTIME_URL` / agent-builder-client as expected. Comment in `mission-control/chats/[chatId]/messages/route.ts:315` confirms: "OpenAI fallback removed — all LLM calls go through AGENT_RUNTIME_URL."

### Body Validation
Most routes validate required fields inline. No systematic validation middleware (e.g., Zod) is used. Not a bug, but a scalability concern.

---

## Type Safety

### `npx tsc --noEmit` Results

**Main App: 0 errors** (with `node_modules` installed)

**CLI: 0 errors** (with `node_modules` installed)

Both compile cleanly when dependencies are present. Previous audits reported thousands of errors due to missing `node_modules`.

### `as any` Casts (3 total)

| File | Line | Usage |
|------|------|-------|
| `src/app/(dashboard)/finance/cashflow/page.tsx` | 131 | `formatter={(...) as any}` — Recharts typing workaround |
| `src/app/(dashboard)/settings/branding/page.tsx` | 60 | `fontWeight: "var(--weight-heading)" as any` — CSS variable cast |
| `cli/src/commands/modules.ts` | 121 | `(res.data as any).requiredTier` — untyped API response |

### `as Record<string, unknown>` Casts (47 total)
Widespread use for Prisma `Json` fields (`metadata`, `config`, `value`, `channels`, `branding`). This is a known pattern when Prisma returns `JsonValue` type. Acceptable but could benefit from typed helpers.

### `@ts-ignore` / `@ts-expect-error`
**None found.** Clean.

---

## Prisma

### Schema: 51 models, 29 enums

### Unused Models (7 — never queried via `prisma.X`)

| Model | Notes |
|-------|-------|
| `FeatureFlag` | Schema only — no feature flag checks exist in code |
| `TaskAttachment` | Schema only — task file attachment support not implemented |
| `ArtifactReview` | Schema only — artifact review workflow not implemented |
| `NotificationPreference` | Schema only — per-channel notification prefs not implemented |
| `FileVersion` | Schema only — file versioning not implemented |
| `OrderItem` | Created via nested writes in `Order.create()`, never queried directly |
| `InvoiceItem` | Created via nested writes in `Invoice.create()`, never queried directly |

**Note on OrderItem/InvoiceItem:** These are created as nested relations during order/invoice creation but never independently queried. They may still be needed for the nested create pattern — verify before removing.

### Raw SQL Queries (`prisma.$queryRaw`)
**None found.** All queries use Prisma client methods.

---

## Environment Variables

### All Variables Referenced in Code (33 unique)

| Variable | In `.env.example`? | Used In |
|----------|-------------------|---------|
| `DATABASE_URL` | Yes | `src/lib/prisma.ts` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase client, auth routes, CLI |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase client, auth routes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `src/lib/supabase/server.ts`, `src/lib/auth.ts` |
| `STRIPE_SECRET_KEY` | Yes | `src/lib/billing/stripe.ts` |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook routes |
| `STRIPE_PRICE_STARTER` | Yes | `src/lib/billing/stripe.ts` |
| `STRIPE_PRICE_PRO` | Yes | `src/lib/billing/stripe.ts` |
| `STRIPE_PRICE_BUSINESS` | Yes | `src/lib/billing/stripe.ts` |
| `NEXT_PUBLIC_APP_URL` | Yes | Billing redirects |
| `AGENT_RUNTIME_URL` | Yes | 15+ files (primary AI backend) |
| `AGENT_RUNTIME_SECRET` | Yes | Agent runtime auth |
| `AGENT_BUILDER_URL` | Yes | `src/lib/events/processor.ts`, `src/lib/modules/installer.ts` |
| `REDIS_URL` | Yes | Rate limiting (dead file), milestones (dead file), VBX (dead file) |
| `CRON_SECRET` | Yes | Cron routes, admin recalculate |
| `SPOKESTACK_ADMIN_ORG_ID` | Yes | Marketplace admin routes |
| `TELNYX_API_KEY` | Yes | `src/lib/integrations/telnyx.ts` |
| `TELNYX_WEBHOOK_SECRET` | Yes | Telnyx webhook route |
| `TELNYX_MESSAGING_PROFILE_ID` | Yes | Telnyx integration |
| `TELNYX_PUBLIC_KEY` | Yes | Telnyx webhook route |
| `TELNYX_SMS_FROM` | Yes | Notifications (dead file only) |
| `TELNYX_WHATSAPP_FROM` | Yes | Telnyx integration |
| `NANGO_SECRET_KEY` | Yes | Nango client |
| `NANGO_HOST` | Yes | Nango client |
| `EMAIL_SERVICE_URL` | Yes | Notifications (dead file only) |
| `PUSH_SERVICE_URL` | Yes | Notifications (dead file only) |
| `VERCEL_TOKEN` | Yes | Instance configure route |
| `VERCEL_PROJECT_ID` | Yes | Instance configure route |
| `NODE_ENV` | N/A | Standard |
| `NO_COLOR` | N/A | CLI only |
| **`NANGO_BASE_URL`** | **No** | `src/lib/sync/runner.ts:23` — **Missing from `.env.example`** |
| **`SPOKESTACK_API_URL`** | **No** | `cli/src/auth.ts:141` — **Missing from `.env.example`** |
| **`SUPABASE_URL`** | **No** | `cli/src/commands/status.ts:49` — CLI fallback for `NEXT_PUBLIC_SUPABASE_URL` |

### In `.env.example` But Not Referenced in Code

| Variable | Notes |
|----------|-------|
| `DIRECT_URL` | Prisma shadow DB URL — needed for `prisma migrate` but not referenced in app code |
| `NANGO_PUBLIC_KEY` | Listed but never used in `src/` or `cli/` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Listed but never used in `src/` or `cli/` |

### Client-Side Without `NEXT_PUBLIC_` Prefix
No issues found. All client-side env vars properly use `NEXT_PUBLIC_` prefix.

### `AGENT_RUNTIME_URL` vs `AGENT_BUILDER_URL`
**Both are used and serve different purposes:**
- `AGENT_RUNTIME_URL` — Used in **15+ files**: chat, ask, onboarding, mission-control messages, marketplace install/review, module uninstall, context synthesizer. This is the primary AI backend (OpenRouter internally).
- `AGENT_BUILDER_URL` — Used in **2 files**: `src/lib/events/processor.ts` and `src/lib/modules/installer.ts`. This is the event-driven agent execution service.

These are **intentionally separate services**, not an inconsistency.

### Dead Env Var References
`REDIS_URL`, `EMAIL_SERVICE_URL`, `PUSH_SERVICE_URL`, and `TELNYX_SMS_FROM` are only referenced in dead files (`notifications.ts`, `ratelimit.ts`, `milestones/checker.ts`, `vbx/streams.ts`). If those files are deleted, these env vars become fully unused.

---

## UI Pages

**120 page.tsx files** across the app.

### Global Issues
- **No `loading.tsx` files** anywhere — no streaming/Suspense loading states
- **No `error.tsx` files** anywhere — no error boundaries for any route segment

### Dashboard Pages with Issues

| Page | Route | Issue |
|------|-------|-------|
| `lms` | `/lms` | **Empty shell** — UI only, no data fetching |
| `spokechat` | `/spokechat` | **Empty shell** — hardcoded empty `channels` array |
| `finance/cashflow` | `/finance/cashflow` | **Hardcoded currency** — AED formatter hardcoded |
| `settings` | `/settings` | **Hardcoded fallbacks** — `TIMEZONES`, `LANGUAGES`, `FALLBACK_PLANS` arrays |

### Pages with Real Data Integration
Most dashboard pages follow a consistent pattern:
- `"use client"` directive
- Wrapped in `ModuleLayoutShell` with `moduleType` for module-gating
- Data fetching via `/api/v1/*` endpoints with `getAuthHeaders()`
- `useState`/`useEffect`/`useCallback` for state management
- Loading spinners while fetching

**Well-implemented pages:** boards, briefs, settings, canvas, crm, finance, marketplace, mission-control, projects, tasks, orders.

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
| marketplace | `/api/v1/marketplace/browse`, `/api/v1/marketplace/install`, `/api/v1/marketplace/:id` | OK |
| module | `/api/v1/modules`, `/api/v1/modules/install` | OK |
| module-analytics | `/api/v1/marketplace/analytics/:id` | OK |
| module-create | `/api/v1/agents/ask`, `/api/v1/context` | OK |
| module-publish | `/api/v1/marketplace/publish` | OK |
| module-sync | Agent runtime URL | OK |
| module-test | Various test endpoints | OK |
| modules | `/api/v1/modules`, `/api/v1/modules/installed` | OK |
| order | `/api/v1/orders`, `/api/v1/clients` | OK |
| project | `/api/v1/projects` | OK |
| seed | `/api/v1/admin/seed` | OK |
| setup | None (interactive setup) | OK |
| status | Multiple health checks | OK |
| task | `/api/v1/tasks` | OK |
| tenant | `/api/v1/auth`, `/api/v1/modules/install-batch` | OK |
| upgrade | `/api/v1/billing` | OK |
| **workspace** | **`/api/v1/auth/workspaces`**, **`/api/v1/auth/switch`** | **BROKEN — endpoints don't exist** |

### CLI TypeScript (`npx tsc --noEmit`)
**0 errors** with `node_modules` installed.

### Broken Endpoints Summary
4 commands call 6 nonexistent endpoints:
1. `brief review` → `/api/v1/briefs/artifacts/:id` and `/api/v1/briefs/artifacts/:id/review`
2. `connect` → `/api/v1/integrations/slack/connect` and `/api/v1/integrations/whatsapp/connect`
3. `init` → `/api/v1/auth/signup`
4. `workspace` → `/api/v1/auth/workspaces` and `/api/v1/auth/switch`

---

## Security

### 1. Hardcoded Credentials (MEDIUM)
**Hardcoded Supabase fallback credentials in 2 files:**
- `src/app/api/v1/auth/login/route.ts:6-11` — Hardcoded Supabase URL and anon key as fallbacks
- `src/app/api/v1/auth/refresh/route.ts:5-10` — Same hardcoded fallbacks

```typescript
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://dufujpalmzbbwtofpgyv.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_i6oqMxrglFTbVpmzFMtUuA_eehALBQR";
```

While anon keys are designed to be public, misconfigured deployments would silently connect to the wrong project. **Remove fallbacks and require env vars.**

### 2. Stripe Key Initialization (LOW)
`src/lib/billing/stripe.ts:8` — `new Stripe(process.env.STRIPE_SECRET_KEY ?? "")` initializes with empty string if key is missing. Should throw instead.

### 3. Telnyx Webhook Bypass (LOW)
`src/lib/integrations/telnyx.ts` — If `TELNYX_WEBHOOK_SECRET` is not set, signature validation is skipped with a console warning. Webhook payloads accepted without verification.

### 4. Missing Content-Security-Policy (LOW)
`src/middleware.ts` sets security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) but is missing `Content-Security-Policy`, the most impactful XSS prevention header.

### 5. CORS Configuration (OK)
CORS in `vercel.json` is properly restricted:
- `Access-Control-Allow-Origin: https://spokestack-core.vercel.app` (no wildcard)
- Proper method and header restrictions

### No Issues Found
- **No `eval()` or `Function()` usage**
- **No `@ts-ignore` or `@ts-expect-error`**
- **No OPENAI_API_KEY references**
- **No raw SQL queries**
- **All authenticated routes use centralized `authenticate()` from `src/lib/auth.ts`**

---

## Dependencies

### `npm audit`
```
found 0 vulnerabilities
```
**Clean.** No HIGH or CRITICAL vulnerabilities.

### Duplicate Packages
No actual duplicates. Package names like `@types/node` vs `@nangohq/node` share a base name but are distinct packages.

### Node Version Compatibility
- `engines.node` is `>=18`
- Running Node v22.22.2
- No EBADENGINE warnings after `npm install`

### Dependency Count
- 42 total packages (dependencies + devDependencies)
- All install cleanly

---

## Recommended Next Steps

1. **Delete 22 dead files** (~1,200+ lines) — 11 unused library files, 9 unused UI components, 2 dead dashboard components. These add confusion and maintenance burden.

2. **Fix 4 broken CLI commands** — `brief review`, `connect`, `init`, and `workspace` call 6 nonexistent API endpoints. Either create the missing routes or update the CLI to use existing endpoints.

3. **Remove hardcoded Supabase fallback credentials** — `src/app/api/v1/auth/login/route.ts` and `refresh/route.ts` should require env vars, not fall back to a specific Supabase project.

4. **Add `loading.tsx` and `error.tsx` boundary files** — Zero loading states and zero error boundaries across 120 pages. At minimum, add these to the `(dashboard)` layout segment.

5. **Clean up unused Prisma models** — Consider removing `FeatureFlag`, `TaskAttachment`, `ArtifactReview`, `NotificationPreference`, `FileVersion` if they have no planned use. Verify `OrderItem` and `InvoiceItem` are only needed for nested creates.

6. **Wire up or delete empty shell pages** — `lms` and `spokechat` have UI but zero data integration.

7. **Add missing env vars to `.env.example`** — `NANGO_BASE_URL`, `SPOKESTACK_API_URL`. Remove unused: `NANGO_PUBLIC_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

8. **Add `Content-Security-Policy` header** — The middleware has good security headers but is missing CSP.

9. **Consider adding error logging to fire-and-forget catches** — 23 `.catch(() => {})` calls silently swallow errors from event emission. At minimum, log to `console.warn`.

10. **Fix Stripe empty-string initialization** — `src/lib/billing/stripe.ts:8` should throw if `STRIPE_SECRET_KEY` is not set, rather than initializing with `""`.
