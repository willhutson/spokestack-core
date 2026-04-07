import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

import { seedIndustryContext } from "@/lib/onboarding/industry-context-seed";

type OnboardingAction =
  | { type: "CREATE_BRIEF"; data: { title: string; description?: string; clientId?: string } }
  | { type: "CREATE_PROJECT"; data: { name: string; description?: string } }
  | { type: "CREATE_ORDER"; data: { clientId?: string; notes?: string; items?: Array<{ description: string; quantity: number; unitPriceCents: number }> } }
  | { type: "CREATE_TASK"; data: { title: string; description?: string; status?: string } }
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "CONNECT_INTEGRATION"; provider: string }
  | { type: "SEED_CONTEXT"; payload: { industry: string; org_name: string; region?: string; team_size?: string; clients?: string[] } };

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const action = (await req.json()) as OnboardingAction;

  switch (action.type) {
    case "CREATE_BRIEF": {
      const brief = await prisma.brief.create({
        data: {
          organizationId: auth.organizationId,
          title: action.data.title,
          description: action.data.description ?? null,
          status: "DRAFT",
          createdById: auth.user.id,
        },
      });
      return json({ success: true, created: { type: "brief", id: brief.id, href: `/briefs/${brief.id}` } });
    }

    case "CREATE_PROJECT": {
      const project = await prisma.project.create({
        data: {
          organizationId: auth.organizationId,
          name: action.data.name,
          description: action.data.description ?? null,
          status: "PLANNING",
        },
      });
      return json({ success: true, created: { type: "project", id: project.id, href: `/projects/${project.id}` } });
    }

    case "CREATE_ORDER": {
      const items = action.data.items ?? [];
      const totalCents = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
      let clientId = action.data.clientId;
      if (!clientId) {
        const defaultClient = await prisma.client.findFirst({ where: { organizationId: auth.organizationId } });
        if (defaultClient) clientId = defaultClient.id;
      }
      const order = await prisma.order.create({
        data: {
          organizationId: auth.organizationId,
          clientId: clientId ?? null,
          status: "PENDING",
          totalCents,
          notes: action.data.notes ?? null,
          items: {
            create: items.map((i) => ({
              description: i.description,
              quantity: i.quantity,
              unitPriceCents: i.unitPriceCents,
              totalCents: i.unitPriceCents * i.quantity,
            })),
          },
        },
      });
      return json({ success: true, created: { type: "order", id: order.id, href: "/orders" } });
    }

    case "CREATE_TASK": {
      const task = await prisma.task.create({
        data: {
          organizationId: auth.organizationId,
          title: action.data.title,
          description: action.data.description ?? null,
          status: (action.data.status as "TODO" | "IN_PROGRESS" | "DONE") ?? "TODO",
          priority: "MEDIUM",
        },
      });
      return json({ success: true, created: { type: "task", id: task.id, href: "/tasks" } });
    }

    case "COMPLETE_ONBOARDING": {
      await prisma.orgSettings.upsert({
        where: { organizationId: auth.organizationId },
        update: { onboardingComplete: true },
        create: { organizationId: auth.organizationId, onboardingComplete: true },
      });
      const response = NextResponse.json({ success: true, redirect: "/" });
      response.cookies.set("spokestack_onboarding_complete", "true", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
      return response;
    }

    case "CONNECT_INTEGRATION": {
      return json({
        success: true,
        connectFlow: { provider: action.provider, endpoint: "/api/v1/integrations/connect" },
      });
    }

    case "SEED_CONTEXT": {
      await seedIndustryContext(
        auth.organizationId,
        action.payload.industry,
        {
          name: action.payload.org_name,
          region: action.payload.region,
          size: action.payload.team_size,
          clients: action.payload.clients,
        }
      );
      return json({ success: true, seeded: action.payload.industry });
    }

    default:
      return error("Unknown action type", 400);
  }
}
