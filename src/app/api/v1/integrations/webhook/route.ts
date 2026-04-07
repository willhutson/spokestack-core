import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  seedGoogleDriveContext,
  seedSlackContext,
  seedHubSpotContext,
} from "@/lib/integrations/nango/seeders";

interface NangoWebhookEvent {
  type: string;
  connectionId: string;
  providerConfigKey: string;
  environment: string;
}

/**
 * POST /api/v1/integrations/webhook
 * Nango calls this on auth.created and sync.completed events.
 * Returns 200 immediately — all seeding is async.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-nango-signature");
  const rawBody = await req.text();

  if (!verifyNangoSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as NangoWebhookEvent;

  if (event.type !== "auth.created" && event.type !== "auth.refreshed") {
    return NextResponse.json({ received: true });
  }

  const orgId = event.connectionId;
  if (!orgId) {
    return NextResponse.json(
      { error: "Missing connectionId" },
      { status: 400 }
    );
  }

  // Fire-and-forget — seeding runs async
  switch (event.providerConfigKey) {
    case "google_drive":
      seedGoogleDriveContext(event.connectionId, orgId).catch(console.error);
      break;
    case "slack":
      seedSlackContext(event.connectionId, orgId).catch(console.error);
      break;
    case "hubspot":
      seedHubSpotContext(event.connectionId, orgId).catch(console.error);
      break;
    default:
      console.log(
        `[nango-webhook] No seeder for provider: ${event.providerConfigKey}`
      );
  }

  return NextResponse.json({ received: true });
}

function verifyNangoSignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;
  const secret = process.env.NANGO_WEBHOOK_SECRET;
  if (!secret) {
    console.warn(
      "[nango-webhook] NANGO_WEBHOOK_SECRET not set — skipping verification"
    );
    return true;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
