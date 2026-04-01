import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);

  const [tasks, projects, briefs, orders] = await Promise.all([
    prisma.task.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, title: true, status: true, priority: true, updatedAt: true },
    }),
    prisma.project.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, name: true, status: true, updatedAt: true },
    }),
    prisma.brief.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, title: true, status: true, updatedAt: true },
    }),
    prisma.order.findMany({
      where: { organizationId: auth.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, status: true, totalCents: true, updatedAt: true },
    }),
  ]);

  const activity = [
    ...tasks.map((t) => ({ id: `task-${t.id}`, type: "TASK" as const, entityId: t.id, title: t.title, status: t.status, updatedAt: t.updatedAt.toISOString(), href: "/tasks" })),
    ...projects.map((p) => ({ id: `project-${p.id}`, type: "PROJECT" as const, entityId: p.id, title: p.name, status: p.status, updatedAt: p.updatedAt.toISOString(), href: `/projects/${p.id}` })),
    ...briefs.map((b) => ({ id: `brief-${b.id}`, type: "BRIEF" as const, entityId: b.id, title: b.title, status: b.status, updatedAt: b.updatedAt.toISOString(), href: `/briefs/${b.id}` })),
    ...orders.map((o) => ({ id: `order-${o.id}`, type: "ORDER" as const, entityId: o.id, title: `Order #${o.id.slice(-6)}`, status: o.status, updatedAt: o.updatedAt.toISOString(), href: "/orders" })),
  ]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);

  return json({ activity, hasActivity: activity.length > 0 });
}
