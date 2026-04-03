# Phase 10B — ongoing_agent_builder: Tool Registration + Execution Bridge

**Repo:** `ongoing_agent_builder`
**Branch:** `feature/phase10b-tool-execution`
**Depends on:** spokestack-core (all CRUD APIs deployed to main)
**Goal:** Agents can autonomously execute CRUD operations against spokestack-core

---

## The Problem

Right now, when the MC agent says "approve this brief," it generates text suggesting the user do it manually. The agent can't actually call `PATCH /api/v1/briefs/{id}` itself.

The execution loop needs to be:

```
User: "Approve the Etihad brief"
    → MC Agent (ongoing_agent_builder)
    → Agent selects tool: approve_brief({ briefId: "xxx" })
    → Builder executes: PATCH https://spokestack-core.vercel.app/api/v1/briefs/xxx
       with body: { "status": "COMPLETED" }
       with header: Authorization: Bearer <service-token>
    → Response: { brief: { id: "xxx", status: "COMPLETED" } }
    → Agent: "Done — the Etihad brief has been approved."
```

---

## What to Build

### 1. Canonical Agent Type Registry Endpoint

```
GET /api/v1/agents/registry
```

Returns all agent types the builder supports, with a translation map for MC agent types:

```json
{
  "agents": [
    {
      "type": "assistant",
      "name": "General Assistant",
      "tools": ["search_tasks", "search_projects", "search_briefs", "search_orders", "search_clients"]
    },
    {
      "type": "brief_writer",
      "name": "Brief Writer",
      "tools": ["create_brief", "update_brief", "approve_brief", "request_revisions", "generate_artifact", "list_briefs"]
    },
    {
      "type": "project_manager",
      "name": "Project Manager",
      "tools": ["create_project", "update_project", "add_phase", "add_milestone", "complete_project", "list_projects"]
    }
  ],
  "mcTranslationMap": {
    "mc-general": "assistant",
    "mc-planner": "project_manager",
    "mc-analyst": "analyst",
    "module-briefs-assistant": "brief_writer",
    "module-crm-assistant": "crm_manager",
    "module-tasks-assistant": "assistant",
    "module-orders-assistant": "order_manager",
    "module-content-studio-assistant": "content_creator"
  }
}
```

### 2. Tool Definitions

Each tool maps to a spokestack-core API endpoint. The builder needs a tool registry:

```python
# tool_registry.py

SPOKESTACK_TOOLS = {
    # ── Tasks ────────────────────────────────────────────
    "create_task": {
        "description": "Create a new task",
        "parameters": {
            "title": {"type": "string", "required": True},
            "description": {"type": "string"},
            "priority": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH", "URGENT"]},
            "status": {"type": "string", "enum": ["TODO", "IN_PROGRESS", "DONE"]},
            "assigneeId": {"type": "string"},
            "dueDate": {"type": "string", "format": "date"},
        },
        "endpoint": "POST /api/v1/tasks",
        "body_map": lambda p: p,  # pass through
    },
    "update_task": {
        "description": "Update a task's status, priority, or other fields",
        "parameters": {
            "taskId": {"type": "string", "required": True},
            "status": {"type": "string"},
            "priority": {"type": "string"},
            "title": {"type": "string"},
            "assigneeId": {"type": "string"},
        },
        "endpoint": "PATCH /api/v1/tasks/{taskId}",
        "body_map": lambda p: {k: v for k, v in p.items() if k != "taskId"},
    },
    "complete_task": {
        "description": "Mark a task as done",
        "parameters": {"taskId": {"type": "string", "required": True}},
        "endpoint": "PATCH /api/v1/tasks/{taskId}",
        "body_map": lambda p: {"status": "DONE"},
    },
    "list_tasks": {
        "description": "List tasks with optional filters",
        "parameters": {
            "status": {"type": "string"},
            "assigneeId": {"type": "string"},
        },
        "endpoint": "GET /api/v1/tasks",
        "query_map": lambda p: p,
    },
    "delete_task": {
        "description": "Delete a task",
        "parameters": {"taskId": {"type": "string", "required": True}},
        "endpoint": "DELETE /api/v1/tasks/{taskId}",
    },

    # ── Projects ─────────────────────────────────────────
    "create_project": {
        "description": "Create a new project",
        "parameters": {
            "name": {"type": "string", "required": True},
            "description": {"type": "string"},
            "startDate": {"type": "string"},
            "endDate": {"type": "string"},
            "clientId": {"type": "string"},
        },
        "endpoint": "POST /api/v1/projects",
    },
    "update_project": {
        "description": "Update a project's status or details",
        "parameters": {
            "projectId": {"type": "string", "required": True},
            "status": {"type": "string", "enum": ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"]},
            "name": {"type": "string"},
            "description": {"type": "string"},
        },
        "endpoint": "PATCH /api/v1/projects/{projectId}",
    },
    "complete_project": {
        "description": "Mark a project as completed",
        "parameters": {"projectId": {"type": "string", "required": True}},
        "endpoint": "PATCH /api/v1/projects/{projectId}",
        "body_map": lambda p: {"status": "COMPLETED"},
    },
    "list_projects": {
        "description": "List all projects",
        "parameters": {"status": {"type": "string"}},
        "endpoint": "GET /api/v1/projects",
    },

    # ── Briefs ───────────────────────────────────────────
    "create_brief": {
        "description": "Create a new brief",
        "parameters": {
            "title": {"type": "string", "required": True},
            "description": {"type": "string"},
            "clientId": {"type": "string"},
        },
        "endpoint": "POST /api/v1/briefs",
    },
    "update_brief": {
        "description": "Update a brief",
        "parameters": {
            "briefId": {"type": "string", "required": True},
            "title": {"type": "string"},
            "description": {"type": "string"},
            "status": {"type": "string"},
        },
        "endpoint": "PATCH /api/v1/briefs/{briefId}",
    },
    "approve_brief": {
        "description": "Approve a brief (move to COMPLETED status)",
        "parameters": {"briefId": {"type": "string", "required": True}},
        "endpoint": "PATCH /api/v1/briefs/{briefId}",
        "body_map": lambda p: {"status": "COMPLETED"},
    },
    "request_revisions": {
        "description": "Send a brief back for revisions (move to DRAFT)",
        "parameters": {
            "briefId": {"type": "string", "required": True},
            "feedback": {"type": "string"},
        },
        "endpoint": "PATCH /api/v1/briefs/{briefId}",
        "body_map": lambda p: {"status": "DRAFT"},
    },
    "list_briefs": {
        "description": "List all briefs",
        "parameters": {"status": {"type": "string"}},
        "endpoint": "GET /api/v1/briefs",
    },

    # ── Orders ───────────────────────────────────────────
    "create_order": {
        "description": "Create an order for a client",
        "parameters": {
            "clientId": {"type": "string", "required": True},
            "items": {"type": "array", "required": True},
            "notes": {"type": "string"},
        },
        "endpoint": "POST /api/v1/orders",
    },
    "update_order_status": {
        "description": "Update an order's fulfillment status",
        "parameters": {
            "orderId": {"type": "string", "required": True},
            "status": {"type": "string", "enum": ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED"]},
        },
        "endpoint": "PATCH /api/v1/orders/{orderId}",
    },
    "generate_invoice": {
        "description": "Generate an invoice from a completed order",
        "parameters": {"orderId": {"type": "string", "required": True}},
        "endpoint": "POST /api/v1/orders/{orderId}/invoice",
    },
    "list_orders": {
        "description": "List all orders",
        "parameters": {"status": {"type": "string"}},
        "endpoint": "GET /api/v1/orders",
    },

    # ── Clients ──────────────────────────────────────────
    "create_client": {
        "description": "Create a new client",
        "parameters": {
            "name": {"type": "string", "required": True},
            "email": {"type": "string"},
            "phone": {"type": "string"},
            "company": {"type": "string"},
            "industry": {"type": "string"},
        },
        "endpoint": "POST /api/v1/clients",
    },
    "update_client": {
        "description": "Update client details",
        "parameters": {
            "clientId": {"type": "string", "required": True},
            "name": {"type": "string"},
            "email": {"type": "string"},
            "industry": {"type": "string"},
        },
        "endpoint": "PATCH /api/v1/clients/{clientId}",
    },
    "list_clients": {
        "description": "List all clients",
        "parameters": {},
        "endpoint": "GET /api/v1/clients",
    },

    # ── Context Graph ────────────────────────────────────
    "read_context": {
        "description": "Read organizational context (team patterns, client info, preferences)",
        "parameters": {
            "category": {"type": "string"},
            "entryType": {"type": "string"},
        },
        "endpoint": "GET /api/v1/context",
    },
    "write_context": {
        "description": "Write a new insight or entity to the context graph",
        "parameters": {
            "entryType": {"type": "string", "required": True},
            "category": {"type": "string", "required": True},
            "key": {"type": "string", "required": True},
            "value": {"type": "object", "required": True},
            "confidence": {"type": "number"},
        },
        "endpoint": "POST /api/v1/context",
    },

    # ── Modules ──────────────────────────────────────────
    "install_module": {
        "description": "Install a marketplace module",
        "parameters": {"moduleType": {"type": "string", "required": True}},
        "endpoint": "POST /api/v1/modules/install",
    },
    "list_modules": {
        "description": "List available and installed modules",
        "parameters": {},
        "endpoint": "GET /api/v1/modules/installed",
    },

    # ── Events ───────────────────────────────────────────
    "create_event_subscription": {
        "description": "Create an automation workflow (event subscription)",
        "parameters": {
            "entityType": {"type": "string", "required": True},
            "action": {"type": "string", "required": True},
            "handler": {"type": "string", "required": True},
        },
        "endpoint": "POST /api/v1/events/subscriptions",
    },

    # ── Search (cross-entity) ────────────────────────────
    "search_workspace": {
        "description": "Search across all entities in the workspace",
        "parameters": {"query": {"type": "string", "required": True}},
        "endpoint": "GET /api/v1/activity",
        "query_map": lambda p: {"limit": 20},
    },
}
```

### 3. Tool Executor

The builder needs a function that takes a tool call and executes it against spokestack-core:

```python
# tool_executor.py

import httpx
import os

SPOKESTACK_CORE_URL = os.environ.get("SPOKESTACK_CORE_URL", "https://spokestack-core.vercel.app")
SPOKESTACK_SERVICE_TOKEN = os.environ.get("SPOKESTACK_SERVICE_TOKEN")  # Service-level auth token

async def execute_tool(tool_name: str, parameters: dict, tenant_id: str) -> dict:
    """Execute a tool against spokestack-core's API."""
    tool = SPOKESTACK_TOOLS.get(tool_name)
    if not tool:
        return {"error": f"Unknown tool: {tool_name}"}

    endpoint = tool["endpoint"]
    method, path = endpoint.split(" ", 1)

    # Substitute path parameters (e.g., {taskId})
    for key, value in parameters.items():
        if f"{{{key}}}" in path:
            path = path.replace(f"{{{key}}}", str(value))

    url = f"{SPOKESTACK_CORE_URL}{path}"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SPOKESTACK_SERVICE_TOKEN}",
        "X-Organization-Id": tenant_id,
    }

    # Build request
    body_map = tool.get("body_map")
    query_map = tool.get("query_map")

    async with httpx.AsyncClient() as client:
        if method == "GET":
            params = query_map(parameters) if query_map else parameters
            response = await client.get(url, headers=headers, params=params)
        elif method == "POST":
            body = body_map(parameters) if body_map else parameters
            response = await client.post(url, headers=headers, json=body)
        elif method == "PATCH":
            body = body_map(parameters) if body_map else {k: v for k, v in parameters.items() if not k.endswith("Id")}
            response = await client.patch(url, headers=headers, json=body)
        elif method == "DELETE":
            response = await client.delete(url, headers=headers)
        else:
            return {"error": f"Unsupported method: {method}"}

    if response.status_code >= 400:
        return {"error": f"API error {response.status_code}: {response.text}"}

    return response.json()
```

### 4. Agent Type Resolution

When spokestack-core sends an MC agent type, the builder translates it:

```python
# agent_resolver.py

MC_TO_CANONICAL = {
    "mc-general": "assistant",
    "mc-expert": "assistant",
    "mc-planner": "project_manager",
    "mc-advisor": "assistant",
    "mc-reviewer": "brief_writer",
    "mc-scheduler": "assistant",
    "mc-analyst": "analyst",
    "mc-strategist": "content_creator",
    "mc-executor": "assistant",
    "mc-optimizer": "analyst",
    "mc-educator": "assistant",
    "mc-communicator": "assistant",
    "module-crm-assistant": "crm_manager",
    "module-tasks-assistant": "assistant",
    "module-projects-assistant": "project_manager",
    "module-briefs-assistant": "brief_writer",
    "module-orders-assistant": "order_manager",
    "module-analytics-assistant": "analyst",
    "module-content-studio-assistant": "content_creator",
    "module-social-publishing-assistant": "social_manager",
    "module-finance-assistant": "finance_manager",
    "module-time-leave-assistant": "assistant",
    "onboarding": "core_onboarding",
}

def resolve_agent_type(requested_type: str) -> str:
    return MC_TO_CANONICAL.get(requested_type, requested_type)
```

### 5. Tool Assignment Per Agent

Each canonical agent type gets a specific set of tools:

```python
AGENT_TOOLS = {
    "assistant": [
        "list_tasks", "list_projects", "list_briefs", "list_orders",
        "list_clients", "read_context", "search_workspace",
        "create_task", "update_task", "complete_task",
    ],
    "brief_writer": [
        "create_brief", "update_brief", "approve_brief", "request_revisions",
        "list_briefs", "list_clients", "read_context",
    ],
    "project_manager": [
        "create_project", "update_project", "complete_project", "list_projects",
        "create_task", "update_task", "list_tasks", "read_context",
    ],
    "order_manager": [
        "create_order", "update_order_status", "generate_invoice",
        "list_orders", "list_clients", "read_context",
    ],
    "crm_manager": [
        "create_client", "update_client", "list_clients",
        "list_orders", "list_briefs", "read_context", "write_context",
    ],
    "analyst": [
        "list_tasks", "list_projects", "list_briefs", "list_orders",
        "list_clients", "read_context", "search_workspace",
    ],
    "content_creator": [
        "create_brief", "list_briefs", "list_clients", "read_context",
    ],
    "core_onboarding": [
        "create_task", "create_project", "create_brief", "create_client",
        "install_module", "list_modules", "write_context", "read_context",
    ],
}
```

### 6. Wire Into Execute Endpoint

In the existing `/api/v1/core/execute` handler:

```python
@app.post("/api/v1/core/execute")
async def execute(request: AgentRequest):
    # Resolve MC type → canonical type
    agent_type = resolve_agent_type(request.agent_type)

    # Get tools for this agent
    available_tools = AGENT_TOOLS.get(agent_type, AGENT_TOOLS["assistant"])
    tool_definitions = [SPOKESTACK_TOOLS[t] for t in available_tools if t in SPOKESTACK_TOOLS]

    # Build LLM request with tools
    response = await call_llm(
        agent_type=agent_type,
        task=request.task,
        tools=tool_definitions,
        conversation_history=request.conversation_history,
    )

    # If LLM returned tool calls, execute them
    if response.tool_calls:
        for tool_call in response.tool_calls:
            result = await execute_tool(
                tool_call.name,
                tool_call.parameters,
                request.tenant_id,
            )
            # Feed result back to LLM for final response
            response = await call_llm_with_tool_result(response, tool_call, result)

    return response
```

---

## Environment Variables (ongoing_agent_builder)

```bash
SPOKESTACK_CORE_URL=https://spokestack-core.vercel.app
SPOKESTACK_SERVICE_TOKEN=<supabase-service-role-key-or-dedicated-api-token>
```

The service token needs to authenticate against spokestack-core's `authenticate()` function. Options:
1. Use a Supabase service role key (bypasses RLS)
2. Create a dedicated API user with OWNER role in the target org
3. Add a service-to-service auth path in spokestack-core that validates `X-Agent-Secret`

Option 3 is cleanest — add to `src/lib/auth.ts`:
```typescript
// In authenticate():
const agentSecret = req.headers.get("x-agent-secret");
if (agentSecret === process.env.AGENT_RUNTIME_SECRET) {
  const orgId = req.headers.get("x-organization-id");
  // Return service-level auth context
  return { user: { id: "system", email: "agent@system" }, organizationId: orgId, role: "OWNER" };
}
```

---

## Acceptance Criteria

- [ ] `GET /api/v1/agents/registry` returns canonical types + MC translation map
- [ ] `POST /api/v1/core/execute` with `agent_type: "mc-planner"` resolves to `project_manager`
- [ ] Agent can call `create_task` tool → task appears in spokestack-core
- [ ] Agent can call `approve_brief` → brief status changes to COMPLETED
- [ ] Agent can call `generate_invoice` → invoice created from order
- [ ] Agent can call `create_client` → client appears in CRM
- [ ] Tool execution errors are returned to the agent (not swallowed)
- [ ] All tool calls include `X-Organization-Id` header for tenant scoping
- [ ] Existing agent conversations still work (non-tool responses)

---

## Test Sequence

```
1. User: "Create a task called 'Review Q2 deck' with HIGH priority"
   → Agent calls: create_task({ title: "Review Q2 deck", priority: "HIGH" })
   → spokestack-core: POST /api/v1/tasks → 201
   → Agent: "Done — created 'Review Q2 deck' with HIGH priority."

2. User: "Approve the Etihad brief"
   → Agent calls: list_briefs({}) → finds Etihad brief
   → Agent calls: approve_brief({ briefId: "xxx" })
   → spokestack-core: PATCH /api/v1/briefs/xxx → 200
   → Agent: "Approved. The Etihad brief is now marked as completed."

3. User: "Create an invoice for order #ABC123"
   → Agent calls: generate_invoice({ orderId: "ABC123" })
   → spokestack-core: POST /api/v1/orders/ABC123/invoice → 201
   → Agent: "Invoice generated for order #ABC123."

4. User: "What's the team working on?"
   → Agent calls: list_tasks({ status: "IN_PROGRESS" })
   → Agent calls: list_projects({ status: "ACTIVE" })
   → Agent: "Here's what's active: [summarizes tasks + projects]"
```
