import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

const TEMPLATES = [
  { id: "social-auto", name: "Social Auto-Publisher", category: "Social", description: "Auto-publish approved content to social platforms", stepCount: 4, installCount: 128 },
  { id: "invoice-reminder", name: "Invoice Reminder", category: "Finance", description: "Send payment reminders for overdue invoices", stepCount: 3, installCount: 89 },
  { id: "brief-triage", name: "Brief Auto-Triage", category: "CRM", description: "AI-powered brief analysis and routing", stepCount: 5, installCount: 67 },
  { id: "weekly-report", name: "Weekly Report Generator", category: "Reporting", description: "Generate and distribute weekly status reports", stepCount: 4, installCount: 56 },
  { id: "lead-scoring", name: "Lead Scoring Pipeline", category: "CRM", description: "Score and route leads based on engagement signals", stepCount: 6, installCount: 43 },
  { id: "content-approval", name: "Content Approval Flow", category: "General", description: "Multi-stage content review and approval", stepCount: 4, installCount: 34 },
];

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  return json({ templates: TEMPLATES });
}
