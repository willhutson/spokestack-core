# spokestack-modules — Module Deployment Protocol + Suite Builder

**Repo:** `spokestack-modules`
**Depends on:** spokestack-core (module install API), ongoing_agent_builder (tool execution)
**Goal:** Self-contained modules that deploy across all three repos in one install

---

## The Problem

Module pages, tool definitions, and agent configs are currently hardcoded across three repos. Adding a module means manually editing files in all three. The Module Deployment Protocol standardizes this — a module is a self-contained package that registers itself everywhere on install.

---

## Module Package Structure

Every module follows this structure:

```
modules/{module-name}/
├── manifest.json              ← identity, metadata, dependencies
├── package.json               ← npm package metadata
├── core/
│   ├── page.tsx               ← dashboard page component (for spokestack-core)
│   ├── routes.json            ← API route definitions (CRUD endpoints)
│   ├── schema-extension.prisma ← additional Prisma models (if needed)
│   └── registry-entry.json    ← entry for spokestack-core's registry.json
├── agents/
│   ├── tools.json             ← tool definitions for ongoing_agent_builder
│   ├── prompts.json           ← system prompt additions per agent type
│   └── handoffs.json          ← cross-agent handoff rules
├── surfaces/
│   ├── dashboard.json         ← sidebar nav entry, icon, label
│   └── cli.json               ← CLI command definitions (if any)
├── integrations/
│   └── providers.json         ← Nango provider mappings for this module
├── migrations/
│   ├── install.ts             ← three-leg install script
│   └── uninstall.ts           ← three-leg uninstall script
└── tests/
    ├── install.test.ts
    └── tools.test.ts
```

---

## manifest.json

```json
{
  "id": "crm",
  "moduleType": "CRM",
  "name": "CRM",
  "version": "1.0.0",
  "description": "Client relationship management — contacts, deals, pipeline",
  "category": "marketing",
  "minTier": "PRO",
  "price": 1000,
  "agentName": "CRM Agent",
  "agentType": "crm_manager",
  "dependencies": [],
  "surfaces": ["dashboard", "cli"],
  "entities": ["Client", "Deal", "Pipeline", "Campaign"],
  "tools": ["create_client", "update_client", "list_clients", "create_deal", "update_deal_stage"],
  "integrations": ["hubspot", "salesforce", "pipedrive"]
}
```

---

## core/routes.json — API Endpoints

Declares what CRUD routes the module needs in spokestack-core:

```json
{
  "routes": [
    { "method": "GET", "path": "/api/v1/clients", "description": "List clients", "existing": true },
    { "method": "POST", "path": "/api/v1/clients", "description": "Create client", "existing": true },
    { "method": "GET", "path": "/api/v1/clients/:clientId", "description": "Get client", "existing": true },
    { "method": "PATCH", "path": "/api/v1/clients/:clientId", "description": "Update client", "existing": true },
    { "method": "DELETE", "path": "/api/v1/clients/:clientId", "description": "Delete client", "existing": true }
  ]
}
```

Routes marked `"existing": true` are verified on install. Routes without that flag need to be created — the install script generates them from a template.

---

## agents/tools.json — Tool Definitions

Tools the agent builder registers for this module:

```json
{
  "agentType": "crm_manager",
  "tools": [
    {
      "name": "create_client",
      "description": "Create a new client in the CRM",
      "method": "POST",
      "path": "/api/v1/clients",
      "parameters": {
        "name": { "type": "string", "required": true },
        "email": { "type": "string" },
        "company": { "type": "string" },
        "industry": { "type": "string" }
      }
    },
    {
      "name": "list_clients",
      "description": "List all clients",
      "method": "GET",
      "path": "/api/v1/clients",
      "parameters": {}
    }
  ]
}
```

---

## agents/prompts.json — Agent Persona

```json
{
  "agentType": "crm_manager",
  "systemPromptExtension": "You manage client relationships. You can create clients, track deals, manage the sales pipeline, and analyze client activity. When users mention a company or person, offer to add them as a client.",
  "capabilities": ["client_management", "deal_tracking", "pipeline_management"],
  "handoffs": {
    "when_order_needed": "order_manager",
    "when_brief_needed": "brief_writer",
    "when_analysis_needed": "analyst"
  }
}
```

---

## migrations/install.ts — Three-Leg Install

```typescript
import type { InstallContext } from "@spokestack/module-sdk";

export async function install(ctx: InstallContext) {
  const { coreUrl, builderUrl, orgId, authHeaders } = ctx;

  // 1. CORE: Create OrgModule record
  await fetch(`${coreUrl}/api/v1/modules/install`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ moduleType: "CRM" }),
  });

  // 2. CORE: Verify routes exist
  const routes = require("../core/routes.json");
  for (const route of routes.routes) {
    if (route.existing) {
      const res = await fetch(`${coreUrl}${route.path.replace(/:(\w+)/g, "test")}`, {
        method: "HEAD",
        headers: authHeaders,
      });
      if (res.status === 404) {
        console.warn(`Route ${route.path} not found — module may not work fully`);
      }
    }
  }

  // 3. BUILDER: Register tools
  const tools = require("../agents/tools.json");
  await fetch(`${builderUrl}/api/v1/core/modules/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Agent-Secret": ctx.agentSecret },
    body: JSON.stringify({
      orgId,
      moduleType: "CRM",
      agentType: tools.agentType,
      tools: tools.tools,
    }),
  });

  // 4. BUILDER: Register prompts
  const prompts = require("../agents/prompts.json");
  await fetch(`${builderUrl}/api/v1/core/modules/register-prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Agent-Secret": ctx.agentSecret },
    body: JSON.stringify({
      orgId,
      agentType: prompts.agentType,
      systemPromptExtension: prompts.systemPromptExtension,
    }),
  });

  return { success: true };
}
```

---

## Suite Builder

### Suite Definition

```json
{
  "id": "dubai-agency-starter",
  "name": "Dubai Agency Starter",
  "version": "1.0.0",
  "description": "Complete setup for creative agencies in the UAE",
  "industry": "agency",
  "region": "MENA",
  "modules": ["CRM", "BRIEFS", "CONTENT_STUDIO", "SOCIAL_PUBLISHING", "TIME_LEAVE"],
  "config": {
    "timezone": "Asia/Dubai",
    "currency": "AED",
    "workWeek": [1, 2, 3, 4, 5],
    "language": "en"
  },
  "moduleOverrides": {
    "CRM": {
      "pipelineStages": ["Lead", "Pitch", "Proposal", "Retainer", "Active Client"],
      "defaultCurrency": "AED"
    },
    "BRIEFS": {
      "types": ["Campaign Brief", "Content Brief", "Social Brief", "Video Brief"],
      "reviewStages": ["Internal Review", "Client Review", "Final Approval"]
    },
    "TIME_LEAVE": {
      "leaveTypes": ["Annual", "Sick", "Hajj", "Compassionate"]
    }
  },
  "workflows": [
    { "entityType": "Brief", "action": "status_changed", "handler": "agent:brief_writer", "config": { "conditions": { "toStatus": "IN_REVIEW" } } },
    { "entityType": "Client", "action": "created", "handler": "agent:crm_manager" },
    { "entityType": "Order", "action": "created", "handler": "module:FINANCE" }
  ],
  "agentPrompts": {
    "crm_manager": "You manage client relationships for a creative agency in Dubai. Clients include brands, government entities, and media companies. Currency is AED. Retainers are common.",
    "brief_writer": "You write creative briefs for campaigns. Common deliverables: social content, video production, brand identity, event activations."
  },
  "onboarding": {
    "welcomeMessage": "Welcome! I'm setting up your agency workspace. Let me ask a few questions about your team and clients.",
    "questions": [
      "How many clients do you typically manage at once?",
      "What's your primary service — social, video, branding, or something else?",
      "Do you work with retainer clients or project-based?"
    ]
  }
}
```

### CLI Commands

```bash
# List available suites
spoke suite list

# Install a suite (installs all modules + config + workflows)
spoke suite install "Dubai Agency Starter" --yes

# Create a custom suite
spoke suite create \
  --name "Custom Agency" \
  --modules CRM,BRIEFS,CONTENT_STUDIO \
  --timezone "Asia/Dubai" \
  --currency AED \
  --yes

# Export current workspace as a suite (for replication)
spoke suite export --name "My Setup"

# Plan mode: preview what a suite would install without doing it
spoke suite plan "Dubai Agency Starter"
```

### Suite Install Flow

```typescript
export async function installSuite(suite: SuiteDefinition, ctx: InstallContext) {
  // 1. Apply org config
  await fetch(`${ctx.coreUrl}/api/v1/settings`, {
    method: "PATCH",
    headers: { ...ctx.authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      timezone: suite.config.timezone,
      language: suite.config.language,
    }),
  });

  // 2. Install each module
  for (const moduleType of suite.modules) {
    const modulePkg = await loadModule(moduleType);
    await modulePkg.install(ctx);
  }

  // 3. Apply module overrides (store in OrgModule.config JSON)
  for (const [moduleType, overrides] of Object.entries(suite.moduleOverrides)) {
    await fetch(`${ctx.coreUrl}/api/v1/modules/${moduleType}/config`, {
      method: "PATCH",
      headers: { ...ctx.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(overrides),
    });
  }

  // 4. Create workflow subscriptions
  for (const workflow of suite.workflows) {
    await fetch(`${ctx.coreUrl}/api/v1/events/subscriptions`, {
      method: "POST",
      headers: { ...ctx.authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(workflow),
    });
  }

  // 5. Register agent prompt overrides
  for (const [agentType, prompt] of Object.entries(suite.agentPrompts)) {
    await fetch(`${ctx.builderUrl}/api/v1/core/modules/register-prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agent-Secret": ctx.agentSecret },
      body: JSON.stringify({ orgId: ctx.orgId, agentType, systemPromptExtension: prompt }),
    });
  }

  return { success: true, modulesInstalled: suite.modules.length };
}
```

---

## Module Builder CLI

```bash
# Scaffold a new module
spoke-module create inventory \
  --name "Inventory Management" \
  --category ops \
  --min-tier STARTER \
  --entities "Product,Warehouse,StockLevel,Transfer" \
  --agent-type "inventory_manager"
```

This generates the full directory structure with:
- manifest.json filled from flags
- routes.json with CRUD for each entity
- tools.json with create/update/list/delete per entity
- prompts.json with a starter system prompt
- page.tsx with a tabbed UI (one tab per entity)
- install.ts and uninstall.ts with the three-leg protocol

---

## Acceptance Criteria

- [ ] `spoke-module create` scaffolds a complete module package
- [ ] Module install.ts successfully registers in all three repos
- [ ] `spoke suite install` installs multiple modules + config + workflows
- [ ] `spoke suite plan` shows what would be installed without doing it
- [ ] `spoke suite export` captures current workspace as a replicable suite
- [ ] New modules automatically appear in onboarding agent's knowledge
- [ ] New tools automatically available to the correct agent types
- [ ] Module uninstall deregisters from builder + deactivates in core
