# ongoing_agent_builder — Dynamic Tool Discovery from Module Manifests

**Repo:** `ongoing_agent_builder`
**Depends on:** spokestack-modules (provides tools.json per module), spokestack-core (CRUD APIs)
**Goal:** Builder automatically discovers and registers tools when modules are installed

---

## The Problem

Tool definitions are currently hardcoded in the builder. When a new module ships in spokestack-modules, someone has to manually add its tools to the builder. The fix: the builder reads tool definitions from a registration API, not from a static file.

---

## What to Build

### 1. Module Registration Endpoints

Accept tool registrations from spokestack-core (called during module install):

```
POST /api/v1/core/modules/register
```

Body (sent by spokestack-core or spokestack-modules install script):
```json
{
  "orgId": "org_xxx",
  "moduleType": "CRM",
  "agentType": "crm_manager",
  "tools": [
    {
      "name": "create_client",
      "description": "Create a new client",
      "method": "POST",
      "path": "/api/v1/clients",
      "parameters": {
        "name": { "type": "string", "required": true },
        "email": { "type": "string" },
        "company": { "type": "string" }
      }
    }
  ]
}
```

Response:
```json
{ "success": true, "toolsRegistered": 5 }
```

```
POST /api/v1/core/modules/register-prompt
```

Body:
```json
{
  "orgId": "org_xxx",
  "agentType": "crm_manager",
  "systemPromptExtension": "You manage client relationships for this organization..."
}
```

```
DELETE /api/v1/core/modules/{orgId}/{moduleType}/deregister
```

Removes all tools + prompt extensions for this module in this org.

### 2. Per-Org Tool Storage

Store registered tools per organization. When `POST /api/v1/core/execute` runs, it loads tools for that org:

```python
# Storage: could be DB table, Redis, or in-memory dict
# Key: (org_id, agent_type) → list of tools

class ModuleToolRegistry:
    """Per-org tool registry populated by module install."""

    def __init__(self):
        self._store: dict[str, dict[str, list[dict]]] = {}  # org_id → agent_type → tools

    def register(self, org_id: str, agent_type: str, tools: list[dict]):
        if org_id not in self._store:
            self._store[org_id] = {}
        if agent_type not in self._store[org_id]:
            self._store[org_id][agent_type] = []
        self._store[org_id][agent_type].extend(tools)

    def get_tools(self, org_id: str, agent_type: str) -> list[dict]:
        """Get tools for an agent type, combining base + org-specific."""
        base = AGENT_TOOLS.get(agent_type, AGENT_TOOLS.get("assistant", []))
        org_tools = self._store.get(org_id, {}).get(agent_type, [])
        return base + org_tools

    def deregister(self, org_id: str, module_type: str):
        """Remove all tools for a module in an org."""
        for agent_type in self._store.get(org_id, {}):
            self._store[org_id][agent_type] = [
                t for t in self._store[org_id][agent_type]
                if t.get("_moduleType") != module_type
            ]

registry = ModuleToolRegistry()
```

### 3. Dynamic Prompt Extensions

Per-org prompt extensions that get appended to the base system prompt:

```python
class PromptRegistry:
    """Per-org prompt extensions from module installs."""

    def __init__(self):
        self._store: dict[str, dict[str, str]] = {}  # org_id → agent_type → extension

    def register(self, org_id: str, agent_type: str, extension: str):
        if org_id not in self._store:
            self._store[org_id] = {}
        self._store[org_id][agent_type] = extension

    def get_prompt(self, org_id: str, agent_type: str, base_prompt: str) -> str:
        extension = self._store.get(org_id, {}).get(agent_type, "")
        if extension:
            return f"{base_prompt}\n\n## Module Context\n{extension}"
        return base_prompt

prompt_registry = PromptRegistry()
```

### 4. Wire Into Execute Endpoint

Update `/api/v1/core/execute` to use the dynamic registries:

```python
@app.post("/api/v1/core/execute")
async def execute(request: AgentRequest):
    agent_type = resolve_agent_type(request.agent_type)
    org_id = request.org_id

    # Get tools: base + org-specific from module installs
    tool_names = registry.get_tools(org_id, agent_type)
    tool_definitions = [SPOKESTACK_TOOLS[t] for t in tool_names if isinstance(t, str) and t in SPOKESTACK_TOOLS]
    # Also include inline tool defs from module registrations
    tool_definitions.extend([t for t in tool_names if isinstance(t, dict)])

    # Get prompt: base + org-specific extensions
    base_prompt = get_base_prompt(agent_type)
    full_prompt = prompt_registry.get_prompt(org_id, agent_type, base_prompt)

    # Build OpenAI-compatible tool schemas
    openai_tools = convert_to_openai_tools(tool_definitions)

    # Call LLM
    messages = build_messages(full_prompt, request)
    response = await openrouter_chat(messages=messages, tools=openai_tools, stream=request.stream)

    # Handle tool calls
    if response.tool_calls:
        tool_results = []
        for tc in response.tool_calls:
            result = await execute_tool(tc.function.name, json.loads(tc.function.arguments), org_id)
            tool_results.append({"tool_call_id": tc.id, "role": "tool", "content": json.dumps(result)})

        messages.append(response.message)
        messages.extend(tool_results)
        response = await openrouter_chat(messages=messages, stream=request.stream)

    return response
```

### 5. Persistent Storage (Optional but Recommended)

For production, back the registries with a database table:

```sql
CREATE TABLE module_tool_registrations (
    id SERIAL PRIMARY KEY,
    org_id VARCHAR(255) NOT NULL,
    module_type VARCHAR(100) NOT NULL,
    agent_type VARCHAR(100) NOT NULL,
    tools JSONB NOT NULL,
    prompt_extension TEXT,
    registered_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(org_id, module_type)
);
```

On startup, load all registrations into memory. On register/deregister, update both DB and memory.

### 6. Tool Discovery Endpoint

Let spokestack-core discover what tools are registered:

```
GET /api/v1/core/modules/{orgId}/tools
```

Response:
```json
{
  "orgId": "org_xxx",
  "registrations": [
    {
      "moduleType": "CRM",
      "agentType": "crm_manager",
      "tools": ["create_client", "update_client", "list_clients"],
      "hasPromptExtension": true,
      "registeredAt": "2026-04-03T10:00:00Z"
    }
  ]
}
```

---

## Integration Flow

```
1. User runs: spoke module install CRM --yes

2. spokestack-core:
   → Creates OrgModule record
   → Returns success

3. spokestack-modules install.ts:
   → POST /api/v1/core/modules/register to ongoing_agent_builder
     body: { orgId, moduleType: "CRM", agentType: "crm_manager", tools: [...] }
   → POST /api/v1/core/modules/register-prompt
     body: { orgId, agentType: "crm_manager", systemPromptExtension: "..." }

4. ongoing_agent_builder:
   → Stores tools in ModuleToolRegistry
   → Stores prompt in PromptRegistry
   → Returns { success: true }

5. User: "Add Etihad as a client"
   → MC sends to builder with org_id
   → Builder resolves agent: crm_manager
   → Builder loads tools: base + CRM-registered tools
   → LLM calls: create_client({ name: "Etihad", industry: "Aviation" })
   → Builder executes: POST spokestack-core/api/v1/clients
   → Returns: "Added Etihad as a client."
```

---

## Suite Integration

When a suite is installed, it registers multiple modules at once:

```python
# Suite install calls register for each module
for module in suite.modules:
    register_tools(org_id, module.type, module.agent_type, module.tools)
    register_prompt(org_id, module.agent_type, suite.agent_prompts.get(module.agent_type, ""))
```

The builder doesn't need to know about suites — it just sees individual module registrations. The suite orchestration happens in spokestack-modules.

---

## Acceptance Criteria

- [ ] `POST /api/v1/core/modules/register` stores tools per org
- [ ] `POST /api/v1/core/modules/register-prompt` stores prompt extensions per org
- [ ] `DELETE /api/v1/core/modules/{orgId}/{moduleType}/deregister` removes tools + prompts
- [ ] `/api/v1/core/execute` loads org-specific tools dynamically
- [ ] `/api/v1/core/execute` appends prompt extensions to system prompt
- [ ] `GET /api/v1/core/modules/{orgId}/tools` returns registered tools
- [ ] New module install → agent immediately has new tools available
- [ ] Module uninstall → tools removed from agent's available set
- [ ] Base tools (from AGENT_TOOLS) still work when no modules are registered
- [ ] Multiple orgs can have different tool sets (per-org isolation)
