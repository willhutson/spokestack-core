# SpokeStack Core

**Agent-native business infrastructure.** Specialized AI agents for Tasks, Projects, Briefs, and Orders — sharing a unified context graph that compounds organizational intelligence weekly.

Built on a decade of operating a 40+ person creative digital agency across Dubai and Abu Dhabi. 267 ERP models distilled into a modular platform any business can use.

---

## Quick Start

```bash
# Clone and set up
git clone https://github.com/willhutson/spokestack-core
cd spokestack-core
npm install

# Configure environment
spokestack setup --supabase-url <URL> --supabase-key <KEY>

# Seed database + install modules
spokestack seed --tier ENTERPRISE --template agency

# Start development
spokestack dev
```

Or the full non-interactive flow for AI agents:

```bash
spokestack init \
  --email you@company.com \
  --password yourpassword \
  --name "Your Name" \
  --org "Your Company" \
  --template agency \
  --supabase-url <URL> \
  --supabase-key <KEY> \
  --tier ENTERPRISE \
  --yes
```

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────────┐
│   Frontend (Next.js) │     │   ongoing_agent_builder       │
│                      │     │   (Python, Railway)           │
│   Dashboard Pages    │     │                              │
│   Mission Control    │◄───►│   47 Agent Types             │
│   Onboarding        │     │   Tool Registry              │
│   CLI               │     │   OpenRouter LLM             │
│                      │     │   Execution Engine           │
├─────────────────────┤     └──────────────────────────────┘
│   API Routes         │              │
│   /api/v1/*          │◄─────────────┘ (tools call CRUD APIs)
├─────────────────────┤
│   Prisma + Supabase  │
│   39 Models          │
│   PostgreSQL         │
└─────────────────────┘
```

### The Agent Execution Loop

```
User message → Mission Control → agent-builder-client.ts
    → POST /api/v1/core/execute (ongoing_agent_builder)
    → Agent selects tools → Tools call spokestack-core CRUD APIs
    → Results streamed back via SSE → UI updates
```

**What's connected today:**
- spokestack-core has all CRUD APIs (114+ routes)
- ongoing_agent_builder has agent definitions + OpenRouter LLM
- agent-builder-client.ts sends requests via `/api/v1/core/execute`
- Auth: `X-Agent-Secret` header on all runtime calls

**What's being wired (Phase 10B):**
- Canonical agent type alignment (47 types → builder's registry)
- Tool registration: `brief_writer` can call `approve_brief` → `PATCH /api/v1/briefs/{id}`
- The builder executes tools against core's APIs — closing the autonomous execution loop

---

## Modules (23)

### Core (always available at tier)

| Module | Page | API Routes | Features |
|--------|------|------------|----------|
| **Tasks** | `/tasks` | `/api/v1/tasks/*` | Kanban DnD, inline create, detail drawer, filters |
| **Projects** | `/projects` | `/api/v1/projects/*` | Card grid, phases timeline, milestones, detail page |
| **Briefs** | `/briefs` | `/api/v1/briefs/*` | Review pipeline (DRAFT→ACTIVE→IN_REVIEW→COMPLETED), approve/revise, artifact generation |
| **Orders** | `/orders` | `/api/v1/orders/*` | Fulfillment pipeline (PENDING→CONFIRMED→IN_PROGRESS→COMPLETED), invoice generation |

### Marketplace

| Module | Page | Features |
|--------|------|----------|
| **CRM** | `/crm` | Clients CRUD, pipeline kanban (Lead→Won), deals (orders-as-deals), activity timeline |
| **Content Studio** | `/content-studio` | 5 tabs: Libraries (DAM), Moodboards, Video Projects, Documents, Calendar |
| **Analytics** | `/analytics` | 6 metric cards, task velocity chart, revenue chart, project health, brief pipeline, team utilization |
| **Finance** | `/finance` | Invoice/order tabs, revenue summary, AED currency, create invoice |
| **Social Publishing** | `/social-publishing` | Post queue + scheduling, monthly calendar, platform accounts, engagement analytics |
| **Workflows** | `/workflows` | Event subscriptions, 6 pre-built templates, canvas integration |
| **Time & Leave** | `/time-leave` | Weekly timesheet grid, leave requests + approval, team directory |
| **Surveys** | `/surveys` | Survey builder (text/rating/multiple-choice), responses, 4 templates |
| **NPS** | `/nps` | SVG gauge, score calculation, response recording, trend chart, per-client scores |
| **Boards** | `/boards` | Simplified kanban from tasks, board templates |
| **Listening** | `/listening` | Brand monitor setup, context-based mentions, sentiment placeholder |
| **Media Buying** | `/media-buying` | Campaign pipeline, spend tracking |
| **LMS** | `/lms` | Courses, enrollments, completion rate |
| **Client Portal** | `/client-portal` | Portal users from clients, approvals, activity |

### Enterprise

| Module | Page | Features |
|--------|------|----------|
| **SpokeChat** | `/spokechat` | Internal team chat channels |
| **Delegation** | `/delegation` | Delegation of authority profiles |
| **Access Control** | `/access-control` | RBAC policies and rules |
| **API Management** | `/api-management` | API keys, webhooks, request logs |
| **Builder** | `/builder` | Templates, permissions, audit log |

---

## API Reference

### Authentication

All API routes require a Bearer token from Supabase Auth:

```
Authorization: Bearer <supabase-access-token>
```

Multi-org: pass `X-Organization-Id` header to target a specific org.

### Core Entity APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/tasks` | List/create tasks |
| GET/PATCH/DELETE | `/api/v1/tasks/:taskId` | Get/update/delete task |
| GET/POST | `/api/v1/projects` | List/create projects |
| GET/PATCH/DELETE | `/api/v1/projects/:projectId` | Get/update/delete project |
| GET/POST | `/api/v1/briefs` | List/create briefs |
| GET/PATCH/DELETE | `/api/v1/briefs/:briefId` | Get/update/delete brief |
| GET/POST | `/api/v1/orders` | List/create orders |
| GET/PATCH | `/api/v1/orders/:orderId` | Get/update order |
| POST | `/api/v1/orders/:orderId/invoice` | Generate invoice from order |
| GET/POST | `/api/v1/clients` | List/create clients |
| GET/PATCH/DELETE | `/api/v1/clients/:clientId` | Get/update/delete client |
| GET/POST | `/api/v1/invoices` | List/create invoices |
| GET/PATCH | `/api/v1/invoices/:invoiceId` | Get/update invoice |

### Mission Control APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/mission-control/chats` | List/create chat sessions |
| GET/PATCH/DELETE | `/api/v1/mission-control/chats/:chatId` | Get/update/archive chat |
| GET/POST | `/api/v1/mission-control/chats/:chatId/messages` | List messages / Send message (SSE streaming) |
| GET | `/api/v1/mission-control/agents` | List available agents |
| GET/PATCH | `/api/v1/mission-control/notifications` | List/mark-read notifications |

### Module System APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/modules` | List all available modules from registry |
| GET | `/api/v1/modules/installed` | List installed modules for org |
| POST | `/api/v1/modules/install` | Install a module |
| DELETE | `/api/v1/modules/:moduleType/uninstall` | Uninstall a module |
| GET | `/api/v1/modules/recommend?industry=agency` | Get recommended modules for industry |
| POST | `/api/v1/modules/install-batch` | Install multiple modules |

### Event System APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/events` | List/create entity events |
| GET | `/api/v1/events/:eventId` | Get event with handler logs |
| GET/POST | `/api/v1/events/subscriptions` | List/create event subscriptions |
| PATCH/DELETE | `/api/v1/events/subscriptions/:id` | Update/delete subscription |

### Digital Asset Management APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/assets/libraries` | List/create asset libraries |
| GET/PATCH | `/api/v1/assets/libraries/:libraryId` | Get/update library |
| POST | `/api/v1/assets/folders` | Create folder |
| GET/PATCH/DELETE | `/api/v1/assets/folders/:folderId` | Get/update/delete folder |
| GET/POST | `/api/v1/assets` | Search/create assets |
| GET/PATCH/DELETE | `/api/v1/assets/:assetId` | Get/update/soft-delete asset |
| POST | `/api/v1/assets/:assetId/versions` | Upload new version |
| GET/POST | `/api/v1/assets/:assetId/comments` | List/add comments |

### Integration APIs (Nango)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/integrations/connect` | Initiate OAuth flow |
| GET | `/api/v1/integrations` | List all connections |
| GET/DELETE | `/api/v1/integrations/:provider` | Get status / Disconnect |
| POST | `/api/v1/integrations/proxy` | Proxy API call through Nango |

### Admin APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PATCH | `/api/v1/billing` | Get billing / Upgrade tier |
| GET/PATCH | `/api/v1/settings` | Get/update org settings |
| GET/PATCH | `/api/v1/org` | Get/update organization |
| GET/POST | `/api/v1/members` | List/invite members |
| POST | `/api/v1/admin/seed` | Seed database (billing tiers, modules, settings) |
| GET | `/api/v1/activity` | Unified activity feed |
| GET/POST | `/api/v1/context` | Read/write context graph |
| POST | `/api/v1/context/synthesize` | Trigger weekly insight synthesis |

### Onboarding APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/v1/onboarding` | Get/set onboarding completion status |
| POST | `/api/v1/onboarding/chat` | Streaming onboarding agent chat (SSE) |
| POST | `/api/v1/onboarding/action` | Execute onboarding actions (create entities) |

### Cron Jobs

| Schedule | Endpoint | Description |
|----------|----------|-------------|
| Monday 09:00 UTC | `/api/cron/weekly-synthesis` | Generate INSIGHT context entries |
| Every 2 hours | `/api/cron/sync` | Dispatch integration syncs |
| Sunday 03:00 UTC | `/api/cron/events/cleanup` | Delete processed events >30 days |

---

## CLI Commands

```bash
# Setup & Deployment
spokestack init          # Full first-run: account + org + env + seed
spokestack setup         # Write .env.local, generate Prisma client
spokestack seed          # Seed billing tiers, modules, settings
spokestack dev           # Start Next.js dev server
spokestack deploy        # Deploy to Vercel
spokestack status        # Full health check

# Entity CRUD (all support --yes for non-interactive)
spokestack task add --title "Fix login" --priority HIGH --yes
spokestack project new --name "Q2 Campaign" --yes
spokestack brief create --title "Social Strategy" --yes
spokestack order new --client "Etihad" --items '[...]' --yes

# Agent
spokestack agent chat                    # Interactive chat
spokestack agent chat --message "..." --json  # Single message, JSON output
spokestack agent ask "What should I work on?" --json

# Modules
spokestack module install CRM --yes
spokestack module uninstall SURVEYS --yes
spokestack modules list

# Workspace
spokestack workspace info
spokestack connect google_drive --yes
spokestack export
```

---

## Environment Variables

```bash
# Required
DATABASE_URL=                          # Supabase PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=              # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # Supabase anon key

# Agent Runtime (ongoing_agent_builder)
AGENT_RUNTIME_URL=                     # Railway URL
AGENT_RUNTIME_SECRET=                  # Shared secret (X-Agent-Secret header)

# Optional
SUPABASE_SERVICE_ROLE_KEY=             # For admin operations
NANGO_SECRET_KEY=                      # OAuth integration broker
NANGO_PUBLIC_KEY=                      # Frontend OAuth popup
STRIPE_SECRET_KEY=                     # Billing (future)
CRON_SECRET=                           # Vercel Cron authentication
REDIS_URL=                             # Rate limiting + caching
```

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Database:** Supabase PostgreSQL via Prisma 7
- **Auth:** Supabase Auth (JWT)
- **AI Runtime:** ongoing_agent_builder (Python, OpenRouter)
- **Integrations:** Nango (OAuth broker, 13 providers)
- **Deployment:** Vercel (frontend + API) + Railway (agent runtime)
- **CLI:** Commander + Inquirer + Chalk

---

## Prisma Schema

39 models, 35+ enums. Key models:

**Core:** Organization, User, Team, TeamMember, OrgSettings, OrgModule, FeatureFlag, Client
**Billing:** BillingAccount, BillingTier, BillingMeterEvent, BillingInvoice
**Work:** Task, TaskList, TaskComment, Project, ProjectPhase, ProjectMilestone, Brief, BriefPhase, Artifact, ArtifactReview, Order, OrderItem, Invoice, InvoiceItem
**Canvas:** WfCanvas, WfCanvasNode, WfCanvasEdge
**Agent:** AgentSession, AgentMessage, ContextEntry, ContextMilestone
**Events:** EntityEvent, EventSubscription, EventHandlerLog, SyncJob
**DAM:** AssetLibrary, AssetFolder, Asset, AssetVersion, AssetComment
**Infrastructure:** Integration, Notification, NotificationPreference, FileAsset, FileVersion

---

## What's Next

### Phase 10B: Agent Tool Registration (ongoing_agent_builder)

The execution bridge between Mission Control and module CRUD. When the MC agent says "approve this brief," it should call `PATCH /api/v1/briefs/{id}` autonomously.

**What's needed in ongoing_agent_builder:**
1. `GET /api/v1/agents/registry` — canonical agent type list with `mcTranslationMap`
2. Tool registration per agent: `brief_writer` → `approve_brief` → `PATCH /api/v1/briefs/{id}`
3. Accept MC agent types and translate internally
4. Execute tools against spokestack-core's CRUD APIs with `X-Agent-Secret` auth

**The loop:**
```
MC Agent decides → calls tool → builder executes → PATCH spokestack-core API → entity updated → event emitted → subscriptions fire → next action triggered
```

This is the last piece to make SpokeStack fully autonomous — agents that don't just suggest, but execute.

---

## Origin

SpokeStack ERP: 267 Prisma models, 186 enums, 191 API routes, 14 active modules, built over a decade of operating a 40+ person creative digital agency across Dubai and Abu Dhabi. `spokestack-core` extracts the universal primitives into a product any business can use, with agents that learn how each business works.
