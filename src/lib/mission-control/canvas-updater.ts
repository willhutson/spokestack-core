import { prisma } from "@/lib/prisma";

/**
 * Update the Mission Control canvas when an agent creates/updates/completes entities.
 * Fire-and-forget — does not block the response.
 *
 * Called after agent chat/ask responses. Checks if any entity mutations
 * occurred and invalidates the auto-generated canvas so it rebuilds on next view.
 */
export async function updateCanvasFromAgentAction(
  orgId: string,
  _agentResponse: Record<string, unknown>
): Promise<void> {
  try {
    // Find the org's Mission Control canvas (name = "Mission Control")
    const canvas = await prisma.wfCanvas.findFirst({
      where: {
        organizationId: orgId,
        name: "Mission Control",
        projectId: null, // Not project-scoped
      },
    });

    if (!canvas) {
      // No canvas yet — it will be auto-generated on first /mission-control visit
      return;
    }

    // Touch the updatedAt timestamp to signal the canvas needs a refresh.
    // The frontend polls or checks this timestamp to know when to re-fetch.
    await prisma.wfCanvas.update({
      where: { id: canvas.id },
      data: { updatedAt: new Date() },
    });
  } catch (err) {
    // Non-blocking — log and continue
    console.error("[canvas-updater] error:", err);
  }
}
