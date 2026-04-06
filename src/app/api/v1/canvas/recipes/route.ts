import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

const RECIPES = [
  {
    id: "social-auto",
    name: "Social Auto-Publisher",
    category: "Social",
    description: "Auto-publish approved content",
    nodeCount: 4,
    setupTime: "5 min",
  },
  {
    id: "invoice-reminder",
    name: "Invoice Reminder",
    category: "Finance",
    description: "Send payment reminders for overdue invoices",
    nodeCount: 3,
    setupTime: "3 min",
  },
  {
    id: "brief-triage",
    name: "Brief Auto-Triage",
    category: "CRM",
    description: "AI-powered brief analysis and routing",
    nodeCount: 5,
    setupTime: "10 min",
  },
  {
    id: "approval-flow",
    name: "Content Approval",
    category: "General",
    description: "Multi-stage content review and approval",
    nodeCount: 4,
    setupTime: "5 min",
  },
  {
    id: "lead-scoring",
    name: "Lead Scoring",
    category: "CRM",
    description: "Score leads based on engagement",
    nodeCount: 6,
    setupTime: "15 min",
  },
];

/**
 * GET /api/v1/canvas/recipes
 * Return static list of workflow recipes.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  return json({ recipes: RECIPES });
}
