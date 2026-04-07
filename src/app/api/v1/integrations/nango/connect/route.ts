import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { createConnection } from "@/lib/integrations/nango/client";

/**
 * POST /api/v1/integrations/nango/connect
 * Initiates Nango OAuth flow. Returns a connect session for the frontend.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { providerConfigKey } = body;

  if (!providerConfigKey) {
    return NextResponse.json(
      { error: "providerConfigKey required" },
      { status: 400 }
    );
  }

  try {
    const session = await createConnection({
      providerConfigKey,
      organizationId: auth.organizationId,
      connectionId: auth.organizationId,
    });

    return NextResponse.json(session);
  } catch (err) {
    console.error("[nango-connect] Failed to create session:", err);
    return NextResponse.json(
      { error: "Failed to initiate connection" },
      { status: 500 }
    );
  }
}
