import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/export
 * Export all organisation data as a single JSON payload.
 * Restricted to OWNER and ADMIN roles.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (!["OWNER", "ADMIN"].includes(auth.role)) {
    return forbidden("Only owners and admins can export data");
  }

  const orgId = auth.organizationId;

  try {
    const [
      organization,
      billingAccount,
      teams,
      members,
      settings,
      modules,
      tasks,
      taskLists,
      projects,
      briefs,
      orders,
      customers,
      invoices,
      agentSessions,
      contextEntries,
      milestones,
      integrations,
      notifications,
      fileAssets,
    ] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.billingAccount.findUnique({
        where: { organizationId: orgId },
        include: { meterEvents: true, invoices: true },
      }),
      prisma.team.findMany({ where: { organizationId: orgId } }),
      prisma.teamMember.findMany({
        where: { organizationId: orgId },
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
      prisma.orgSettings.findUnique({ where: { organizationId: orgId } }),
      prisma.orgModule.findMany({ where: { organizationId: orgId } }),
      prisma.task.findMany({
        where: { organizationId: orgId },
        include: { comments: true, attachments: true },
      }),
      prisma.taskList.findMany({ where: { organizationId: orgId } }),
      prisma.project.findMany({
        where: { organizationId: orgId },
        include: { phases: true, milestones: true },
      }),
      prisma.brief.findMany({
        where: { organizationId: orgId },
        include: {
          phases: true,
          artifacts: { include: { reviews: true } },
        },
      }),
      prisma.order.findMany({
        where: { organizationId: orgId },
        include: { items: true },
      }),
      prisma.customer.findMany({ where: { organizationId: orgId } }),
      prisma.invoice.findMany({
        where: { organizationId: orgId },
        include: { items: true },
      }),
      prisma.agentSession.findMany({
        where: { organizationId: orgId },
        include: { messages: true },
      }),
      prisma.contextEntry.findMany({ where: { organizationId: orgId } }),
      prisma.contextMilestone.findMany({ where: { organizationId: orgId } }),
      prisma.integration.findMany({ where: { organizationId: orgId } }),
      prisma.notification.findMany({ where: { organizationId: orgId } }),
      prisma.fileAsset.findMany({ where: { organizationId: orgId } }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      organization,
      billingAccount,
      teams,
      members,
      settings,
      modules,
      taskLists,
      tasks,
      projects,
      briefs,
      orders,
      customers,
      invoices,
      agentSessions,
      contextEntries,
      milestones,
      integrations,
      notifications,
      fileAssets,
    };

    return json(exportData);
  } catch (err: any) {
    console.error("Export failed:", err.message);
    return error("Export failed", 500);
  }
}
