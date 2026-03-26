import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";
import { ModuleType } from "@prisma/client";

/**
 * Marketplace module catalog with descriptions and pricing.
 */
const MARKETPLACE_MODULES: Array<{
  moduleType: ModuleType;
  name: string;
  description: string;
  priceCentsMonthly: number;
  category: string;
}> = [
  {
    moduleType: "CRM",
    name: "CRM",
    description: "Customer relationship management with contact tracking, deal pipelines, and activity history.",
    priceCentsMonthly: 2900,
    category: "Sales",
  },
  {
    moduleType: "SOCIAL_PUBLISHING",
    name: "Social Publishing",
    description: "Schedule and publish content across social media platforms with AI-assisted copy.",
    priceCentsMonthly: 1900,
    category: "Marketing",
  },
  {
    moduleType: "CONTENT_STUDIO",
    name: "Content Studio",
    description: "AI-powered content creation workspace for blogs, emails, and marketing materials.",
    priceCentsMonthly: 2900,
    category: "Marketing",
  },
  {
    moduleType: "ANALYTICS",
    name: "Analytics",
    description: "Dashboards and reporting across all modules with custom metric tracking.",
    priceCentsMonthly: 1900,
    category: "Intelligence",
  },
  {
    moduleType: "SURVEYS",
    name: "Surveys",
    description: "Create and distribute surveys with AI-generated analysis of responses.",
    priceCentsMonthly: 900,
    category: "Research",
  },
  {
    moduleType: "LISTENING",
    name: "Social Listening",
    description: "Monitor brand mentions, keywords, and sentiment across social platforms.",
    priceCentsMonthly: 2900,
    category: "Intelligence",
  },
  {
    moduleType: "MEDIA_BUYING",
    name: "Media Buying",
    description: "Plan, execute, and optimize paid media campaigns across ad platforms.",
    priceCentsMonthly: 4900,
    category: "Advertising",
  },
  {
    moduleType: "LMS",
    name: "Learning Management",
    description: "Create and manage training courses, quizzes, and certification paths.",
    priceCentsMonthly: 1900,
    category: "HR",
  },
  {
    moduleType: "NPS",
    name: "NPS Tracker",
    description: "Net Promoter Score surveys with automated follow-ups and trend analysis.",
    priceCentsMonthly: 900,
    category: "Research",
  },
  {
    moduleType: "TIME_LEAVE",
    name: "Time & Leave",
    description: "Time tracking, leave requests, and attendance management.",
    priceCentsMonthly: 900,
    category: "HR",
  },
  {
    moduleType: "BOARDS",
    name: "Boards",
    description: "Kanban-style boards for visual workflow management.",
    priceCentsMonthly: 900,
    category: "Productivity",
  },
  {
    moduleType: "FINANCE",
    name: "Finance",
    description: "Expense tracking, budgets, and financial reporting.",
    priceCentsMonthly: 2900,
    category: "Finance",
  },
  {
    moduleType: "WORKFLOWS",
    name: "Workflows",
    description: "Visual workflow builder for automating business processes across modules.",
    priceCentsMonthly: 1900,
    category: "Automation",
  },
];

/**
 * GET /api/v1/marketplace
 * List available marketplace modules with install status.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  // Get installed modules for this org
  const installedModules = await prisma.orgModule.findMany({
    where: { organizationId: auth.organizationId },
  });

  const installedMap = new Map(
    installedModules.map((m) => [m.moduleType, m])
  );

  const modules = MARKETPLACE_MODULES.map((mod) => {
    const installed = installedMap.get(mod.moduleType);
    return {
      ...mod,
      installed: !!installed?.active,
      installedAt: installed?.installedAt ?? null,
    };
  });

  return json({ modules });
}
