import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, error } from "@/lib/api";
import crypto from "crypto";

/**
 * POST /api/internal/webhooks/telnyx
 * Handle incoming WhatsApp messages via Telnyx.
 * Validates the webhook signature, extracts the message, and routes to the agent runtime.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  // ── Signature Validation ──────────────────────────────────────────────
  const signature = req.headers.get("telnyx-signature-ed25519");
  const timestamp = req.headers.get("telnyx-timestamp");
  const telnyxPublicKey = process.env.TELNYX_PUBLIC_KEY;

  if (!signature || !timestamp) {
    return error("Missing Telnyx signature headers", 401);
  }

  if (telnyxPublicKey) {
    try {
      const signedPayload = `${timestamp}|${body}`;
      const isValid = crypto.verify(
        null,
        Buffer.from(signedPayload),
        {
          key: Buffer.from(telnyxPublicKey, "base64"),
          format: "der",
          type: "spki",
        },
        Buffer.from(signature, "base64")
      );
      if (!isValid) {
        return error("Invalid Telnyx signature", 401);
      }
    } catch {
      return error("Signature verification failed", 401);
    }
  }

  // ── Parse Payload ─────────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return error("Invalid JSON payload", 400);
  }

  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return json({ received: true });

  const eventType = data.event_type as string | undefined;

  // Only process incoming WhatsApp messages
  if (eventType !== "message.received") {
    return json({ received: true });
  }

  const msgPayload = data.payload as Record<string, unknown> | undefined;
  if (!msgPayload) return json({ received: true });

  const from = (msgPayload.from as Record<string, string>)?.phone_number;
  const to = (msgPayload.to as Array<Record<string, string>>)?.[0]?.phone_number;
  const text = (msgPayload.text as Record<string, string>)?.body;
  const mediaItems = msgPayload.media as Array<Record<string, string>> | undefined;

  if (!from || !text) {
    return json({ received: true });
  }

  // ── Route to Agent Runtime ────────────────────────────────────────────
  // Find the integration and org by the Telnyx phone number (the "to" number)
  const integration = await prisma.integration.findFirst({
    where: {
      type: "TELNYX",
      status: "ACTIVE",
      // The config JSON stores the phone number
      config: { path: ["phoneNumber"], equals: to },
    },
  });

  if (!integration) {
    // No matching integration found — acknowledge receipt but do nothing
    return json({ received: true, matched: false });
  }

  const organizationId = integration.organizationId;

  // Create or find an active session for this WhatsApp user
  let session = await prisma.agentSession.findFirst({
    where: {
      organizationId,
      surface: "WHATSAPP",
      endedAt: null,
      metadata: { path: ["whatsappFrom"], equals: from },
    },
  });

  if (!session) {
    session = await prisma.agentSession.create({
      data: {
        organizationId,
        agentType: "TASKS", // Default agent; the runtime can upgrade based on message intent
        surface: "WHATSAPP",
        metadata: { whatsappFrom: from, whatsappTo: to },
      },
    });
  }

  // Store the inbound message
  await prisma.agentMessage.create({
    data: {
      sessionId: session.id,
      role: "USER",
      content: text,
      ...(mediaItems && mediaItems.length > 0
        ? { toolCalls: { media: mediaItems } }
        : {}),
    },
  });

  // TODO: Invoke agent runtime asynchronously (e.g., via a queue or background job).
  // For now, we acknowledge receipt — the agent runtime polls or subscribes to new messages.

  return json({ received: true, sessionId: session.id });
}
