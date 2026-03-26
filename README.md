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
| 03a | [Agent Runtime Tech Spec](./03a-agent-runtime-tech-spec.md) | Deployment topology, MC Router dispatch, CoreToolkit (Prisma-direct), session management, Railway service config |
| 10 | [Addenda & Open Items](./10-addenda.md) | Canvas UI strategy, data migration/import, multi-workspace, API versioning, "Meet Your Team" reveal UI spec |

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
