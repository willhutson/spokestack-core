import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { ModuleType } from "@prisma/client";
import {
  getModuleByType,
  tierCanInstall,
} from "@/lib/modules/registry";
import {
  INDUSTRY_TEMPLATES,
  getAvailableTemplates,
} from "@/lib/modules/templates";

/**
 * GET /api/v1/modules/recommend?industry=agency
 * Returns recommended modules for an industry, respecting the org's tier.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const industry = searchParams.get("industry")?.toLowerCase();

  if (!industry || !INDUSTRY_TEMPLATES[industry]) {
    return json({
      error: industry
        ? `Unknown industry: ${industry}`
        : "industry query param is required",
      availableTemplates: getAvailableTemplates(),
    }, industry ? 400 : 200);
  }

  const template = INDUSTRY_TEMPLATES[industry];

  // Get org's billing tier
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: auth.organizationId },
    select: { tier: true },
  });
  const tier = billing?.tier ?? "FREE";

  // Build recommendations with install eligibility
  const recommended = template.modules.map((mtStr) => {
    const mt = mtStr as ModuleType;
    const registryEntry = getModuleByType(mt);
    const canInstall = tierCanInstall(tier, mt);

    return {
      moduleType: mtStr,
      name: registryEntry?.name ?? mtStr,
      reason: getRecommendationReason(mtStr, industry),
      canInstall,
      ...(canInstall ? {} : { requiredTier: registryEntry?.minTier }),
    };
  });

  return json({
    industry,
    label: template.label,
    recommended,
    availableTemplates: getAvailableTemplates(),
  });
}

function getRecommendationReason(
  moduleType: string,
  industry: string
): string {
  const reasons: Record<string, Record<string, string>> = {
    CRM: {
      agency: "Manage client relationships and deal pipeline",
      saas: "Track leads, trials, and customer lifecycle",
      services: "Organize client engagements and proposals",
      ecommerce: "Customer segmentation and lifetime value tracking",
      consulting: "Manage consulting engagements and client contacts",
      media: "Publisher and advertiser relationship management",
      _default: "Manage customer relationships and contacts",
    },
    CONTENT_STUDIO: {
      agency: "Creative asset management and approval workflows",
      media: "Content production pipeline from draft to publish",
      _default: "AI-powered content creation and management",
    },
    WORKFLOWS: {
      agency: "Automate brief intake, review cycles, and handoffs",
      saas: "Automate deployment, onboarding, and support escalation",
      services: "Standardize service delivery and client onboarding",
      construction: "Automate permitting, inspections, and handoffs",
      education: "Automate enrollment, grading, and certification",
      _default: "Multi-step workflow automation with triggers and conditions",
    },
    TIME_LEAVE: {
      agency: "Track team availability across campaigns",
      services: "Billable hours tracking and capacity planning",
      construction: "Crew scheduling and time tracking",
      consulting: "Billable vs. non-billable time tracking",
      _default: "Team availability, time tracking, and leave management",
    },
    SOCIAL_PUBLISHING: {
      agency: "Schedule and publish client social content",
      ecommerce: "Product launches and promotional content scheduling",
      media: "Multi-channel content distribution",
      _default: "Social media scheduling with AI-optimized timing",
    },
    ANALYTICS: {
      saas: "Product usage, churn prediction, and revenue metrics",
      ecommerce: "Sales funnels, conversion rates, and inventory insights",
      consulting: "Utilization rates and project profitability",
      media: "Content performance and audience analytics",
      education: "Student engagement and learning outcome analytics",
      _default: "Business intelligence dashboards and trend analysis",
    },
    NPS: {
      saas: "Track product satisfaction and feature requests",
      services: "Client satisfaction after engagement completion",
      education: "Student and parent satisfaction tracking",
      _default: "Net Promoter Score tracking with automated surveys",
    },
    FINANCE: {
      saas: "MRR tracking, runway forecasting, and burn rate",
      services: "Project profitability and billing management",
      ecommerce: "Revenue tracking and expense management",
      construction: "Job costing and budget tracking",
      consulting: "Engagement profitability and expense tracking",
      _default: "Financial tracking, budgets, and forecasting",
    },
    LMS: {
      education: "Course management and student progress tracking",
      _default: "Learning management and team skill development",
    },
  };

  const moduleReasons = reasons[moduleType];
  if (!moduleReasons) return "Recommended for your industry";
  return moduleReasons[industry] ?? moduleReasons._default ?? "Recommended for your industry";
}
