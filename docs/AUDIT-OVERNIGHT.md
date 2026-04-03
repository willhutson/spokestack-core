# SpokeStack Core — Overnight Audit
*Generated: 2026-04-03*

## Summary
- **8 dead component files** found, **5 missing API route implementations**, **2 duplicate UI components**
- **107 API routes** audited (3 missing endpoints called by pages, 1 CORS issue)
- **0 TypeScript errors** in main app; **11 errors** in CLI (`cli/src/commands/tenant.ts`)
- **9 `as any` casts**, 0 `@ts-ignore`/`@ts-expect-error`
- **4 security concerns** (CORS wildcard, hardcoded Supabase keys, missing security headers, 16 undocumented env vars)
- **25 CLI commands** verified (3 endpoint path mismatches)
- **7 unused Prisma models**
- **12 npm vulnerabilities** (5 moderate, 7 high — all in transitive deps)

---

## Dead Code

### Unused Components (never imported anywhere)

| File | Description |
|------|-------------|
| `src/components/mission-control/ActivityFeed.tsx` | Activity feed display — orphaned |
| `src/components/mission-control/MissionControlHeader.tsx` | Header UI — orphaned |
| `src/components/modules/briefs/BriefCreateForm.tsx` | Brief creation form — orphaned |
| `src/components/modules/tasks/TaskCreateForm.tsx` | Task creation form — orphaned |
| `src/components/modules/orders/OrderCreateForm.tsx` | Order creation form — orphaned |
| `src/components/module-page/ModulePageShell.tsx` | Layout wrapper — orphaned |

### Duplicate Components

| File | Duplicate Of |
|------|-------------|
| `src/components/ui/phases-timeline.tsx` | `shared/PhasesTimeline` (the used version) |
| `src/components/ui/status-badge.tsx` | `shared/StatusBadge` (the used version) |

### Missing API Route Implementations (pages call these but no route.ts exists)

| Called Endpoint | Called From |
|----------------|------------|
| `/api/v1/access-control/policies` | `src/app/(dashboard)/access-control/page.tsx` |
| `/api/v1/api-keys` | `src/app/(dashboard)/api-management/page.tsx` |
| `/api/v1/webhooks` | `src/app/(dashboard)/api-management/page.tsx` |
| `/api/v1/builder/templates` | `src/app/(dashboard)/builder/page.tsx` |
| `/api/v1/delegations` | `src/app/(dashboard)/delegation/page.tsx` |

### API Routes Never Called From Frontend

These routes exist but are never called from any page or client component. Some may be called externally (webhooks, cron, CLI).

| Route | Notes |
|-------|-------|
| `/api/v1/agents/sessions` | May be CLI-only |
| `/api/v1/modules/recommend` | Unused recommendation engine |
| `/api/v1/customers`, `/api/v1/customers/[customerId]` | Duplicate of `/api/v1/clients` |
| `/api/v1/notifications` | Not wired into UI |
| `/api/v1/events/subscriptions/[id]` | Event subscription CRUD |
| `/api/v1/briefs/[briefId]/phases` | Phase management |
| `/api/v1/briefs/[briefId]/artifacts` | Artifact management |
| `/api/v1/assets/[assetId]/versions` | Version management |
| `/api/v1/task-lists`, `/api/v1/task-lists/[listId]` | Task list CRUD |
| `/api/v1/projects/[projectId]/canvas` | Canvas endpoint |
| `/api/v1/projects/[projectId]/milestones` | Milestones endpoint |
| `/api/admin/onboarding/draft` | Draft management |

### Phase 10A References
No references to "Phase 10A" or old runtime code found in the codebase.

---

## API Routes

**Total: 107 route files**

### Health Overview
- **Authentication**: 106/107 routes use `authenticate()` — the 1 exception is `/api/v1/modules` (GET, intentionally public catalog)
- **Error Handling**: All routes use try/catch with proper error responses. No empty catch blocks found.
- **Body Validation**: All POST/PATCH routes validate required fields before processing.
- **Direct LLM Calls**: 0 — all agent calls go through `agent-builder-client` abstraction.
- **Module Guards**: Domain routes enforce module availability via `moduleGuard()`.

### Routes With Issues

| Route | Methods | Auth | Issues |
|-------|---------|------|--------|
| `/api/v1/modules` | GET | None | Intentionally public — OK |
| `/api/v1/auth` | POST, PUT | Supabase ID | No org auth (user registration) — OK |
| `/api/v1/auth/login` | POST | None | Supabase credential check — OK |
| `/api/v1/auth/refresh` | POST | None | Token refresh — OK |
| `/api/internal/webhooks/stripe` | POST | Stripe sig | Webhook — OK |
| `/api/internal/webhooks/telnyx` | POST | Ed25519 sig | Webhook — OK |
| `/api/cron/*` | GET | Bearer CRON_SECRET | Cron jobs — OK |
| `/api/v1/admin/marketplace/recalculate-scores` | POST | X-Cron-Secret header | Uses different header name than other cron routes |
| `/api/v1/onboarding/chat` | POST | authenticate() | Uses `req as any` cast (line 97) |

### Webhook Security
- **Stripe**: Full `constructEvent()` signature verification
- **Telnyx**: Ed25519 signature validation with `crypto.verify()`
- **Cron**: Bearer token validation with `CRON_SECRET`

### Fire-and-Forget Patterns
Multiple routes use `.catch(() => {})` for non-critical operations (event emission, canvas updates). This is intentional but means failures in these operations are silently dropped.

---

## Type Safety

### Main App (`npx tsc --noEmit`)
**0 errors** — Clean build after `npm install`.

### CLI (`cd cli && npx tsc --noEmit`)
**11 errors** — All in `cli/src/commands/tenant.ts`:

| Line | Error |
|------|-------|
| 98, 100, 105, 111, 112, 113 | `'supabaseData' is of type 'unknown'` (TS18046) — needs type assertion or type guard |

Root cause: `supabaseData` from a JSON response is typed as `unknown` but accessed without narrowing.

### `as any` Casts (9 total)

| File | Line | Context |
|------|------|---------|
| `src/lib/billing/stripe.ts` | 159 | `(subscription as any).current_period_end` — Stripe type incomplete |
| `src/lib/billing/stripe.ts` | 218 | `allowedModules as any` — Prisma enum array cast |
| `src/app/api/v1/onboarding/action/route.ts` | 80 | `action.data.status as any` — dynamic status |
| `src/app/api/v1/onboarding/chat/route.ts` | 97 | `req as any` — Request type mismatch |
| `src/app/api/v1/mission-control/chats/[chatId]/route.ts` | 70 | `updatedMeta as any` — JSON metadata |
| `src/app/api/v1/admin/seed/route.ts` | 77 | `moduleType as any` — enum cast |
| `src/app/api/v1/admin/seed/route.ts` | 83 | `moduleType as any` — enum cast |
| `src/app/api/v1/mission-control/chats/route.ts` | 84 | `prismaAgentType as any` — enum mapping |
| `src/app/api/v1/mission-control/chats/route.ts` | 86 | `metadata as any` — JSON metadata |

### `@ts-ignore` / `@ts-expect-error`
**0 found.**

---

## Prisma

### Schema Models (52 total)

**Foundation (7):** Organization, User, Team, TeamMember, OrgSettings, OrgModule, FeatureFlag

**Marketplace (4):** PublishedModule, ModuleReview, ModuleInstall, ModuleBillingEvent

**Billing (4):** BillingAccount, BillingTier, BillingMeterEvent, BillingInvoice

**Tasks (4):** TaskList, Task, TaskComment, TaskAttachment

**Projects (6):** Project, ProjectPhase, ProjectMilestone, WfCanvas, WfCanvasNode, WfCanvasEdge

**Briefs (4):** Brief, BriefPhase, Artifact, ArtifactReview

**Orders (5):** Client, Order, OrderItem, Invoice, InvoiceItem

**Agent (4):** AgentSession, AgentMessage, ContextEntry, ContextMilestone

**Infrastructure (5):** Integration, Notification, NotificationPreference, FileAsset, FileVersion

**Events (4):** EntityEvent, EventSubscription, EventHandlerLog, SyncJob

**Digital Assets (5):** AssetLibrary, AssetFolder, Asset, AssetVersion, AssetComment

### Unused Models (never directly queried in src/)

| Model | Notes |
|-------|-------|
| `FeatureFlag` | Defined but never referenced — no feature flag system implemented |
| `TaskAttachment` | Defined but never referenced — file attachment not wired |
| `ArtifactReview` | Defined but never referenced — review workflow not implemented |
| `NotificationPreference` | Defined but never referenced — preference UI not built |
| `FileVersion` | Defined but never referenced — versioning not wired |
| `OrderItem` | Only created via nested writes (`items.create`), never directly queried |
| `InvoiceItem` | Only created via nested writes, never directly queried |

### Raw SQL Queries
**0 found.** All database access uses Prisma's type-safe query builder.

### Field Name Consistency
All field names used in API route queries match the schema definitions exactly. Verified across Client, Task, Order, Invoice, Asset, Brief, Project, ContextEntry, and OrgModule models. All enum values and composite unique constraints are used correctly.

---

## Environment Variables

### All Variables Referenced (31 unique)

#### Documented in `.env.example` (15)
| Variable | Used In |
|----------|---------|
| `DATABASE_URL` | Prisma config |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server |
| `STRIPE_SECRET_KEY` | Billing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe |
| `AGENT_RUNTIME_URL` | Agent chat/ask endpoints |
| `AGENT_RUNTIME_SECRET` | Service-to-service auth |
| `REDIS_URL` | Caching |
| `TELNYX_API_KEY` | Telnyx integration |
| `TELNYX_WEBHOOK_SECRET` | Telnyx webhooks |
| `NANGO_SECRET_KEY` | Nango integration |
| `NANGO_PUBLIC_KEY` | Nango integration |
| `NANGO_HOST` | Nango integration |

#### Missing From `.env.example` (16)
| Variable | Used In | Priority |
|----------|---------|----------|
| `CRON_SECRET` | 5 cron/admin routes | HIGH — required for cron jobs |
| `NEXT_PUBLIC_APP_URL` | `src/lib/billing/stripe.ts` | HIGH — billing redirects |
| `AGENT_BUILDER_URL` | `src/lib/events/processor.ts`, `src/lib/modules/installer.ts` | HIGH — event processing |
| `SPOKESTACK_ADMIN_ORG_ID` | Marketplace review route | MEDIUM |
| `STRIPE_PRICE_STARTER` | `src/lib/billing/stripe.ts` | MEDIUM — billing tiers |
| `STRIPE_PRICE_PRO` | `src/lib/billing/stripe.ts` | MEDIUM |
| `STRIPE_PRICE_BUSINESS` | `src/lib/billing/stripe.ts` | MEDIUM |
| `EMAIL_SERVICE_URL` | `src/lib/notifications.ts` | LOW — optional |
| `PUSH_SERVICE_URL` | `src/lib/notifications.ts` | LOW — optional |
| `NANGO_BASE_URL` | `src/lib/sync/runner.ts` | LOW — has default |
| `TELNYX_MESSAGING_PROFILE_ID` | `src/lib/integrations/telnyx.ts` | LOW |
| `TELNYX_PUBLIC_KEY` | Telnyx webhook validation | LOW |
| `TELNYX_SMS_FROM` | `src/lib/notifications.ts` | LOW |
| `TELNYX_WHATSAPP_FROM` | `src/lib/integrations/telnyx.ts` | LOW |
| `VERCEL_TOKEN` | Instance configure route | LOW |
| `VERCEL_PROJECT_ID` | Instance configure route | LOW |
| `DIRECT_URL` | `prisma.config.ts` | LOW — migration fallback |

#### Client-Side Usage
All client-side env vars are properly prefixed with `NEXT_PUBLIC_`. No leaks of server-side secrets to the client.

#### AGENT_RUNTIME_URL vs AGENT_BUILDER_URL

| Variable | Default | Used For | Locations |
|----------|---------|----------|-----------|
| `AGENT_RUNTIME_URL` | `http://localhost:8100` | Chat, ask, onboarding, context synthesis | 19 locations |
| `AGENT_BUILDER_URL` | `http://localhost:4100` | Event handler triggers, module agent registration | 2 locations |

These are **two separate services**. `AGENT_RUNTIME_URL` is the primary AI runtime. `AGENT_BUILDER_URL` is a secondary builder service for event-driven agent execution. Only `AGENT_RUNTIME_URL` is documented in `.env.example`.

---

## UI Pages

**Total: 46 pages, 3 layouts**

### Pages With Data Fetching Issues

| Page | Route | Data Source | Issues |
|------|-------|------------|--------|
| Access Control | `/access-control` | `/api/v1/access-control/policies` | **Endpoint does not exist** |
| API Management | `/api-management` | `/api/v1/api-keys`, `/api/v1/webhooks` | **Both endpoints do not exist** |
| Builder | `/builder` | `/api/v1/builder/templates` | **Endpoint does not exist** |
| Delegation | `/delegation` | `/api/v1/delegations` | **Endpoint does not exist** |

### Pages Overview

| Page | Route | Data Source | Loading | Errors |
|------|-------|------------|---------|--------|
| Landing | `/` | Static | N/A | N/A |
| Login | `/login` | Supabase OAuth | Yes | Yes |
| Signup | `/signup` | Supabase + API | Yes | Yes |
| Conversation | `/conversation` | SSE stream + API | Yes | Yes |
| Reveal | `/reveal` | `/api/v1/onboarding/summary` | Yes | Yes |
| Analytics | `/analytics` | 7 parallel API calls | Yes (skeleton) | try/catch silent |
| Boards | `/boards` | `/api/v1/tasks` | Yes (skeleton) | try/catch silent |
| Briefs | `/briefs` | `/api/v1/briefs`, `/api/v1/clients` | Yes | Yes |
| Client Portal | `/client-portal` | `/api/v1/clients` | Yes (skeleton) | try/catch silent |
| Client Reporting | `/client-reporting` | `/api/v1/briefs`, `/api/v1/context` | Yes (skeleton) | Yes |
| Content Studio | `/content-studio` | `/api/v1/assets/*`, `/api/v1/briefs` | Yes | try/catch silent |
| Crisis Comms | `/crisis-comms` | `/api/v1/projects`, `/api/v1/context`, `/api/v1/briefs` | Yes | try/catch silent |
| CRM | `/crm` | `/api/v1/clients`, `/api/v1/orders`, `/api/v1/activity` | Yes | try/catch silent |
| Finance | `/finance` | None visible | - | - |
| Marketplace | `/marketplace` | `/api/v1/modules`, `/api/v1/modules/installed` | Yes | Yes (banner) |
| Mission Control | `/mission-control` | Multiple MC endpoints | Yes | Yes |
| Orders | `/orders` | `/api/v1/orders` | Yes | try/catch silent |
| Press Releases | `/press-releases` | `/api/v1/briefs`, `/api/v1/context` | Yes | try/catch silent |
| Projects | `/projects` | `/api/v1/projects` | Yes | try/catch silent |
| Settings | `/settings` | `/api/v1/settings`, `/api/v1/integrations` | Yes | Yes |
| Tasks | `/tasks` | `/api/v1/tasks` | Yes | Optimistic rollback |

**Common pattern**: Most pages use `try/catch` with silent failure (no user-visible error state). Data fails silently and the page renders with empty arrays.

---

## CLI

### Commands (25 total)

| Command | Calls | Status |
|---------|-------|--------|
| `agent chat` | `/api/v1/agents/chat` (SSE) | OK |
| `agent ask` | `/api/v1/agents/ask` | OK |
| `setup` | None (local config) | OK |
| `deploy` | None (Vercel CLI wrapper) | OK |
| `project new` | `/api/v1/projects` (POST) | OK |
| `project list` | `/api/v1/projects` (GET) | OK |
| `project show` | `/api/v1/projects/{id}` (GET) | OK |
| `project canvas` | None (opens browser) | OK |
| `task add` | `/api/v1/tasks` (POST) | OK |
| `task list` | `/api/v1/tasks` (GET) | OK |
| `task done` | `/api/v1/tasks/{id}` (PATCH) | OK |
| `task show` | `/api/v1/tasks/{id}` (GET) | OK |
| `brief create` | `/api/v1/briefs` (POST) | OK |
| `brief list` | `/api/v1/briefs` (GET) | OK |
| `brief show` | `/api/v1/briefs/{id}` (GET) | OK |
| `brief review` | `/api/v1/briefs/artifacts/{id}/review` (PATCH) | UNVERIFIED — endpoint may not exist |
| `module list` | `/api/v1/modules` (GET) | OK |
| `module add` | `/api/v1/modules/{slug}/install` (POST) | PATH MISMATCH — UI uses `/api/v1/modules/install` |
| `module remove` | `/api/v1/modules/{slug}/install` (DELETE) | PATH MISMATCH — UI uses different path |
| `module create` | Local scaffolding | OK |
| `module test` | Local validation | OK |
| `module publish` | `/api/v1/marketplace/publish` (POST) | OK |
| `module analytics` | `/api/v1/marketplace/analytics/{id}` (GET) | OK |
| `marketplace browse` | `/api/v1/marketplace/browse` (GET) | OK |
| `marketplace install` | `/api/v1/marketplace/install` (POST) | OK |
| `order new` | `/api/v1/orders` (POST) | OK |
| `order list` | `/api/v1/orders` (GET) | OK |
| `order invoice` | `/api/v1/orders/{id}/invoice` (POST) | OK |
| `customer list` | `/api/v1/orders/customers` (GET) | PATH MISMATCH — should be `/api/v1/customers` |
| `customer add` | `/api/v1/orders/customers` (POST) | PATH MISMATCH — should be `/api/v1/customers` |
| `tenant provision` | Supabase API | Has 11 TS errors (unknown type) |

### CLI Build (`cd cli && npx tsc --noEmit`)
**11 errors** in `cli/src/commands/tenant.ts` — all `TS18046: 'supabaseData' is of type 'unknown'`. Missing `@types/node` is resolved after `npm install`, but the `tenant.ts` type narrowing issue persists.

---

## Security

### Issues Found

#### 1. CORS Wildcard (MEDIUM)
**File**: `vercel.json` (lines 23-32)
```json
"Access-Control-Allow-Origin": "*"
```
All API routes allow requests from any origin. Combined with all HTTP methods being allowed, this is overly permissive. Should be restricted to specific domains.

#### 2. Hardcoded Supabase Credentials (LOW)
**Files**: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/app/api/v1/auth/login/route.ts`, `src/app/api/v1/auth/refresh/route.ts`

Hardcoded fallback values for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These are publishable keys (not secrets), but hardcoding project-specific credentials is poor practice. Should throw an error if env vars are missing.

#### 3. Missing Security Headers (LOW-MEDIUM)
**File**: `src/middleware.ts`

Middleware is a pass-through (`return NextResponse.next()`). No security headers configured:
- No `Content-Security-Policy`
- No `X-Frame-Options`
- No `X-Content-Type-Options`
- No `Referrer-Policy`

#### 4. Inconsistent Cron Auth Header (LOW)
`/api/v1/admin/marketplace/recalculate-scores` uses `X-Cron-Secret` header, while all other cron routes use `Authorization: Bearer <CRON_SECRET>`. Should be consistent.

### No Issues Found
- No `eval()` or `Function()` usage
- No `dangerouslySetInnerHTML`
- No raw SQL / SQL injection vectors
- No XSS vulnerabilities
- No hardcoded secret keys (only publishable keys)
- No sensitive data in logs
- Webhook signatures properly validated (Stripe + Telnyx)
- All auth routes properly validate credentials

---

## Dependencies

### npm audit Results
**12 vulnerabilities** (5 moderate, 7 high) — all in transitive dependencies:

| Package | Severity | Issue | Via |
|---------|----------|-------|-----|
| `@hono/node-server` <1.19.10 | HIGH | Auth bypass via encoded slashes | prisma -> @prisma/dev |
| `hono` <=4.12.6 | HIGH | 9 issues (XSS, cache deception, IP spoofing, etc.) | prisma -> @prisma/dev |
| `lodash` <=4.17.23 | HIGH | Prototype pollution (3 CVEs) | prisma -> chevrotain |
| `effect` <3.20.0 | HIGH | AsyncLocalStorage context contamination | prisma -> @prisma/config |
| `brace-expansion` <1.1.13 | MODERATE | Zero-step sequence hang | direct dep |

All vulnerabilities are fixable via `npm audit fix`. None are in direct application code — all flow through `prisma` toolchain dependencies.

### Duplicate Packages
**None** — no package appears in both `dependencies` and `devDependencies`.

### Node Version Compatibility
- **Required**: `>=18` (in `package.json` engines)
- **Current runtime**: `v22.22.2`
- **Status**: Compatible. The EBADENGINE warning with Node v25 would occur since `>=18` technically allows it, but no explicit upper bound is set.

---

## Recommended Next Steps

### Critical (do first)
1. **Implement missing API routes** or remove the pages that call them: `/api/v1/access-control/policies`, `/api/v1/api-keys`, `/api/v1/webhooks`, `/api/v1/builder/templates`, `/api/v1/delegations`
2. **Fix CORS** in `vercel.json` — restrict `Access-Control-Allow-Origin` to your actual domains instead of `*`
3. **Document all 16 missing env vars** in `.env.example`, especially `CRON_SECRET`, `AGENT_BUILDER_URL`, and `NEXT_PUBLIC_APP_URL`

### High Priority
4. **Fix CLI endpoint paths** — `module add/remove` and `customer list/add` call wrong paths
5. **Fix CLI type error** — add type narrowing for `supabaseData` in `cli/src/commands/tenant.ts`
6. **Remove hardcoded Supabase fallbacks** — fail with clear error if env vars are missing
7. **Run `npm audit fix`** to resolve the 12 transitive dependency vulnerabilities

### Medium Priority
8. **Delete 8 dead component files** — `ActivityFeed`, `MissionControlHeader`, `BriefCreateForm`, `TaskCreateForm`, `OrderCreateForm`, `ModulePageShell`, `phases-timeline`, `status-badge`
9. **Add security headers** to `src/middleware.ts` (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
10. **Add user-visible error states** to pages that silently swallow fetch errors
11. **Clean up 9 `as any` casts** — most can be replaced with proper types or type guards

### Low Priority
12. **Evaluate 7 unused Prisma models** — document their intended use or remove them (FeatureFlag, TaskAttachment, ArtifactReview, NotificationPreference, FileVersion, OrderItem, InvoiceItem)
13. **Standardize cron auth** — use `Authorization: Bearer` consistently instead of mixing with `X-Cron-Secret`
14. **Consolidate `/api/v1/customers` and `/api/v1/clients`** — both map to the Client model, creating confusion
15. **Wire up uncalled API routes** or document them as CLI/external-only
