# SpokeStack Core — Product Architecture Spec

**Addendum to the Cornerstone Strategy — March 2026**

This is the canonical architectural spec for `spokestack-core`, the universal product extraction from SpokeStack ERP. It answers three questions:

1. How to give a minimal version away free and make the next tier complete but cheap
2. How to spec the core offering as Tasks / Briefs / Projects / Orders with a magic onboarding moment
3. How to build the agent ecosystem that makes the marketplace the real business

---

## The One-Paragraph Version

SpokeStack is agent-native business infrastructure. Users get a workspace via `npx spokestack init` (developers, global) or a WhatsApp voice note (service businesses, MENA first). A conversational onboarding agent builds their workspace from a 3-minute conversation. They start free with a Tasks Agent. As they grow, they unlock Projects, Briefs, and Orders Agents — each a specialized team member that reads the same shared context graph. That context graph compounds weekly, making the agents measurably smarter and making switching costs grow over time. When context milestones trigger, the agent recommends marketplace modules — each of which comes with its own agent. The platform tiers fund infrastructure. The marketplace is the business.

---

## Document Index

| # | Document | What It Covers |
|---|----------|----------------|
| 01 | [Deployment Architecture](./01-deployment-architecture.md) | Cloud-hosted design, per-tenant isolation, infrastructure costs, future self-hosted path |
| 02 | [Core Product & Schema](./02-core-product-schema.md) | 267→50 model extraction, unified schema design, application-layer gating, repo structure |
| 03 | [Agent Architecture](./03-agent-architecture.md) | Mode-specific agents, shared context graph, lock-in per mode, marketplace-as-agent-acquisition |
| 04 | [Pricing & Tiers](./04-pricing-and-tiers.md) | Freemium model, uncapped credits, soft throttle, unit economics, business model layers |
| 05 | [Onboarding](./05-onboarding.md) | Dual-track launch (CLI + WhatsApp), conversational workspace setup, the reveal, agent handoff |
| 06 | [Context Milestones](./06-context-milestones.md) | Marketplace flywheel triggers, milestone definitions, implementation spec, async architecture |
| 07 | [CLI Package](./07-cli-package.md) | npm package spec, command reference, auth flow, agent interaction patterns |
| 08 | [Category & Positioning](./08-category-positioning.md) | Agent-native business infrastructure, TAM reframe, competitive positioning, narrative |
| 09 | [Build Plan](./09-build-plan.md) | Two-ship strategy, week-by-week scope, Ship 1 vs Ship 2 boundaries, risk register |

---

## Key Design Decisions (Cross-Cutting)

These decisions recur across documents. They're stated here once as axioms.

**One schema, all tiers.** Every tenant gets the full database schema from day one. Tier differences are enforced at the application layer (ModuleGuard middleware + agent instruction sets), never the data layer. Upgrades are instant — a Stripe webhook, a BillingTier update, and the new agent appears. No migrations, no downtime.

**Agents are the product.** Not a feature, not an implementation detail. Each mode has a dedicated agent. Each marketplace module ships with its own agent. Users don't "enable features" — they meet new team members. The agent ecosystem is what compounds value.

**Shared context graph.** All agents read from and write to the same ContextEntry store per organization. The context graph is the moat. It compounds weekly. It's non-portable. It makes every agent smarter the more any agent is used.

**Uncapped agent credits, soft throttle.** Credits never gate usage. A per-minute rate limit protects against abuse without interrupting the context accumulation engine. The COGS of free users is CAC.

**The marketplace is the business.** Platform tiers ($29–149/mo) fund infrastructure. Marketplace modules ($5–15/mo each, every module ships with its own agent) are the expansion revenue engine. Third-party SDK opens the Shopify App Store model.

**Two launch tracks.** CLI for developers (global). WhatsApp for service businesses (MENA first, then global). Both converge on the same product. Day-one parity, not sequential phases.

---

## Architecture Overview

```
[User Surfaces]                  [SpokeStack Cloud]
┌──────────────┐                ┌──────────────────────────────────────┐
│ CLI (npx)    │                │                                      │
│ Web Dashboard│── HTTPS ──→    │  Auth (Supabase)                     │
│ Desktop (Tau)│                │  ERP Core (Vercel/Next.js)           │
│ Mobile (PWA) │                │  Agent Runtime (Railway)             │
│ WhatsApp     │                │    ├─ Onboarding Agent               │
└──────────────┘                │    ├─ Tasks Agent                    │
                                │    ├─ Projects Agent                 │
                                │    ├─ Briefs Agent                   │
                                │    ├─ Orders Agent                   │
                                │    └─ Marketplace Module Agents      │
                                │  MC Router (Orchestrator)            │
                                │  AgentVBX (Redis Streams)            │
                                │  Context Graph (PostgreSQL)          │
                                │  Billing Engine (Stripe)             │
                                │  Storage (S3/Supabase)               │
                                │  Notification Router                 │
                                └──────────────────────────────────────┘
```

---

## Quick Reference — Tier Summary

| | Free | Starter ($29) | Pro ($59) | Business ($149) | Enterprise |
|---|---|---|---|---|---|
| Members | 3 | 10 | 25 | 50 | Unlimited |
| Agents | Tasks | + Projects | + Briefs | + Orders | + Custom |
| Credits | Uncapped | Uncapped | Uncapped | Uncapped | Uncapped |
| Surfaces | CLI + Web | + Desktop/Mobile/WhatsApp | All | All | All |
| Marketplace | Browse | Browse | 3 modules | Unlimited | Unlimited |

---

## Origin

SpokeStack ERP: 267 Prisma models, 186 enums, 191 API routes, 14 active modules, built over a decade of operating a 40+ person creative digital agency across Dubai and Abu Dhabi. `spokestack-core` extracts the universal primitives — Tasks, Projects, Briefs, Orders — into a product any business can use, with agents that learn how each business works.
# 01 — Deployment Architecture

## Cloud-Hosted, CLI-Managed

SpokeStack is **not** local-first. It's a cloud-hosted platform managed from the CLI.

- **Runs locally**: The CLI tool itself. A thin client that authenticates, sends commands, receives responses.
- **Runs in the cloud**: Everything else — database (Supabase/PostgreSQL), agent layer (Railway), delivery layer (AgentVBX/Redis Streams), file storage, billing engine.

---

## Why Not Local-First

Local-first aligns with the data sovereignty thesis in spirit, but creates real architectural problems:

1. **Agent execution requires cloud compute.** Multiple specialized agents can't run on a laptop. Model inference (even DeepSeek) needs consistent, scalable compute. The agent architecture in [03-agent-architecture.md](./03-agent-architecture.md) describes mode-specific agents (Tasks, Projects, Briefs, Orders) plus marketplace module agents — all requiring persistent runtime.

2. **Multi-surface delivery needs always-on endpoints.** WhatsApp, SMS, and voice channels require persistent webhook receivers. A sleeping laptop kills the workflow. The dual-track onboarding in [05-onboarding.md](./05-onboarding.md) depends on WhatsApp as a first-class surface from day one.

3. **Collaboration needs shared state.** Teams of 5–50 need a single source of truth. CRDTs and local-first sync engines are maturing but not production-ready for a 50–60 model relational schema with cross-model relationships.

4. **The context graph needs centralized accumulation.** Agent intelligence compounds across all team members' interactions. Fragmented local databases lose the compounding effect. See [06-context-milestones.md](./06-context-milestones.md) for how this accumulation drives the marketplace flywheel.

---

## Infrastructure Topology

```
[User's Machine]                [SpokeStack Cloud]
┌──────────────┐               ┌───────────────────────────┐
│ CLI (npx)    │── HTTPS ──→   │ Auth (Supabase)           │
│ Desktop App  │               │ ERP Core (Vercel)         │
│ Mobile PWA   │               │ Agent Runtime (Railway)    │
│ WhatsApp     │               │ AgentVBX (Redis Streams)   │
└──────────────┘               │ DB (Supabase/PostgreSQL)   │
                               │ Storage (S3/Supabase)      │
                               │ Billing (Stripe)           │
                               └───────────────────────────┘
```

### Component Responsibilities

| Component | Provider | Role |
|-----------|----------|------|
| **Auth** | Supabase Auth | Signup, login, org creation, team invites, JWT issuance |
| **ERP Core** | Vercel (Next.js App Router) | API routes, dashboard UI, onboarding UI, ModuleGuard middleware |
| **Agent Runtime** | Railway | Mode-specific agents (Tasks, Projects, Briefs, Orders), marketplace module agents, MC Router orchestrator |
| **AgentVBX** | Railway + Redis Streams | Multi-surface delivery layer — routes agent responses to CLI, web, desktop, mobile, WhatsApp |
| **Database** | Supabase (PostgreSQL) | All persistent state — the unified schema described in [02-core-product-schema.md](./02-core-product-schema.md) |
| **Storage** | S3 or Supabase Storage | File assets, artifact outputs, voice note recordings |
| **Billing** | Stripe | Subscription management, tier upgrades, marketplace module billing, metered usage |

---

## Per-Tenant Isolation

Each organization gets:

- **Row-level isolation** via `organizationId` on every model (already built in existing ERP). Every database query is scoped by organization. No shared data between tenants.
- **Isolated agent context namespace.** The ContextEntry store is keyed by `organizationId`. All mode agents (Tasks, Projects, Briefs, Orders) read/write within their org's namespace. See [03-agent-architecture.md](./03-agent-architecture.md) for details.
- **Separate billing account.** Each org has its own BillingAccount, BillingTier, and usage metering. See [04-pricing-and-tiers.md](./04-pricing-and-tiers.md).
- **Optional custom domain** via Vercel rewrites (Enterprise tier).

### Isolation Model

```
Organization (Tenant)
├── BillingAccount (1:1)
├── Teams[] → Members[] → Roles[]
├── Context Graph (ContextEntry[])
│   ├── Read by: Tasks Agent, Projects Agent, Briefs Agent, Orders Agent
│   ├── Read by: Marketplace Module Agents (CRM Agent, Publishing Agent, etc.)
│   └── Written to by: All agents on every interaction
├── Data
│   ├── Tasks[], TaskLists[], TaskComments[]
│   ├── Projects[], ProjectPhases[], WfCanvas[]
│   ├── Briefs[], BriefPhases[], Artifacts[], ArtifactReviews[]
│   └── Orders[], OrderItems[], Invoices[], Customers[]
├── AgentSessions[], AgentMessages[]
├── ContextMilestones[] (see 06-context-milestones.md)
├── Integrations[] (Slack, Google Drive, etc.)
└── FileAssets[]
```

---

## Infrastructure Cost Per Tenant

| Component | Provider | Cost/tenant/mo | Notes |
|-----------|----------|----------------|-------|
| Database | Supabase (shared instance) | ~$0.50–2 | Row-level isolation, not separate DBs |
| Compute | Vercel (serverless) | ~$0.10–1 | Scales to zero for inactive tenants |
| Agent Runtime | Railway | ~$0.50–3 | Per active session, not per tenant |
| Redis | Railway | ~$0.20–0.50 | AgentVBX stream routing |
| **Total marginal** | | **~$1.30–6.50** |  |

### Scale Projections

| Tenants | Monthly infrastructure cost | Notes |
|---------|---------------------------|-------|
| 100 | ~$200–500 | Early stage, mostly free tier |
| 1,000 | ~$3K–5K | Mix of free + paid |
| 10,000 | ~$15K–30K | Volume discounts kick in |
| 100,000 | ~$80K–150K | Dedicated Supabase instances, Railway scaling |

Serverless architecture means inactive tenants cost near-zero. A free user who signs up, onboards, and doesn't return for 2 weeks costs essentially nothing until they come back. This is the structural advantage that makes permanent freemium viable — see [04-pricing-and-tiers.md](./04-pricing-and-tiers.md).

---

## Request Flow

### CLI / Web / Desktop / Mobile → Agent

```
1. User sends request (CLI command, chat message, button click)
2. Request hits Vercel API route with JWT
3. ModuleGuard middleware checks:
   - Is user authenticated?
   - Does their org's BillingTier grant access to this mode?
   - Is the requested module installed?
4. If gated feature → return upgrade prompt
5. If allowed → forward to Agent Runtime on Railway via HTTPS
6. MC Router receives request, determines intent, routes to appropriate agent:
   - Task-related → Tasks Agent
   - Project-related → Projects Agent
   - Brief-related → Briefs Agent
   - Order-related → Orders Agent
   - Module-specific → Module's Agent (CRM Agent, Publishing Agent, etc.)
7. Agent reads from Context Graph (ContextEntry store)
8. Agent processes request, executes tools (CRUD, Canvas manipulation, artifact generation)
9. Agent writes new ContextEntry records (accumulating intelligence)
10. Response routed back through AgentVBX to the originating surface
```

### WhatsApp → Agent

```
1. User sends WhatsApp message (text or voice note) to SpokeStack number
2. Telnyx webhook receives message
3. If voice note → Telnyx STT transcribes (Whisper Large-V3-Turbo, sub-250ms)
4. AgentVBX receives transcribed text, identifies org by phone number
5. MC Router routes to appropriate agent
6. Agent processes, reads/writes Context Graph
7. Response sent back via WhatsApp (text, with optional TTS for voice response)
```

---

## Networking & Security

### API Surface

- All client → cloud communication over HTTPS (TLS 1.3)
- JWT-based auth issued by Supabase Auth
- API routes enforce org-scoped access via middleware
- Rate limiting at API gateway level (see soft throttle in [04-pricing-and-tiers.md](./04-pricing-and-tiers.md))
- CORS configured for web dashboard + desktop app origins

### Data Residency

- Default: Supabase region selection at org creation (initially US East, expanding to EU and MENA)
- Enterprise tier: dedicated Supabase instance with guaranteed region
- Self-hosted tier: full data sovereignty (see below)

### Secrets Management

- Supabase service role key: Railway environment variables
- Stripe keys: Vercel + Railway environment variables
- Telnyx credentials: Railway environment variables
- Integration OAuth tokens: encrypted in database, per-org
- Agent model API keys: Railway environment variables (OpenRouter aggregator)

---

## Future: Self-Hosted Enterprise Tier

For enterprises with strict data sovereignty requirements (government, healthcare, MENA financial institutions), a self-hosted deployment becomes viable at Phase 5+.

The stack is already containerizable:

| Component | Container |
|-----------|-----------|
| ERP Core | Next.js Docker image |
| Database | Supabase self-hosted (or raw PostgreSQL) |
| Agent Runtime | Node.js Docker image |
| Redis | Official Redis image |
| AgentVBX | Node.js Docker image |

### Self-Hosted Architecture

```
[Enterprise Network]
┌──────────────────────────────────────┐
│ Docker Compose / Kubernetes          │
│ ┌──────────┐ ┌──────────┐           │
│ │ ERP Core │ │ Agent RT │           │
│ └────┬─────┘ └────┬─────┘           │
│      │             │                 │
│ ┌────▼─────┐ ┌────▼─────┐           │
│ │PostgreSQL│ │  Redis   │           │
│ └──────────┘ └──────────┘           │
│                                      │
│ External: Stripe, Telnyx (via proxy) │
└──────────────────────────────────────┘
```

This is a later optimization, not the initial product. The cloud-hosted architecture serves all tiers through Business. Enterprise self-hosted is a deployment option, not a separate product.
# 02 — Core Product & Schema

## The Extraction Problem

SpokeStack ERP: 267 Prisma models, 186 enums, 191 API routes, 14 active modules. That's an agency platform built over a decade of operating a 40+ person creative digital agency. We need a universal product.

The extraction is a **new repo** (`spokestack-core`), not a strip-down of the existing ERP. The existing ERP continues to serve LMTD internally. `spokestack-core` shares DNA but diverges immediately — different schema scope, different deployment model, different audience.

---

## Design Principle: One Schema, All Tiers

Every tenant gets the **same database schema** from day one. Tasks, Projects, Briefs, and Orders models all exist in every workspace. What changes between tiers is what the UI exposes and what the agents are allowed to do.

This is the Notion pattern: blocks are blocks regardless of plan. Upgrades are frictionless. A free-tier user's workspace already *has* the Brief and Order tables — they just can't see or interact with them until they upgrade. No migrations, no schema changes, no data model divergence between tiers.

### Why This Matters

- **Instant upgrades.** User clicks "Upgrade to Pro," Stripe processes payment, BillingTier updates, Briefs tab appears in UI + Briefs Agent activates. Zero downtime, zero migration.
- **No fork risk.** Every tenant runs the same schema. One migration path, one codebase, one deployment.
- **Context graph coherence.** Even before a user upgrades, their Tasks Agent may detect patterns that suggest Brief-like workflows. The data structures are ready to receive that data the moment the tier unlocks.
- **Agent-driven upgrades.** The Tasks Agent can say "this looks like a project — your Projects Agent could help here" because the Project tables already exist. The upgrade path is a BillingTier change, not a schema migration.

---

## Application-Layer Gating

Gating happens in exactly two places:

### 1. ModuleGuard Middleware (Already Built)

```typescript
// Simplified — actual implementation checks OrgModule + BillingTier
async function moduleGuard(req: Request, module: ModuleType) {
  const org = await getOrgFromSession(req);
  const tier = await getBillingTier(org.id);
  const modules = await getOrgModules(org.id);

  if (!tierGrantsAccess(tier, module)) {
    return { allowed: false, upgradeRequired: true, targetTier: getRequiredTier(module) };
  }

  if (module.isMarketplace && !modules.includes(module.id)) {
    return { allowed: false, installRequired: true };
  }

  return { allowed: true };
}
```

ModuleGuard runs before every API route and before rendering every dashboard route. It checks the org's BillingTier against the requested capability and returns an upgrade prompt if gated.

### 2. Agent Instruction Set Scoping

Each agent's system prompt and available tools are assembled at session start based on the org's BillingTier:

```typescript
function buildAgentConfig(org: Organization): AgentConfig {
  const tier = org.billingAccount.tier;
  const tools = [
    ...TASKS_TOOLS,  // Always available
    ...(tier >= 'STARTER' ? PROJECTS_TOOLS : []),
    ...(tier >= 'PRO' ? BRIEFS_TOOLS : []),
    ...(tier >= 'BUSINESS' ? ORDERS_TOOLS : []),
    ...getMarketplaceModuleTools(org),
  ];

  const systemPrompt = buildSystemPrompt(tier, org);
  return { tools, systemPrompt };
}
```

A free-tier Tasks Agent literally doesn't have the tools to create a Brief. It can *recognize* that a user might benefit from Briefs (because it reads the context graph), but it can't execute Brief operations. On upgrade, the agent config rebuilds with the new tools — no redeployment, no restart.

### Gating Matrix

| Capability | Free | Starter ($29) | Pro ($59) | Business ($149) | Enterprise |
|---|---|---|---|---|---|
| Tasks UI + Tasks Agent | ✓ | ✓ | ✓ | ✓ | ✓ |
| Projects UI + Projects Agent | — | ✓ | ✓ | ✓ | ✓ |
| Briefs UI + Briefs Agent + artifacts | — | — | ✓ | ✓ | ✓ |
| Orders UI + Orders Agent + invoicing | — | — | — | ✓ | ✓ |
| Marketplace module installs | — | — | 3 included | Unlimited | Unlimited |
| Multi-surface (Desktop/Mobile/WhatsApp) | — | ✓ | ✓ | ✓ | ✓ |

---

## Repo Structure

```
spokestack-core/
├── docs/                         # This spec (you're reading it)
│   ├── README.md
│   ├── 01-deployment-architecture.md
│   ├── 02-core-product-schema.md
│   ├── ...
├── prisma/
│   └── schema.prisma            # ~50-60 models (vs 267 in ERP)
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                 # ~40-50 routes (vs 191 in ERP)
│   │   │   ├── auth/
│   │   │   ├── tasks/
│   │   │   ├── projects/
│   │   │   ├── briefs/
│   │   │   ├── orders/
│   │   │   ├── agents/
│   │   │   ├── billing/
│   │   │   ├── marketplace/
│   │   │   └── integrations/
│   │   ├── (dashboard)/         # Minimal config/analytics UI
│   │   │   ├── tasks/
│   │   │   ├── projects/
│   │   │   ├── briefs/
│   │   │   ├── orders/
│   │   │   ├── marketplace/
│   │   │   ├── settings/
│   │   │   └── layout.tsx
│   │   └── (onboarding)/        # The magic moment (see 05-onboarding.md)
│   │       ├── conversation/
│   │       └── reveal/
│   ├── lib/
│   │   ├── agent/               # Agent Runtime client
│   │   │   ├── router.ts       # MC Router — intent detection + agent dispatch
│   │   │   ├── context.ts      # Context Graph read/write
│   │   │   ├── config.ts       # Tier-scoped agent config builder
│   │   │   └── agents/
│   │   │       ├── onboarding.ts
│   │   │       ├── tasks.ts
│   │   │       ├── projects.ts
│   │   │       ├── briefs.ts
│   │   │       └── orders.ts
│   │   ├── billing/             # Stripe + metering
│   │   │   ├── stripe.ts
│   │   │   ├── tiers.ts
│   │   │   └── metering.ts
│   │   ├── vbx/                 # AgentVBX client (Redis Streams)
│   │   │   ├── streams.ts
│   │   │   └── surfaces.ts
│   │   ├── milestones/          # Context milestone engine (see 06-context-milestones.md)
│   │   │   ├── checker.ts
│   │   │   └── definitions.ts
│   │   ├── guard/               # ModuleGuard middleware
│   │   │   └── module-guard.ts
│   │   └── integrations/
│   │       ├── slack.ts
│   │       ├── google-drive.ts
│   │       └── telnyx.ts
│   └── modules/                  # Mode-specific business logic
│       ├── tasks/
│       │   ├── actions.ts
│       │   ├── queries.ts
│       │   └── components/
│       ├── projects/
│       │   ├── actions.ts
│       │   ├── queries.ts
│       │   ├── canvas.ts       # WfCanvas operations
│       │   └── components/
│       ├── briefs/
│       │   ├── actions.ts
│       │   ├── queries.ts
│       │   ├── artifacts.ts    # Artifact generation pipeline
│       │   └── components/
│       └── orders/
│           ├── actions.ts
│           ├── queries.ts
│           ├── invoicing.ts
│           └── components/
├── cli/                          # Published to npm as `spokestack`
│   ├── index.ts                 # Entry point + command router
│   ├── commands/
│   │   ├── init.ts
│   │   ├── login.ts
│   │   ├── status.ts
│   │   ├── task.ts
│   │   ├── project.ts
│   │   ├── brief.ts
│   │   ├── module.ts
│   │   ├── upgrade.ts
│   │   ├── agent.ts
│   │   ├── connect.ts
│   │   └── export.ts
│   ├── auth.ts                  # Token storage + refresh
│   └── ui.ts                   # Terminal formatting + prompts
├── packages/
│   └── sdk/                     # Third-party developer SDK (Phase 2)
│       ├── module-template/
│       └── agent-template/
├── docker-compose.yml           # Local dev + future self-hosted
├── railway.toml
├── vercel.json
└── package.json
```

---

## Prisma Schema — Core Subset

### Foundation Models

```prisma
model Organization {
  id              String   @id @default(cuid())
  name            String
  slug            String   @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  billingAccount  BillingAccount?
  teams           Team[]
  members         TeamMember[]
  settings        OrgSettings?
  modules         OrgModule[]
  featureFlags    FeatureFlag[]

  // Data
  tasks           Task[]
  taskLists       TaskList[]
  projects        Project[]
  briefs          Brief[]
  orders          Order[]
  customers       Customer[]

  // Agent
  agentSessions   AgentSession[]
  contextEntries  ContextEntry[]
  milestones      ContextMilestone[]

  // Infrastructure
  integrations    Integration[]
  notifications   Notification[]
  fileAssets      FileAsset[]
}

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  avatarUrl       String?
  supabaseId      String   @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  memberships     TeamMember[]
  agentMessages   AgentMessage[]
}

model Team {
  id              String   @id @default(cuid())
  organizationId  String
  name            String
  description     String?
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])
  members         TeamMember[]
}

model TeamMember {
  id              String   @id @default(cuid())
  organizationId  String
  userId          String
  teamId          String?
  role            MemberRole @default(MEMBER)
  joinedAt        DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])
  user            User @relation(fields: [userId], references: [id])
  team            Team? @relation(fields: [teamId], references: [id])
}

model OrgSettings {
  id              String   @id @default(cuid())
  organizationId  String   @unique
  timezone        String   @default("UTC")
  language        String   @default("en")
  weekStartDay    Int      @default(1)

  organization    Organization @relation(fields: [organizationId], references: [id])
}

model OrgModule {
  id              String   @id @default(cuid())
  organizationId  String
  moduleType      ModuleType
  installedAt     DateTime @default(now())
  active          Boolean  @default(true)
  config          Json?

  organization    Organization @relation(fields: [organizationId], references: [id])
  @@unique([organizationId, moduleType])
}

model FeatureFlag {
  id              String   @id @default(cuid())
  organizationId  String
  flag            String
  enabled         Boolean  @default(false)

  organization    Organization @relation(fields: [organizationId], references: [id])
  @@unique([organizationId, flag])
}
```

### Billing Models (Already Built — PR #402)

```prisma
model BillingAccount {
  id              String   @id @default(cuid())
  organizationId  String   @unique
  stripeCustomerId String?  @unique
  tier            BillingTierType @default(FREE)
  status          BillingStatus @default(ACTIVE)
  trialEndsAt     DateTime?
  currentPeriodEnd DateTime?

  organization    Organization @relation(fields: [organizationId], references: [id])
  invoices        BillingInvoice[]
  meterEvents     BillingMeterEvent[]
}

model BillingTier {
  id              String   @id @default(cuid())
  type            BillingTierType @unique
  name            String
  priceMonthly    Int              // cents
  maxMembers      Int
  maxStorageGb    Int
  maxMarketplaceModules Int
  surfacesIncluded String[]        // ["cli", "web", "desktop", "mobile", "whatsapp"]
  modesIncluded   String[]         // ["tasks", "projects", "briefs", "orders"]
}

model BillingMeterEvent {
  id              String   @id @default(cuid())
  billingAccountId String
  eventType       MeterEventType   // AGENT_CALL, STORAGE_BYTE, MODULE_INSTALL
  quantity        Int
  timestamp       DateTime @default(now())
  metadata        Json?

  billingAccount  BillingAccount @relation(fields: [billingAccountId], references: [id])
}

model BillingInvoice {
  id              String   @id @default(cuid())
  billingAccountId String
  stripeInvoiceId String?  @unique
  amountCents     Int
  status          InvoiceStatus
  periodStart     DateTime
  periodEnd       DateTime

  billingAccount  BillingAccount @relation(fields: [billingAccountId], references: [id])
}
```

### Tasks Models

```prisma
model TaskList {
  id              String   @id @default(cuid())
  organizationId  String
  name            String
  description     String?
  position        Int      @default(0)
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])
  tasks           Task[]
}

model Task {
  id              String   @id @default(cuid())
  organizationId  String
  taskListId      String?
  title           String
  description     String?
  status          TaskStatus @default(TODO)
  priority        TaskPriority @default(MEDIUM)
  assigneeId      String?
  dueDate         DateTime?
  completedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  metadata        Json?    // Flexible — lets agent store learned patterns

  organization    Organization @relation(fields: [organizationId], references: [id])
  taskList        TaskList? @relation(fields: [taskListId], references: [id])
  comments        TaskComment[]
  attachments     TaskAttachment[]
}

model TaskComment {
  id              String   @id @default(cuid())
  taskId          String
  authorId        String?  // null = agent-generated
  content         String
  createdAt       DateTime @default(now())

  task            Task @relation(fields: [taskId], references: [id])
}

model TaskAttachment {
  id              String   @id @default(cuid())
  taskId          String
  fileAssetId     String
  createdAt       DateTime @default(now())

  task            Task @relation(fields: [taskId], references: [id])
  fileAsset       FileAsset @relation(fields: [fileAssetId], references: [id])
}
```

### Projects Models

```prisma
model Project {
  id              String   @id @default(cuid())
  organizationId  String
  name            String
  description     String?
  status          ProjectStatus @default(PLANNING)
  startDate       DateTime?
  endDate         DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  metadata        Json?

  organization    Organization @relation(fields: [organizationId], references: [id])
  phases          ProjectPhase[]
  milestones      ProjectMilestone[]
  canvas          WfCanvas?
}

model ProjectPhase {
  id              String   @id @default(cuid())
  projectId       String
  name            String
  position        Int
  status          PhaseStatus @default(PENDING)
  startDate       DateTime?
  endDate         DateTime?

  project         Project @relation(fields: [projectId], references: [id])
}

model ProjectMilestone {
  id              String   @id @default(cuid())
  projectId       String
  name            String
  dueDate         DateTime?
  completedAt     DateTime?
  description     String?

  project         Project @relation(fields: [projectId], references: [id])
}

// Workflow Canvas — the visual workflow builder (already built)
model WfCanvas {
  id              String   @id @default(cuid())
  projectId       String?  @unique
  organizationId  String
  name            String
  description     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project         Project? @relation(fields: [projectId], references: [id])
  nodes           WfCanvasNode[]
  edges           WfCanvasEdge[]
}

model WfCanvasNode {
  id              String   @id @default(cuid())
  canvasId        String
  type            NodeType
  label           String
  positionX       Float
  positionY       Float
  config          Json?

  canvas          WfCanvas @relation(fields: [canvasId], references: [id])
  outEdges        WfCanvasEdge[] @relation("SourceNode")
  inEdges         WfCanvasEdge[] @relation("TargetNode")
}

model WfCanvasEdge {
  id              String   @id @default(cuid())
  canvasId        String
  sourceNodeId    String
  targetNodeId    String
  condition       Json?

  canvas          WfCanvas @relation(fields: [canvasId], references: [id])
  sourceNode      WfCanvasNode @relation("SourceNode", fields: [sourceNodeId], references: [id])
  targetNode      WfCanvasNode @relation("TargetNode", fields: [targetNodeId], references: [id])
}
```

### Briefs Models

```prisma
model Brief {
  id              String   @id @default(cuid())
  organizationId  String
  title           String
  description     String?
  status          BriefStatus @default(DRAFT)
  clientName      String?
  createdById     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  metadata        Json?

  organization    Organization @relation(fields: [organizationId], references: [id])
  phases          BriefPhase[]
  artifacts       Artifact[]
}

model BriefPhase {
  id              String   @id @default(cuid())
  briefId         String
  name            String
  position        Int
  status          PhaseStatus @default(PENDING)
  assigneeId      String?
  dueDate         DateTime?

  brief           Brief @relation(fields: [briefId], references: [id])
}

model Artifact {
  id              String   @id @default(cuid())
  briefId         String
  type            ArtifactType  // DOCUMENT, DESIGN, VIDEO, COPY, PRESENTATION
  title           String
  content         Json?         // Structured content or reference to file
  status          ArtifactStatus @default(DRAFT)
  version         Int          @default(1)
  generatedByAgent Boolean    @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  brief           Brief @relation(fields: [briefId], references: [id])
  reviews         ArtifactReview[]
  fileAsset       FileAsset?  @relation(fields: [fileAssetId], references: [id])
  fileAssetId     String?
}

model ArtifactReview {
  id              String   @id @default(cuid())
  artifactId      String
  reviewerId      String
  status          ReviewStatus  // APPROVED, REVISION_REQUESTED, REJECTED
  comments        String?
  createdAt       DateTime @default(now())

  artifact        Artifact @relation(fields: [artifactId], references: [id])
}
```

### Orders Models

```prisma
model Customer {
  id              String   @id @default(cuid())
  organizationId  String
  name            String
  email           String?
  phone           String?
  company         String?
  metadata        Json?
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])
  orders          Order[]
  invoices        Invoice[]
}

model Order {
  id              String   @id @default(cuid())
  organizationId  String
  customerId      String?
  status          OrderStatus @default(PENDING)
  totalCents      Int      @default(0)
  currency        String   @default("USD")
  notes           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id])
  customer        Customer? @relation(fields: [customerId], references: [id])
  items           OrderItem[]
  invoice         Invoice?
}

model OrderItem {
  id              String   @id @default(cuid())
  orderId         String
  description     String
  quantity        Int      @default(1)
  unitPriceCents  Int
  totalCents      Int

  order           Order @relation(fields: [orderId], references: [id])
}

model Invoice {
  id              String   @id @default(cuid())
  organizationId  String
  customerId      String?
  orderId         String?  @unique
  number          String
  status          InvoiceStatus @default(DRAFT)
  totalCents      Int
  currency        String   @default("USD")
  issuedAt        DateTime?
  dueDate         DateTime?
  paidAt          DateTime?
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])
  customer        Customer? @relation(fields: [customerId], references: [id])
  order           Order? @relation(fields: [orderId], references: [id])
  items           InvoiceItem[]
}

model InvoiceItem {
  id              String   @id @default(cuid())
  invoiceId       String
  description     String
  quantity        Int      @default(1)
  unitPriceCents  Int
  totalCents      Int

  invoice         Invoice @relation(fields: [invoiceId], references: [id])
}
```

### Agent Models

```prisma
model AgentSession {
  id              String   @id @default(cuid())
  organizationId  String
  userId          String?
  agentType       AgentType  // ONBOARDING, TASKS, PROJECTS, BRIEFS, ORDERS, MODULE_*
  surface         SurfaceType // CLI, WEB, DESKTOP, MOBILE, WHATSAPP
  startedAt       DateTime @default(now())
  endedAt         DateTime?
  metadata        Json?

  organization    Organization @relation(fields: [organizationId], references: [id])
  messages        AgentMessage[]
}

model AgentMessage {
  id              String   @id @default(cuid())
  sessionId       String
  role            MessageRole // USER, AGENT, SYSTEM
  content         String
  toolCalls       Json?      // Structured record of tools invoked
  tokenCount      Int?
  createdAt       DateTime @default(now())

  session         AgentSession @relation(fields: [sessionId], references: [id])
}

// The shared context graph — the moat
model ContextEntry {
  id              String   @id @default(cuid())
  organizationId  String
  entryType       ContextType  // ENTITY, PATTERN, PREFERENCE, MILESTONE, INSIGHT
  category        String       // e.g. "team_member", "client", "workflow_pattern"
  key             String       // e.g. "sarah_creative_lead", "project_qa_bottleneck"
  value           Json         // Structured context data
  confidence      Float        @default(0.5)
  sourceAgentType AgentType?   // Which agent created this entry
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  expiresAt       DateTime?    // Some context is temporal

  organization    Organization @relation(fields: [organizationId], references: [id])
  @@index([organizationId, entryType])
  @@index([organizationId, category])
  @@unique([organizationId, category, key])
}

// Context milestones — see 06-context-milestones.md
model ContextMilestone {
  id              String   @id @default(cuid())
  organizationId  String
  milestoneType   MilestoneType
  threshold       Int
  currentValue    Int      @default(0)
  triggered       Boolean  @default(false)
  triggeredAt     DateTime?
  recommendedModule String?
  dismissed       Boolean  @default(false)
  dismissedAt     DateTime?
  lastCheckedAt   DateTime?

  organization    Organization @relation(fields: [organizationId], references: [id])
  @@unique([organizationId, milestoneType])
}
```

### Infrastructure Models

```prisma
model Integration {
  id              String   @id @default(cuid())
  organizationId  String
  type            IntegrationType // SLACK, GOOGLE_DRIVE, GITHUB, TELNYX
  status          IntegrationStatus @default(PENDING)
  config          Json?    // Encrypted OAuth tokens, webhook URLs, etc.
  installedAt     DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])
}

model Notification {
  id              String   @id @default(cuid())
  organizationId  String
  userId          String
  type            NotificationType
  title           String
  body            String?
  channel         NotificationChannel // PUSH, EMAIL, WHATSAPP, SMS, IN_APP
  read            Boolean  @default(false)
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])
}

model NotificationPreference {
  id              String   @id @default(cuid())
  userId          String
  organizationId  String
  channel         NotificationChannel
  enabled         Boolean  @default(true)

  @@unique([userId, organizationId, channel])
}

model FileAsset {
  id              String   @id @default(cuid())
  organizationId  String
  fileName        String
  mimeType        String
  sizeBytes       Int
  storageUrl      String
  uploadedById    String?
  createdAt       DateTime @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id])
  versions        FileVersion[]
  taskAttachments TaskAttachment[]
}

model FileVersion {
  id              String   @id @default(cuid())
  fileAssetId     String
  version         Int
  storageUrl      String
  sizeBytes       Int
  createdAt       DateTime @default(now())

  fileAsset       FileAsset @relation(fields: [fileAssetId], references: [id])
}
```

### Enums

```prisma
enum MemberRole { OWNER ADMIN MEMBER VIEWER }
enum BillingTierType { FREE STARTER PRO BUSINESS ENTERPRISE }
enum BillingStatus { ACTIVE PAST_DUE CANCELED }
enum InvoiceStatus { DRAFT SENT PAID OVERDUE VOID }
enum MeterEventType { AGENT_CALL STORAGE_BYTE MODULE_INSTALL }
enum TaskStatus { TODO IN_PROGRESS DONE ARCHIVED }
enum TaskPriority { LOW MEDIUM HIGH URGENT }
enum ProjectStatus { PLANNING ACTIVE ON_HOLD COMPLETED ARCHIVED }
enum PhaseStatus { PENDING ACTIVE COMPLETED SKIPPED }
enum BriefStatus { DRAFT ACTIVE IN_REVIEW COMPLETED ARCHIVED }
enum ArtifactType { DOCUMENT DESIGN VIDEO COPY PRESENTATION OTHER }
enum ArtifactStatus { DRAFT IN_REVIEW APPROVED REJECTED }
enum ReviewStatus { APPROVED REVISION_REQUESTED REJECTED }
enum OrderStatus { PENDING CONFIRMED IN_PROGRESS COMPLETED CANCELED }
enum AgentType { ONBOARDING TASKS PROJECTS BRIEFS ORDERS MODULE }
enum SurfaceType { CLI WEB DESKTOP MOBILE WHATSAPP }
enum MessageRole { USER AGENT SYSTEM }
enum ContextType { ENTITY PATTERN PREFERENCE MILESTONE INSIGHT }
enum MilestoneType { CLIENT_ENTITY_DENSITY BRIEF_CYCLE_COUNT SOCIAL_CONTENT_PATTERN PROJECT_TIMELINE_DENSITY ENGAGEMENT_DEPTH COLLABORATION_DENSITY }
enum NodeType { START END ACTION CONDITION DELAY APPROVAL NOTIFICATION }
enum IntegrationType { SLACK GOOGLE_DRIVE GITHUB TELNYX CUSTOM }
enum IntegrationStatus { PENDING ACTIVE ERROR DISABLED }
enum NotificationType { TASK_ASSIGNED TASK_COMPLETED BRIEF_REVIEW MILESTONE_DUE AGENT_RECOMMENDATION SYSTEM }
enum NotificationChannel { PUSH EMAIL WHATSAPP SMS IN_APP }
enum ModuleType { TASKS PROJECTS BRIEFS ORDERS CRM SOCIAL_PUBLISHING CONTENT_STUDIO ANALYTICS SURVEYS LISTENING MEDIA_BUYING LMS NPS TIME_LEAVE BOARDS FINANCE WORKFLOWS ADMIN }
```

### Model Count

| Category | Models | Count |
|----------|--------|-------|
| Foundation | Organization, User, Team, TeamMember, OrgSettings, OrgModule, FeatureFlag | 7 |
| Billing | BillingAccount, BillingTier, BillingMeterEvent, BillingInvoice | 4 |
| Tasks | Task, TaskList, TaskComment, TaskAttachment | 4 |
| Projects | Project, ProjectPhase, ProjectMilestone, WfCanvas, WfCanvasNode, WfCanvasEdge | 6 |
| Briefs | Brief, BriefPhase, Artifact, ArtifactReview | 4 |
| Orders | Customer, Order, OrderItem, Invoice, InvoiceItem | 5 |
| Agent | AgentSession, AgentMessage, ContextEntry, ContextMilestone | 4 |
| Infrastructure | Integration, Notification, NotificationPreference, FileAsset, FileVersion | 5 |
| **Total** | | **39 models + 27 enums** |

Clean, focused, extensible via marketplace modules. Every model carries `organizationId` for row-level tenant isolation.

---

## What Stays Behind (SpokeStack ERP → Future Marketplace Modules)

These 14 modules exist in the current ERP and become marketplace modules at Phase 4+:

| Module | Current ERP Status | Marketplace Priority |
|--------|-------------------|---------------------|
| Social Publishing | Built | High — early milestone trigger |
| Content Studio | Built | High |
| CRM | Built | High — early milestone trigger |
| Analytics | Built | Medium |
| Surveys | Built | Medium |
| Listening | Built | Low |
| Media Buying | Built | Low |
| LMS | Built | Low |
| NPS | Built | Medium |
| Time & Leave | Built | Medium |
| Boards | Built | Medium |
| Finance | Built | Low |
| Workflows (Advanced) | Built | Low |
| Admin (Advanced) | Built | Low |

Each module, when extracted for the marketplace, ships with its own agent. See [03-agent-architecture.md](./03-agent-architecture.md) for the agent-per-module model.
# 03 — Agent Architecture

## Agents Are the Product

The agents are what do the work. Not a feature, not an implementation detail. More capable, more specialized agents = more work done = more value = more lock-in = more willingness to pay.

Constraining to one agent per tenant would be like Shopify saying "you only get one app." The architecture is: **mode-specific agents sharing a unified context graph.**

---

## Architecture Overview

```
                         ┌─────────────────────────┐
                         │      MC Router           │
                         │  (Intent Detection +     │
                         │   Agent Dispatch)         │
                         └────────┬────────────────┘
                                  │
              ┌───────────┬───────┼───────┬───────────┐
              ▼           ▼       ▼       ▼           ▼
        ┌──────────┐ ┌────────┐ ┌────┐ ┌────────┐ ┌────────────┐
        │Onboarding│ │ Tasks  │ │Proj│ │ Briefs │ │  Orders    │
        │  Agent   │ │ Agent  │ │Agt │ │ Agent  │ │  Agent     │
        └────┬─────┘ └───┬────┘ └─┬──┘ └───┬────┘ └─────┬──────┘
             │            │        │        │             │
             │     ┌──────┴────────┴────────┴─────────────┘
             │     │
             ▼     ▼
        ┌──────────────────────────┐
        │    Shared Context Graph  │
        │    (ContextEntry store)  │
        │    Per-organization      │
        └──────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │  Marketplace Module      │
        │  Agents (CRM Agent,     │
        │  Publishing Agent, etc.) │
        │  Also read/write here    │
        └──────────────────────────┘
```

### Components

**MC Router (already built):** The orchestrator. Receives user input from any surface (CLI, web, desktop, mobile, WhatsApp). Detects intent. Routes to the appropriate agent. Does not process requests itself — it's a dispatcher. If a request is ambiguous, it asks for clarification. If a request spans modes ("create a task from this brief"), it coordinates between agents.

**Mode-Specific Agents:** Tasks Agent, Projects Agent, Briefs Agent, Orders Agent. Each has its own system prompt, tool set, and behavioral patterns. Each reads from and writes to the shared context graph. Each is tier-gated — see [02-core-product-schema.md](./02-core-product-schema.md) for gating logic.

**Onboarding Agent:** A special-purpose agent that only runs during workspace setup. Warm, curious, generative. Builds the workspace through conversation. Hands off to mode agents after the reveal. See [05-onboarding.md](./05-onboarding.md).

**Marketplace Module Agents:** Each marketplace module ships with its own agent. CRM module → CRM Agent. Social Publishing module → Publishing Agent. These agents also read/write the shared context graph, making them immediately contextually aware of the organization.

**Shared Context Graph:** The ContextEntry store. Every agent reads and writes here. This is the moat. See [Context Graph](#the-shared-context-graph) section below.

---

## Agent Specifications

### Tasks Agent

**Purpose:** Handle all task-related operations. Create, assign, update, complete, and recommend tasks. Adapt to whatever the user defines as a "task" — personal to-dos, team work, client deliverables, ad-hoc requests.

**System Prompt Core:**
```
You are the Tasks Agent for {org.name}. You manage task creation, assignment,
tracking, and completion. You read from the shared context graph to understand
team dynamics, past patterns, and organizational preferences.

You are flexible about what constitutes a "task." A construction company's tasks
look nothing like an agency's tasks. Adapt to how this organization works.

When you detect patterns that suggest a user might benefit from Projects, Briefs,
or Orders capabilities, mention it naturally — not as a sales pitch, but as a
genuine observation: "This looks like part of a bigger initiative. Your Projects
Agent could help plan the whole thing."
```

**Tools:**
- `createTask(title, description?, assigneeId?, dueDate?, priority?, taskListId?)`
- `updateTask(taskId, updates)`
- `completeTask(taskId)`
- `listTasks(filters?)`
- `createTaskList(name, description?)`
- `addComment(taskId, content)`
- `assignTask(taskId, assigneeId)`
- `searchTasks(query)`
- `readContext(categories?)` — read from shared context graph
- `writeContext(entry)` — write to shared context graph

**Lock-In Behaviors (what the agent learns over time):**

| Time | What It Learns | How It Manifests |
|------|---------------|-----------------|
| Week 1 | Team member names, basic preferences | "Should I assign this to Sarah? She usually handles creative tasks." |
| Week 2-3 | Assignment patterns, workload distribution | "Sarah's got 8 open tasks. Omar only has 3. Want to balance?" |
| Month 1 | Effort estimation from historical completion data | "Tasks like this usually take your team about 3 days." |
| Month 2+ | Recurring cadences, client patterns | "You create a content review task every Friday. Want me to automate that?" |
| Month 3+ | Cross-mode insights (with context graph) | "Your last 5 projects all had QA bottlenecks. Want me to flag QA tasks earlier?" |

**Key Design Principle:** The Tasks Agent shouldn't be rigid. It handles whatever the user throws at it. The `metadata` JSON field on the Task model provides extensibility — the agent can store learned patterns, custom fields, and organizational conventions without schema changes.

---

### Projects Agent

**Purpose:** Handle project planning, workflow management, Canvas operations, and project intelligence. Decompose project intent into structured plans. Monitor execution and proactively surface risks.

**System Prompt Core:**
```
You are the Projects Agent for {org.name}. You manage project planning,
workflow design (WfCanvas), milestone tracking, and execution monitoring.

You read historical project data from the context graph to make predictions
and recommendations. When you see patterns across projects — bottlenecks,
timeline slips, resource conflicts — you surface them proactively.

You can create and modify WfCanvas workflows. When a user describes a process,
translate it into a visual workflow with nodes and edges.
```

**Tools:**
- `createProject(name, description?, startDate?, endDate?)`
- `updateProject(projectId, updates)`
- `addPhase(projectId, name, position)`
- `addMilestone(projectId, name, dueDate?, description?)`
- `createCanvas(projectId?, name, description?)`
- `addCanvasNode(canvasId, type, label, position, config?)`
- `addCanvasEdge(canvasId, sourceNodeId, targetNodeId, condition?)`
- `getProjectStatus(projectId)` — synthesized health report
- `listProjects(filters?)`
- `readContext(categories?)`
- `writeContext(entry)`

**Lock-In Behaviors:**

| Time | What It Learns | How It Manifests |
|------|---------------|-----------------|
| Week 1-2 | How this org structures projects | "Based on your description, this looks like a 4-phase project. Here's a Canvas." |
| Month 1 | Phase duration patterns | "Your design phases usually run 20% over. Want me to add buffer?" |
| Month 2 | Resource bottlenecks | "QA has been the bottleneck in your last 3 projects. Want to restructure?" |
| Month 3+ | Cross-project intelligence | "Projects with Client X consistently need an extra review cycle. Building that in." |
| Month 4+ | Predictive project planning | "Based on 15 completed projects, here's what I'd recommend for scope and timeline." |

**Canvas as Lock-In:** The WfCanvas is one of the deepest lock-in mechanisms. Once workflows encode institutional knowledge — how approvals flow, what triggers notifications, which team handles which phase — migration is painful. The Projects Agent makes Canvases even stickier by learning *which Canvas patterns work best for which project types* and recommending proven workflows for new projects.

---

### Briefs Agent

**Purpose:** Orchestrate the creative/strategic brief lifecycle. Decompose briefs into phases, generate artifacts (documents, designs, copy), route for review, and manage the approval cycle.

**System Prompt Core:**
```
You are the Briefs Agent for {org.name}. You manage the brief lifecycle from
intake through delivery. You can decompose briefs into phases, generate artifact
drafts, route artifacts for review, and track approval cycles.

For complex briefs, you can spin up sub-agents for parallel artifact generation.
You learn creative preferences, revision patterns, and approval velocity to make
the process faster over time.
```

**Tools:**
- `createBrief(title, description?, clientName?)`
- `addBriefPhase(briefId, name, position, assigneeId?, dueDate?)`
- `generateArtifact(briefId, type, title, instructions)` — creates artifact draft
- `submitForReview(artifactId, reviewerIds[])`
- `recordReview(artifactId, reviewerId, status, comments?)`
- `listBriefs(filters?)`
- `getBriefStatus(briefId)` — synthesized progress report
- `readContext(categories?)`
- `writeContext(entry)`

**Multi-Agent for Brief Orchestration:**

The Briefs Agent is the one mode where multi-agent decomposition genuinely helps. When a brief requires multiple artifacts — a strategy document, a creative concept, a media plan — the Briefs Agent can spin up short-lived sub-agents for parallel generation:

```
Briefs Agent receives: "Create a campaign brief for Client X product launch"
  │
  ├─ Decomposes into phases:
  │   Phase 1: Strategy Document
  │   Phase 2: Creative Concept
  │   Phase 3: Media Plan
  │
  ├─ Spins up sub-agents (short-lived, workflow-scoped):
  │   ├─ Strategy Writer sub-agent → generates strategy doc artifact
  │   ├─ Creative sub-agent → generates concept artifact
  │   └─ Media sub-agent → generates media plan artifact
  │
  ├─ Sub-agents complete, artifacts created
  │
  └─ Briefs Agent routes each artifact to appropriate reviewer
```

These sub-agents are workflow-level, not persistent. They spin up for a specific brief execution and terminate. They read the shared context graph for organizational context but don't persist as always-on processes.

**Lock-In Behaviors:**

| Time | What It Learns | How It Manifests |
|------|---------------|-----------------|
| Brief 1-3 | Basic structure preferences | "Your briefs typically have 4 phases. Using that as the template." |
| Brief 5-10 | Revision patterns | "Your team's creative briefs average 2.3 revision cycles." |
| Brief 10+ | Approval velocity | "Reviews take 2.1 days on average. Client X is fastest at 1.2 days." |
| Brief 15+ | Creative preferences | "Based on past approvals, your team prefers concise strategy docs under 5 pages." |
| Brief 25+ | Predictive quality | "Here's a draft that matches the style of your 10 highest-rated artifacts." |

---

### Orders Agent

**Purpose:** Manage the commercial lifecycle — customers, orders, invoicing, and business intelligence derived from transaction patterns.

**System Prompt Core:**
```
You are the Orders Agent for {org.name}. You manage customers, orders, invoicing,
and commercial intelligence. You track purchasing patterns, seasonal trends, and
customer relationships.

You can generate invoices, track payment status, and surface insights about
the business's commercial health. You read the context graph to connect order
patterns with project and task data.
```

**Tools:**
- `createCustomer(name, email?, phone?, company?)`
- `createOrder(customerId?, items[], notes?)`
- `updateOrder(orderId, updates)`
- `generateInvoice(orderId, dueDate?)`
- `sendInvoice(invoiceId)` — via configured channel
- `recordPayment(invoiceId, paidAt?)`
- `listOrders(filters?)`
- `listCustomers(filters?)`
- `getRevenueInsights(period?)` — synthesized business intelligence
- `readContext(categories?)`
- `writeContext(entry)`

**Lock-In Behaviors:**

| Time | What It Learns | How It Manifests |
|------|---------------|-----------------|
| Month 1 | Customer list, basic order patterns | "You have 8 active customers. Here's a summary." |
| Month 2 | Purchasing frequency | "Client X orders every 3 weeks. They're due soon." |
| Month 3+ | Revenue patterns | "Your top 3 clients represent 62% of revenue." |
| Month 4+ | Seasonal trends | "Q4 orders historically spike 40%. Want to prepare capacity?" |
| Month 6+ | Cross-mode intelligence | "Projects for Client X always generate 2-3 follow-on orders. Flagging." |

---

## The Shared Context Graph

### What It Is

The ContextEntry store is a shared, append-mostly knowledge base that all agents read from and write to. It stores organizational intelligence as structured entries with types, categories, keys, and values.

### Entry Types

| Type | What It Stores | Example |
|------|---------------|---------|
| **ENTITY** | Known organizational entities | `{type: "team_member", key: "sarah_chen", value: {name: "Sarah Chen", role: "Creative Lead", skills: ["design", "branding"], avgTaskDays: 3.2}}` |
| **PATTERN** | Learned behavioral patterns | `{type: "pattern", key: "qa_bottleneck_week3", value: {description: "QA phase bottlenecks in week 3 of web projects", frequency: 5, confidence: 0.82}}` |
| **PREFERENCE** | Organizational preferences | `{type: "preference", key: "brief_style_concise", value: {description: "Team prefers strategy docs under 5 pages", source: "artifact_reviews"}}` |
| **INSIGHT** | Cross-mode intelligence | `{type: "insight", key: "client_x_q4_spike", value: {description: "Client X increases orders 40% in Q4", evidence: ["order_2024_q4", "order_2023_q4"]}}` |
| **MILESTONE** | Context milestone progress | See [06-context-milestones.md](./06-context-milestones.md) |

### How Agents Use It

Every agent interaction follows this pattern:

```
1. Agent receives user request
2. Agent reads relevant ContextEntry records
   - Filter by category (e.g., "team_member" for assignment decisions)
   - Filter by type (e.g., PATTERN for predictive suggestions)
   - Sorted by confidence (higher = more trusted)
3. Agent processes request with context-enriched understanding
4. Agent executes tools (CRUD operations)
5. Agent evaluates whether new context was generated:
   - New entity discovered? → write ENTITY
   - New pattern detected? → write PATTERN
   - Preference inferred? → write PREFERENCE
   - Cross-mode insight? → write INSIGHT
6. Agent responds to user
```

### Compounding Effect

The context graph compounds because:

- **Every agent writes to it.** The Tasks Agent learns assignment patterns. The Projects Agent learns workflow patterns. The Briefs Agent learns creative preferences. All of this context is available to all agents.
- **Cross-agent reads create cross-mode intelligence.** The Orders Agent can read project patterns to predict order timing. The Projects Agent can read task assignment patterns to optimize resource allocation. The Briefs Agent can read order history to prioritize client briefs.
- **Confidence increases over time.** Each confirming observation increases the `confidence` score on a ContextEntry. After 10 observations of the same pattern, the agent acts with higher certainty.
- **The graph is non-portable.** No export can capture the accumulated intelligence. A user can export their data (tasks, projects, briefs, orders), but the contextual relationships, learned patterns, and cross-mode insights are SpokeStack's proprietary intelligence layer.

### Context Graph Maintenance

Not all context is permanent. The graph needs maintenance:

- **Temporal context expires.** A ContextEntry with `expiresAt` set auto-decays. "Sarah is on vacation" expires when the vacation ends.
- **Confidence decay.** Patterns not re-confirmed within 90 days see confidence decrease by 10%.
- **Contradiction resolution.** When a new observation contradicts an existing entry, the agent updates the entry rather than creating a duplicate. Confidence resets to the new observation's baseline.
- **Deduplication.** The unique constraint on `[organizationId, category, key]` prevents duplicate entries. Updates merge with existing entries.

---

## Tier Gating — Agent Availability

| Tier | Agents Available | Context Graph | Multi-Agent |
|---|---|---|---|
| **Free** | Onboarding + Tasks Agent | Shared, accumulating | Never |
| **Starter** ($29) | + Projects Agent | Shared, accumulating | Never |
| **Pro** ($59) | + Briefs Agent | Shared, accumulating | Brief orchestration workflows |
| **Business** ($149) | + Orders Agent | Shared, accumulating | Brief + Order workflows |
| **Enterprise** | + Custom specialist agents | Shared + dedicated graphs | Always available |

### How Upgrades Work

1. User clicks "Upgrade to Pro" in dashboard (or `spokestack upgrade` in CLI)
2. Stripe processes payment
3. `BillingAccount.tier` updates to `PRO`
4. Next agent session: `buildAgentConfig()` includes Briefs tools + system prompt
5. Briefs tab appears in UI (ModuleGuard now allows access)
6. Briefs Agent is available via MC Router
7. Agent greets user: "Your Briefs Agent is here. I already know your team structure and workflow patterns. Ready to create your first brief?"

The upgrade is instant. No redeployment, no migration, no downtime. The agent already has full context from the shared context graph.

### How Downgrades Work

1. User downgrades from Pro to Starter
2. BillingTier updates
3. Briefs UI becomes inaccessible (ModuleGuard blocks)
4. Briefs Agent no longer available via MC Router
5. Existing Brief data is preserved (schema is the same for all tiers)
6. If user re-upgrades, Briefs Agent reactivates with all prior data intact
7. Context graph entries written by Briefs Agent persist — other agents can still read them

---

## Marketplace Module Agents

### The Agent-Per-Module Model

Every marketplace module ships with its own agent. This is the key differentiator: users don't just install a feature — they acquire a new team member.

```
Module Installation Flow:
1. User installs CRM module ($10/mo)
2. OrgModule record created
3. CRM Agent becomes available via MC Router
4. CRM Agent reads shared context graph
5. CRM Agent immediately knows: team members, client mentions, order history
6. CRM Agent: "I can see you work with 12 recurring clients. Let me set up your CRM."
```

### Module Agent Design Contract

Third-party developers building marketplace modules must follow this contract:

```typescript
interface ModuleAgent {
  // Identity
  agentType: string;           // e.g., "MODULE_CRM"
  displayName: string;         // e.g., "CRM Agent"
  description: string;

  // Capabilities
  tools: AgentTool[];          // Module-specific tools
  systemPrompt: string;        // Agent personality + instructions

  // Context Graph Integration (required)
  contextCategories: string[]; // Categories this agent reads/writes
  contextPermissions: {
    read: string[];            // Categories this agent can read
    write: string[];           // Categories this agent can write
  };

  // Schema Extension (optional)
  prismaModels?: string;       // Additional Prisma models for this module
  migrations?: string[];       // Database migrations

  // UI Extension (optional)
  dashboardRoutes?: Route[];   // Dashboard tabs/pages
  cliCommands?: CliCommand[];  // CLI subcommands
}
```

### Context Permissions

Module agents have scoped access to the context graph:

- **Core agents** (Tasks, Projects, Briefs, Orders) have full read/write access to all context categories.
- **Module agents** declare which categories they need to read and write. A CRM Agent reads "client", "order", "team_member" categories. A Social Publishing Agent reads "content", "team_member", "preference" categories.
- **No module agent can delete core context entries.** They can write their own entries and update entries they created.

---

## Agent Runtime Architecture

### Compute Model

Agents run on Railway as serverless functions, not persistent processes. Each agent call is:

1. MC Router receives request
2. Router determines target agent
3. Agent function is invoked with: user message, session context, org's context graph entries, tier-scoped tools and system prompt
4. Agent processes (LLM inference via OpenRouter)
5. Agent returns response + tool calls + context writes
6. Response routed to user via AgentVBX

### Session Management

- **AgentSession** records track which agent, which surface, when started
- **AgentMessage** records store the full conversation history
- Sessions persist across surfaces — start a task in CLI, continue via WhatsApp
- MC Router can resume sessions when intent matches an active session's agent

### Cost Control

Agent runtime cost is managed by:

1. **Soft throttle** — per-minute rate limits (see [04-pricing-and-tiers.md](./04-pricing-and-tiers.md))
2. **Model routing** — simple tasks use cheaper models (DeepSeek); complex orchestration uses stronger models (Claude Sonnet)
3. **Context window management** — only relevant ContextEntry records are included in the agent's context, not the full graph
4. **Caching** — repeated similar queries can be served from cached responses
5. **Sub-agent lifecycle** — Brief orchestration sub-agents are ephemeral, not persistent

### Model Selection

| Operation | Model | Rationale |
|-----------|-------|-----------|
| Simple CRUD (create task, update status) | DeepSeek | Low cost, fast, sufficient |
| Pattern recognition, recommendations | Claude Haiku / DeepSeek | Cost-effective reasoning |
| Complex orchestration (brief decomposition) | Claude Sonnet | Stronger planning/reasoning |
| Artifact generation (strategy docs, copy) | Claude Sonnet | Quality-critical output |
| Context graph analysis | Claude Haiku | Balance of cost and capability |

Model selection is handled by the agent framework, not hardcoded. As models improve or pricing changes, the routing table updates without code changes.

---

## The Onboarding → Mode Agent Handoff

The onboarding experience transitions from a single Onboarding Agent to mode-specific agents. See [05-onboarding.md](./05-onboarding.md) for the full flow. The key architectural points:

1. **Onboarding Agent** runs during workspace setup. It's a separate agent type with its own system prompt optimized for conversational workspace building.
2. **The Reveal** introduces mode agents: "Meet your Tasks Agent. When you're ready, your Projects Agent will be here too."
3. **Context handoff** is automatic — the Onboarding Agent writes organizational entities to the context graph. Mode agents read them immediately.
4. **No cold start** — because mode agents read the context graph, they already know the team structure, workflow patterns, and tool preferences from the onboarding conversation.

---

## Evolution Path

| Phase | Agent Capability | Context Graph Maturity |
|-------|-----------------|----------------------|
| **Launch** | 4 mode agents + onboarding agent, basic tool sets | Entity-level (team members, clients) |
| **Month 2-3** | First marketplace module agents (CRM, Social Publishing) | Pattern-level (recurring behaviors) |
| **Month 4-6** | Agent customization (persona tuning, workflow rules) | Preference-level (organizational style) |
| **Month 6-9** | Third-party module agents via SDK | Insight-level (cross-mode intelligence) |
| **Month 12+** | Enterprise custom specialist agents | Predictive-level (anticipatory behavior) |

The agent ecosystem compounds. Every new agent added to the system writes to the shared context graph, making every other agent smarter. This is the flywheel.
# 03a — Agent Runtime Tech Spec

**Addendum to [03-agent-architecture.md](./03-agent-architecture.md)**

The agent architecture doc describes *what* agents do. This doc describes *where they run and how they're wired together* — the deployment topology, dispatch mechanics, session management, and the toolkit that replaces the existing ERP's agent-builder.

---

## Decision: Separate Lightweight Runtime, Not a Fork

The existing `agent-builder` on Railway is tightly coupled to the LMTD ERP. It uses `ERPToolkit` — a class that makes real HTTP calls to the ERP's 191 API routes with LMTD-specific auth, LMTD-specific models, and LMTD-specific tool definitions. Forking it would mean stripping 80% of the code and maintaining two diverging codebases.

`spokestack-core` gets its own agent runtime: a lightweight Node.js service on Railway that handles MC Router dispatch, agent session management, LLM inference, and tool execution. It's purpose-built for the 39-model schema and the mode-agent architecture.

### Why Not In-Process (Same Next.js App)?

Tempting — fewer services to deploy. But wrong for three reasons:

1. **Vercel serverless has a 60-second execution limit** (Pro plan). Agent conversations with tool calls can exceed this, especially Brief orchestration with sub-agents. Railway has no execution time limit.

2. **Agent sessions need persistent connections.** The agent chat experience (both CLI and web) benefits from streaming responses. Vercel serverless functions are request-response. Railway can hold open SSE/WebSocket connections.

3. **Compute isolation.** A spike in agent inference shouldn't slow down dashboard page loads. Separate services on separate Railway instances means agent compute doesn't compete with API serving.

### Why Not the Existing agent-builder?

The existing agent-builder has deep coupling:

| Existing agent-builder | spokestack-core needs |
|---|---|
| ERPToolkit makes HTTP calls to 191 ERP routes | CoreToolkit calls Prisma directly (co-located DB access) |
| 51 specialized agent definitions | 5 mode agents + marketplace agent interface |
| LMTD-specific auth (internal JWT) | Supabase JWT validation |
| Custom session store (MongoDB) | PostgreSQL-backed AgentSession/AgentMessage |
| Agent configs hardcoded per LMTD department | Agent configs built dynamically from BillingTier + OrgModule |

A clean build is faster than a strip-down and won't accumulate technical debt from the fork.

---

## Deployment Topology

```
[Vercel — ERP Core]                    [Railway — Agent Runtime]
┌──────────────────────────┐           ┌──────────────────────────────┐
│ Next.js App Router       │           │ Node.js Service              │
│                          │           │                              │
│ /api/agents/chat   ──────┼── SSE ──→ │ HTTP Server (Hono/Fastify)   │
│ /api/agents/ask    ──────┼── POST ──→│                              │
│                          │           │ ┌──────────────────────────┐ │
│ ModuleGuard middleware   │           │ │ MC Router                │ │
│ (checks tier before      │           │ │ - Intent classification  │ │
│  forwarding to agent)    │           │ │ - Agent dispatch         │ │
│                          │           │ │ - Cross-agent coord     │ │
│ Dashboard UI             │           │ └─────────┬────────────────┘ │
│ Onboarding UI            │           │           │                  │
│ API routes (CRUD)        │           │ ┌─────────▼────────────────┐ │
└──────────────────────────┘           │ │ Agent Executor           │ │
                                       │ │ - Loads agent config     │ │
           ┌───────────────────────┐   │ │ - Manages conversation   │ │
           │ Supabase (PostgreSQL) │   │ │ - Executes tool calls    │ │
           │                       │◀──┤ │ - Streams responses      │ │
           │ All 39 models         │   │ └─────────┬────────────────┘ │
           │ ContextEntry store    │   │           │                  │
           │ AgentSession/Message  │   │ ┌─────────▼────────────────┐ │
           └───────────────────────┘   │ │ CoreToolkit              │ │
                                       │ │ - Direct Prisma calls    │ │
           ┌───────────────────────┐   │ │ - Context graph R/W      │ │
           │ Redis (Railway)       │◀──┤ │ - Billing meter writes   │ │
           │                       │   │ └──────────────────────────┘ │
           │ Rate limit counters   │   │                              │
           │ Milestone cache       │   │ ┌──────────────────────────┐ │
           │ AgentVBX streams      │   │ │ OpenRouter Client        │ │
           └───────────────────────┘   │ │ - Model routing          │ │
                                       │ │ - DeepSeek / Claude      │ │
                                       │ └──────────────────────────┘ │
                                       └──────────────────────────────┘

[WhatsApp / Telnyx]
┌──────────────────────────┐
│ Telnyx webhook ──────────┼── POST ──→ Railway Agent Runtime
│ (voice notes → STT)      │           (same service, /webhook/telnyx endpoint)
└──────────────────────────┘
```

### Key Architectural Decisions

**The Agent Runtime connects directly to Supabase PostgreSQL via Prisma.** Not through the ERP Core API. This eliminates the HTTP hop that the existing ERPToolkit requires. The Agent Runtime shares the same Prisma schema as the ERP Core — both are generated from the same `schema.prisma`. Tool calls execute as direct database operations, not API calls.

**The ERP Core (Vercel) acts as a gateway.** Dashboard and CLI requests hit Vercel API routes first. ModuleGuard checks tier access. If the request is agent-bound, Vercel proxies to Railway. This keeps auth and tier enforcement in one place.

**WhatsApp webhooks hit Railway directly.** Telnyx sends webhooks to the Agent Runtime, not through Vercel. The Agent Runtime validates the webhook signature, identifies the org by phone number, and processes the message. Responses go back through Telnyx's API.

---

## MC Router — Intent Detection & Agent Dispatch

MC Router is the first thing that processes every user message. It decides which agent handles the request.

### Implementation

```typescript
// src/runtime/router.ts

interface RouteDecision {
  agentType: AgentType;
  confidence: number;
  reasoning?: string;
}

class MCRouter {
  /**
   * Route a user message to the appropriate agent.
   *
   * Uses a lightweight LLM call (DeepSeek) to classify intent.
   * Falls back to keyword matching if LLM is unavailable.
   */
  async route(
    message: string,
    orgId: string,
    activeSession?: AgentSession
  ): Promise<RouteDecision> {

    // 1. If there's an active session and the message seems continuation, stay
    if (activeSession && this.isContinuation(message)) {
      return { agentType: activeSession.agentType, confidence: 0.9 };
    }

    // 2. Check tier — only route to agents the org has access to
    const tier = await this.getOrgTier(orgId);
    const availableAgents = this.getAvailableAgents(tier);

    // 3. Classify intent
    const classification = await this.classifyIntent(message, availableAgents);

    // 4. If intent maps to a gated agent, return upgrade prompt
    if (classification.agentType && !availableAgents.includes(classification.agentType)) {
      return {
        agentType: 'UPGRADE_PROMPT',
        confidence: 1.0,
        reasoning: `This looks like a ${classification.agentType} request. Your ${classification.agentType} Agent is available on the ${this.getRequiredTier(classification.agentType)} plan.`,
      };
    }

    return classification;
  }

  private async classifyIntent(
    message: string,
    availableAgents: AgentType[]
  ): Promise<RouteDecision> {
    // Lightweight LLM call for intent classification
    const response = await this.llm.complete({
      model: 'deepseek-chat', // Cheapest model — classification only
      messages: [{
        role: 'system',
        content: `Classify the user's intent into one of these agent types: ${availableAgents.join(', ')}.
                  Respond with JSON: {"agentType": "...", "confidence": 0.0-1.0}
                  TASKS: task creation, assignment, status, to-dos, work items
                  PROJECTS: project planning, workflows, milestones, timelines, phases
                  BRIEFS: creative briefs, artifacts, reviews, approvals, deliverables
                  ORDERS: orders, invoices, customers, payments, commercial`,
      }, {
        role: 'user',
        content: message,
      }],
      max_tokens: 50,
    });

    return JSON.parse(response);
  }

  private getAvailableAgents(tier: BillingTierType): AgentType[] {
    const map: Record<BillingTierType, AgentType[]> = {
      FREE: ['TASKS'],
      STARTER: ['TASKS', 'PROJECTS'],
      PRO: ['TASKS', 'PROJECTS', 'BRIEFS'],
      BUSINESS: ['TASKS', 'PROJECTS', 'BRIEFS', 'ORDERS'],
      ENTERPRISE: ['TASKS', 'PROJECTS', 'BRIEFS', 'ORDERS'],
    };
    return map[tier];
  }

  /**
   * Simple heuristic: if the message is short and doesn't contain
   * mode-switching keywords, treat it as continuation of active session.
   */
  private isContinuation(message: string): boolean {
    const switchKeywords = ['switch to', 'project', 'brief', 'order', 'task'];
    const isShort = message.split(' ').length < 8;
    const hasSwitch = switchKeywords.some(k => message.toLowerCase().includes(k));
    return isShort && !hasSwitch;
  }
}
```

### Routing Cost

Intent classification uses DeepSeek with a ~50 token response. At DeepSeek pricing (~$0.14/M input, $0.28/M output), routing costs ~$0.00002 per message. Negligible even at scale.

### Cross-Agent Requests

Some requests span agents: "Create a task from this brief" or "Which projects have overdue orders?" MC Router handles this by:

1. Routing to the **primary** agent (the one that executes the action)
2. Primary agent reads context from the **secondary** agent's domain via the shared Context Graph
3. If the primary agent needs to *write* to the secondary domain, it calls the secondary agent's tools directly (both agents share the same Prisma instance)

No inter-service communication needed. Both agents access the same database.

---

## Agent Executor — Session & Conversation Management

The Agent Executor is the core loop that runs an agent conversation turn.

### Implementation

```typescript
// src/runtime/executor.ts

class AgentExecutor {
  async executeTurn(
    sessionId: string,
    userMessage: string,
    surface: SurfaceType,
  ): AsyncGenerator<AgentStreamChunk> {

    // 1. Load or create session
    const session = await this.loadSession(sessionId);
    const org = await this.loadOrg(session.organizationId);

    // 2. Build agent config (tier-scoped tools + system prompt)
    const config = await this.buildAgentConfig(org, session.agentType);

    // 3. Load conversation history (last N messages for context window)
    const history = await this.loadHistory(sessionId, { limit: 50 });

    // 4. Load relevant context graph entries
    const context = await this.loadContext(org.id, session.agentType);

    // 5. Check rate limit
    const allowed = await this.checkRateLimit(org.id, org.billingAccount.tier);
    if (!allowed) {
      yield { type: 'text', content: "I'm working through a few things — give me a moment." };
      await this.waitForRateLimit(org.id);
    }

    // 6. Record user message
    await this.recordMessage(sessionId, 'USER', userMessage);

    // 7. Build LLM request
    const llmMessages = [
      { role: 'system', content: config.systemPrompt },
      { role: 'system', content: this.formatContext(context) },
      ...this.formatHistory(history),
      { role: 'user', content: userMessage },
    ];

    // 8. Execute LLM call with streaming + tool use loop
    let response = await this.llm.stream({
      model: config.model,
      messages: llmMessages,
      tools: config.tools,
      max_tokens: 4096,
    });

    // 9. Tool use loop — agent may call tools, then continue
    while (response.hasToolCalls) {
      const toolResults = await this.executeTools(response.toolCalls, org.id);
      yield { type: 'tool_progress', tools: response.toolCalls };

      // Feed tool results back to LLM
      response = await this.llm.stream({
        model: config.model,
        messages: [
          ...llmMessages,
          { role: 'assistant', content: response.content, tool_calls: response.toolCalls },
          ...toolResults.map(r => ({ role: 'tool', content: r.result, tool_call_id: r.id })),
        ],
        tools: config.tools,
      });
    }

    // 10. Stream final text response
    for await (const chunk of response.textStream) {
      yield { type: 'text', content: chunk };
    }

    // 11. Record agent message + meter the call
    await this.recordMessage(sessionId, 'AGENT', response.fullText, {
      toolCalls: response.toolCalls,
      tokenCount: response.usage.totalTokens,
    });

    await this.meterAgentCall(org.id, session.agentType, response.usage);

    // 12. Post-turn: evaluate context graph updates
    await this.evaluateContextUpdates(org.id, session.agentType, userMessage, response);
  }
}
```

### `buildAgentConfig()` — The Tier-Scoped Configuration Builder

This is the function that makes tier gating work at the agent level:

```typescript
// src/runtime/config.ts

async function buildAgentConfig(
  org: Organization & { billingAccount: BillingAccount; modules: OrgModule[] },
  agentType: AgentType,
): Promise<AgentConfig> {

  // 1. Load base agent definition
  const agentDef = AGENT_DEFINITIONS[agentType];

  // 2. Assemble tools based on agent type
  let tools = [...agentDef.baseTools];

  // 3. Add marketplace module tools if installed
  for (const module of org.modules.filter(m => m.active)) {
    const moduleDef = MODULE_DEFINITIONS[module.moduleType];
    if (moduleDef?.tools) {
      tools.push(...moduleDef.tools);
    }
  }

  // 4. Add cross-agent awareness tools (read-only into other domains)
  tools.push(
    readContextTool,    // Always available — read shared context graph
    writeContextTool,   // Always available — write to shared context graph
  );

  // 5. Build system prompt with org-specific context
  const systemPrompt = agentDef.buildSystemPrompt({
    orgName: org.name,
    teamMembers: await getTeamSummary(org.id),
    tier: org.billingAccount.tier,
    installedModules: org.modules.map(m => m.moduleType),
    // Include upgrade awareness so agent can mention gated capabilities
    gatedAgents: getGatedAgents(org.billingAccount.tier),
  });

  // 6. Select model based on agent type + expected complexity
  const model = selectModel(agentType);

  return { tools, systemPrompt, model };
}

// Model selection — can be overridden per-request based on message complexity
function selectModel(agentType: AgentType): string {
  switch (agentType) {
    case 'ONBOARDING':
      return 'anthropic/claude-sonnet-4-20250514'; // Quality-critical first impression
    case 'TASKS':
      return 'deepseek/deepseek-chat';              // Simple CRUD, cost-efficient
    case 'PROJECTS':
      return 'deepseek/deepseek-chat';              // Canvas creation needs reasoning but DeepSeek handles
    case 'BRIEFS':
      return 'anthropic/claude-sonnet-4-20250514'; // Artifact generation needs quality
    case 'ORDERS':
      return 'deepseek/deepseek-chat';              // Commercial ops are structured
    default:
      return 'deepseek/deepseek-chat';
  }
}
```

### Where `buildAgentConfig()` Runs

On Railway, in the Agent Runtime service. Not on Vercel. The config is built fresh at the start of each agent session (not each message — it caches for the session duration). When a user upgrades mid-session, the next session gets the new config.

---

## CoreToolkit — The spokestack-core Agent Toolkit

Replaces the existing ERPToolkit. The fundamental difference: **CoreToolkit uses direct Prisma calls**, not HTTP requests to an API.

### Architecture

```typescript
// src/runtime/toolkit.ts

class CoreToolkit {
  private prisma: PrismaClient;
  private orgId: string;

  constructor(prisma: PrismaClient, orgId: string) {
    this.prisma = prisma;
    this.orgId = orgId;
  }

  // --- Tasks Agent Tools ---

  async createTask(params: {
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    priority?: TaskPriority;
    taskListId?: string;
  }) {
    const task = await this.prisma.task.create({
      data: {
        organizationId: this.orgId,
        ...params,
        dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      },
      include: { taskList: true },
    });

    // Entity detection for context milestones
    await detectEntities(this.orgId, `${params.title} ${params.description || ''}`);

    return { success: true, task };
  }

  async listTasks(filters?: {
    status?: TaskStatus;
    assigneeId?: string;
    taskListId?: string;
  }) {
    return this.prisma.task.findMany({
      where: {
        organizationId: this.orgId,
        ...filters,
      },
      include: { taskList: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // --- Projects Agent Tools ---

  async createProject(params: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }) {
    return this.prisma.project.create({
      data: {
        organizationId: this.orgId,
        ...params,
        startDate: params.startDate ? new Date(params.startDate) : undefined,
        endDate: params.endDate ? new Date(params.endDate) : undefined,
      },
    });
  }

  async createCanvas(params: {
    projectId?: string;
    name: string;
    nodes: { type: NodeType; label: string; positionX: number; positionY: number; config?: any }[];
    edges: { sourceIndex: number; targetIndex: number; condition?: any }[];
  }) {
    // Transactional canvas creation — nodes + edges in one operation
    return this.prisma.$transaction(async (tx) => {
      const canvas = await tx.wfCanvas.create({
        data: {
          organizationId: this.orgId,
          projectId: params.projectId,
          name: params.name,
        },
      });

      const nodes = await Promise.all(
        params.nodes.map(n => tx.wfCanvasNode.create({
          data: { canvasId: canvas.id, ...n },
        }))
      );

      await Promise.all(
        params.edges.map(e => tx.wfCanvasEdge.create({
          data: {
            canvasId: canvas.id,
            sourceNodeId: nodes[e.sourceIndex].id,
            targetNodeId: nodes[e.targetIndex].id,
            condition: e.condition,
          },
        }))
      );

      return { canvas, nodes, edges: params.edges.length };
    });
  }

  // --- Context Graph Tools (all agents) ---

  async readContext(params: {
    categories?: string[];
    types?: ContextType[];
    limit?: number;
  }) {
    return this.prisma.contextEntry.findMany({
      where: {
        organizationId: this.orgId,
        ...(params.categories ? { category: { in: params.categories } } : {}),
        ...(params.types ? { entryType: { in: params.types } } : {}),
      },
      orderBy: { confidence: 'desc' },
      take: params.limit || 20,
    });
  }

  async writeContext(params: {
    entryType: ContextType;
    category: string;
    key: string;
    value: any;
    confidence?: number;
    sourceAgentType?: AgentType;
  }) {
    return this.prisma.contextEntry.upsert({
      where: {
        organizationId_category_key: {
          organizationId: this.orgId,
          category: params.category,
          key: params.key,
        },
      },
      update: {
        value: params.value,
        confidence: params.confidence || 0.5,
        updatedAt: new Date(),
      },
      create: {
        organizationId: this.orgId,
        ...params,
        confidence: params.confidence || 0.5,
      },
    });
  }

  // ... Briefs, Orders tools follow same pattern
}
```

### Tool Registration

Tools are registered as LLM function definitions. Each agent gets a scoped set:

```typescript
// src/runtime/tools/definitions.ts

const TASKS_TOOLS: LLMTool[] = [
  {
    name: 'createTask',
    description: 'Create a new task. Use when the user wants to add a task, to-do, or work item.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Optional description' },
        assigneeId: { type: 'string', description: 'Team member ID to assign to' },
        dueDate: { type: 'string', description: 'Due date in ISO format' },
        priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        taskListId: { type: 'string', description: 'Task list to add to' },
      },
      required: ['title'],
    },
  },
  // ... updateTask, completeTask, listTasks, etc.
];

const PROJECTS_TOOLS: LLMTool[] = [
  // ... createProject, createCanvas, addPhase, addMilestone, etc.
];

const BRIEFS_TOOLS: LLMTool[] = [
  // ... createBrief, generateArtifact, submitForReview, etc.
];

const ORDERS_TOOLS: LLMTool[] = [
  // ... createOrder, createCustomer, generateInvoice, etc.
];

// Context tools — available to ALL agents
const CONTEXT_TOOLS: LLMTool[] = [
  {
    name: 'readContext',
    description: 'Read organizational context — team members, patterns, preferences, insights. Use before making recommendations or assignments.',
    parameters: { /* ... */ },
  },
  {
    name: 'writeContext',
    description: 'Record a new organizational insight, pattern, or entity. Use when you learn something new about how this organization works.',
    parameters: { /* ... */ },
  },
];
```

---

## Session Management Across Surfaces

A user might start a task in CLI, check status on mobile, and approve via WhatsApp. Sessions need to work across surfaces.

### Session Model

```
AgentSession represents a conversation thread with a specific agent.
It persists across surfaces. Surface is tracked per-message, not per-session.

Session lifecycle:
1. Created when user first interacts with an agent (or MC Router routes to one)
2. Active while user is engaged (no explicit "end" — sessions time out after 30 min idle)
3. Resumable — if user returns to the same agent within 24 hours, same session continues
4. New session starts if: different agent type, or >24 hours since last message
```

### Cross-Surface Resume

```typescript
async function getOrCreateSession(
  orgId: string,
  userId: string,
  agentType: AgentType,
  surface: SurfaceType,
): Promise<AgentSession> {
  // Look for recent session with same agent type
  const existing = await prisma.agentSession.findFirst({
    where: {
      organizationId: orgId,
      userId: userId,
      agentType: agentType,
      endedAt: null,
      // Active if last message within 24 hours
      messages: {
        some: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (existing) return existing;

  // Create new session
  return prisma.agentSession.create({
    data: {
      organizationId: orgId,
      userId: userId,
      agentType: agentType,
      surface: surface, // Initial surface — messages track per-message surface
    },
  });
}
```

---

## Agent Runtime — Railway Service Configuration

### Service Specification

```toml
# railway.toml

[service]
name = "spokestack-agent-runtime"
healthcheck = "/health"
startCommand = "node dist/server.js"

[service.env]
DATABASE_URL = "${{ shared.DATABASE_URL }}"
REDIS_URL = "${{ shared.REDIS_URL }}"
OPENROUTER_API_KEY = "${{ shared.OPENROUTER_API_KEY }}"
TELNYX_API_KEY = "${{ shared.TELNYX_API_KEY }}"
TELNYX_WEBHOOK_SECRET = "${{ shared.TELNYX_WEBHOOK_SECRET }}"
AGENT_RUNTIME_SECRET = "${{ shared.AGENT_RUNTIME_SECRET }}"

[deploy]
numReplicas = 2
```

### HTTP Server

```typescript
// src/runtime/server.ts
// Using Hono — lightweight, fast, supports streaming

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';

const app = new Hono();

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Agent chat — SSE streaming
app.post('/agent/chat', async (c) => {
  // Validate request comes from ERP Core (shared secret)
  const secret = c.req.header('X-Agent-Secret');
  if (secret !== process.env.AGENT_RUNTIME_SECRET) return c.json({ error: 'unauthorized' }, 401);

  const { sessionId, message, orgId, userId, surface } = await c.req.json();

  return streamSSE(c, async (stream) => {
    const executor = new AgentExecutor();
    for await (const chunk of executor.executeTurn(sessionId, message, surface)) {
      await stream.writeSSE({ data: JSON.stringify(chunk) });
    }
  });
});

// Agent ask — single response (no streaming)
app.post('/agent/ask', async (c) => {
  // ... similar but collects full response before returning
});

// Telnyx webhook — WhatsApp messages
app.post('/webhook/telnyx', async (c) => {
  // Validate Telnyx webhook signature
  // Process incoming WhatsApp message
  // Route through MC Router
  // Send response via Telnyx API
});

export default app;
```

### Communication: Vercel ↔ Railway

The ERP Core (Vercel) communicates with the Agent Runtime (Railway) via:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /agent/chat` | SSE stream | Conversational agent interaction |
| `POST /agent/ask` | JSON response | One-shot agent query |
| `POST /agent/session` | JSON response | Create/resume session |
| `GET /agent/health` | JSON response | Health check |

Authentication: shared secret in `X-Agent-Secret` header. This is service-to-service auth, not user auth. User auth (JWT) is validated by ModuleGuard on Vercel before the request reaches Railway.

### Scaling

Railway auto-scales based on CPU/memory. Starting with 2 replicas. Agent sessions are stateless on the server side (all state in PostgreSQL/Redis), so any replica can handle any request. No sticky sessions needed.

At 1,000+ concurrent agent sessions, consider:
- Dedicated Railway service per agent type (Tasks runtime, Projects runtime, etc.)
- Connection pooling for Prisma (PgBouncer on Supabase)
- Response caching for repeated similar queries

---

## Repo Structure for Agent Runtime

```
spokestack-core/
├── src/
│   ├── runtime/                    # Agent Runtime (deploys to Railway)
│   │   ├── server.ts              # Hono HTTP server
│   │   ├── router.ts             # MC Router — intent classification
│   │   ├── executor.ts           # Agent execution loop
│   │   ├── config.ts             # buildAgentConfig() — tier-scoped
│   │   ├── toolkit.ts            # CoreToolkit — Prisma-based tools
│   │   ├── context.ts            # Context graph read/write helpers
│   │   ├── ratelimit.ts          # Redis sliding window rate limiter
│   │   ├── models.ts             # OpenRouter client + model routing
│   │   ├── agents/                # Agent definitions
│   │   │   ├── onboarding.ts    # Onboarding Agent system prompt + config
│   │   │   ├── tasks.ts         # Tasks Agent
│   │   │   ├── projects.ts      # Projects Agent
│   │   │   ├── briefs.ts        # Briefs Agent
│   │   │   └── orders.ts        # Orders Agent
│   │   ├── tools/                 # Tool definitions (LLM function schemas)
│   │   │   ├── definitions.ts   # TASKS_TOOLS, PROJECTS_TOOLS, etc.
│   │   │   └── index.ts
│   │   └── webhooks/
│   │       └── telnyx.ts         # WhatsApp webhook handler
│   ├── app/                        # ERP Core (deploys to Vercel)
│   │   └── api/
│   │       └── agents/
│   │           ├── chat/route.ts  # Proxy to Railway /agent/chat
│   │           └── ask/route.ts   # Proxy to Railway /agent/ask
│   └── lib/
│       └── agent/
│           └── client.ts          # Client for calling Agent Runtime from Vercel
```

Both the ERP Core and Agent Runtime live in the same monorepo but deploy to different platforms. They share the Prisma schema and TypeScript types.
# 04 — Pricing & Tiers

## Freemium, Not Free Trial

The free tier is **permanent**, not time-limited. The goal is context graph density — not conversion urgency.

Every free user accumulating agent context is a user whose switching cost grows weekly, whose module recommendations get better, and whose eventual upgrade becomes more valuable. This is the Canva/Notion playbook: massive free base, 2–5% conversion, but those who convert have deep product familiarity and high retention.

---

## Why Uncapped Agent Credits

**The free tier has uncapped agent credits.** The "aha moment" — the agent building context over time — requires sustained agent usage. If the user hits a credit wall, the compounding stops and the magic dies.

The COGS per free user is ~$2–5/mo (mostly idle infrastructure + occasional inference). That's the cost of acquisition in a world where the CLI and WhatsApp are the sales team and there's zero marketing spend. Treat it as CAC.

Heavy agent consumers are the best customers — they build the deepest context graphs and will adopt the most modules. Never throttle the accumulation engine.

---

## Tier Structure

| | **Free** | **Starter** | **Pro** | **Business** | **Enterprise** |
|---|---|---|---|---|---|
| **Price** | $0 forever | $29/mo | $59/mo | $149/mo | Custom |
| **Members** | Up to 3 | Up to 10 | Up to 25 | Up to 50 | Unlimited |
| **Agents** | Tasks | + Projects | + Briefs | + Orders | + Custom |
| **Agent credits** | Uncapped | Uncapped | Uncapped | Uncapped | Uncapped |
| **Surfaces** | CLI + Web | + Desktop + Mobile + WhatsApp | All | All | All |
| **Storage** | 1 GB | 10 GB | 50 GB | 200 GB | Custom |
| **Marketplace** | Browse only | Browse only | 3 modules included | Unlimited | Unlimited |
| **Support** | Community | Email | Priority | Dedicated | SLA |

### Why $29 for Starter

At $19/mo, SpokeStack is in the "tool" category. At $29/mo, it's in the "platform" category. The differentiation isn't price — it's the agent doing real work.

Competitor pricing for reference:

| Competitor | Price | What You Get |
|-----------|-------|-------------|
| Monday.com | $27/mo for 3 users (Standard) | Dashboard, no agent |
| Asana | $24.99/user/mo = $125/mo for 5 users | Task management, basic AI |
| Notion | $10/user/mo = $50/mo for 5 users | Docs + basic project tracking |
| Odoo | Free for 1 app, $31.10/user/mo for full | ERP, no agent intelligence |
| **SpokeStack Starter** | **$29/mo for 10 users** | **Tasks + Projects Agents, all surfaces, uncapped credits** |

The $29 price point is radically cheaper than any competitor on a per-user basis while firmly positioned as a platform. It includes 10 users (not 3 or 5), uncapped agent credits, and all 5 delivery surfaces.

---

## Soft Throttle — Not Credit Walls

Uncapped credits create a fat-tail risk. At 10,000 free tenants, if 1% are heavy outliers consuming $50–100/mo in inference, that's $50K–100K/year in unrecoverable cost.

The solution: **per-minute rate limits** on agent calls, not credit caps. A team doing normal work never hits the limit. A script hammering the API does.

### Rate Limit Design

| Tier | Rate Limit | Normal Team Usage | Headroom |
|---|---|---|---|
| Free | ~20 agent calls/min | ~2–5 calls/min | 4–10x |
| Starter | ~40 agent calls/min | ~5–10 calls/min | 4–8x |
| Pro | ~80 agent calls/min | ~10–20 calls/min | 4–8x |
| Business | ~200 agent calls/min | ~20–40 calls/min | 5–10x |
| Enterprise | Custom / unlimited | Varies | — |

Normal humans can't generate 20 agent calls per minute through a conversational interface. The limit only catches automated abuse and runaway loops.

### UX When Rate-Limited

The agent handles rate limits naturally:

```
Agent: "I'm working through a few things — give me a moment."
[2-3 second pause]
Agent: [continues normally]
```

It feels like the agent is thinking, not like you hit a wall. The experience stays conversational. The economics stay protected.

### Implementation

```typescript
// Rate limiter — Redis-based sliding window
async function checkRateLimit(orgId: string, tier: BillingTierType): Promise<boolean> {
  const limits: Record<BillingTierType, number> = {
    FREE: 20,
    STARTER: 40,
    PRO: 80,
    BUSINESS: 200,
    ENTERPRISE: Infinity,
  };

  const key = `rate:${orgId}:${currentMinute()}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);

  return count <= limits[tier];
}
```

---

## The Real Business Model

Platform tiers are distribution, not the business. The marketplace is the business.

### Revenue Layers

| Layer | Mechanism | Revenue Character |
|---|---|---|
| **Platform tiers** | $29–149/mo per workspace | Predictable, funds infrastructure |
| **Marketplace modules** | $5–15/mo per module per tenant | High-margin expansion revenue |
| **Agent executions** | Metered overages for extreme usage | Usage-aligned tail |
| **Outcome pricing** | Per deliverable (enterprise) | Value-aligned premium |

### Expansion Math

| Scenario | Platform | Modules | Total MRR |
|----------|----------|---------|-----------|
| Starter, no modules | $29 | $0 | $29 |
| Pro, 3 modules @ $10 | $59 | $30 | $89 |
| Business, 5 modules @ $10 | $149 | $50 | $199 |
| Enterprise, unlimited modules | Custom | Included | $500+ |

A single Pro customer running 3 marketplace modules goes from $59 to $89/mo. That's a 51% ARPU increase from modules alone.

When the third-party developer SDK opens, every module sold is revenue at near-zero marginal cost — the Shopify App Store model. SpokeStack takes a platform cut (likely 20–30%) of third-party module revenue.

### Revenue Timeline

| Period | Revenue Source | Expected MRR |
|--------|---------------|-------------|
| Month 0 | Free signups only | $0 |
| Month 1–2 | First Starter/Pro conversions | $500–2K |
| Month 3–4 | Context milestones trigger module purchases | $2K–5K |
| Month 6 | Organic growth + marketplace traction | $10K–20K |
| Month 12 | Enterprise deals + third-party modules | $50K–100K |

---

## Unit Economics

### Per-Tenant COGS

| Item | Free | Starter | Pro | Business |
|------|------|---------|-----|----------|
| Infrastructure (DB, compute, Redis) | ~$1–2 | ~$2–4 | ~$3–5 | ~$4–6 |
| Agent inference (avg usage) | ~$0.50–1 | ~$1–3 | ~$2–5 | ~$5–10 |
| Stripe processing | $0 | ~$1.14 | ~$2.01 | ~$4.62 |
| **Total COGS** | **~$1.50–3** | **~$4.14–8.14** | **~$7.01–12.01** | **~$13.62–20.62** |
| **Revenue** | **$0** | **$29** | **$59** | **$149** |
| **Gross margin** | **N/A (CAC)** | **~72–86%** | **~80–88%** | **~86–91%** |

### At Scale (1,000 paid tenants)

Assuming 60% Starter, 25% Pro, 10% Business, 5% Enterprise ($500 avg):

| Tier | Count | MRR | Monthly COGS | Gross Profit |
|------|-------|-----|-------------|-------------|
| Free (10x paid) | 10,000 | $0 | ~$20K | -$20K (CAC) |
| Starter | 600 | $17,400 | ~$3,600 | $13,800 |
| Pro | 250 | $14,750 | ~$2,375 | $12,375 |
| Business | 100 | $14,900 | ~$1,700 | $13,200 |
| Enterprise | 50 | $25,000 | ~$3,000 | $22,000 |
| **Total** | **11,000** | **$72,050** | **~$30,675** | **~$41,375** |

Plus marketplace module revenue: if 40% of paid tenants run an average of 2 modules at $10/mo = $8,000/mo additional high-margin revenue.

**Total MRR with modules: ~$80K at 1,000 paid tenants.** ~57% gross margin including free-tier CAC. ~78% gross margin on paid tenants alone.

---

## Billing Implementation

### Stripe Integration

```typescript
// Tier upgrade flow
async function upgradeTier(orgId: string, targetTier: BillingTierType) {
  const billing = await getBillingAccount(orgId);

  // Create or update Stripe subscription
  const subscription = await stripe.subscriptions.create({
    customer: billing.stripeCustomerId,
    items: [{ price: TIER_PRICES[targetTier] }],
    payment_behavior: 'default_incomplete',
  });

  // Update local tier — this is what gates agent capabilities
  await prisma.billingAccount.update({
    where: { organizationId: orgId },
    data: { tier: targetTier },
  });

  // Agent config rebuilds on next session start — no explicit refresh needed
}
```

### Marketplace Module Billing

Modules are billed as separate Stripe subscription items:

```typescript
async function installModule(orgId: string, moduleType: ModuleType) {
  const billing = await getBillingAccount(orgId);

  // Add module as subscription item
  await stripe.subscriptionItems.create({
    subscription: billing.stripeSubscriptionId,
    price: MODULE_PRICES[moduleType],
  });

  // Create OrgModule record — enables module's agent
  await prisma.orgModule.create({
    data: { organizationId: orgId, moduleType, active: true },
  });
}
```

### Usage Metering

All agent calls are metered via BillingMeterEvent for analytics and potential future usage-based pricing:

```typescript
async function meterAgentCall(orgId: string, agentType: AgentType, tokens: number) {
  await prisma.billingMeterEvent.create({
    data: {
      billingAccountId: await getBillingAccountId(orgId),
      eventType: 'AGENT_CALL',
      quantity: 1,
      metadata: { agentType, tokens, model: selectedModel },
    },
  });
}
```

This metering runs on every agent call regardless of tier. It's not used for billing on standard tiers (credits are uncapped), but provides the data for: analytics dashboards, abuse detection, cost forecasting, and potential future usage-based enterprise pricing.

---

## WhatsApp Number Provisioning

Users bring their own Telnyx number for WhatsApp. The agent guides them through setup during onboarding or via `spokestack connect whatsapp`.

**Optional add-on:** SpokeStack provisions a Telnyx number at cost + $2/mo markup.

| Option | Cost to User | SpokeStack Revenue |
|--------|-------------|-------------------|
| Bring your own Telnyx number | User's Telnyx cost | $0 |
| SpokeStack-provisioned number | ~$3–5/mo | ~$2/mo margin |

The provisioned number option lowers the barrier for non-technical users (especially the WhatsApp onboarding track) who don't want to set up a Telnyx account.
# 05 — Onboarding

## Two Parallel Launch Tracks

Two audiences, two channels, same product. Day-one parity, not sequential phases.

| Track | Audience | Entry Point | Geography |
|---|---|---|---|
| **CLI** | Developers, technical founders, SaaS builders | `npx spokestack init` | Global |
| **WhatsApp** | Service businesses, agencies, SMB operators | Voice note in Arabic/English/etc. | MENA first, then global |

The CLI track is zero-friction for developers. The WhatsApp track reaches the office manager at a 20-person construction firm, the studio manager at an architecture practice, the operations lead at a boutique consultancy — people who will never run `npx` but will send a voice note in a heartbeat.

The MENA WhatsApp track is where a decade of agency experience gives an unfair advantage no Silicon Valley competitor can replicate.

---

## Track 1: CLI Onboarding

### Step 1: CLI Init (30 seconds)

```
$ npx spokestack init

  ╔═══════════════════════════════════════╗
  ║         Welcome to SpokeStack        ║
  ║   Agent-First Work Infrastructure    ║
  ╚═══════════════════════════════════════╝

  ? Email: will@teamlmtd.com
  ? Password: ••••••••
  ? Workspace name: LMTD

  ✓ Account created
  ✓ Workspace provisioned

  Opening your workspace setup...
```

**No menu. No "start blank" option.** The conversation IS the product. If someone wants an empty workspace, they can tell the agent "just give me an empty workspace." That's still a conversation. Offering alternatives signals that the conversation is optional, which undermines the entire positioning of SpokeStack as agent-first infrastructure.

### Step 2: The Conversation (3–5 minutes)

Full-screen conversational interface with split screen — chat on the left, workspace building live on the right.

The Onboarding Agent asks 5–7 questions. Each answer triggers **visible** workspace creation — teams, workflows, roles appearing with animations in the side panel. This is the moment that gets screen-recorded and shared.

#### Onboarding Agent Specification

**System prompt core:**
```
You are the SpokeStack Onboarding Agent. Your job is to learn about this
organization and build their workspace through conversation.

You are warm, curious, and efficient. Ask 5-7 questions. After each answer,
trigger visible workspace actions (team creation, workflow setup, role
assignment). The user should see their workspace materializing in real time
as they talk to you.

When you have enough context, transition to the Reveal — show the completed
workspace and introduce the Tasks Agent.

You write to the Context Graph as you learn. Every entity (team member, client,
workflow pattern) gets a ContextEntry so mode agents have full context from
their first interaction.
```

**Question Framework:**

The agent adapts its questions based on responses, but the typical flow covers:

| # | Question | What It Builds | Context Graph Writes |
|---|----------|---------------|---------------------|
| 1 | "What does your company do?" | Teams, departments | ENTITY: org_type, industry, size |
| 2 | "How many people on your team?" | Member count expectation | ENTITY: team_size |
| 3 | "What's your typical workflow?" | WfCanvas (simple workflow) | PATTERN: primary_workflow |
| 4 | "Who are the key people?" | Team member placeholders, roles | ENTITY: team_members[] |
| 5 | "What tools do you use now?" | Integration cards | PREFERENCE: existing_tools[] |
| 6 | "What's your biggest operational pain?" | Priority setup | PREFERENCE: pain_points[] |
| 7 | "Want to create your first real task?" | First task | (Transition to Tasks Agent) |

**Not all 7 questions are mandatory.** If the user gives rich answers, the agent can skip ahead. If the user says "we're a 5-person startup, just get me going," the agent creates a minimal workspace and moves to the reveal in under 60 seconds.

#### Example Flow

> **Agent**: Welcome to SpokeStack. What does your company do?
>
> **User**: We're a digital agency in Dubai. About 45 people. Creative campaigns, social media, content production for big brands.
>
> *[Side panel: Teams appear — "Creative", "Social Media", "Content Production", "Account Management"]*
>
> **Agent**: Got it. Do your campaigns follow a standard process?
>
> **User**: Brief comes in, we concept it, client approves, then produce and deliver.
>
> *[Side panel: Workflow appears — "Brief Intake → Concept → Client Review → Production & Delivery"]*
>
> **Agent**: Who are the key people?
>
> **User**: Sarah runs creative, Omar handles accounts, Priya leads social.
>
> *[Side panel: Roles populate under teams — Sarah (Creative Lead), Omar (Account Lead), Priya (Social Lead)]*
>
> **Agent**: What tools do you use now?
>
> **User**: Slack and Google Drive. Monday but we want off it.
>
> *[Side panel: Integration cards appear — Slack (Connect), Google Drive (Connect), Monday (Import)]*
>
> **Agent**: Your workspace is ready. 4 teams, 3 leads, a campaign workflow, integration slots for Slack and Google Drive, and 3 sample tasks.
>
> Now let me introduce your Tasks Agent — it already knows your team structure and will handle task creation, assignment, and tracking. When you're ready for project workflows, your Projects Agent will be here too.
>
> Want to create your first real task?

### Step 3: The Reveal

The conversation transitions to the actual workspace. Everything the agent built is there — populated, configured, real.

**What the user sees:**
- Dashboard with teams populated
- Workflow canvas with their described process
- Team members listed (as placeholders — they'll need to invite real users)
- Integration cards ready to connect
- 3 sample tasks that match their described workflow
- Tasks Agent available and contextually aware

**What happened behind the scenes:**
- Organization, Teams, TeamMember placeholders created
- WfCanvas with nodes matching their workflow description
- ContextEntry records for every entity mentioned
- OrgSettings configured (timezone from browser, language from conversation)
- Tasks Agent session initialized with full context graph access

### The Onboarding → Mode Agent Handoff

The critical transition: the Onboarding Agent is warm, curious, generative — it builds through conversation. The mode-specific agents are competent, proactive, specialized — they do the actual work.

**Handoff mechanism:**
1. Onboarding Agent writes all learned context to the Context Graph
2. Onboarding Agent session ends
3. MC Router begins routing user intent to mode agents
4. Tasks Agent's first interaction reads the full Context Graph
5. Tasks Agent: "I know your team. Sarah's on creative, Omar on accounts, Priya on social. What's your first task?"

There's no cold start. The mode agents already know everything the Onboarding Agent learned.

---

## Track 2: WhatsApp Voice Onboarding

### Flow

```
1. User visits spokestack.dev/start
   (or gets link from someone, or scans QR code at event/on card)

2. Opens WhatsApp with SpokeStack's number
   (Click-to-WhatsApp link or QR)

3. Sends a voice note:
   "Hey, we're a digital agency in Dubai, about 45 people.
    We do creative campaigns and content production."

4. Telnyx STT transcribes (Whisper Large-V3-Turbo, sub-250ms latency)
   - Supports 100+ languages
   - Arabic voice notes work natively

5. Onboarding Agent processes transcription
   - Extracts: industry, team size, services
   - Writes ContextEntry records

6. Agent sends follow-up questions via WhatsApp text:
   "Great! What's your typical workflow for a campaign?"

7. User responds (text or voice note)
   - Each response builds the workspace in background

8. After 3-5 exchanges:
   "Your workspace is ready. Here's your login: [link]
    Your Tasks Agent speaks Arabic too. Send it a voice note
    anytime to create tasks."

9. User opens link → sees fully configured workspace
   (same Reveal as CLI track, but arrived via WhatsApp)
```

### Technical Stack

| Component | Provider | Cost |
|-----------|----------|------|
| WhatsApp Business API | Telnyx | ~$0.005–0.02 per message |
| Speech-to-Text | Telnyx STT (Whisper Large-V3-Turbo) | ~$0.01–0.05 per minute |
| Text-to-Speech (optional) | Telnyx TTS | ~$0.01 per response |
| **Total per onboarding** | | **~$0.05–0.20** |

### Multilingual Support

| Capability | Coverage |
|-----------|---------|
| Telnyx STT | 100+ languages, including Arabic (MSA + Gulf dialects) |
| Telnyx TTS | 90+ languages |
| Agent responses | Generated in detected language (model capability) |

Arabic voice notes work natively. This is critical for MENA. A founder in Abu Dhabi describes their business in Arabic, gets a configured workspace with an Arabic-speaking Tasks Agent. No competitor offers this.

### WhatsApp as Ongoing Surface

After onboarding, WhatsApp becomes a persistent surface:

- **Create tasks**: "Remind Sarah to finish the brand deck by Thursday"
- **Check status**: "What's the status on the Expo City project?"
- **Approve artifacts**: "Approve the creative concept for Client X"
- **Voice notes**: All interactions work via voice — the agent transcribes and responds

This is gated by tier — WhatsApp surface is available on Starter and above (see [04-pricing-and-tiers.md](./04-pricing-and-tiers.md)). Free users who onboarded via WhatsApp get web + CLI access. WhatsApp as ongoing surface becomes the upgrade incentive.

---

## Onboarding Pipeline Architecture

Following the pipeline pattern (acquire → prepare → process → parse → render):

```
acquire:    User's natural language description (text or transcribed voice)
prepare:    Extract entities, workflow patterns, team structure
process:    LLM inference — map description to workspace operations
parse:      Convert LLM output to Prisma operations (team creation, canvas nodes, etc.)
render:     Execute database writes + animate in side panel (or send WhatsApp confirmation)
```

Each step is discrete and cacheable. If the LLM processing step fails, the user's input is preserved and can be re-processed without re-asking the question.

### Error Handling

| Failure | Recovery |
|---------|----------|
| STT transcription fails | Agent asks user to type instead |
| LLM inference fails | Retry with fallback model; if repeated, create minimal workspace |
| Database write fails | Transaction rollback + retry; user sees "setting up..." animation |
| WhatsApp delivery fails | Retry via Telnyx; fallback to email if phone verified |

### Onboarding Analytics

Track per-onboarding:

| Metric | What It Measures |
|--------|-----------------|
| `onboarding_started` | User initiated (CLI or WhatsApp) |
| `onboarding_completed` | Workspace fully created |
| `onboarding_duration_seconds` | Time from start to reveal |
| `onboarding_questions_asked` | How many questions the agent needed |
| `onboarding_track` | CLI or WhatsApp |
| `onboarding_language` | Detected language |
| `first_task_created` | User created a real task during onboarding |
| `first_agent_interaction_post_onboarding` | First mode agent interaction after reveal |
| `day_1_return` | User returned within 24 hours |
| `day_7_return` | User returned within 7 days |

These metrics inform: onboarding agent prompt tuning, question optimization (which questions correlate with retention), language-specific conversion rates, and track-specific (CLI vs WhatsApp) performance.
# 06 — Context Milestones

## Purpose

The marketplace flywheel depends on recommendation quality. Recommendation quality is a function of **context engineering, not time**. A team using SpokeStack heavily for 2 weeks has richer context than a team logging in twice a month for 3 months.

Context milestones are **explicit thresholds** at which the agent has enough signal to make specific module recommendations. Not emergent behavior — engineered behavior. The agent doesn't guess when a module might help. It observes concrete data patterns and triggers when the evidence is sufficient.

---

## Milestone Definitions

| Milestone Type | Signal (Data Pattern) | Threshold | Recommended Module | Agent Prompt |
|---|---|---|---|---|
| `CLIENT_ENTITY_DENSITY` | Recurring external entity names in task descriptions, briefs, orders | 50+ tasks with client references | CRM | "I notice you work with 12 recurring clients. Want to track them properly?" |
| `BRIEF_CYCLE_COUNT` | Completed brief → review → approval cycles | 10+ completed brief cycles | Advanced Analytics | "You've run 10 brief cycles. Want to see approval velocity and revision patterns?" |
| `SOCIAL_CONTENT_PATTERN` | NLP detects social media, content, publishing keywords in tasks/briefs | 20+ tasks with social/content keywords | Social Publishing | "You're creating a lot of social content. Want to schedule and publish directly?" |
| `PROJECT_TIMELINE_DENSITY` | Projects with explicit date-based milestones and deadlines | 5+ projects with time-based milestones | Time & Leave | "Your projects have tight timelines. Want to track team availability?" |
| `ENGAGEMENT_DEPTH` | Total agent interactions across all agents | 100+ agent interactions | Agent Customization | "You use the agent heavily. Want to customize its behavior for your workflow?" |
| `COLLABORATION_DENSITY` | Distinct team members with daily active agent interactions | 3+ members active daily for 5+ consecutive days | Boards | "Your team is collaborating actively. Want shared visual boards?" |

### Future Milestones (Post-Launch)

| Milestone Type | Signal | Module |
|---|---|---|
| `INVOICE_VOLUME` | 20+ invoices generated | Finance module |
| `RECURRING_TASK_PATTERN` | 10+ tasks with weekly/monthly recurrence detected | Workflows (Advanced) |
| `CONTENT_ARTIFACT_VOLUME` | 50+ artifacts generated across briefs | Content Studio |
| `TEAM_GROWTH_RATE` | 5+ new members added in 30 days | Admin (Advanced) |
| `FEEDBACK_LOOP_PATTERN` | Repeated survey/feedback requests in tasks | NPS/Surveys module |

---

## Data Model

```prisma
model ContextMilestone {
  id                String        @id @default(cuid())
  organizationId    String
  milestoneType     MilestoneType
  threshold         Int           // Target value to trigger
  currentValue      Int           @default(0)
  triggered         Boolean       @default(false)
  triggeredAt       DateTime?
  recommendedModule String?       // ModuleType key
  dismissed         Boolean       @default(false)
  dismissedAt       DateTime?
  lastCheckedAt     DateTime?     // Last time the async worker evaluated this
  metadata          Json?         // Additional context (e.g., detected entity list)

  organization      Organization  @relation(fields: [organizationId], references: [id])
  @@unique([organizationId, milestoneType])
}

enum MilestoneType {
  CLIENT_ENTITY_DENSITY
  BRIEF_CYCLE_COUNT
  SOCIAL_CONTENT_PATTERN
  PROJECT_TIMELINE_DENSITY
  ENGAGEMENT_DEPTH
  COLLABORATION_DENSITY
}
```

### Initialization

Milestones are seeded when an organization is created:

```typescript
async function seedMilestones(orgId: string) {
  const milestones = [
    { milestoneType: 'CLIENT_ENTITY_DENSITY', threshold: 50, recommendedModule: 'CRM' },
    { milestoneType: 'BRIEF_CYCLE_COUNT', threshold: 10, recommendedModule: 'ANALYTICS' },
    { milestoneType: 'SOCIAL_CONTENT_PATTERN', threshold: 20, recommendedModule: 'SOCIAL_PUBLISHING' },
    { milestoneType: 'PROJECT_TIMELINE_DENSITY', threshold: 5, recommendedModule: 'TIME_LEAVE' },
    { milestoneType: 'ENGAGEMENT_DEPTH', threshold: 100, recommendedModule: null }, // Agent Customization, not a module
    { milestoneType: 'COLLABORATION_DENSITY', threshold: 3, recommendedModule: 'BOARDS' },
  ];

  await prisma.contextMilestone.createMany({
    data: milestones.map(m => ({ organizationId: orgId, ...m })),
    skipDuplicates: true,
  });
}
```

---

## Async Architecture

Milestone checks do **not** run synchronously on every agent interaction. That would add a database query to the hot path of every agent call.

Instead: **async background worker + cached milestone state.**

### Architecture

```
┌─────────────┐     writes      ┌──────────────────┐
│ Agent calls  │ ──────────────→ │ BillingMeterEvent │
│ Task/Brief/  │                 │ + domain tables    │
│ Order CRUD   │                 └────────┬───────────┘
└─────────────┘                           │
                                          │ (every 5 min)
                                          ▼
                              ┌──────────────────────┐
                              │ Milestone Worker      │
                              │ (Railway cron job)    │
                              │                       │
                              │ 1. Query domain data  │
                              │ 2. Update currentValue│
                              │ 3. Check thresholds   │
                              │ 4. Update cache       │
                              └────────┬──────────────┘
                                       │
                                       ▼
                              ┌──────────────────────┐
                              │ Redis cache           │
                              │ milestone:{orgId}     │
                              │ {type: triggered/not} │
                              └────────┬──────────────┘
                                       │
                                       │ (agent reads)
                                       ▼
                              ┌──────────────────────┐
                              │ Agent session         │
                              │ reads cached state    │
                              │ surfaces rec if       │
                              │ triggered + !dismissed│
                              └──────────────────────┘
```

### Worker Implementation

```typescript
// Runs every 5 minutes via Railway cron
async function checkMilestones() {
  // Get orgs with active sessions in the last hour (no need to check dormant orgs)
  const activeOrgs = await getRecentlyActiveOrgs(60); // minutes

  for (const orgId of activeOrgs) {
    const milestones = await prisma.contextMilestone.findMany({
      where: { organizationId: orgId, triggered: false },
    });

    for (const milestone of milestones) {
      const currentValue = await computeMilestoneValue(orgId, milestone.milestoneType);

      await prisma.contextMilestone.update({
        where: { id: milestone.id },
        data: {
          currentValue,
          lastCheckedAt: new Date(),
          ...(currentValue >= milestone.threshold ? {
            triggered: true,
            triggeredAt: new Date(),
          } : {}),
        },
      });

      // Update Redis cache
      await redis.hset(`milestone:${orgId}`, milestone.milestoneType, JSON.stringify({
        triggered: currentValue >= milestone.threshold,
        recommendedModule: milestone.recommendedModule,
        dismissed: milestone.dismissed,
      }));
    }
  }
}
```

### Value Computation

Each milestone type has a specific query:

```typescript
async function computeMilestoneValue(orgId: string, type: MilestoneType): Promise<number> {
  switch (type) {
    case 'CLIENT_ENTITY_DENSITY':
      // Count tasks with detected external entity names
      return prisma.contextEntry.count({
        where: {
          organizationId: orgId,
          category: 'client',
          entryType: 'ENTITY',
        },
      });

    case 'BRIEF_CYCLE_COUNT':
      return prisma.brief.count({
        where: {
          organizationId: orgId,
          status: 'COMPLETED',
        },
      });

    case 'SOCIAL_CONTENT_PATTERN':
      // Count tasks with social/content keywords detected by NLP
      return prisma.contextEntry.count({
        where: {
          organizationId: orgId,
          category: 'content_pattern',
          entryType: 'PATTERN',
        },
      });

    case 'PROJECT_TIMELINE_DENSITY':
      return prisma.project.count({
        where: {
          organizationId: orgId,
          milestones: { some: { dueDate: { not: null } } },
        },
      });

    case 'ENGAGEMENT_DEPTH':
      return prisma.agentMessage.count({
        where: {
          session: { organizationId: orgId },
          role: 'USER',
        },
      });

    case 'COLLABORATION_DENSITY':
      // Count distinct users with agent interactions in the last 5 days
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const activeUsers = await prisma.agentSession.findMany({
        where: {
          organizationId: orgId,
          startedAt: { gte: fiveDaysAgo },
          userId: { not: null },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      return activeUsers.length;
  }
}
```

### Agent-Side Cache Read

When an agent session starts, it reads the cached milestone state:

```typescript
async function getTriggeredMilestones(orgId: string): Promise<MilestoneRecommendation[]> {
  const cached = await redis.hgetall(`milestone:${orgId}`);

  return Object.entries(cached)
    .map(([type, json]) => ({ type, ...JSON.parse(json) }))
    .filter(m => m.triggered && !m.dismissed);
}
```

The agent includes triggered milestones in its context and surfaces recommendations naturally in conversation. The recommendation doesn't need to appear the instant the threshold is crossed — appearing within the next few interactions is fine.

---

## Recommendation UX

### How Recommendations Surface

Recommendations are **conversational**, not UI chrome. The agent weaves them into natural interaction:

**Good:**
> User: "Create a task: prepare social media assets for Q2 campaign"
>
> Tasks Agent: "Done — task created and assigned to Priya. By the way, I've noticed you've created 23 social content tasks in the last month. Would a Social Publishing module help? It lets you schedule and publish directly from SpokeStack."

**Bad:**
> [Banner at top of dashboard: "🎉 You've unlocked a recommendation! Try the Social Publishing module!"]

The agent approach is better because it's contextual (appears when the user is doing relevant work), conversational (feels like a helpful suggestion, not an ad), and dismissable ("not now" = the agent remembers and doesn't ask again for 30 days).

### Dismissal Logic

When a user says "not now" or equivalent:

```typescript
async function dismissMilestone(orgId: string, milestoneType: MilestoneType) {
  await prisma.contextMilestone.update({
    where: { organizationId_milestoneType: { organizationId: orgId, milestoneType } },
    data: { dismissed: true, dismissedAt: new Date() },
  });

  // Update cache
  await redis.hset(`milestone:${orgId}`, milestoneType, JSON.stringify({
    triggered: true,
    dismissed: true,
    recommendedModule: milestone.recommendedModule,
  }));
}
```

**Re-surfacing:** Dismissed milestones re-surface after 30 days if the underlying signal has strengthened (currentValue has grown significantly). The agent mentions it differently: "Last month I suggested the CRM module. Since then, you've added 15 more client references. Might be worth another look."

---

## Entity Detection (for CLIENT_ENTITY_DENSITY)

The `CLIENT_ENTITY_DENSITY` milestone requires detecting recurring external entities in task descriptions. This runs as a lightweight NLP step during task creation:

```typescript
async function detectEntities(orgId: string, text: string) {
  // Extract potential entity names (capitalized proper nouns, company names)
  // Use lightweight NLP or regex-based extraction — not a full LLM call
  const entities = extractProperNouns(text);

  for (const entity of entities) {
    // Upsert into context graph
    await prisma.contextEntry.upsert({
      where: {
        organizationId_category_key: {
          organizationId: orgId,
          category: 'client',
          key: normalizeEntityKey(entity),
        },
      },
      update: {
        confidence: { increment: 0.1 },
        updatedAt: new Date(),
      },
      create: {
        organizationId: orgId,
        entryType: 'ENTITY',
        category: 'client',
        key: normalizeEntityKey(entity),
        value: { name: entity, mentionCount: 1 },
        confidence: 0.3,
      },
    });
  }
}
```

Entity detection is lightweight and runs on every task creation. It's not an LLM call — it's pattern matching that feeds the context graph. The LLM-level intelligence happens when the agent reads the context graph and synthesizes recommendations.

---

## Monitoring & Tuning

### Metrics to Track

| Metric | What It Tells You |
|--------|------------------|
| `milestone_trigger_rate` | % of orgs that trigger each milestone type |
| `time_to_trigger` | Days from org creation to milestone trigger |
| `recommendation_acceptance_rate` | % of triggered recommendations that lead to module install |
| `recommendation_dismissal_rate` | % dismissed on first presentation |
| `re-surface_acceptance_rate` | % of re-surfaced recommendations that convert |
| `module_retention_30d` | % of installed modules still active after 30 days |

### Threshold Tuning

Thresholds should be tuned based on data. If `CLIENT_ENTITY_DENSITY` triggers at 50 tasks but the recommendation acceptance rate is only 5%, the threshold might be too low (premature recommendation) or the recommendation copy might be wrong. If the threshold is 50 but most orgs that accept the CRM module had 80+ tasks, raise the threshold.

Target: **20–30% acceptance rate** on first presentation. Higher means the threshold might be too conservative (missing earlier opportunities). Lower means it's triggering too early or the recommendation isn't compelling.
# 07 — CLI Package

## Overview

Published as `spokestack` on npm. The CLI is a thin client — it authenticates, sends commands to the cloud API, and renders responses in the terminal. No local state beyond auth tokens.

```bash
npm install -g spokestack    # Global install
# or
npx spokestack <command>     # No install needed
```

---

## Command Reference

### Authentication

```bash
spokestack init              # Create workspace + onboarding conversation
spokestack login             # Authenticate to existing workspace
spokestack logout            # Clear local auth tokens
spokestack whoami            # Show current user + workspace
```

### Tasks (Free tier)

```bash
spokestack task add                          # Interactive task creation
spokestack task add "Fix the login bug"      # Quick task creation
spokestack task add "Prepare deck" --assign sarah --due friday --priority high
spokestack task list                         # List all tasks
spokestack task list --mine                  # My assigned tasks
spokestack task list --status todo           # Filter by status
spokestack task done <taskId>                # Mark complete
spokestack task show <taskId>                # Show task details
```

### Projects (Starter+)

```bash
spokestack project new                       # Interactive project creation
spokestack project new "Q2 Campaign"         # Quick project creation
spokestack project list                      # List projects
spokestack project show <projectId>          # Project details + status
spokestack project canvas <projectId>        # Open workflow canvas in browser
```

### Briefs (Pro+)

```bash
spokestack brief create                      # Interactive brief creation
spokestack brief create "Brand Refresh"      # Quick brief creation
spokestack brief list                        # List briefs
spokestack brief show <briefId>              # Brief details + artifact status
spokestack brief review <artifactId>         # Review an artifact
```

### Orders (Business+)

```bash
spokestack order new                         # Interactive order creation
spokestack order list                        # List orders
spokestack order invoice <orderId>           # Generate invoice
spokestack customer list                     # List customers
spokestack customer add "Acme Corp"          # Add customer
```

### Agent

```bash
spokestack agent chat                        # Open conversational agent session
spokestack agent ask "What's Sarah working on?"  # One-shot agent query
spokestack agent ask "Create 3 tasks for the website redesign"
```

### Workspace Management

```bash
spokestack status                            # Workspace health + agent stats
spokestack module list                       # Browse marketplace
spokestack module add crm                    # Install marketplace module
spokestack module remove crm                 # Uninstall module
spokestack upgrade                           # Upgrade tier (opens Stripe checkout)
spokestack connect slack                     # Set up Slack integration
spokestack connect whatsapp                  # Set up WhatsApp surface
spokestack export                            # Export all data (JSON archive)
spokestack invite user@example.com           # Invite team member
```

---

## CLI Architecture

### Auth Flow

```
1. spokestack init / spokestack login
2. CLI opens browser for Supabase Auth (email/password or OAuth)
3. On success, Supabase returns JWT
4. CLI stores JWT in ~/.spokestack/auth.json (or OS keychain)
5. All subsequent CLI calls include JWT in Authorization header
6. JWT refresh happens automatically when expired
```

**Token storage:**
```
~/.spokestack/
├── auth.json          # { accessToken, refreshToken, expiresAt, orgId, orgSlug }
└── config.json        # { defaultFormat: "table", colorOutput: true }
```

### Request Flow

Every CLI command follows this pattern:

```typescript
// Simplified CLI command handler
async function handleCommand(command: string, args: Args) {
  const auth = await loadAuth();  // Read from ~/.spokestack/auth.json
  if (!auth) return promptLogin();

  const response = await fetch(`${API_BASE}/api/${command}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  if (response.status === 401) return handleTokenRefresh(auth);
  if (response.status === 403) return handleUpgradeRequired(response);

  const data = await response.json();
  render(data, args.format || 'table');
}
```

### Upgrade Prompts

When a user tries a gated command:

```
$ spokestack project new "Q2 Campaign"

  ⚠  Projects requires the Starter plan ($29/mo)
  Your current plan: Free

  Your Projects Agent is ready to help with project planning,
  workflow design, and milestone tracking.

  → Upgrade now: spokestack upgrade
  → Learn more: spokestack.dev/pricing
```

The language matches the agent-as-team-member framing. It's not "this feature requires an upgrade" — it's "your Projects Agent is ready."

---

## Agent Chat Mode

`spokestack agent chat` opens an interactive session:

```
$ spokestack agent chat

  Connected to Tasks Agent for LMTD
  Type a message, or /help for commands

  You: What's everyone working on?

  Tasks Agent: Here's the current workload:
  • Sarah (Creative): 5 tasks — 2 in progress, 3 to-do
  • Omar (Accounts): 3 tasks — 1 in progress, 2 to-do
  • Priya (Social): 7 tasks — 4 in progress, 3 to-do

  Priya's load is heavier than usual. Want me to redistribute?

  You: Yes, move 2 of Priya's to-do tasks to Omar

  Tasks Agent: Done. Moved "Schedule Instagram carousel" and
  "Write LinkedIn post copy" to Omar.

  You: /switch projects

  Switched to Projects Agent

  You: How's the Q2 campaign looking?

  Projects Agent: The Q2 Campaign project is in Phase 2 (Concept).
  3 of 5 milestones completed. Timeline is on track.
  Note: based on your last 3 campaigns, the Production phase
  usually runs 15% over. Want me to add buffer?

  You: /quit
```

### Chat Commands

| Command | Action |
|---------|--------|
| `/help` | Show available commands |
| `/switch <agent>` | Switch to a different agent (tasks, projects, briefs, orders) |
| `/status` | Quick workspace status |
| `/quit` or `/exit` | End chat session |
| `/surface` | Show which agents are available on current tier |

### One-Shot Mode

`spokestack agent ask` is for quick queries without entering chat mode:

```
$ spokestack agent ask "What tasks are due this week?"

  Due this week:
  1. Brand deck review (Sarah) — due Wed
  2. Social calendar Q2 (Priya) — due Thu
  3. Client meeting prep (Omar) — due Fri
```

The agent determines which mode agent to route to based on the query content. MC Router handles this transparently.

---

## Output Formatting

### Default: Table

```
$ spokestack task list

  ID        Title                    Status      Assignee    Due
  ────────  ───────────────────────  ──────────  ──────────  ──────────
  tsk_01    Fix login bug            IN_PROGRESS Sarah       Mar 28
  tsk_02    Prepare Q2 deck          TODO        Omar        Mar 30
  tsk_03    Social calendar          TODO        Priya       Apr 1
```

### JSON (for scripting)

```
$ spokestack task list --format json

  [
    {"id":"tsk_01","title":"Fix login bug","status":"IN_PROGRESS","assignee":"Sarah","due":"2026-03-28"},
    ...
  ]
```

### Minimal (for pipes)

```
$ spokestack task list --format minimal

  tsk_01  Fix login bug           IN_PROGRESS  Sarah  Mar 28
  tsk_02  Prepare Q2 deck         TODO         Omar   Mar 30
  tsk_03  Social calendar         TODO         Priya  Apr 1
```

---

## npm Package Configuration

```json
{
  "name": "spokestack",
  "version": "0.1.0",
  "description": "Agent-first work infrastructure — CLI",
  "bin": {
    "spokestack": "./dist/index.js"
  },
  "keywords": ["erp", "agent", "ai", "project-management", "cli", "productivity"],
  "repository": "https://github.com/spokestack/spokestack-core",
  "license": "MIT",
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.0.0",
    "inquirer": "^9.0.0",
    "open": "^10.0.0",
    "conf": "^12.0.0"
  }
}
```

### Size Budget

The CLI should be lightweight. Target: < 5 MB installed. It's a thin client — no bundled models, no heavy dependencies, no local database.
# 08 — Category & Positioning

## The Real Market

SpokeStack is not competing in the project management segment ($20.47B by 2030). It's not "cheaper Monday.com." It's not "AI-powered Asana."

The real market is **agent-native business infrastructure** — a category that doesn't exist yet because no one has built it.

---

## The Shopify Analogy

Before Shopify, "e-commerce platform" wasn't a category. It was a feature of web development agencies. If you wanted an online store in 2005, you hired a developer. Shopify made it a product. One command, one conversation, one store.

SpokeStack does the same thing to business operations. Before SpokeStack, "agent-managed work" isn't a category — it's a feature bolted onto existing tools. Monday.com added an AI assistant. Notion added AI blocks. Asana added AI project summaries. All of them retrofitted AI onto dashboards designed in 2015.

SpokeStack starts from the other direction: **what does business infrastructure look like when you build it for agents and humans from day one?**

The answer: agents are team members, not features. The workspace builds itself from a conversation. The system gets smarter every week. The marketplace recommends what you need before you know you need it.

---

## Positioning Statement

**For teams that run on tasks, projects, briefs, and orders,**
**SpokeStack is the first agent-native business infrastructure**
**that gives you specialized AI agents — not features — that learn how your business works,**
**compound their intelligence weekly, and grow with you through a marketplace of agent-powered modules.**

**Unlike Monday.com, Asana, Notion, and Odoo,**
**SpokeStack was built for agents and humans from day one,**
**not retrofitted with AI on top of a 2015 dashboard.**

---

## Competitive Landscape

### The Retrofit Problem

Every competitor in the space is working from the same playbook: take an existing dashboard product, add an AI layer. The fundamental architecture is wrong:

| Competitor | What They Built | What They Bolted On | The Problem |
|-----------|----------------|--------------------|-|
| Monday.com | Dashboard-first PM tool | AI assistant, automations | AI can't understand workflows it didn't create |
| Asana | Task management + timeline | AI project summaries, smart fields | Summarizing tasks ≠ doing work |
| Notion | Docs + databases | AI blocks, Q&A | Docs-first, not operations-first |
| ClickUp | Everything-app | ClickUp Brain | Feature bloat × AI = confusion |
| Odoo | Traditional ERP | Gradual AI additions | Monolithic architecture fights agent integration |

The retrofit approach has a structural ceiling: the AI layer can only operate within the constraints of the existing UI paradigm. If the product was designed around a Kanban board, the AI becomes a smarter Kanban board — it can't fundamentally change how work gets done.

### SpokeStack's Structural Advantage

SpokeStack doesn't have a "dashboard" that agents assist. The agents are the primary interface. The dashboard is a configuration layer and analytics view, not the daily work surface.

| Dimension | Competitors | SpokeStack |
|-----------|------------|-----------|
| Primary interface | Dashboard (human-first) | Agent conversation (agent-first) |
| AI capability | Feature (summarize, suggest) | Product (create, execute, learn) |
| Intelligence | Session-level (no memory) | Organizational (compounds weekly) |
| Multi-surface | Web + mobile app | CLI + Web + Desktop + Mobile + WhatsApp |
| Upgrade path | More features | More agents |
| Lock-in | Data export kills it | Context graph is non-portable |
| Marketplace | Integrations (passive) | Agent-powered modules (active) |

### The 267-Model Advantage

No AI-native startup can build what SpokeStack has: a relational schema that models how real businesses operate, built over a decade of running a 40+ person agency serving government and enterprise clients. They'll build pretty chat interfaces around basic task management. SpokeStack builds the actual operating system.

The schema isn't just data modeling — it's institutional knowledge about how teams coordinate, how briefs flow, how projects bottleneck, how orders cycle. That knowledge is embedded in the data model itself.

---

## TAM Reframe

| Framing | TAM | Why It's Wrong/Right |
|---------|-----|---------------------|
| Project management tool | $20.47B by 2030 | Too small, too crowded. Positions SpokeStack as a competitor, not a category. |
| ERP + Productivity + AI Agents | $281B + $150B + $52.6B | The cornerstone framing — correct markets, correct size. Use for investor TAM slides. |
| Agent-native business infrastructure | Undefined (category creation) | The real play. This is where SpokeStack defines the category. Use for narrative and positioning. |

### How to Talk About It

**To investors:** "We're building agent-native business infrastructure. The TAM spans ERP ($281B), productivity ($150B), and AI agents ($52.6B). We're the first product purpose-built for this intersection."

**To developers (CLI track):** "Your team gets AI agents that actually do work — not another dashboard with a chatbot. `npx spokestack init` and talk to it."

**To service businesses (WhatsApp track):** "Send a voice note describing your business. Get a workspace with an agent that manages your tasks. It learns how you work."

**To press/analysts:** "What Shopify did to e-commerce, SpokeStack does to business operations. The first ERP built for agents and humans together."

---

## Narrative Arc

### The Problem

Every business runs on tasks, projects, briefs, and orders. The tools they use to manage these — Monday.com, Asana, Notion, Odoo — were designed when "productivity" meant dashboards. They've bolted on AI assistants, but the fundamental interface is still a human staring at a board.

### The Insight

AI agents can do the work, not just organize it. But only if the infrastructure is built for them. Current tools were designed for humans to click buttons. They can't accommodate agents that create tasks, manage projects, generate artifacts, process orders, and learn from every interaction.

### The Solution

SpokeStack: agent-native business infrastructure. Purpose-built for a world where agents and humans work together. One conversation creates your workspace. Specialized agents handle each mode of work. A shared intelligence layer compounds organizational knowledge. A marketplace of agent-powered modules grows with your business.

### The Proof

Built on a decade of operating a 40+ person agency. The schema models how real businesses actually work — not how a startup imagines they work. 267 models in the full ERP, distilled to 39 focused models in the core product. The agents aren't demos — they're the operational layer of a real company.

### The Vision

In 5 years, the idea of business operations without agent infrastructure will feel as primitive as e-commerce without Shopify feels today. SpokeStack is building the foundation.

---

## Launch Messaging

### For npm / GitHub / Hacker News (CLI Track)

**Headline:** "SpokeStack: Agent-first work infrastructure. `npx spokestack init` and talk to it."

**Body:** Your team gets specialized AI agents — not features — that manage tasks, projects, briefs, and orders. They learn how your business works and get smarter every week. Free forever for up to 3 people. No dashboard required.

### For LinkedIn / MENA Business Networks (WhatsApp Track)

**Headline:** "Describe your business in a voice note. Get a workspace with an AI agent that manages your tasks."

**Body:** SpokeStack turns a 90-second voice note into a fully configured workspace with AI agents that learn your team's workflow. Works in Arabic, English, and 100+ languages. Send a WhatsApp message to get started: [link]

### For Press / Industry Analysts

**Headline:** "Dubai-built SpokeStack launches the first agent-native ERP — agents that do the work, not just organize it"

**Body:** After a decade of building agency operations software serving government and enterprise clients across Dubai and Abu Dhabi, SpokeStack launches as a universal platform where specialized AI agents manage tasks, projects, creative briefs, and commercial orders — learning how each business works and compounding intelligence weekly. The platform launches with dual entry points: a CLI for developers globally and WhatsApp voice onboarding for service businesses in MENA.
# 09 — Build Plan

## Two-Ship Strategy

The scope has grown across iterations: dual-track onboarding, mode-specific agents, context milestones, rate limiting, marketplace browsing. An 8-week single ship is unrealistic for a solo builder + Claude Code. Instead: two ships.

**Ship 1** gets a usable product live with real users generating context.
**Ship 2** adds the differentiated capabilities once the foundation is validated in production.

---

## Ship 1 — The Foundation (Weeks 1–8)

### What Ships

- CLI onboarding track (`npx spokestack init`)
- Web dashboard (minimal — config, task views, settings)
- Onboarding Agent (conversational workspace setup)
- Tasks Agent (full capabilities)
- Projects Agent (full capabilities)
- Shared Context Graph (ContextEntry store)
- ModuleGuard (tier gating)
- Billing (Stripe — Free, Starter, Pro tiers)
- Agent chat via CLI and web
- Data export

### What Doesn't Ship (Yet)

- WhatsApp onboarding track (Ship 2)
- Briefs Agent + artifact generation (Ship 2)
- Orders Agent + invoicing (Ship 2)
- Desktop app (Tauri) (Ship 2)
- Mobile PWA (Ship 2)
- Context milestones (Ship 2)
- Marketplace browsing (Ship 2)
- Business / Enterprise tiers (Ship 2)

### Why This Split

Ship 1 delivers a complete, usable product: Tasks + Projects with agent intelligence, two surfaces (CLI + web), and real billing. A 10-person team can onboard, create tasks, manage projects, and experience the context graph compounding. That's enough to validate:

1. Does the onboarding conversation convert?
2. Does the context graph actually compound in ways users notice?
3. Is the Tasks → Projects upgrade path natural?
4. Do the unit economics hold at small scale?

Ship 2 adds everything that makes SpokeStack *different* — Briefs, Orders, WhatsApp, marketplace, milestones. These build on a validated foundation rather than shipping all at once and debugging everything simultaneously.

---

## Ship 1 — Week-by-Week

### Week 1: Foundation + Auth + Schema

**Goal:** Bootable `spokestack-core` repo with auth, database, and minimal API.

| Task | Details |
|------|---------|
| Init repo | Next.js App Router, TypeScript, Tailwind |
| Prisma schema | All 39 models + 27 enums (full schema, all tiers — see [02-core-product-schema.md](./02-core-product-schema.md)) |
| Supabase setup | Auth config, database provisioning, RLS policies |
| Seed data | BillingTier records, default FeatureFlags |
| Basic API | Auth endpoints, org creation, team CRUD |
| ModuleGuard | Middleware that checks BillingTier before route access |
| Railway setup | Agent runtime placeholder, Redis instance |

**Exit criteria:** `npx spokestack login` authenticates and returns workspace info. Database schema is deployed. ModuleGuard blocks gated routes.

### Week 2: CLI + Onboarding Agent

**Goal:** `npx spokestack init` creates a workspace via conversational agent.

| Task | Details |
|------|---------|
| CLI scaffolding | Commander-based CLI, auth token storage, basic commands |
| CLI `init` flow | Email/password → workspace creation → browser open |
| Onboarding Agent | System prompt, question framework, workspace-building tools |
| Split-screen UI | Next.js page: chat left, workspace preview right |
| Workspace builder | Agent tool calls → Prisma writes (teams, members, canvas) |
| Context Graph writes | Onboarding Agent writes entities to ContextEntry on each answer |
| The Reveal | Transition from onboarding to dashboard with populated workspace |

**Exit criteria:** Full onboarding flow works end-to-end. User describes business, workspace materializes, context graph has entries.

### Week 3: Tasks Agent + Tasks UI

**Goal:** Tasks Agent is fully functional. Dashboard shows tasks.

| Task | Details |
|------|---------|
| Tasks Agent | System prompt, tool definitions (create, update, complete, list, assign) |
| Tasks API routes | CRUD endpoints for Task, TaskList, TaskComment |
| Tasks dashboard | Kanban view, list view, task detail panel |
| MC Router | Intent detection + routing (currently just Tasks Agent) |
| Agent chat (web) | Chat panel in dashboard — sends messages, displays responses |
| Agent chat (CLI) | `spokestack agent chat` and `spokestack agent ask` |
| CLI task commands | `spokestack task add`, `task list`, `task done` |
| Context Graph reads | Tasks Agent reads ContextEntry for team member info, preferences |
| Context Graph writes | Tasks Agent writes patterns (assignment patterns, workload data) |

**Exit criteria:** User can create, assign, complete tasks via agent chat and CLI. Agent knows team members from onboarding context. Agent writes new context entries.

### Week 4: Projects Agent + Projects UI

**Goal:** Projects Agent is fully functional with Canvas support.

| Task | Details |
|------|---------|
| Projects Agent | System prompt, tools (create project, add phases, milestones, canvas) |
| Projects API routes | CRUD for Project, ProjectPhase, ProjectMilestone |
| WfCanvas API | CRUD for WfCanvas, WfCanvasNode, WfCanvasEdge |
| Projects dashboard | Project list, project detail, Gantt/timeline view |
| Canvas UI | Visual workflow builder (read-only initially, interactive in Ship 2) |
| MC Router update | Route project-related intent to Projects Agent |
| CLI project commands | `spokestack project new`, `project list`, `project show` |
| Cross-agent context | Projects Agent reads task patterns from context graph |

**Exit criteria:** User can create projects with phases and milestones. Canvas populates from agent conversation. Projects Agent reads context from Tasks Agent's entries.

### Week 5: Billing + Tier Gating

**Goal:** Stripe integration live. Free → Starter → Pro upgrade flow works.

| Task | Details |
|------|---------|
| Stripe integration | Customer creation, subscription management, webhook handling |
| Tier definitions | Free, Starter ($29), Pro ($59) in BillingTier table |
| Upgrade flow (web) | Dashboard upgrade page → Stripe Checkout → tier update |
| Upgrade flow (CLI) | `spokestack upgrade` → opens Stripe Checkout in browser |
| Agent config rebuild | On tier change, next agent session loads expanded tools |
| Upgrade prompts | ModuleGuard returns "Projects Agent is ready" messaging |
| Downgrade handling | Tier change → mode agents become unavailable → data preserved |
| Usage metering | BillingMeterEvent on every agent call (analytics, not billing) |

**Exit criteria:** Full upgrade/downgrade lifecycle works. Free user sees Tasks only. After upgrading to Starter, Projects Agent activates. Metering records every agent call.

### Week 6: Rate Limiting + Agent Polish

**Goal:** Soft throttle protects economics. Agent quality polished.

| Task | Details |
|------|---------|
| Rate limiter | Redis sliding window per org per minute (see [04-pricing-and-tiers.md](./04-pricing-and-tiers.md)) |
| Rate limit UX | Agent says "I'm working through a few things" when limited |
| Agent session management | Session persistence, cross-surface resume |
| Agent context window | Optimize which ContextEntry records are included per call |
| Model routing | Simple tasks → DeepSeek, complex → Claude Sonnet |
| Error handling | Agent graceful degradation on model failure, retry logic |
| Prompt tuning | Iterate on all agent system prompts based on testing |

**Exit criteria:** Rate limits protect against abuse. Agents handle errors gracefully. Model routing optimizes cost.

### Week 7: AgentVBX Integration + Multi-Surface

**Goal:** Agent responses route correctly across CLI and web surfaces.

| Task | Details |
|------|---------|
| AgentVBX client | Redis Streams integration for response routing |
| Surface detection | Track which surface initiated each request |
| Session continuity | Start task in CLI, see it in web dashboard immediately |
| Notification system | Basic in-app notifications for task assignments, completions |
| Data export | `spokestack export` → JSON archive of all org data |

**Exit criteria:** Agent sessions work seamlessly across CLI and web. Data export works for sovereignty compliance.

### Week 8: Polish + Testing + npm Publish

**Goal:** Ship 1 goes live.

| Task | Details |
|------|---------|
| End-to-end testing | Full flows: onboarding, task management, project creation, upgrade |
| CLI polish | Error messages, help text, output formatting |
| Dashboard polish | Loading states, empty states, responsive design |
| npm publish | `spokestack` package on npm, `npx spokestack init` works globally |
| Documentation | README, getting started guide, API docs |
| Monitoring | Error tracking, agent call metrics, billing dashboards |
| Landing page | spokestack.dev with CLI demo, pricing, "get started" CTA |

**Exit criteria:** `npx spokestack init` works for anyone in the world. Billing processes payments. Agents respond reliably. Monitoring catches issues.

---

## Ship 2 — Differentiation (Weeks 9–14)

### Week 9–10: WhatsApp Track + Telnyx Integration

| Task | Details |
|------|---------|
| Telnyx STT integration | Voice note transcription pipeline |
| WhatsApp Business API | Message receive/send via Telnyx |
| WhatsApp Onboarding Agent | Adapted for async text-based conversation |
| QR code landing page | spokestack.dev/start → WhatsApp |
| WhatsApp as ongoing surface | Task creation, status checks via WhatsApp |

### Week 10–11: Briefs Agent + Artifacts

| Task | Details |
|------|---------|
| Briefs Agent | System prompt, tools, brief lifecycle management |
| Artifact generation | LLM-powered artifact creation (documents, copy) |
| Review workflow | Submit for review → approve/revise/reject |
| Briefs dashboard | Brief list, brief detail, artifact viewer, review panel |
| Sub-agent orchestration | Brief decomposition → parallel artifact generation |

### Week 11–12: Orders Agent + Invoicing

| Task | Details |
|------|---------|
| Orders Agent | System prompt, tools, order/invoice lifecycle |
| Customer management | Customer CRUD, relationship tracking |
| Invoice generation | Create, send, track payment status |
| Orders dashboard | Order list, customer list, invoice viewer |
| Business tier activation | $149/mo tier with Orders Agent |

### Week 12–13: Context Milestones + Marketplace

| Task | Details |
|------|---------|
| Milestone worker | Async background job (see [06-context-milestones.md](./06-context-milestones.md)) |
| Entity detection | Lightweight NLP on task/brief creation |
| Redis cache | Milestone state cache for agent reads |
| Recommendation UX | Agent surfaces module recommendations conversationally |
| Marketplace UI | Browse available modules (dashboard) |
| Module install flow | Stripe subscription item + OrgModule creation |

### Week 13–14: Desktop + Mobile + Polish

| Task | Details |
|------|---------|
| Tauri desktop app | Electron alternative — notifications, task views, agent chat |
| PWA mobile | Progressive web app — approvals, task updates, agent chat |
| Surface routing | AgentVBX routes to all 5 surfaces correctly |
| Ship 2 testing | End-to-end across all surfaces and tiers |
| Ship 2 launch | WhatsApp track live, Briefs/Orders live, marketplace live |

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| **Onboarding agent quality** — workspace generated from conversation doesn't match user's actual organization | High — first impression drives retention | Medium | Extensive prompt tuning. Fallback: "Let me adjust" option. Post-onboarding edit flow. |
| **Agent inference cost spikes** — uncapped credits + popular product = cost overrun | High — unsustainable unit economics | Low (rate limits help) | Monitoring + alerts on per-tenant cost. Model routing (cheap models for simple tasks). Emergency tier-specific daily caps (not shipped but designed). |
| **Context graph noise** — low-confidence entries accumulate, degrading agent recommendations | Medium — agents make bad suggestions | Medium | Confidence decay over time. Deduplication via unique constraints. Periodic cleanup job. |
| **Supabase scaling** — shared Postgres instance hits connection/row limits | High — downtime | Low (until 5K+ tenants) | Monitor connection pool. Plan migration to dedicated instance at 3K tenants. |
| **WhatsApp API reliability** — Telnyx or Meta API rate limits, downtime | Medium — WhatsApp track unavailable | Medium | Retry logic. Fallback to SMS for critical messages. Queue unsent messages for retry. |
| **CLI distribution** — npm discovery is competitive, hard to stand out | Medium — slow CLI track growth | High | GitHub presence, dev blog posts, Show HN. CLI is not the only channel (WhatsApp track). |
| **Stripe regulatory** — UAE-based company, global payments | Low — payment processing blocked | Low | Stripe Atlas entity if needed. Existing ADGM licensing may suffice. |
| **Solo builder bottleneck** — one founder + Claude Code building everything | High — velocity limited | High | Ruthless prioritization. Ship 1/Ship 2 split. Claude Code handles 80% of implementation. Hire first engineer post-Ship 1 revenue. |

---

## Success Metrics

### Ship 1 (8-week targets)

| Metric | Target | Why It Matters |
|--------|--------|---------------|
| Onboarding completion rate | > 70% | Validates the conversational onboarding flow |
| Day-7 retention | > 30% | Users finding value in first week |
| Tasks created per active user per week | > 5 | Agent is being used, not just explored |
| Context graph entries per org at day 7 | > 20 | Graph is accumulating |
| Free → Starter conversion at day 30 | > 5% | Freemium model is working |
| Agent response latency p95 | < 3s | Acceptable conversational speed |

### Ship 2 (14-week targets)

| Metric | Target | Why It Matters |
|--------|--------|---------------|
| WhatsApp onboarding completion rate | > 50% | Voice onboarding works (lower bar — async, more friction) |
| Briefs artifacts generated per brief | > 2 | Briefs Agent is producing value |
| Context milestone trigger rate | > 20% of 30-day-old orgs | Milestones aren't set too high |
| Module recommendation acceptance rate | > 15% | Recommendations are relevant |
| Starter → Pro upgrade rate | > 10% | Briefs mode is compelling |

---

## Development Environment

### Local Dev Stack

```bash
# Clone and setup
git clone https://github.com/spokestack/spokestack-core
cd spokestack-core
npm install

# Environment
cp .env.example .env.local
# Fill in: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#          STRIPE_SECRET_KEY, OPENROUTER_API_KEY, REDIS_URL

# Database
npx prisma generate
npx prisma db push
npx prisma db seed

# Run
npm run dev          # Next.js dev server (localhost:3000)
npm run agent:dev    # Agent runtime (localhost:3001)
npm run cli:dev      # CLI in dev mode (points to localhost)
```

### Deployment

| Component | Platform | Deploy Method |
|-----------|----------|-------------|
| ERP Core (Next.js) | Vercel | Git push → auto deploy |
| Agent Runtime | Railway | Git push → auto deploy |
| Redis | Railway | Managed instance |
| Database | Supabase | Managed (cloud dashboard) |
| CLI | npm | `npm publish` |

### CI/CD

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx prisma generate
      - run: npm test

  deploy-vercel:
    needs: test
    # Vercel auto-deploys from main

  deploy-railway:
    needs: test
    # Railway auto-deploys from main

  publish-cli:
    needs: test
    if: contains(github.event.head_commit.message, '[cli-release]')
    steps:
      - run: cd cli && npm publish
```
# 10 — Addenda & Open Items

This document captures architectural decisions, clarifications, and named future work items that emerged during spec review. Each section addresses a specific gap.

---

## 10a. WfCanvas UI Strategy & Projects Agent Prompt Quality

### The Problem

The build plan (09) says "visual workflow builder (read-only initially, interactive in Ship 2)." This means in Ship 1, the Canvas is a *display* of what the Projects Agent built — the user can see the workflow but can't drag nodes, add edges, or restructure it manually.

This makes the Projects Agent's prompt quality **load-bearing in Ship 1**. If the agent misinterprets "Brief comes in → concept → client review → production → delivery" and generates a wrong Canvas, the user has no manual fallback. They have to tell the agent to fix it.

### Decision: Conversational Editing as the Fallback

Read-only Canvas in Ship 1 is acceptable *if* the Projects Agent handles corrections well. The manual fallback isn't a drag-and-drop editor — it's the conversation itself:

> **User**: "The workflow isn't quite right. Client review should come after production, not before."
>
> **Projects Agent**: "Got it — moving Client Review after Production. Here's the updated workflow."
> *[Canvas re-renders with corrected node order]*

This is actually aligned with the agent-first philosophy. The agent *is* the editor. But it means the Projects Agent needs to handle three specific capabilities:

1. **Initial generation**: Translate workflow description → Canvas (nodes + edges)
2. **Incremental correction**: "Move X after Y", "Add a phase between A and B", "Remove the QA step"
3. **Rebuild from scratch**: "That's not right. Let me describe it again."

### Build Plan Implications (Week 4)

Week 4 of the build plan should explicitly allocate time for:

| Task | Time | Notes |
|------|------|-------|
| Canvas generation from conversation | 2 days | Core Projects Agent tool |
| Canvas correction via conversation | 2 days | "Move X after Y" patterns |
| Canvas display UI (read-only) | 1 day | Simple node/edge renderer |
| Projects Agent prompt tuning | 2 days | **Dedicated time for prompt iteration** |

The prompt tuning allocation is non-negotiable. The Projects Agent system prompt needs:
- Multiple examples of workflow descriptions → Canvas structures
- Explicit handling of ambiguous descriptions ("do you mean sequential or parallel?")
- Error recovery patterns ("that doesn't look right" → ask for clarification, don't guess)

### Ship 2: Interactive Canvas

In Ship 2 (weeks 13-14), the Canvas becomes interactive:
- Drag-and-drop node repositioning
- Click-to-add nodes and edges
- Inline node editing (rename, reconfigure)
- Canvas changes sync to the database and notify the Projects Agent

The agent can then reference manual edits: "I see you moved QA before Production. Want me to update the project timeline to match?"

---

## 10b. Data Migration & Import

### The Problem

The onboarding example says "Monday but we want off it." But there's no import/migration flow. Teams switching from Monday.com, Asana, Notion, Trello, or Jira won't switch if they can't bring their data. Empty workspaces feel empty, no matter how good the agent is.

### Decision: Named as Ship 2 / Phase 3 Growth Unlock

Data import is not in Ship 1. The Ship 1 audience (developers via CLI, early adopters) is more tolerant of starting fresh. But migration is a critical growth unlock and should be designed now even if built later.

### Import Architecture

```
spokestack import monday --api-key <key>
spokestack import asana --token <token>
spokestack import csv ./tasks.csv
spokestack import notion --integration-token <token>
```

Each import follows the pipeline pattern:

```
acquire:    Fetch data from source API (or read CSV/JSON file)
prepare:    Map source schema to SpokeStack schema
process:    LLM-assisted field mapping for ambiguous fields
parse:      Generate Prisma-compatible records
render:     Write to database + populate context graph from imported data
```

### Source Priority

| Source | Priority | Rationale |
|--------|----------|-----------|
| CSV/JSON | Ship 2 | Universal fallback — any tool can export CSV |
| Monday.com | Phase 3 | Explicitly named competitor, API is well-documented |
| Asana | Phase 3 | API is mature, task model maps cleanly |
| Notion | Phase 3 | Common in SpokeStack's target audience |
| Trello | Phase 3 | Simple model, easy mapping |
| Jira | Phase 4 | Complex model, enterprise audience |

### The Agent-Powered Import Differentiator

Here's where SpokeStack can be radically better than competitors at import:

> **User**: `spokestack import csv ./tasks.csv`
>
> **Tasks Agent**: "I see 347 tasks across 12 columns. Let me map them:
> - 'Task Name' → title
> - 'Assigned To' → assignee (I found matching team members for 8 of 15 names)
> - 'Due' → dueDate
> - 'Status' → status (mapping 'Done' → DONE, 'In Progress' → IN_PROGRESS, 'Not Started' → TODO)
> - 'Client' → I'll create ContextEntry records for each client name
>
> 7 names don't match existing team members. Want me to create invites, or skip those assignments?"

The import isn't just a data dump — the agent reads the imported data and seeds the context graph. After importing 347 tasks from Monday.com, the agent already knows which clients the team works with, who handles what, and what the typical workflow looks like. The context graph starts pre-warmed rather than empty.

### Schema Consideration

Add an `importSource` field to Task, Project, Brief, Order:

```prisma
model Task {
  // ... existing fields
  importSource    String?     // e.g., "monday", "asana", "csv"
  importSourceId  String?     // Original ID in source system
}
```

This enables: deduplication on re-import, source attribution in analytics, and potential two-way sync in future.

---

## 10c. Multi-Workspace Support

### The Problem

The schema has Organization but no concept of a user belonging to multiple orgs. The User → TeamMember relationship is many-to-many (a user can be a member of multiple orgs), but the CLI and dashboard assume a single active workspace.

This matters for SpokeStack's core audience:
- **Consultants** managing 3-5 client workspaces
- **Freelancers** with a personal workspace + client workspaces
- **Agency owners** (the MENA audience) with their agency workspace + client workspaces
- **Investors/advisors** with board-level access to portfolio company workspaces

### Decision: Schema Already Supports It — UI/CLI Needs a Workspace Switcher

The data model is correct. User has many TeamMember records, each linked to an Organization. The gap is in the interface layer.

### Implementation

**CLI:**
```bash
spokestack workspace list             # Show all workspaces user belongs to
spokestack workspace switch <slug>    # Switch active workspace
spokestack workspace current          # Show current workspace

# Auth token stores active orgId
# ~/.spokestack/auth.json: { ..., activeOrgId: "org_xxx", orgs: ["org_xxx", "org_yyy"] }
```

**Dashboard:**
Workspace switcher in the sidebar header. Shows org name + avatar. Dropdown lists all orgs the user belongs to. Click to switch — reloads dashboard with new orgId context.

**Agent:**
Each agent session is scoped to an organization. When the user switches workspaces, they get a new session with the new org's context graph. The agent in Workspace A has no access to Workspace B's data.

### Tier Gating

| Capability | Free | Starter+ |
|---|---|---|
| Create 1 workspace | ✓ | ✓ |
| Join other workspaces (as invited member) | ✓ | ✓ |
| Create additional workspaces | — | ✓ |

Free users can create one workspace and be invited to others. Creating multiple workspaces (for consultants managing clients) requires Starter+. This is a natural upgrade driver for consultants and freelancers.

### Build Plan Placement

Workspace switcher is a **Ship 1, Week 5** item. It's lightweight (UI dropdown + CLI command + activeOrgId in auth state) and prevents a painful migration later. The alternative — hardcoding single-workspace and retrofitting multi-workspace after users have established patterns — is worse.

---

## 10d. API Versioning

### The Problem

The third-party developer SDK is Phase 3 (months 4-6). The API surface designed in Ship 1 needs to be stable or versioned by then. Breaking changes to the API after marketplace modules exist would be painful — every third-party module would need updating.

### Decision: URL-Based Versioning from Day 1

All API routes include a version prefix from Ship 1:

```
/api/v1/tasks
/api/v1/projects
/api/v1/agents/chat
/api/v1/billing/upgrade
```

This costs nothing to implement (Next.js route groups handle it) and establishes the contract early.

### Versioning Rules

1. **v1 is the Ship 1 API.** It's the surface third-party modules will build against in Phase 3.
2. **v1 remains supported for minimum 12 months after v2 ships.** Third-party modules get a year to migrate.
3. **Non-breaking additions don't require a version bump.** New endpoints, new optional fields on existing endpoints, new enum values — these are additive and backward-compatible.
4. **Breaking changes require a new version.** Removing fields, changing response shapes, renaming endpoints, changing auth mechanisms.

### Implementation

```
src/app/api/
├── v1/
│   ├── tasks/
│   │   ├── route.ts           # GET /api/v1/tasks, POST /api/v1/tasks
│   │   └── [taskId]/
│   │       └── route.ts       # GET/PATCH/DELETE /api/v1/tasks/:taskId
│   ├── projects/
│   ├── briefs/
│   ├── orders/
│   ├── agents/
│   │   ├── chat/route.ts
│   │   └── ask/route.ts
│   └── billing/
└── internal/                    # Non-versioned internal routes (Vercel ↔ Railway, webhooks)
    ├── webhooks/
    └── admin/
```

### SDK Contract (Phase 3 Preview)

When the third-party SDK ships, modules will interact with SpokeStack via:

```typescript
// What a third-party module looks like
import { SpokeStackModule, AgentDefinition, ToolDefinition } from '@spokestack/sdk';

export default SpokeStackModule.define({
  name: 'crm',
  version: '1.0.0',
  apiVersion: 'v1',          // Declares which API version this module targets
  agent: CRMAgentDefinition,
  tools: CRMToolDefinitions,
  schema: CRMPrismaExtension, // Additional models for this module
  routes: CRMDashboardRoutes, // Dashboard tabs/pages
  cliCommands: CRMCliCommands,
});
```

By declaring `apiVersion: 'v1'`, the module locks to the v1 contract. When v2 ships, the module continues working against v1 until the developer updates.

---

## 10e. The Reveal — "Meet Your Team" UI Spec

### The Problem

The onboarding flow (05) describes the split-screen conversation and the workspace building live on the right. It describes the *concept* of "Meet your team" — the Onboarding Agent introducing the Tasks Agent. But the actual visual transition — the emotional moment — needs design attention. This is the first time the user meets the agent they'll work with daily.

### The Reveal Sequence

The reveal is a **3-beat transition** from onboarding to daily workspace:

#### Beat 1: The Summary (2 seconds)

The onboarding conversation fades to a summary card:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ✓ Workspace ready                                  │
│                                                     │
│  4 teams · 3 leads · 1 workflow · 2 integrations    │
│                                                     │
│  "Let me introduce your team."                      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

The split-screen collapses. The workspace preview panel and chat panel merge into a single focused view. This is a deliberate pause — the user has been in a fast-moving conversation and needs a beat to land.

#### Beat 2: The Agent Cards (3-4 seconds)

Agent cards appear with a staggered entrance animation. Each card shows: the agent's name, its role, and a one-line description of what it knows about this organization.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Your team                                          │
│                                                     │
│  ┌─────────────────────────┐  ┌──────────────────┐  │
│  │ ◉ Tasks Agent           │  │ ◎ Projects Agent │  │
│  │                         │  │                  │  │
│  │ Manages your tasks,     │  │ Coming soon on   │  │
│  │ assignments, and to-dos │  │ the Starter plan │  │
│  │                         │  │                  │  │
│  │ Already knows:          │  │ Will manage your │  │
│  │ • 3 team leads          │  │ workflows and    │  │
│  │ • Your campaign process │  │ timelines        │  │
│  │ • Slack + Drive prefs   │  │                  │  │
│  │                         │  │  [$29/mo →]      │  │
│  │ [Start working →]       │  │                  │  │
│  └─────────────────────────┘  └──────────────────┘  │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │ ◎ Briefs Agent   │  │ ◎ Orders Agent   │         │
│  │                  │  │                  │         │
│  │ Pro plan         │  │ Business plan    │         │
│  │                  │  │                  │         │
│  │ [$59/mo →]       │  │ [$149/mo →]      │         │
│  └──────────────────┘  └──────────────────┘         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Design details:
- **Active agent** (Tasks Agent on free tier) has a solid dot (◉), full card, "Already knows" section, and a primary CTA
- **Gated agents** have an outline dot (◎), muted card, tier + price, and a subtle upgrade link
- The "Already knows" section is generated from the Context Graph entries written during onboarding. This is proof the system listened.
- Cards appear staggered (Tasks first, then Projects 200ms later, etc.) to create a sense of a team assembling

#### Beat 3: The Handoff (transition to workspace)

User clicks "Start working →" on the Tasks Agent card. The agent cards animate out. The full dashboard fades in with:

- Sidebar with navigation (Tasks active, Projects/Briefs/Orders grayed per tier)
- Main area showing the task list with sample tasks
- Chat panel slides in from the right with the Tasks Agent's first message:

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────────────────────────┐ ┌──────────────┐ │
│ │ Sidebar  │ │ Tasks                        │ │ Tasks Agent  │ │
│ │          │ │                              │ │              │ │
│ │ ▸ Tasks  │ │ ┌─ To Do ──────────────────┐ │ │ I'm your     │ │
│ │ ▹ Projs  │ │ │ Prepare Q2 deck    Omar  │ │ │ Tasks Agent. │ │
│ │ ▹ Briefs │ │ │ Brand review      Sarah  │ │ │              │ │
│ │ ▹ Orders │ │ │ Social calendar   Priya  │ │ │ I know Sarah │ │
│ │          │ │ └──────────────────────────┘ │ │ runs creative│ │
│ │ Settings │ │                              │ │ Omar handles │ │
│ │ Modules  │ │ ┌─ In Progress ────────────┐ │ │ accounts,    │ │
│ │          │ │ │ (empty)                  │ │ │ and Priya    │ │
│ │          │ │ └──────────────────────────┘ │ │ leads social.│ │
│ │          │ │                              │ │              │ │
│ │          │ │                              │ │ What's first?│ │
│ └──────────┘ └──────────────────────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

The Tasks Agent's first message is warm but competent. It demonstrates context (it knows the team) without being verbose. "What's first?" is a prompt to action — not an open-ended question.

### WhatsApp Track Reveal

For users who onboarded via WhatsApp, the reveal is simpler — it's a WhatsApp message sequence:

```
Agent: Your workspace is ready! Here's what I set up:

  ✓ 4 teams (Creative, Social Media, Content Production, Account Management)
  ✓ 3 team leads (Sarah, Omar, Priya)
  ✓ Campaign workflow
  ✓ 3 sample tasks

🔗 Open your dashboard: https://app.spokestack.dev/lmtd

Your Tasks Agent is ready. You can create tasks right here in WhatsApp:
  • "Add a task: prepare brand deck for Sarah by Friday"
  • "What's everyone working on?"

Or open the dashboard for the full experience. What would you like to do first?
```

The WhatsApp reveal doesn't have the visual agent cards — but it establishes the same principle: the Tasks Agent is introduced as a separate entity that's ready to work.

### Implementation Notes

The reveal UI is a Next.js page at `/(onboarding)/reveal/page.tsx`. It reads from:

1. **Organization** — name, teams, members created during onboarding
2. **ContextEntry** — "Already knows" items, filtered to high-confidence ENTITY type
3. **BillingTier** — determines which agent cards are active vs gated
4. **OrgSettings** — language preference for copy

The reveal page is visited once per organization. After the user clicks "Start working," a flag is set (`OrgSettings.onboardingComplete = true`) and future visits go directly to the dashboard.

---

## Summary of Changes to Existing Docs

| Doc | Change | Type |
|-----|--------|------|
| README.md | Add 03a and 10 to document index | Update |
| 02-core-product-schema.md | Add `importSource`/`importSourceId` fields to Task, Project, Brief, Order | Additive |
| 02-core-product-schema.md | Add `onboardingComplete` to OrgSettings | Additive |
| 02-core-product-schema.md | Note that User → TeamMember is already many-to-many (multi-workspace ready) | Clarification |
| 03-agent-architecture.md | Reference 03a for runtime deployment details | Cross-reference |
| 05-onboarding.md | Reference 10e for reveal UI spec | Cross-reference |
| 07-cli-package.md | Add `workspace list`, `workspace switch`, `workspace current` commands | Additive |
| 07-cli-package.md | Add `import` command group | Additive |
| 09-build-plan.md | Add workspace switcher to Week 5 | Schedule |
| 09-build-plan.md | Add API versioning (/api/v1/) to Week 1 | Schedule |
| 09-build-plan.md | Increase Week 4 Projects Agent prompt tuning allocation to 2 days | Schedule |
| 09-build-plan.md | Add data import to Ship 2 scope (weeks 12-13) | Schedule |
| 09-build-plan.md | Add 03a-agent-runtime-tech-spec.md as Week 1-2 reference | Cross-reference |                                               
