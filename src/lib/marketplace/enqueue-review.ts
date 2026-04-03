/**
 * Fire-and-forget module review enqueue.
 * Sends the module to the agent builder's module_reviewer agent.
 * Non-blocking — failures are logged, never thrown.
 */
export async function enqueueModuleReview(
  moduleId: string,
  orgId: string
): Promise<void> {
  const runtimeUrl = process.env.AGENT_RUNTIME_URL;
  const secret = process.env.AGENT_RUNTIME_SECRET;
  if (!runtimeUrl) return;

  try {
    await fetch(`${runtimeUrl}/api/v1/core/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Secret": secret || "",
      },
      body: JSON.stringify({
        agent_type: "module_reviewer",
        task: `Review module ${moduleId} for security and quality`,
        org_id: orgId,
        user_id: "system",
        stream: false,
        metadata: { moduleId },
      }),
    });
  } catch (err) {
    console.error("[marketplace] Failed to enqueue module review:", err);
  }
}
