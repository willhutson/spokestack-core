# Comms Agency Suite — Designed for Houbara Communications

## Context

Houbara Communications (houbaracomms.agency) is a PR/comms agency based in the UAE. CEO: Loretta (loretta@houbaracomms.com). This suite is the first real customer deployment of the module system — if it works for Houbara, it works for any comms agency.

A comms agency's daily workflows are fundamentally different from a creative agency. They manage: media relationships, press releases, crisis response, coverage tracking, influencer campaigns, and events. The existing "agency" template (CRM, Content Studio, Social Publishing, Workflows, Time & Leave) covers some of this but misses the PR-specific workflows.

## Strategy: No New Prisma Models

Every new module uses existing models creatively:
- **Briefs** → press releases, media pitches, crisis statements, client reports
- **Tasks** → media outreach, journalist follow-ups, event tasks, deadline tracking
- **Projects** → PR campaigns, events, crisis situations, influencer programs
- **Orders** → sponsorship deals, influencer contracts, event vendor payments
- **ContextEntry** → journalist database, media lists, influencer contacts, coverage data
- **Client** → agency clients (brands, government entities)
- **Assets** → press kits, media assets, brand guidelines, event collateral
- **EventSubscription** → automated workflows (pitch sent → follow up in 3 days)

## 6 New Modules for spokestack-modules

### Module 1: MEDIA_RELATIONS

**What it does:** Manage journalist contacts, media lists, pitch tracking, and relationship scoring.

**manifest.json:**
```json
{
  "id": "media-relations",
  "moduleType": "MEDIA_RELATIONS",
  "name": "Media Relations",
  "version": "1.0.0",
  "description": "Journalist database, media lists, pitch tracking, and relationship management",
  "category": "marketing",
  "minTier": "PRO",
  "price": 1500,
  "agentName": "Media Relations Agent",
  "agentType": "media_relations_manager"
}
```

**Data model (using existing models):**
- Journalists → ContextEntry (category: "journalist", key: "journalist_{name}", value: { name, outlet, beat, email, phone, twitter, relationship_score, last_contacted, notes })
- Media Lists → ContextEntry (category: "media_list", value: { name, journalistKeys[], purpose })
- Pitches → Brief (status: DRAFT→ACTIVE→IN_REVIEW→COMPLETED maps to Draft→Pitched→Following Up→Covered)
- Coverage → ContextEntry (category: "coverage", value: { headline, outlet, journalist, url, date, sentiment, reach, ave })

**Dashboard page tabs:**
1. **Journalists** — Contact database with search, filter by beat/outlet, relationship score bars, last contacted date. "Add Journalist" form. Click to see pitch history.
2. **Media Lists** — Grouped contact lists (e.g., "Tech Journalists UAE", "Lifestyle Editors GCC"). Create/edit lists. Export for mail merge.
3. **Pitches** — Pipeline: Draft → Pitched → Following Up → Covered → Declined. Each pitch card shows: headline, target journalist, date pitched, follow-up count.
4. **Coverage** — Coverage log with: headline, outlet, date, sentiment badge, reach estimate, AVE. Monthly coverage report summary.

**Agent tools:**
- `add_journalist` → POST /api/v1/context (category: journalist)
- `search_journalists` → GET /api/v1/context?category=journalist
- `create_media_list` → POST /api/v1/context (category: media_list)
- `create_pitch` → POST /api/v1/briefs (with metadata: { type: "pitch" })
- `log_coverage` → POST /api/v1/context (category: coverage)
- `get_coverage_report` → GET /api/v1/context?category=coverage (aggregate)

**Agent prompt:** "You manage media relationships for a PR agency. You know journalists by name, outlet, and beat. When a client needs coverage, you suggest the right journalists to pitch, draft the pitch, and track follow-ups. You calculate AVE (Advertising Value Equivalency) for coverage reports."

**Integrations:** Meltwater (future), Cision (future), LinkedIn (existing Nango provider)

**Workflow templates:**
- "Pitch Follow-Up": Brief.status_changed (to ACTIVE/Pitched) → create Task "Follow up with {journalist}" due in 3 days
- "Coverage Alert": ContextEntry.created (category: coverage) → notify client via CLIENT_PORTAL

---

### Module 2: PRESS_RELEASES

**What it does:** Draft, approve, distribute, and track press releases.

**manifest.json:**
```json
{
  "id": "press-releases",
  "moduleType": "PRESS_RELEASES",
  "name": "Press Releases",
  "version": "1.0.0",
  "description": "Draft, approve, distribute, and track press release performance",
  "category": "marketing",
  "minTier": "PRO",
  "price": 1000,
  "agentName": "Press Release Agent",
  "agentType": "press_release_writer"
}
```

**Data model:**
- Press Releases → Brief (metadata: { type: "press_release", distribution_date, embargo_date, wire_service, boilerplate })
- Artifacts → Artifact (type: DOCUMENT for the actual release, versions for drafts)
- Distribution → ContextEntry (category: "pr_distribution", value: { briefId, media_list, sent_count, opens, pickups })

**Dashboard page tabs:**
1. **Drafts** — Press releases in DRAFT status. Rich text preview. "Generate Draft" button → agent writes a PR from a brief description.
2. **Approvals** — IN_REVIEW releases with approve/revise buttons. Client approval workflow via CLIENT_PORTAL.
3. **Distribution** — Scheduled and sent releases. Distribution status per media list. Open/pickup tracking.
4. **Archive** — COMPLETED releases with performance: pickups, reach, AVE.

**Agent tools:**
- `draft_press_release` → POST /api/v1/briefs (metadata: { type: "press_release" })
- `generate_pr_content` → openChatWithContext("Write a press release about...")
- `schedule_distribution` → POST /api/v1/context (category: pr_distribution)
- `track_pickups` → PATCH /api/v1/context (update pickup count)

**Agent prompt:** "You write and distribute press releases. You know AP style, inverted pyramid structure, and how to craft a compelling lede. You suggest embargo timing, distribution lists, and follow-up strategies. For UAE releases, you know both English and Arabic media landscapes."

---

### Module 3: CRISIS_COMMS

**What it does:** Rapid-response crisis management with stakeholder mapping and escalation chains.

**manifest.json:**
```json
{
  "id": "crisis-comms",
  "moduleType": "CRISIS_COMMS",
  "name": "Crisis Communications",
  "version": "1.0.0",
  "description": "Crisis playbooks, stakeholder mapping, holding statements, escalation management",
  "category": "ops",
  "minTier": "BUSINESS",
  "price": 2000,
  "agentName": "Crisis Comms Agent",
  "agentType": "crisis_manager"
}
```

**Data model:**
- Crisis Situations → Project (status maps to: Monitoring → Active Crisis → Containment → Resolution → Post-Mortem)
- Holding Statements → Brief (metadata: { type: "holding_statement", crisis_project_id, audience })
- Stakeholder Map → ContextEntry (category: "crisis_stakeholder", value: { name, role, contact, priority, status })
- Escalation Chain → EventSubscription (handler: webhook or agent, conditions per severity)

**Dashboard page tabs:**
1. **Status Board** — Active crises as cards with severity badge (Low/Medium/High/Critical), last update time, assigned team. Real-time feel with auto-refresh.
2. **Playbooks** — Pre-built crisis response templates: "Product Recall", "Executive Scandal", "Data Breach", "Negative Press", "Social Media Storm". Each playbook has a checklist of actions.
3. **Stakeholders** — Map of stakeholders with priority levels: Internal (CEO, Legal, HR), External (Media, Regulators, Customers, Partners). Contact info and status per crisis.
4. **Statements** — Holding statements in various stages. "Generate Statement" → agent drafts based on crisis type and audience.

**Agent prompt:** "You are a crisis communications specialist. When activated, you immediately assess the situation, identify stakeholders, draft holding statements, and recommend an escalation path. You know the UAE regulatory environment (NMC, TDRA). You prioritize speed — a holding statement in 30 minutes is better than a perfect one in 3 hours."

**Workflow templates:**
- "Crisis Activated": Project.status_changed (to "Active Crisis") → create Tasks for all playbook items + notify stakeholders
- "Statement Approved": Brief.status_changed (holding_statement, to COMPLETED) → distribute to media list

---

### Module 4: CLIENT_REPORTING

**What it does:** Monthly retainer reports, coverage analysis, SOV calculations, AVE tracking.

**manifest.json:**
```json
{
  "id": "client-reporting",
  "moduleType": "CLIENT_REPORTING",
  "name": "Client Reporting",
  "version": "1.0.0",
  "description": "Monthly retainer reports, coverage analysis, share of voice, AVE calculations",
  "category": "analytics",
  "minTier": "PRO",
  "price": 1000,
  "agentName": "Reporting Agent",
  "agentType": "client_reporter"
}
```

**Data model:**
- Reports → Brief (metadata: { type: "client_report", period, client_id, metrics })
- Metrics → ContextEntry (category: "report_metric", value: { client_id, period, coverage_count, ave_total, sov_percentage, sentiment_score })

**Dashboard page tabs:**
1. **Reports** — Monthly report list per client. Status: Draft → In Review → Sent. "Generate Report" → agent compiles coverage, tasks completed, and metrics into a report brief.
2. **Metrics** — Dashboard cards: total coverage this month, AVE, SOV vs competitors, sentiment breakdown. Per-client drill-down.
3. **Templates** — Report templates: "Monthly Retainer Report", "Campaign Wrap Report", "Quarterly Review", "Annual Summary".

**Agent prompt:** "You generate client reports for a PR agency. You pull coverage data, calculate AVE (reach × CPM rate), compute share of voice against competitors, and summarize campaign performance. Reports should be data-driven but narrative — tell the story of what the team achieved this month."

---

### Module 5: INFLUENCER_MANAGEMENT

**What it does:** Influencer database, campaign tracking, deliverable management, ROI calculation.

**manifest.json:**
```json
{
  "id": "influencer-management",
  "moduleType": "INFLUENCER_MGMT",
  "name": "Influencer Management",
  "version": "1.0.0",
  "description": "Influencer database, campaign tracking, deliverables, ROI and engagement analytics",
  "category": "marketing",
  "minTier": "PRO",
  "price": 1500,
  "agentName": "Influencer Agent",
  "agentType": "influencer_manager"
}
```

**Data model:**
- Influencers → ContextEntry (category: "influencer", value: { name, handle, platform, followers, engagement_rate, niche, location, rate_card, past_campaigns })
- Campaigns → Project (metadata: { type: "influencer_campaign", budget, target_reach })
- Deliverables → Task (linked to project, metadata: { platform, content_type, due_date, posted, engagement })
- Contracts → Order (client = the brand, items = influencer fees)

**Dashboard page tabs:**
1. **Influencers** — Database with search/filter by platform, niche, location, follower range. Engagement rate badges. "Add Influencer" form.
2. **Campaigns** — Active influencer campaigns as project cards. Budget tracker, deliverable completion rate.
3. **Deliverables** — Task kanban: Briefed → In Production → Submitted → Approved → Posted. Content preview when available.
4. **ROI** — Per-campaign ROI: spend vs reach vs engagement. Cost per engagement calculation.

**Agent prompt:** "You manage influencer relationships for brands in the UAE and GCC. You know the local influencer landscape — who works with which brands, typical rate cards, and engagement benchmarks by platform and niche. You can recommend influencers based on campaign goals, negotiate rates, and track deliverable completion."

**Integrations:** Instagram API (future Nango), TikTok Creator Marketplace (future)

---

### Module 6: EVENTS

**What it does:** Event planning, guest management, RSVP tracking, run-of-show, post-event reporting.

**manifest.json:**
```json
{
  "id": "events",
  "moduleType": "EVENTS",
  "name": "Events",
  "version": "1.0.0",
  "description": "Event planning, guest lists, RSVP tracking, run-of-show, vendor management",
  "category": "ops",
  "minTier": "PRO",
  "price": 1500,
  "agentName": "Events Agent",
  "agentType": "event_planner"
}
```

**Data model:**
- Events → Project (metadata: { type: "event", venue, date, capacity, budget, format })
- Guest List → ContextEntry (category: "event_guest", value: { event_project_id, name, email, company, rsvp_status, table_assignment, dietary })
- Run of Show → Task (linked to project, ordered by time, metadata: { time, duration, responsible, notes })
- Vendors → Order (linked to project, items = vendor services/costs)

**Dashboard page tabs:**
1. **Events** — Calendar view of upcoming events. Card view with: name, date, venue, guest count, budget status.
2. **Guest Lists** — Per-event RSVP tracker: Invited → Confirmed → Attended → No Show. Search, filter, export. Send invitations (future: email integration).
3. **Run of Show** — Timeline view for event day: time → activity → responsible person → notes. Drag to reorder.
4. **Budget** — Per-event budget tracker: vendor orders, total spend, remaining budget. "Add Vendor" creates an order.

**Agent prompt:** "You plan and manage events for a PR agency in the UAE. You know Dubai and Abu Dhabi venues, typical event formats (press conferences, product launches, gala dinners, brand activations), and local logistics (permitting, cultural considerations, Ramadan scheduling). You can build a run-of-show, manage guest lists, and track vendor budgets."

**Workflow templates:**
- "RSVP Reminder": 7 days before event → create Task "Send RSVP reminder to unconfirmed guests"
- "Post-Event Report": Project.status_changed (to COMPLETED) → generate client report with attendance stats

---

## The Houbara Communications Suite

```json
{
  "id": "comms-agency-uae",
  "name": "UAE Comms Agency",
  "version": "1.0.0",
  "description": "Complete PR/communications agency setup for the UAE market",
  "industry": "comms",
  "region": "MENA",
  "modules": [
    "CRM", "BRIEFS", "CONTENT_STUDIO", "SOCIAL_PUBLISHING",
    "LISTENING", "ANALYTICS", "CLIENT_PORTAL", "TIME_LEAVE",
    "MEDIA_RELATIONS", "PRESS_RELEASES", "CRISIS_COMMS",
    "CLIENT_REPORTING", "INFLUENCER_MGMT", "EVENTS"
  ],
  "config": {
    "timezone": "Asia/Dubai",
    "currency": "AED",
    "workWeek": [1, 2, 3, 4, 5],
    "language": "en"
  },
  "moduleOverrides": {
    "CRM": {
      "pipelineStages": ["Prospect", "Pitch", "Proposal", "Retainer", "Active Client", "Dormant"],
      "defaultCurrency": "AED",
      "clientTypes": ["Brand", "Government Entity", "Semi-Government", "SME", "Startup"]
    },
    "BRIEFS": {
      "types": ["Media Pitch", "Press Release", "Holding Statement", "Campaign Brief", "Client Report", "Event Brief"],
      "reviewStages": ["Internal Review", "Client Review", "Legal Review", "Final Approval"]
    },
    "LISTENING": {
      "defaultMonitors": ["Client brand names", "Competitor brands", "Industry keywords"],
      "sources": ["Gulf News", "The National", "Khaleej Times", "Arabian Business", "Campaign ME"]
    },
    "TIME_LEAVE": {
      "leaveTypes": ["Annual", "Sick", "Hajj", "Compassionate", "Maternity/Paternity"]
    }
  },
  "workflows": [
    { "name": "Pitch Follow-Up", "entityType": "Brief", "action": "status_changed", "handler": "agent:media_relations_manager", "config": { "conditions": { "metadata.type": "pitch", "toStatus": "ACTIVE" } } },
    { "name": "Coverage Alert", "entityType": "ContextEntry", "action": "created", "handler": "webhook:notify_client", "config": { "conditions": { "category": "coverage" } } },
    { "name": "Crisis Activation", "entityType": "Project", "action": "status_changed", "handler": "agent:crisis_manager", "config": { "conditions": { "metadata.type": "crisis" } } },
    { "name": "Monthly Report Due", "entityType": "*", "action": "*", "handler": "agent:client_reporter", "config": { "schedule": "0 9 1 * *" } },
    { "name": "RSVP Reminder", "entityType": "Project", "action": "updated", "handler": "agent:event_planner", "config": { "conditions": { "metadata.type": "event", "daysUntilEvent": 7 } } }
  ],
  "agentPrompts": {
    "crm_manager": "You manage client relationships for a PR/communications agency in the UAE. Clients include brands, government entities (tourism boards, economic zones), semi-government organizations, and regional companies. Currency is AED. Retainer agreements are standard — most clients are on monthly retainers of AED 15,000-75,000.",
    "media_relations_manager": "You are the media relations specialist for a UAE comms agency. You know the Gulf media landscape: The National, Gulf News, Khaleej Times, Arabian Business, Campaign Middle East, Communicate. You track journalist relationships, manage media lists, and ensure timely pitch follow-ups.",
    "crisis_manager": "You handle crisis communications for clients in the UAE. You understand the regulatory environment (NMC, TDRA), cultural sensitivities, and the speed required. A holding statement within 30 minutes, a full response within 2 hours.",
    "event_planner": "You plan events across Dubai and Abu Dhabi. You know venues (Madinat Jumeirah, ADNEC, Coca-Cola Arena, Museum of the Future), local logistics, and cultural considerations. You manage guest lists with VIP/media/influencer tiers."
  },
  "onboarding": {
    "welcomeMessage": "Welcome to SpokeStack for Comms Agencies! I'll help you set up your workspace for PR and communications. Let's start — who are your current clients?",
    "questions": [
      "Who are your top 3 clients right now?",
      "What's your typical retainer structure — monthly, project-based, or a mix?",
      "Do you handle crisis comms, or is that a separate service?",
      "How many journalists are in your regular media outreach?",
      "Do you manage influencer campaigns for clients?"
    ]
  }
}
```

## Implementation in spokestack-modules

Each of the 6 new modules follows the Module Deployment Protocol from `docs/spokestack-modules-spec.md`. The suite is a JSON file that orchestrates their installation.

### New ModuleType enum values needed in spokestack-core:
```
MEDIA_RELATIONS
PRESS_RELEASES
CRISIS_COMMS
CLIENT_REPORTING
INFLUENCER_MGMT
EVENTS
```

These get added to:
1. `prisma/schema.prisma` → ModuleType enum
2. `src/lib/modules/registry.json` → 6 new entries
3. `src/lib/modules/templates.ts` → new "comms" template

### New Nango providers to add (future):
- Meltwater (media monitoring)
- Cision (press release distribution)
- Instagram Creator API (influencer analytics)
- Eventbrite (event management)

## Verification

After building:
1. `spoke suite install "UAE Comms Agency" --yes` → installs all 14 modules
2. Each module page loads with real data fetching
3. The onboarding agent asks comms-specific questions
4. Agent tools work: "Add journalist Sarah Ahmed from The National" → creates ContextEntry
5. Workflow templates fire: pitch brief moves to ACTIVE → follow-up task created
6. Houbara can log in, see their workspace configured for comms, and start adding clients/journalists
