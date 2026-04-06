import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const canvas = await prisma.wfCanvas.findUnique({
      where: { id: params.id },
      include: { nodes: true, edges: true },
    });

    if (!canvas) return error("Workflow not found", 404);
    if (canvas.organizationId !== auth.organizationId) return unauthorized();

    return json({ canvas });
  } catch (err) {
    return error("Failed to fetch workflow", 500);
  }
}
