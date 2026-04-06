/**
 * Houbara Demo Instance Seed Script
 *
 * Populates the Houbara demo org with realistic UAE PR agency data.
 * All entities prefixed with [DEMO] so real data is never confused.
 *
 * Pure HTTP — no imports from src/, no Prisma. Uses fetch() against the
 * deployed Vercel app and @supabase/supabase-js for authentication.
 *
 * Usage:
 *   npx tsx scripts/seed-houbara-demo.ts
 *
 * Environment (loaded from .env.local via dotenv):
 *   SPOKESTACK_CORE_URL          — defaults to https://spokestack-core.vercel.app
 *   DEMO_EMAIL                   — defaults to demo@houbaracomms.agency
 *   DEMO_PASSWORD                — defaults to Houbara2026!
 *   DEMO_ORG_ID                  — defaults to cmp0houbara000001lmtdhoubara
 *   NEXT_PUBLIC_SUPABASE_URL     — required (from .env.local)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY — required (from .env.local)
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local first, then .env as fallback
config({ path: ".env.local" });
config({ path: ".env" });

const BASE_URL =
  process.env.SPOKESTACK_CORE_URL || "https://spokestack-core.vercel.app";
const EMAIL = process.env.DEMO_EMAIL || "demo@houbaracomms.agency";
const PASSWORD = process.env.DEMO_PASSWORD || "Houbara2026!";
const ORG_ID =
  process.env.DEMO_ORG_ID || "cmp0houbara000001lmtdhoubara";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "  ✗ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
  console.error(
    "    Make sure .env.local exists with these variables, or set them directly."
  );
  process.exit(1);
}

let AUTH_TOKEN = "";

// ── Helpers ──────────────────────────────────────────────────────

async function authenticate(): Promise<string> {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

  const {
    data: { session },
    error,
  } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });

  if (error || !session) {
    throw new Error(
      `Auth failed: ${error?.message || "No session returned"}`
    );
  }

  return session.access_token;
}

async function api<T = unknown>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      "Content-Type": "application/json",
      "X-Organization-Id": ORG_ID,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    console.error(`  ✗ ${method} ${path}: ${res.status} — ${err}`);
    return null as T;
  }

  return res.json() as T;
}

function log(icon: string, msg: string) {
  console.log(`  ${icon} ${msg}`);
}

// ── Org Setup (tier + modules) ───────────────────────────────────

async function setupOrg() {
  log("⚙️", "Setting up org tier and modules...");

  // Upgrade billing tier to ENTERPRISE (unlocks all core modules)
  await api("POST", "/api/v1/admin/seed", {
    tier: "ENTERPRISE",
    onboardingComplete: true,
  });
  log("✔", "Billing tier → ENTERPRISE");

  // Install the 6 comms modules + CRM
  const modules = [
    "MEDIA_RELATIONS",
    "PRESS_RELEASES",
    "CRISIS_COMMS",
    "CLIENT_REPORTING",
    "INFLUENCER_MGMT",
    "EVENTS",
    "CRM",
    "CONTENT_STUDIO",
    "ANALYTICS",
    "SOCIAL_PUBLISHING",
  ];

  for (const moduleType of modules) {
    await api("POST", "/api/v1/modules/install", { moduleType });
    log("✔", `Module installed: ${moduleType}`);
  }

  // Set branding theme to Indigo
  await api("PATCH", "/api/v1/settings/branding", {
    theme: "indigo",
  });
  log("✔", "Theme → Indigo");
}

// ── Seed Data ────────────────────────────────────────────────────

async function seedClients() {
  log("📋", "Creating clients...");

  await api("POST", "/api/v1/clients", {
    name: "Etihad Airways",
    email: "comms@etihad.ae",
    company: "Etihad Airways",
    industry: "Aviation",
    notes: "Flag carrier of the UAE. Key account.",
  });
  log("✔", "Etihad Airways");

  await api("POST", "/api/v1/clients", {
    name: "Dubai Tourism",
    email: "media@visitdubai.com",
    company: "Dubai Tourism & Commerce Marketing",
    industry: "Government / Tourism",
    notes: "DTCM — tourism promotion authority.",
  });
  log("✔", "Dubai Tourism");
}

async function seedJournalists() {
  log("📋", "Creating journalist database...");

  const journalists = [
    {
      key: "journalist_sarah_ahmed_thenational",
      value: {
        name: "Sarah Ahmed",
        outlet: "The National",
        beat: "Aviation & Travel",
        email: "s.ahmed@thenational.ae",
        twitter: "@SarahAhmedUAE",
        relationship_score: 8,
        notes:
          "Strong relationship. Covers Etihad regularly. Prefers exclusive pitches.",
      },
    },
    {
      key: "journalist_mark_townsend_gulnews",
      value: {
        name: "Mark Townsend",
        outlet: "Gulf News",
        beat: "Business & Economy",
        email: "m.townsend@gulfnews.com",
        twitter: "@MarkTownsendGN",
        relationship_score: 7,
        notes:
          "Covers corporate stories. Good for press releases with financial angle.",
      },
    },
    {
      key: "journalist_priya_menon_arabianbiz",
      value: {
        name: "Priya Menon",
        outlet: "Arabian Business",
        beat: "Technology & Innovation",
        email: "p.menon@arabianbusiness.com",
        relationship_score: 6,
        notes: "Tech-focused. Good for digital transformation angles.",
      },
    },
    {
      key: "journalist_khalid_al_rashid_albayan",
      value: {
        name: "Khalid Al Rashid",
        outlet: "Al Bayan",
        beat: "Business News",
        email: "k.alrashid@albayan.ae",
        language: "Arabic",
        relationship_score: 5,
        notes:
          "Arabic-language coverage. Important for government clients.",
      },
    },
    {
      key: "journalist_claire_davidson_campaignme",
      value: {
        name: "Claire Davidson",
        outlet: "Campaign Middle East",
        beat: "Advertising & Marketing",
        email: "c.davidson@campaignme.com",
        twitter: "@ClaireCampaignME",
        relationship_score: 9,
        notes:
          "Top relationship. Always open to agency stories and client campaigns.",
      },
    },
    {
      key: "journalist_omar_hassan_khaleejitimes",
      value: {
        name: "Omar Hassan",
        outlet: "Khaleej Times",
        beat: "UAE Business",
        email: "o.hassan@khaleejtimes.com",
        relationship_score: 6,
        notes:
          "General business beat. Quick turnaround on press releases.",
      },
    },
    {
      key: "journalist_natalie_ford_zawya",
      value: {
        name: "Natalie Ford",
        outlet: "Zawya",
        beat: "Financial Markets",
        email: "n.ford@zawya.com",
        relationship_score: 5,
        notes:
          "Financial wire service. Good for earnings and corporate milestones.",
      },
    },
    {
      key: "journalist_reem_al_mazrouei_broadcast",
      value: {
        name: "Reem Al Mazrouei",
        outlet: "Dubai Eye 103.8",
        beat: "Business Radio",
        email: "r.almazrouei@dubaieyemedia.com",
        relationship_score: 7,
        notes:
          "Radio. Great for spokespeople who want broadcast coverage.",
      },
    },
  ];

  for (const j of journalists) {
    await api("POST", "/api/v1/context", {
      entryType: "ENTITY",
      category: "journalist",
      key: j.key,
      value: j.value,
    });
    log("✔", `${j.value.name} (${j.value.outlet})`);
  }
}

async function seedMediaLists() {
  log("📋", "Creating media lists...");

  await api("POST", "/api/v1/context", {
    entryType: "ENTITY",
    category: "media_list",
    key: "list_aviation_uae",
    value: {
      name: "UAE Aviation Media",
      description:
        "Key journalists covering aviation, travel, and tourism in the UAE and GCC",
      journalistKeys: [
        "journalist_sarah_ahmed_thenational",
        "journalist_mark_townsend_gulnews",
        "journalist_omar_hassan_khaleejitimes",
      ],
      purpose: "Etihad Airways press releases and announcements",
    },
  });
  log("✔", "UAE Aviation Media");

  await api("POST", "/api/v1/context", {
    entryType: "ENTITY",
    category: "media_list",
    key: "list_marketing_uae",
    value: {
      name: "UAE Marketing & Comms Media",
      description:
        "Marketing, advertising, and communications trade press",
      journalistKeys: [
        "journalist_claire_davidson_campaignme",
        "journalist_priya_menon_arabianbiz",
      ],
      purpose:
        "Agency news, campaign launches, industry thought leadership",
    },
  });
  log("✔", "UAE Marketing & Comms Media");
}

async function seedBriefs() {
  log("📋", "Creating press releases & briefs...");

  await api("POST", "/api/v1/briefs", {
    title:
      "[DEMO] Etihad Airways Launches New Abu Dhabi–Tokyo Route — Press Release DRAFT",
    description:
      "FOR IMMEDIATE RELEASE\n\nAbu Dhabi, 7 April 2026 — Etihad Airways, the national airline of the United Arab Emirates, today announced the launch of a new direct service between Abu Dhabi International Airport (AUH) and Tokyo Narita International Airport (NRT), effective 1 June 2026.\n\nThe new route will operate four times weekly, offering passengers seamless connections between the UAE capital and Japan's primary international hub. The service will be operated by the airline's Boeing 787 Dreamliner aircraft, featuring 28 Business Studio seats and 252 Economy Smart seats.\n\n\"This new route reflects our commitment to connecting Abu Dhabi to key global destinations,\" said Simon (COO — DEMO) at Etihad Airways. \"Japan is an important market for both business and leisure travellers, and we are delighted to strengthen our Asia-Pacific network.\"\n\nAbout Etihad Airways\nEtihad Airways, the national airline of the UAE, was formed in 2003 to bring Abu Dhabi and the United Arab Emirates to the world.\n\nMedia Contact: Houbara Communications | demo@houbaracomms.agency",
    status: "DRAFT",
  });
  log("✔", "Etihad Tokyo Route — DRAFT");

  await api("POST", "/api/v1/briefs", {
    title:
      "[DEMO] Dubai Tourism Q1 2026 Visitor Statistics — Media Advisory",
    description:
      "MEDIA ADVISORY\n\nDubai, 7 April 2026 — Dubai Tourism & Commerce Marketing (DTCM) will release first-quarter 2026 visitor statistics at a press briefing to be held on Thursday, 10 April 2026 at 10:00 AM GST at the Dubai Frame, Zabeel Park.\n\nHighlights expected to include:\n• Q1 international overnight visitors\n• Top source markets\n• Hotel occupancy rates\n• Average length of stay\n\nMedia Credentials: Journalists wishing to attend should RSVP to Houbara Communications by Wednesday, 9 April 2026.\n\nMedia Contact: Houbara Communications | demo@houbaracomms.agency",
    status: "ACTIVE",
  });
  log("✔", "Dubai Tourism Q1 Stats — ACTIVE");

  await api("POST", "/api/v1/briefs", {
    title:
      "[DEMO] Houbara Communications Named MENA PR Agency of the Year 2026",
    description:
      'FOR IMMEDIATE RELEASE\n\nDubai, 7 April 2026 — Houbara Communications, the integrated communications consultancy, has been named MENA PR Agency of the Year 2026 at the Arabian Business Achievement Awards ceremony held last evening at Atlantis The Palm, Dubai.\n\nThe award recognises Houbara\'s exceptional work across strategic communications, media relations, and stakeholder engagement for a portfolio of blue-chip clients in the UAE and wider GCC region.\n\nLoretta, CEO — Houbara Communications, commented: "This recognition reflects the exceptional dedication of our entire team and the trust our clients place in us. We are committed to raising the bar for communications excellence in the MENA region."\n\nAbout Houbara Communications\nHoubara Communications is an integrated and content-driven communications consultancy with partners across the MENA region.',
    status: "COMPLETED",
  });
  log("✔", "Agency of the Year — COMPLETED");
}

async function seedPitches() {
  log("📋", "Creating active pitches...");

  await api("POST", "/api/v1/briefs", {
    title:
      "[DEMO] Exclusive: Etihad's Tokyo Route — Pitch to Sarah Ahmed",
    description:
      "Hi Sarah,\n\nI wanted to offer you an exclusive ahead of tomorrow's announcement — Etihad Airways is launching a new direct route to Tokyo Narita, starting 1 June.\n\nI know you cover aviation closely, and I thought you'd want to be first with this. Happy to arrange a call with Etihad's CCO this afternoon if you're interested.\n\nLet me know!\nLoretta",
    status: "ACTIVE",
    metadata: { type: "pitch" },
  });
  log("✔", "Etihad Tokyo pitch to Sarah Ahmed");

  await api("POST", "/api/v1/briefs", {
    title:
      "[DEMO] Pitch: Dubai Tourism Q1 Stats to Campaign Middle East",
    description:
      "Hi Claire,\n\nDubai Tourism is releasing their Q1 visitor numbers next Thursday, and given Campaign ME's readership, I think there's a strong angle here around the digital marketing strategies that have driven the surge in European visitors (+18% YoY).\n\nWould you be interested in a pre-briefing with the DTCM Director of International Marketing before the official release?\n\nBest,\nLoretta",
    status: "ACTIVE",
    metadata: { type: "pitch" },
  });
  log("✔", "Dubai Tourism pitch to Campaign ME");
}

async function seedEvents() {
  log("📋", "Creating events...");

  await api("POST", "/api/v1/projects", {
    name: "[DEMO] Dubai Tourism Q1 Press Briefing",
    description:
      "Venue: Dubai Frame, Zabeel Park\nDate: Thursday 10 April 2026, 10:00 AM GST\nFormat: Press conference + media Q&A\nCapacity: 45 journalists\nClient: Dubai Tourism\n\nRun of show:\n10:00 — Doors open, coffee\n10:30 — Welcome remarks, DTCM Director General\n10:45 — Q1 statistics presentation\n11:15 — Media Q&A\n12:00 — Close",
    status: "ACTIVE",
    metadata: { type: "event" },
  });
  log("✔", "Dubai Tourism Q1 Press Briefing");

  await api("POST", "/api/v1/projects", {
    name: "[DEMO] Houbara Annual Client Dinner 2026",
    description:
      "Venue: Zuma Dubai, DIFC\nDate: Wednesday 22 April 2026, 7:00 PM GST\nFormat: Seated dinner, 6 tables of 8\nGuest count: 48 (clients, media, key stakeholders)\nDress code: Smart casual\n\nNote: Annual relationship-building event for top-tier clients and key media contacts.",
    status: "PLANNING",
    metadata: { type: "event" },
  });
  log("✔", "Houbara Annual Client Dinner");
}

async function seedTasks() {
  log("📋", "Creating tasks...");

  const tasks = [
    {
      title: "[DEMO] Send Etihad Tokyo route pitch to Sarah Ahmed",
      priority: "HIGH",
      status: "TODO",
    },
    {
      title:
        "[DEMO] Confirm AV setup for Dubai Tourism press briefing",
      priority: "HIGH",
      status: "IN_PROGRESS",
    },
    {
      title: "[DEMO] Draft April client report for Etihad",
      priority: "MEDIUM",
      status: "TODO",
    },
    {
      title:
        "[DEMO] Follow up with Campaign ME on Dubai Tourism data angle",
      priority: "MEDIUM",
      status: "TODO",
    },
  ];

  for (const t of tasks) {
    await api("POST", "/api/v1/tasks", t);
    log("✔", t.title.replace("[DEMO] ", ""));
  }
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("\n  🐦 Houbara Demo Seed");
  console.log("  " + "─".repeat(50));
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Org:    ${ORG_ID}`);
  console.log(`  User:   ${EMAIL}\n`);

  try {
    log("🔐", "Authenticating...");
    AUTH_TOKEN = await authenticate();
    log("✔", "Authenticated\n");
  } catch (err) {
    console.error(
      `  ✗ Authentication failed: ${err instanceof Error ? err.message : err}`
    );
    console.error(
      "\n  Make sure the demo account exists in Supabase."
    );
    process.exit(1);
  }

  await setupOrg();
  console.log();
  await seedClients();
  console.log();
  await seedJournalists();
  console.log();
  await seedMediaLists();
  console.log();
  await seedBriefs();
  console.log();
  await seedPitches();
  console.log();
  await seedEvents();
  console.log();
  await seedTasks();

  console.log("\n  " + "─".repeat(50));
  console.log("  ✅ Houbara demo instance seeded:");
  console.log("     Tier: ENTERPRISE (all modules unlocked)");
  console.log("     10 modules installed");
  console.log("     2 clients");
  console.log("     8 journalists in media database");
  console.log("     2 media lists");
  console.log("     3 press releases/briefs");
  console.log("     2 active pitches");
  console.log("     2 events (as projects)");
  console.log("     4 tasks");
  console.log();
  console.log("  Demo login:");
  console.log(`    URL:      ${BASE_URL}`);
  console.log("    Email:    demo@houbaracomms.agency");
  console.log("    Password: Houbara2026!");
  console.log("    Theme:    Indigo");
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
