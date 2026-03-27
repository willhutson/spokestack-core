import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TELNYX_API_KEY = process.env.TELNYX_API_KEY ?? "";
const TELNYX_API_URL = "https://api.telnyx.com/v2";
const TELNYX_WEBHOOK_SECRET = process.env.TELNYX_WEBHOOK_SECRET ?? "";

// ---------------------------------------------------------------------------
// Webhook validation
// ---------------------------------------------------------------------------

/**
 * Validate a Telnyx webhook signature.
 * Telnyx signs webhooks with an HMAC-SHA256 of the raw payload.
 */
export function validateWebhookSignature(
  payload: string | Buffer,
  signature: string
): boolean {
  if (!TELNYX_WEBHOOK_SECRET) {
    console.warn(
      "TELNYX_WEBHOOK_SECRET not set — skipping signature validation"
    );
    return true;
  }

  const expected = crypto
    .createHmac("sha256", TELNYX_WEBHOOK_SECRET)
    .update(payload)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// ---------------------------------------------------------------------------
// WhatsApp messaging
// ---------------------------------------------------------------------------

/**
 * Send a WhatsApp message via Telnyx Messaging API.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string
): Promise<{ messageId: string }> {
  const response = await fetch(`${TELNYX_API_URL}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TELNYX_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.TELNYX_WHATSAPP_FROM ?? "",
      to,
      text: message,
      messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID ?? "",
      type: "whatsapp",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telnyx send failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return { messageId: data.data?.id ?? "" };
}

// ---------------------------------------------------------------------------
// Voice transcription
// ---------------------------------------------------------------------------

/**
 * Transcribe a voice note using Telnyx Speech-to-Text.
 * Accepts a media URL (e.g. from a WhatsApp voice message).
 */
export async function transcribeVoiceNote(
  mediaUrl: string
): Promise<string> {
  const response = await fetch(`${TELNYX_API_URL}/ai/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TELNYX_API_KEY}`,
    },
    body: JSON.stringify({
      media_url: mediaUrl,
      language: "en",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telnyx transcription failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.data?.text ?? "";
}

// ---------------------------------------------------------------------------
// Org lookup by phone
// ---------------------------------------------------------------------------

/**
 * Find the organization associated with a phone number.
 * Looks up integrations of type TELNYX that store a phone number in config.
 */
export async function lookupOrgByPhone(
  phone: string
): Promise<string | null> {
  // Normalise to E.164-ish (strip spaces, dashes)
  const normalised = phone.replace(/[\s\-()]/g, "");

  const integration = await prisma.integration.findFirst({
    where: {
      type: "TELNYX",
      status: "ACTIVE",
    },
  });

  if (!integration) return null;

  // Config is expected to contain { phoneNumber: "+1..." }
  const config = integration.config as Record<string, any> | null;
  if (config?.phoneNumber) {
    const storedPhone = (config.phoneNumber as string).replace(
      /[\s\-()]/g,
      ""
    );
    if (storedPhone === normalised) {
      return integration.organizationId;
    }
  }

  // Broader search — scan all active Telnyx integrations
  const integrations = await prisma.integration.findMany({
    where: { type: "TELNYX", status: "ACTIVE" },
  });

  for (const integ of integrations) {
    const cfg = integ.config as Record<string, any> | null;
    if (cfg?.phoneNumber) {
      const stored = (cfg.phoneNumber as string).replace(/[\s\-()]/g, "");
      if (stored === normalised) {
        return integ.organizationId;
      }
    }
  }

  return null;
}
