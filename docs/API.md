# SpokeStack Core — API Reference

**Base URL:** `https://spokestack-core.vercel.app/api`
**Auth:** Bearer token (Supabase JWT) via `Authorization: Bearer <token>` header
**Service auth:** `x-agent-secret` + `x-org-id` headers (agent-builder → core)

---

## Authentication

All `/api/v1/*` endpoints require authentication. Two auth paths:

1. **User auth (Bearer):** Pass the Supabase access token in the `Authorization` header. The token is validated via `getAuthUser()`, then mapped to a User + Organization via the `Membership` table.
2. **Service auth (Agent):** Pass `x-agent-secret` (matches `AGENT_RUNTIME_SECRET` env var) and `x-org-id` headers. Used by the agent runtime for server-to-server calls.

Multi-org: If a user belongs to multiple organizations, pass `x-organization-id` header to select which org context to use. Defaults to the most recently joined org.

---

## Core Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth` | Create user + org (signup flow), seeds core modules |
| PUT | `/v1/auth` | Update user profile |
| POST | `/v1/auth/login` | Supabase email/password login |
| POST | `/v1/auth/refresh` | Refresh Supabase session token |

### Settings & Billing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/settings` | Get org settings (timezone, language, onboardingComplete, missionControlEnabled) |
| PATCH | `/v1/settings` | Update org settings (OWNER/ADMIN only) |
| GET | `/v1/billing` | Get billing tier, status, tier details, all available tiers |
| POST | `/v1/billing` | Upgrade/change billing tier |
| POST | `/v1/billing/webhook` | Stripe webhook handler |

### Organization

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/org` | Get current org details |
| PATCH | `/v1/org` | Update org name, slug, etc. |
| GET | `/v1/organizations/by-slug/:slug` | Look up org by slug |

### Members & Teams

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/members` | List org members |
| POST | `/v1/members` | Invite new member |
| PATCH | `/v1/members/:memberId` | Update member role |
| DELETE | `/v1/members/:memberId` | Remove member |
| GET | `/v1/teams` | List teams |
| POST | `/v1/teams` | Create team |
| GET | `/v1/teams/:teamId` | Get team details |
| PATCH | `/v1/teams/:teamId` | Update team |
| DELETE | `/v1/teams/:teamId` | Delete team |
| GET | `/v1/teams/:teamId/members` | List team members |
| POST | `/v1/teams/:teamId/members` | Add member to team |

---

## Module System

### Module Registry

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/modules` | List all available modules from static registry (22 modules) |
| GET | `/v1/modules/installed` | List installed modules for current org (OrgModule records + registry metadata) |
| GET | `/v1/modules/recommend` | Get tier-aware module recommendations |
| POST | `/v1/modules/install` | Install a single module |
| POST | `/v1/modules/install-batch` | Install multiple modules at once |
| DELETE | `/v1/modules/:moduleType/uninstall` | Uninstall a module |

### Marketplace

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/marketplace` | Browse marketplace modules |
| POST | `/v1/marketplace/install` | Install from marketplace |
| POST | `/v1/marketplace/uninstall` | Uninstall from marketplace |

---

## Core Modules

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/tasks` | List tasks (filterable by status, priority, assignee) |
| POST | `/v1/tasks` | Create task |
| GET | `/v1/tasks/:taskId` | Get task detail |
| PATCH | `/v1/tasks/:taskId` | Update task (status, priority, assignee, etc.) |
| DELETE | `/v1/tasks/:taskId` | Delete task |
| GET | `/v1/tasks/:taskId/comments` | List task comments |
| POST | `/v1/tasks/:taskId/comments` | Add comment to task |
| GET | `/v1/task-lists` | List task lists (kanban columns) |
| POST | `/v1/task-lists` | Create task list |
| GET | `/v1/task-lists/:listId` | Get task list |
| PATCH | `/v1/task-lists/:listId` | Update task list |
| DELETE | `/v1/task-lists/:listId` | Delete task list |

### Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/projects` | List projects |
| POST | `/v1/projects` | Create project |
| GET | `/v1/projects/:projectId` | Get project detail |
| PATCH | `/v1/projects/:projectId` | Update project |
| DELETE | `/v1/projects/:projectId` | Delete project |
| GET | `/v1/projects/:projectId/phases` | List project phases |
| POST | `/v1/projects/:projectId/phases` | Create phase |
| GET | `/v1/projects/:projectId/milestones` | List milestones |
| POST | `/v1/projects/:projectId/milestones` | Create milestone |
| GET | `/v1/projects/:projectId/canvas` | Get project canvas |
| POST | `/v1/projects/:projectId/canvas` | Update canvas |

### Briefs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/briefs` | List briefs |
| POST | `/v1/briefs` | Create brief |
| GET | `/v1/briefs/:briefId` | Get brief detail |
| PATCH | `/v1/briefs/:briefId` | Update brief |
| DELETE | `/v1/briefs/:briefId` | Delete brief |
| GET | `/v1/briefs/:briefId/phases` | List brief phases |
| POST | `/v1/briefs/:briefId/phases` | Create phase |
| GET | `/v1/briefs/:briefId/artifacts` | List brief artifacts |
| POST | `/v1/briefs/:briefId/artifacts` | Upload artifact |

### Orders & Invoicing

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/orders` | List orders |
| POST | `/v1/orders` | Create order |
| GET | `/v1/orders/:orderId` | Get order detail |
| PATCH | `/v1/orders/:orderId` | Update order |
| POST | `/v1/orders/:orderId/invoice` | Generate invoice for order |
| GET | `/v1/invoices` | List invoices |
| GET | `/v1/invoices/:invoiceId` | Get invoice detail |
| PATCH | `/v1/invoices/:invoiceId` | Update invoice |

### Clients (formerly Customers)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/clients` | List clients |
| POST | `/v1/clients` | Create client |
| GET | `/v1/clients/:clientId` | Get client detail |
| PATCH | `/v1/clients/:clientId` | Update client |
| DELETE | `/v1/clients/:clientId` | Delete client |
| GET | `/v1/customers` | List customers (legacy alias) |
| POST | `/v1/customers` | Create customer (legacy alias) |
| GET | `/v1/customers/:customerId` | Get customer (legacy alias) |
| PATCH | `/v1/customers/:customerId` | Update customer (legacy alias) |
| DELETE | `/v1/customers/:customerId` | Delete customer (legacy alias) |

---

## Mission Control

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/mission-control` | Get MC state (canvas, agents, status) |
| POST | `/v1/mission-control` | Agent chat completion (SSE streaming) |
| GET | `/v1/mission-control/chats` | List chat sessions |
| POST | `/v1/mission-control/chats` | Create new chat |
| GET | `/v1/mission-control/chats/:chatId` | Get chat detail |
| PATCH | `/v1/mission-control/chats/:chatId` | Rename/archive chat |
| DELETE | `/v1/mission-control/chats/:chatId` | Delete chat |
| GET | `/v1/mission-control/chats/:chatId/messages` | List messages in chat |
| POST | `/v1/mission-control/chats/:chatId/messages` | Send message (triggers agent response) |
| GET | `/v1/mission-control/agents` | List available agents (13 agent types) |
| GET | `/v1/mission-control/notifications` | List notifications |
| PATCH | `/v1/mission-control/notifications` | Mark notifications read |
| PATCH | `/v1/mission-control/notifications/:notificationId` | Update single notification |
| GET | `/v1/mission-control/activity` | Get activity feed |

---

## Agent System

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/agents/chat` | Agent chat (SSE streaming, used by MC and CLI) |
| POST | `/v1/agents/ask` | One-shot agent query |
| GET | `/v1/agents/sessions` | List agent sessions |

---

## Context Graph

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/context` | Get context entries for org |
| POST | `/v1/context` | Create/update context entry |
| POST | `/v1/context/synthesize` | Trigger context synthesis (weekly rollup) |

---

## Assets & DAM

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/assets` | List assets |
| POST | `/v1/assets` | Upload asset |
| GET | `/v1/assets/:assetId` | Get asset detail |
| PATCH | `/v1/assets/:assetId` | Update asset metadata |
| DELETE | `/v1/assets/:assetId` | Delete asset |
| POST | `/v1/assets/:assetId/versions` | Upload new version |
| GET | `/v1/assets/:assetId/comments` | List asset comments |
| POST | `/v1/assets/:assetId/comments` | Add comment |
| PATCH | `/v1/assets/comments/:commentId` | Edit comment |
| GET | `/v1/assets/libraries` | List asset libraries |
| POST | `/v1/assets/libraries` | Create library |
| GET | `/v1/assets/libraries/:libraryId` | Get library |
| PATCH | `/v1/assets/libraries/:libraryId` | Update library |
| POST | `/v1/assets/folders` | Create folder |
| GET | `/v1/assets/folders/:folderId` | Get folder |
| PATCH | `/v1/assets/folders/:folderId` | Update folder |
| DELETE | `/v1/assets/folders/:folderId` | Delete folder |

---

## Events & Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/events` | List entity events |
| POST | `/v1/events` | Create event |
| GET | `/v1/events/:eventId` | Get event detail |
| GET | `/v1/events/subscriptions` | List event subscriptions |
| POST | `/v1/events/subscriptions` | Create subscription |
| PATCH | `/v1/events/subscriptions/:id` | Update subscription |
| DELETE | `/v1/events/subscriptions/:id` | Delete subscription |

---

## Integrations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/integrations` | List connected integrations |
| POST | `/v1/integrations/connect` | Initiate OAuth connection |
| POST | `/v1/integrations/proxy` | Proxy request to integration provider |
| GET | `/v1/integrations/:provider` | Get integration status |
| DELETE | `/v1/integrations/:provider` | Disconnect integration |

---

## Other

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/activity` | Get org activity feed |
| GET | `/v1/notifications` | List notifications |
| PATCH | `/v1/notifications` | Mark notifications read |
| GET | `/v1/export` | Export org data |
| PUT | `/v1/instance/configure` | Configure instance (CLI init flow) |
| GET | `/v1/onboarding` | Get onboarding state |
| POST | `/v1/onboarding` | Update onboarding state |
| POST | `/v1/onboarding/chat` | Onboarding agent chat |
| POST | `/v1/onboarding/action` | Execute onboarding action |

---

## Internal / Cron

| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/onboarding` | Admin onboarding setup |
| GET | `/admin/onboarding/draft` | Get onboarding draft |
| POST | `/admin/onboarding/draft` | Save onboarding draft |
| DELETE | `/admin/onboarding/draft` | Delete onboarding draft |
| GET | `/cron/events/cleanup` | Clean up processed events |
| GET | `/cron/sync` | Run integration sync |
| GET | `/cron/weekly-synthesis` | Run weekly context synthesis |
| POST | `/internal/webhooks/stripe` | Stripe webhook |
| POST | `/internal/webhooks/telnyx` | Telnyx webhook (WhatsApp/SMS) |

---

## Status (as of Phase 9C — 2026-04-02)

All endpoints are operational. The following were broken and fixed in Phase 9C:

| Endpoint | Issue | Resolution |
|----------|-------|------------|
| `GET /v1/settings` | 500 — missing `missionControlEnabled` column | Column added to DB |
| `GET /v1/modules/installed` | 500 — rogue `ADMIN` enum in OrgModule | Record deleted, enum cleaned |

See [Phase-9C-Database-Hotfix.md](./Phase-9C-Database-Hotfix.md) for full details.
