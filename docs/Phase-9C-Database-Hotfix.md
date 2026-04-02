# Phase 9C — Database Hotfix

**Date:** 2026-04-02
**Branch:** main
**Scope:** Production database repair — no code changes

---

## Executive Summary

The live dashboard was non-functional: sidebar showed "Free plan" instead of "Enterprise", no installed modules appeared in the sidebar navigation, and the marketplace displayed "Could not load install status." The root cause was **two database-level issues** — a missing column and a rogue enum record — both causing 500 errors on critical API endpoints.

No code was changed. All fixes were applied directly to the Supabase production database via the SQL editor.

---

## Bug #1 (CRITICAL): Missing `missionControlEnabled` Column on `OrgSettings`

**Affected endpoint:** `GET /api/v1/settings` — returned HTTP 500 with empty body

**Root cause:** The Prisma schema defined a `missionControlEnabled Boolean @default(true)` column on the `OrgSettings` model, but this column was never created in the production database. A `prisma db push` was missed after the schema change was added (likely during Phase 8 or Phase 9A development).

**Impact:**
- Every call to `/api/v1/settings` crashed with an unhandled Prisma query error (500, empty body)
- The dashboard layout defaults `billingTier` to `"FREE"` when the settings fetch fails
- Sidebar displayed "Free plan" instead of the actual tier ("Enterprise")
- Settings page could not load or save any org settings
- Onboarding redirect logic couldn't read `onboardingComplete` flag

**Diagnosis method:** Tested individual columns via Supabase PostgREST — all columns returned 200 except `missionControlEnabled` which returned 400 (column not found).

**Fix:**
```sql
ALTER TABLE "OrgSettings"
ADD COLUMN IF NOT EXISTS "missionControlEnabled" boolean NOT NULL DEFAULT true;
```

**Verification:** `GET /api/v1/settings` returned 200 with full settings payload immediately after the fix.

---

## Bug #2 (CRITICAL): Rogue `ADMIN` Enum Record in `OrgModule`

**Affected endpoint:** `GET /api/v1/modules/installed` — returned HTTP 500 with empty body

**Root cause:** The `OrgModule` table contained a record with `moduleType = 'ADMIN'` for the LMTD organization. The `ADMIN` value existed in the PostgreSQL `ModuleType` enum (from a previous `prisma db push` that included it) but was later removed from the Prisma schema. The generated Prisma client does not recognize `ADMIN` as a valid `ModuleType` variant, so any `findMany` query that returns a row containing this value throws a deserialization error.

**Impact:**
- Every call to `/api/v1/modules/installed` crashed
- No installed modules appeared in the sidebar navigation
- Marketplace page showed "Could not load install status" warning
- Module install/uninstall flows broken

**Diagnosis method:**
1. Confirmed all OrgModule table columns existed and matched the schema
2. Enumerated PostgreSQL enum values: found 24 values in DB vs 23 in Prisma schema
3. Identified `ADMIN` as the extra value not present in the current schema
4. Queried LMTD org records: found `bcd0d8f3-2d2a-43fc-a979-6bafba6f189c` with `moduleType = 'ADMIN'`

**Fix:**
```sql
DO $$
BEGIN
  DELETE FROM "OrgModule" WHERE id = 'bcd0d8f3-2d2a-43fc-a979-6bafba6f189c';
END $$;
```

**Verification:** `GET /api/v1/modules/installed` returned 200 with 23 installed modules.

---

## Additional Work: Module Seeding

**Problem:** The `OrgModule` table was empty for the LMTD organization. The `seedCoreModules` function is wired into the org creation flow (`src/app/api/v1/auth/route.ts` line 136), but it appears the LMTD org was created before this seeding logic was added, so no modules were ever installed.

**Fix:** Inserted all 23 module records for the LMTD org (Enterprise tier = all modules included):

| Category | Modules |
|----------|---------|
| Core (4) | TASKS, PROJECTS, BRIEFS, ORDERS |
| Marketing (5) | CRM, SOCIAL_PUBLISHING, CONTENT_STUDIO, LISTENING, MEDIA_BUYING |
| Operations (7) | SURVEYS, LMS, TIME_LEAVE, BOARDS, FINANCE, WORKFLOWS, CLIENT_PORTAL |
| Analytics (2) | ANALYTICS, NPS |
| Enterprise (5) | SPOKECHAT, DELEGATION, ACCESS_CONTROL, API_MANAGEMENT, BUILDER |

---

## Additional Work: Schema Sync

After the hotfixes, `prisma db push` from the local repo revealed additional schema drift. A Prisma 7 engine bug generated invalid SQL that combined `RENAME CONSTRAINT` with `ALTER COLUMN` in a single `ALTER TABLE` statement (PostgreSQL doesn't support this).

**Workaround:** Generated the migration SQL via `prisma migrate diff`, split the problematic statement manually, and executed in three batches through the Supabase SQL editor:

1. **Batch 1:** Column type alterations on Client, EntityEvent, EventHandlerLog, EventSubscription, Integration, SyncJob
2. **Batch 2:** Index creation, foreign key renames, new foreign key constraints
3. **Batch 3:** Index renames (17 indexes renamed to match Prisma conventions)

**Final state:** `prisma db push` returns "The database is already in sync with the Prisma schema."

---

## API Endpoint Status After Fix

| Endpoint | Before | After | Notes |
|----------|--------|-------|-------|
| `GET /api/v1/settings` | 500 | 200 | Missing column fixed |
| `GET /api/v1/modules/installed` | 500 | 200 | Rogue enum record removed |
| `GET /api/v1/billing` | 200 | 200 | Was already working |
| `GET /api/v1/mission-control/chats` | 200 | 200 | Was already working |
| `GET /api/v1/mission-control/agents` | 200 | 200 | Was already working |
| `GET /api/v1/mission-control/notifications` | 200 | 200 | Was already working |

---

## Prevention

1. **Always run `prisma db push` after schema changes.** The `postinstall` script only runs `prisma generate` (TypeScript client), not `db push` (database DDL). Schema changes that add columns or modify enums require a separate `db push` against the target database.

2. **Don't remove enum values from the Prisma schema without first cleaning the database.** If any records reference a removed enum value, Prisma's deserializer will crash on `findMany` queries. Clean the data first, then update the schema.

3. **Add try-catch wrappers to API routes.** Every route handler should catch errors and return structured JSON error responses instead of empty 500s. The empty response bodies made diagnosis significantly harder.

4. **Consider adding a health-check endpoint** that queries every critical table (`OrgSettings`, `OrgModule`, `BillingTier`, `AgentSession`) and reports column-level compatibility with the Prisma schema.
