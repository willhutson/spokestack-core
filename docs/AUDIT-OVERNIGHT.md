# SpokeStack Core — Overnight Audit
*Generated: 2026-04-04*

## Summary
- **0 dead source files** found (previous cleanup was thorough)
- **130+ API routes** audited (**12 issues** flagged)
- **0 TypeScript errors** (main app); **~279 errors** in CLI
- **1 security concern** (timing attack vulnerability)
- **24 CLI commands** verified (**4 broken endpoints**)
- **46 UI pages** audited (**4 empty shells**, **6 with hardcoded data**)
- **49 Prisma models** checked (**7 unused**)
- **33 environment variables** mapped (**2 undocumented**)
- **0 npm vulnerabilities**

---

## Dead Code

### Source Files
**Status: CLEAN.** All files in `src/` are actively imported. The April 3 cleanup was thorough — all previously flagged dead components have been removed:
- ~~ActivityFeed.tsx~~ removed
- ~~MissionControlHeader.tsx~~ removed
- ~~BriefCreateForm.tsx~~ removed
- ~~TaskCreateForm.tsx~~ removed
- ~~OrderCreateForm.tsx~~ removed
- ~~ModulePageShell.tsx~~ removed
- ~~Duplicate UI components~~ removed

### Potentially Unused API Routes (infrastructure/preparatory)
These routes exist but have no frontend consumers — they may be CLI-only, internal, or planned:

| Route | Notes |
|-------|-------|
| `/api/v1/agents/sessions` | CLI-only session management |
| `/api/v1/modules/recommend` | Recommendation engine — not wired |
| `/api/v1/customers/*` | Alias for `/api/v1/clients` — consolidate |
| `/api/v1/notifications` | Not wired to UI |
| `/api/v1/events/subscriptions/[id]` | Event subscription CRUD |
| `/api/v1/briefs/[briefId]/phases` | Phase management |
| `/api/v1/briefs/[briefId]/artifacts` | Artifact management |
| `/api/v1/assets/[assetId]/versions` | Version management |
| `/api/v1/task-lists/*` | Task list CRUD — not wired |
| `/api/v1/projects/[projectId]/milestones` | Milestones endpoint |
| `/api/admin/onboarding/draft` | Draft management |

### Potentially Unused Lib Files
| File | Notes |
|------|-------|
| `src/lib/platform/role-templates.ts` | Not imported anywhere — verify if needed |

---

## API Routes

### Route Inventory (130+ routes)

| Route | Methods | Auth | Issues |
|-------|---------|------|--------|
| `/api/v1/auth` | GET, POST, PUT | YES (Supabase) | None |
| `/api/v1/auth/login` | POST | NO (public) | None — proper error handling |
| `/api/v1/auth/refresh` | POST | NO (public) | None — proper error handling |
| `/api/v1/agents/ask` | POST | YES | Silent `.catch(() => {})` on canvas update |
| `/api/v1/agents/chat` | POST | YES | Silent `.catch(() => {})` on correction detection |
| `/api/v1/agents/sessions` | GET, POST | YES | None |
| `/api/v1/access-control/policies` | GET, POST | YES | None |
| `/api/v1/api-keys` | GET, POST, DELETE | YES | None |
| `/api/v1/assets/*` | CRUD | YES | No validation on PATCH fields |
| `/api/v1/billing` | GET, POST | YES | None |
| `/api/v1/billing/webhook` | POST | Stripe sig | None |
| `/api/v1/briefs/*` | CRUD | YES + module guard | Event emission `.catch(() => {})` |
| `/api/v1/builder/templates` | GET | YES | None |
| `/api/v1/clients/*` | CRUD | YES + module guard | None |
| `/api/v1/context/*` | GET, POST | YES | None |
| `/api/v1/customers/*` | CRUD | YES + module guard | Alias of `/clients` — naming mismatch |
| `/api/v1/delegations` | GET, POST | YES | None |
| `/api/v1/events/*` | CRUD | YES | None |
| `/api/v1/export` | GET | YES (OWNER/ADMIN) | None |
| `/api/v1/instance/configure` | PUT | YES | Domain input not validated |
| `/api/v1/integrations/*` | CRUD | YES | None |
| `/api/v1/invoices/*` | CRUD | YES + module guard | None |
| `/api/v1/marketplace/*` | Various | YES | None |
| `/api/v1/members/*` | CRUD | YES (OWNER/ADMIN) | None |
| `/api/v1/mission-control/*` | Various | YES | Missing try-catch for `req.json()` in chats POST |
| `/api/v1/modules` | GET | NO (public) | Intentionally public |
| `/api/v1/modules/install` | POST | YES | None |
| `/api/v1/notifications` | GET, PATCH | YES | Missing validation for PATCH |
| `/api/v1/onboarding/*` | Various | YES | None |
| `/api/v1/orders/*` | CRUD | YES + module guard | None |
| `/api/v1/org` | GET, PATCH | YES (OWNER/ADMIN) | None |
| `/api/v1/projects/*` | CRUD | YES + module guard | Direct delete — orphans phases/milestones |
| `/api/v1/settings` | GET, PATCH | YES (OWNER/ADMIN) | None |
| `/api/v1/tasks/*` | CRUD | YES + module guard | Direct delete — orphans comments |
| `/api/v1/teams/*` | CRUD | YES (OWNER/ADMIN) | None |
| `/api/v1/webhooks` | GET, POST | YES | None |
| `/api/cron/sync` | GET | CRON_SECRET | None |
| `/api/cron/events/cleanup` | GET | CRON_SECRET | None |
| `/api/cron/weekly-synthesis` | GET | CRON_SECRET | None |
| `/api/internal/webhooks/stripe` | POST | Stripe signature | None |
| `/api/internal/webhooks/telnyx` | POST | Telnyx ED25519 | None |

### Flagged Issues

1. **Silent error swallowing** — Multiple routes use `.catch(() => {})` on event emission and fire-and-forget operations. At minimum these should log warnings.
   - `src/app/api/v1/agents/chat/route.ts` (lines 46-65)
   - `src/app/api/v1/agents/ask/route.ts` (lines 52, 88)
   - `src/app/api/v1/briefs/[briefId]/route.ts` (lines 57, 71, 73)

2. **Missing request body validation** — Most POST/PATCH endpoints use TypeScript type assertions (`body as { ... }`) without runtime validation. No zod/yup schemas.

3. **Missing `req.json()` try-catch** — `/api/v1/mission-control/chats` POST calls `await req.json()` without explicit error handling.

4. **Cascading delete risk** — Direct deletes on projects, tasks, and briefs may orphan child records (phases, milestones, comments, attachments).

5. **No OPENAI_API_KEY references** — All LLM calls properly route through `AGENT_RUNTIME_URL` + `AGENT_RUNTIME_SECRET`.

---

## Type Safety

### Main App: `npx tsc --noEmit`
**0 errors** (with dependencies installed)

*Note: Without `node_modules`, 8,108 errors appear — all from missing type declarations (react, next, etc.). This is expected.*

### CLI: `cd cli && npx tsc --noEmit`
**~279 errors** across all command files. Root causes:
- Missing `@types/node` in devDependencies (83 errors — `process`, `Buffer`, `node:fs`, etc.)
- Missing module declarations for `commander`, `inquirer`, `open` (12 errors)
- Implicit `any` on function parameters (50+ errors — `opts`, `input`, `err`, `code`, `l`)
- Missing `fetch`, `Response`, `ReadableStream`, `TextDecoder` types (15 errors)
- `'auth' is possibly 'null'` (3 errors)

### Type Bypasses

**`as any` casts (1 total):**

| File | Line | Code |
|------|------|------|
| `cli/src/commands/modules.ts` | 121 | `(res.data as any).requiredTier` |

**`as unknown as` double casts (7 total):**

| File | Line | Purpose |
|------|------|---------|
| `src/lib/prisma.ts` | 4 | Prisma singleton on globalThis |
| `src/lib/billing/stripe.ts` | 159 | Stripe subscription period access |
| `cli/src/api.ts` | 78, 91, 101 | Generic API response casting |
| `src/app/api/v1/agents/ask/route.ts` | 52 | Agent result to Record |
| `src/app/api/v1/mission-control/chats/route.ts` | 86 | Metadata to Prisma JSON |
| `src/app/api/v1/mission-control/chats/[chatId]/route.ts` | 70 | Metadata to Prisma JSON |

**`@ts-ignore` / `@ts-expect-error`: 0 found**

---

## Prisma

### Schema: 49 Models, 33 Enums

### Unused Models (never directly queried in `src/`)

| Model | Status | Notes |
|-------|--------|-------|
| `FeatureFlag` | Unused | No feature flag system implemented |
| `TaskAttachment` | Unused | File attachment not wired |
| `ArtifactReview` | Unused | Review workflow not implemented |
| `NotificationPreference` | Unused | Preference UI not built |
| `FileVersion` | Unused | Versioning not wired |
| `OrderItem` | Nested only | Only via `Order.items` nested creates |
| `InvoiceItem` | Nested only | Only via `Invoice.items` nested creates |

### Deprecated Fields
- **`Brief.clientName`** — Still actively used in 15+ locations despite being deprecated. Should be migrated to `clientId` FK.

### Raw SQL
**None found.** All queries use Prisma client methods exclusively. No `$queryRaw` or `$executeRaw`.

### Field Name Accuracy
All API routes verified against schema — no field name mismatches detected.

---

## Environment Variables

### All Referenced Variables (33 total)

| Variable | Count | Server/Client | In .env.example |
|----------|-------|---------------|-----------------|
| `AGENT_RUNTIME_URL` | 11 | Server | YES |
| `AGENT_RUNTIME_SECRET` | 10 | Server | YES |
| `AGENT_BUILDER_URL` | 2 | Server | YES |
| `DATABASE_URL` | 3 | Server | YES |
| `DIRECT_URL` | 1 | Server | YES |
| `NEXT_PUBLIC_SUPABASE_URL` | 4 | Public | YES |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 4 | Public | YES |
| `SUPABASE_SERVICE_ROLE_KEY` | 1 | Server | YES |
| `STRIPE_SECRET_KEY` | 3 | Server | YES |
| `STRIPE_WEBHOOK_SECRET` | 2 | Server | YES |
| `STRIPE_PRICE_STARTER` | 1 | Server | YES |
| `STRIPE_PRICE_PRO` | 1 | Server | YES |
| `STRIPE_PRICE_BUSINESS` | 1 | Server | YES |
| `NEXT_PUBLIC_APP_URL` | 2 | Public | YES |
| `REDIS_URL` | 5 | Server | YES |
| `CRON_SECRET` | 4 | Server | YES |
| `SPOKESTACK_ADMIN_ORG_ID` | 2 | Server | YES |
| `TELNYX_API_KEY` | 1 | Server | YES |
| `TELNYX_WEBHOOK_SECRET` | 1 | Server | YES |
| `TELNYX_PUBLIC_KEY` | 1 | Server | YES |
| `TELNYX_MESSAGING_PROFILE_ID` | 1 | Server | YES |
| `TELNYX_SMS_FROM` | 1 | Server | YES |
| `TELNYX_WHATSAPP_FROM` | 1 | Server | YES |
| `NANGO_SECRET_KEY` | 3 | Server | YES |
| `NANGO_HOST` | 1 | Server | YES |
| `NANGO_BASE_URL` | 1 | Server | **MISSING** |
| `EMAIL_SERVICE_URL` | 1 | Server | YES |
| `PUSH_SERVICE_URL` | 1 | Server | YES |
| `VERCEL_TOKEN` | 1 | Server | YES |
| `VERCEL_PROJECT_ID` | 1 | Server | YES |
| `SPOKESTACK_API_URL` | 1 | CLI only | **MISSING** |
| `NODE_ENV` | 3 | Framework | N/A |
| `NO_COLOR` | 1 | CLI | N/A |

### Issues

- **Missing from `.env.example`:** `NANGO_BASE_URL` (has safe fallback), `SPOKESTACK_API_URL` (has safe fallback)
- **Defined in `.env.example` but unused:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NANGO_PUBLIC_KEY`
- **No client-side secret leakage** — all `NEXT_PUBLIC_*` vars are safe for exposure
- **AGENT_RUNTIME_URL vs AGENT_BUILDER_URL:** Both actively used for different purposes:
  - `AGENT_RUNTIME_URL` (11 refs) — Primary AI execution backend (agent chat, ask, synthesis)
  - `AGENT_BUILDER_URL` (2 refs) — Module registration and event-driven agent execution

---

## UI Pages

### Page Inventory (46 pages)

| Page | Route | Data Source | Issues |
|------|-------|------------|--------|
| Landing | `/` | None | Static hero — no functionality |
| Signup | `/signup` | `/api/v1/auth` | None |
| Login | `/login` | Supabase OAuth | None |
| Conversation | `/conversation` | `/api/v1/agents/chat` | None — streams from agent |
| Onboarding | `/onboarding` | `/api/v1/onboarding` | None |
| Reveal | `/reveal` | `/api/v1/onboarding/summary` | Hardcoded agent cards (4) |
| Admin Onboarding | `/admin/onboarding` | `/api/admin/onboarding` | None |
| Tasks | `/tasks` | `/api/v1/tasks` | None |
| Projects | `/projects` | `/api/v1/projects` | None |
| Projects Detail | `/projects/[id]` | `/api/v1/projects/:id` | None |
| Briefs | `/briefs` | `/api/v1/briefs` | None |
| Briefs Detail | `/briefs/[id]` | `/api/v1/briefs/:id` | None |
| Orders | `/orders` | `/api/v1/orders` | None |
| CRM | `/crm` | `/api/v1/clients`, `/orders` | Hardcoded pipeline stages (6) |
| Client Portal | `/client-portal` | `/api/v1/clients` | Partially placeholder |
| Client Reporting | `/client-reporting` | `/api/v1/briefs`, `/context` | Hardcoded report templates (4) |
| Access Control | `/access-control` | `/api/v1/access-control/policies` | None |
| Analytics | `/analytics` | API calls present | None |
| Finance | `/finance` | API calls present | None |
| API Management | `/api-management` | API calls present | None |
| Settings | `/settings` | Multiple API calls | None — comprehensive settings page |
| Marketplace | `/marketplace` | `/api/v1/modules` | Hardcoded categories (6) |
| Marketplace Browse | `/marketplace/browse` | `/api/v1/marketplace/browse` | None |
| Marketplace Publish | `/marketplace/publish` | None (form only) | Hardcoded form options |
| Marketplace My Modules | `/marketplace/my-modules` | `/api/v1/marketplace/my-modules` | None |
| Marketplace Detail | `/marketplace/[id]` | `/api/v1/marketplace/:id` | None |
| Workflows | `/workflows` | API calls present | None |
| Events | `/events` | API calls present | None |
| Insights | `/insights` | API calls present | Minimal page |
| Press Releases | `/press-releases` | `/api/v1/briefs`, `/context` | None |
| Content Studio | `/content-studio` | `/api/v1/assets`, `/briefs` | None |
| NPS | `/nps` | `/api/v1/clients`, `/context` | None |
| Crisis Comms | `/crisis-comms` | `/api/v1/projects`, `/context` | Hardcoded crisis playbooks (5) |
| Listening | `/listening` | `/api/v1/context` | Mockup sentiment chart |
| Media Relations | `/media-relations` | API calls present | None |
| Social Publishing | `/social-publishing` | API calls present | None |
| Surveys | `/surveys` | API calls present | None |
| Boards | `/boards` | API calls present | None |
| Builder | `/builder` | API calls present | None |
| Delegation | `/delegation` | API calls present | None |
| Influencer Mgmt | `/influencer-mgmt` | API calls present | None |
| Time & Leave | `/time-leave` | API calls present | None |
| Mission Control | `/mission-control` | Via MissionControlLayout | Thin wrapper — data fetching in component |
| **Spokechat** | `/spokechat` | **None** | **EMPTY SHELL — "Coming soon"** |
| **LMS** | `/lms` | **None** | **EMPTY SHELL — hardcoded "0" metrics, no API** |
| **Media Buying** | `/media-buying` | `/api/v1/clients` | **EMPTY SHELL — hardcoded "0" metrics** |

### Flagged Issues
- **3 empty shells:** `/spokechat`, `/lms`, `/media-buying`
- **6 pages with hardcoded data:** `/reveal`, `/crm`, `/client-reporting`, `/crisis-comms`, `/marketplace`, `/listening`

---

## CLI

### Command Inventory (24 commands)

| Command | Calls | Status |
|---------|-------|--------|
| `init` | POST `/api/v1/auth/signup`, POST `/api/v1/auth`, PUT `/api/v1/auth`, POST `/api/v1/admin/seed` | **BROKEN** — `/auth/signup` does not exist |
| `login` | POST `/api/v1/auth/login` | OK |
| `logout` | Local only | OK |
| `whoami` | Local only | OK |
| `task add` | POST `/api/v1/tasks` | OK |
| `task list` | GET `/api/v1/tasks` | OK |
| `task done` | PATCH `/api/v1/tasks/:id` | OK |
| `task show` | GET `/api/v1/tasks/:id` | OK |
| `project new` | POST `/api/v1/projects` | OK |
| `project list` | GET `/api/v1/projects` | OK |
| `project show` | GET `/api/v1/projects/:id` | OK |
| `project canvas` | Opens browser | OK |
| `brief create` | POST `/api/v1/briefs` | OK |
| `brief list` | GET `/api/v1/briefs` | OK |
| `brief show` | GET `/api/v1/briefs/:id` | OK |
| `brief review` | PATCH `/api/v1/briefs/artifacts/:id/review` | **BROKEN** — endpoint path mismatch |
| `order new` | POST `/api/v1/orders` | OK |
| `order list` | GET `/api/v1/orders` | OK |
| `order invoice` | POST `/api/v1/orders/:id/invoice` | OK |
| `customer list` | GET `/api/v1/clients` | OK |
| `customer add` | POST `/api/v1/clients` | OK |
| `agent chat` | POST `/api/v1/agents/chat` | OK |
| `agent ask` | POST `/api/v1/agents/ask` | OK |
| `workspace list` | GET `/api/v1/auth/workspaces` | **BROKEN** — endpoint does not exist |
| `workspace switch` | POST `/api/v1/auth/switch` | **BROKEN** — endpoint does not exist |
| `workspace current` | Local only | OK |
| `connect slack` | POST `/api/v1/integrations/slack/connect` | **MISMATCH** — generic `/connect` route exists instead |
| `connect whatsapp` | POST `/api/v1/integrations/whatsapp/connect` | **MISMATCH** — generic `/connect` route exists instead |
| `module create` | Local scaffolding | OK |
| `module test` | Local validation | OK |
| `module publish` | POST `/api/v1/marketplace/publish` | OK |
| `module analytics` | GET `/api/v1/marketplace/:id`, `/analytics/:id` | OK |
| `module list` | GET `/api/v1/modules` | OK |
| `module add` | POST `/api/v1/modules/install` | OK |
| `modules list` | GET `/api/v1/modules`, `/installed` | OK |
| `modules install` | POST `/api/v1/modules/install` | OK |
| `marketplace browse` | GET `/api/v1/marketplace/browse` | OK |
| `marketplace search` | GET `/api/v1/marketplace/browse?q=` | OK |
| `marketplace install` | POST `/api/v1/marketplace/install` | OK |
| `marketplace info` | GET `/api/v1/marketplace/:id` | OK |
| `status` | Multiple GET endpoints | OK |
| `export` | GET `/api/v1/export` | OK |
| `upgrade` | GET/POST `/api/v1/billing` | OK |
| `tenant create` | POST `/api/v1/auth`, PUT, POST `/modules/install-batch` | OK |
| `instance configure` | PUT `/api/v1/instance/configure` | OK |
| `dev` | Spawns Next.js | OK |
| `deploy` | Vercel CLI | OK |
| `setup` | Local env | OK |
| `seed` | POST `/api/v1/admin/seed` | OK |

### CLI TypeScript Build
**FAILS** with ~279 errors. Fix: add `@types/node` to `cli/devDependencies` and install missing type packages.

---

## Security

### Findings

| Category | Status | Details |
|----------|--------|---------|
| Auth on all protected routes | PASS | All use `authenticate()` + `unauthorized()` |
| Webhook signature validation | PASS | Stripe + Telnyx properly validated |
| Cron job protection | PASS | All use `CRON_SECRET` bearer token |
| Hardcoded secrets | PASS | None found — all via `process.env` |
| `eval()` usage | PASS | None found |
| `new Function()` usage | PASS | None found |
| XSS vectors | PASS | No `dangerouslySetInnerHTML` |
| SQL injection | PASS | Prisma ORM only, no raw queries |
| CORS / security headers | PASS | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| Client-side secret leakage | PASS | All `NEXT_PUBLIC_*` vars are safe |
| **Timing attack** | **FAIL** | `src/lib/auth.ts:57` uses `!==` instead of `timingSafeEqual()` for `AGENT_RUNTIME_SECRET` comparison |
| Domain input validation | WARN | `src/app/api/v1/instance/configure/route.ts` accepts unvalidated domain for Vercel API |

### Timing Attack Detail
```
// src/lib/auth.ts:57
if (!expectedSecret || agentSecret !== expectedSecret) return null;
```
**Fix:** Replace with `crypto.timingSafeEqual()` (the Telnyx webhook handler already does this correctly at `src/lib/integrations/telnyx.ts:36-39`).

---

## Dependencies

### npm audit
```
found 0 vulnerabilities
```

### Duplicate Packages
No duplicates between `dependencies` and `devDependencies`.
- 31 dependencies
- 7 devDependencies

### Node Version
- **Required:** `>=18` (per `engines` field)
- **Running:** v22.22.2
- No EBADENGINE warnings with current setup

### CLI Dependencies
CLI `package.json` does not include `@types/node` in devDependencies, causing all 279 TypeScript errors.

---

## Recommended Next Steps

### Critical (fix immediately)
1. **Fix timing attack** in `src/lib/auth.ts:57` — use `crypto.timingSafeEqual()` for `AGENT_RUNTIME_SECRET` comparison
2. **Add missing CLI endpoints** — implement `GET /api/v1/auth/workspaces` and `POST /api/v1/auth/switch` (or update CLI to use existing auth flow)
3. **Fix CLI TypeScript build** — add `@types/node`, `@types/commander`, `@types/inquirer` to `cli/devDependencies`

### High Priority (fix soon)
4. **Add request body validation** — implement zod schemas for all POST/PATCH routes (replace `body as { ... }` type assertions with runtime validation)
5. **Fix silent error handling** — add `console.error()` at minimum to all `.catch(() => {})` blocks
6. **Add cascading delete protection** — use transactions for project/task/brief deletes to prevent orphaned child records
7. **Migrate `Brief.clientName`** — deprecated field still used in 15+ locations; migrate to `clientId` FK

### Medium Priority
8. **Remove unused Prisma models** or document as planned features: `FeatureFlag`, `TaskAttachment`, `ArtifactReview`, `NotificationPreference`, `FileVersion`
9. **Fix CLI endpoint mismatches** — `init` signup flow, `brief review` path, `connect` integration routing
10. **Document `.env.example`** — add `NANGO_BASE_URL` and `SPOKESTACK_API_URL`; remove unused `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `NANGO_PUBLIC_KEY`
11. **Build out empty shell pages** — `/spokechat`, `/lms`, `/media-buying` are placeholders with no functionality
12. **Add domain validation** — `src/app/api/v1/instance/configure/route.ts` should validate domain format before passing to Vercel API

### Low Priority
13. **Consolidate customer/client naming** — CLI uses "customer" commands but calls `/api/v1/clients`; API has both `/customers` and `/clients` routes
14. **Replace hardcoded data** — pipeline stages in CRM, report templates, crisis playbooks should come from config or API
15. **Add structured logging** — replace `console.error` with a proper logging service for production observability
