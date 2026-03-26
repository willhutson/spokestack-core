import { NextRequest } from "next/server";
import { json, error } from "@/lib/api";
import {
  constructWebhookEvent,
  handleStripeWebhook,
} from "@/lib/billing/stripe";

/**
 * POST /api/v1/billing/webhook
 * Stripe webhook handler. Verifies the signature, then delegates
 * to handleStripeWebhook for business logic.
 *
 * This route must NOT use the authenticate() middleware — Stripe
 * calls it directly with its own signature scheme.
 */
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return error("Missing stripe-signature header", 400);
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return error("Failed to read request body", 400);
  }

  let event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return error("Invalid signature", 400);
  }

  try {
    await handleStripeWebhook(event);
  } catch (err: any) {
    console.error("Stripe webhook processing error:", err.message);
    return error("Webhook processing failed", 500);
  }

  return json({ received: true });
}
