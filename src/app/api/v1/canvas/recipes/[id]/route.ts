import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

interface RecipeNode {
  type: string;
  label: string;
  positionX: number;
  positionY: number;
  config?: Record<string, unknown>;
}

interface RecipeDetail {
  id: string;
  name: string;
  category: string;
  description: string;
  nodeCount: number;
  setupTime: string;
  nodes: RecipeNode[];
  requiredConfig: string[];
}

const RECIPE_DETAILS: Record<string, RecipeDetail> = {
  "social-auto": {
    id: "social-auto",
    name: "Social Auto-Publisher",
    category: "Social",
    description: "Auto-publish approved content across social channels when content is marked as approved.",
    nodeCount: 4,
    setupTime: "5 min",
    nodes: [
      { type: "START", label: "Content Approved Trigger", positionX: 100, positionY: 200 },
      { type: "CONDITION", label: "Check Platform Config", positionX: 350, positionY: 200 },
      { type: "ACTION", label: "Publish to Channels", positionX: 600, positionY: 200 },
      { type: "NOTIFICATION", label: "Notify Team", positionX: 850, positionY: 200 },
    ],
    requiredConfig: ["Social platform credentials", "Publishing schedule", "Approval webhook URL"],
  },
  "invoice-reminder": {
    id: "invoice-reminder",
    name: "Invoice Reminder",
    category: "Finance",
    description: "Automatically send payment reminders for overdue invoices at configurable intervals.",
    nodeCount: 3,
    setupTime: "3 min",
    nodes: [
      { type: "START", label: "Invoice Overdue Check", positionX: 100, positionY: 200 },
      { type: "DELAY", label: "Wait Period", positionX: 350, positionY: 200, config: { delayDays: 3 } },
      { type: "ACTION", label: "Send Reminder Email", positionX: 600, positionY: 200 },
    ],
    requiredConfig: ["Email template", "Reminder interval (days)", "Max reminder count"],
  },
  "brief-triage": {
    id: "brief-triage",
    name: "Brief Auto-Triage",
    category: "CRM",
    description: "AI-powered analysis of incoming briefs with automatic categorization and team routing.",
    nodeCount: 5,
    setupTime: "10 min",
    nodes: [
      { type: "START", label: "New Brief Received", positionX: 100, positionY: 200 },
      { type: "ACTION", label: "AI Analysis", positionX: 300, positionY: 200 },
      { type: "CONDITION", label: "Priority Check", positionX: 500, positionY: 200 },
      { type: "ACTION", label: "Assign to Team", positionX: 700, positionY: 100 },
      { type: "NOTIFICATION", label: "Alert Manager", positionX: 700, positionY: 300 },
    ],
    requiredConfig: ["AI model configuration", "Team routing rules", "Priority thresholds"],
  },
  "approval-flow": {
    id: "approval-flow",
    name: "Content Approval",
    category: "General",
    description: "Multi-stage content review and approval workflow with configurable reviewers.",
    nodeCount: 4,
    setupTime: "5 min",
    nodes: [
      { type: "START", label: "Content Submitted", positionX: 100, positionY: 200 },
      { type: "APPROVAL", label: "Manager Review", positionX: 350, positionY: 200 },
      { type: "APPROVAL", label: "Legal Review", positionX: 600, positionY: 200 },
      { type: "ACTION", label: "Mark Approved", positionX: 850, positionY: 200 },
    ],
    requiredConfig: ["Reviewer list", "Escalation rules", "SLA deadline (hours)"],
  },
  "lead-scoring": {
    id: "lead-scoring",
    name: "Lead Scoring",
    category: "CRM",
    description: "Score incoming leads based on engagement signals and route to appropriate sales reps.",
    nodeCount: 6,
    setupTime: "15 min",
    nodes: [
      { type: "START", label: "New Lead Event", positionX: 100, positionY: 200 },
      { type: "ACTION", label: "Gather Signals", positionX: 300, positionY: 200 },
      { type: "ACTION", label: "Calculate Score", positionX: 500, positionY: 200 },
      { type: "CONDITION", label: "Score Threshold", positionX: 700, positionY: 200 },
      { type: "ACTION", label: "Assign to Rep", positionX: 900, positionY: 100 },
      { type: "DELAY", label: "Nurture Queue", positionX: 900, positionY: 300, config: { delayDays: 7 } },
    ],
    requiredConfig: ["Scoring weights", "Threshold values", "Sales rep assignment rules", "CRM integration"],
  },
};

/**
 * GET /api/v1/canvas/recipes/[id]
 * Return detailed recipe with sample nodes.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { id } = await params;

  const recipe = RECIPE_DETAILS[id];
  if (!recipe) return error("Recipe not found", 404);

  return json({ recipe });
}
