import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { runSynthesisForOrg } from "@/lib/context/synthesizer";

/**
 * POST /api/v1/context/synthesize
 * Trigger weekly synthesis for the authenticated user's org.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  try {
    const insightCount = await runSynthesisForOrg(auth.organizationId);
    return json({ success: true, insightsGenerated: insightCount });
  } catch (err) {
    console.error("[synthesize] error:", err);
    return error(
      `Synthesis failed: ${err instanceof Error ? err.message : String(err)}`,
      500
    );
  }
}
