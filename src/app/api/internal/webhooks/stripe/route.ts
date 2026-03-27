import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, error } from "@/lib/api";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/**
 * POST /api/internal/webhooks/stripe
 * Handle Stripe webhook events for billing lifecycle.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return error("Missing Stripe signature", 401);
  }

  // ── Signature Validation ──────────────────────────────────────────────
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(`Webhook signature verification failed: ${message}`, 401);
  }

  // ── Event Handling ────────────────────────────────────────────────────
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string;

      const billing = await prisma.billingAccount.findUnique({
        where: { stripeCustomerId },
      });
      if (!billing) break;

      // Map Stripe price/product to our tier
      const tier = mapSubscriptionToTier(subscription);

      // In newer Stripe API versions, current_period_end lives on subscription items
      const firstItem = subscription.items.data[0];
      const periodEnd = firstItem
        ? new Date(firstItem.current_period_end * 1000)
        : undefined;

      await prisma.billingAccount.update({
        where: { id: billing.id },
        data: {
          tier,
          status: subscription.status === "active" ? "ACTIVE" : "PAST_DUE",
          ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = subscription.customer as string;

      const billing = await prisma.billingAccount.findUnique({
        where: { stripeCustomerId },
      });
      if (!billing) break;

      await prisma.billingAccount.update({
        where: { id: billing.id },
        data: {
          tier: "FREE",
          status: "CANCELED",
        },
      });
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId = invoice.customer as string;

      const billing = await prisma.billingAccount.findUnique({
        where: { stripeCustomerId },
      });
      if (!billing) break;

      await prisma.billingInvoice.create({
        data: {
          billingAccountId: billing.id,
          stripeInvoiceId: invoice.id,
          amountCents: invoice.amount_paid,
          status: "PAID",
          periodStart: new Date(invoice.period_start * 1000),
          periodEnd: new Date(invoice.period_end * 1000),
        },
      });

      // Update billing status to active on successful payment
      if (billing.status !== "ACTIVE") {
        await prisma.billingAccount.update({
          where: { id: billing.id },
          data: { status: "ACTIVE" },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId = invoice.customer as string;

      const billing = await prisma.billingAccount.findUnique({
        where: { stripeCustomerId },
      });
      if (!billing) break;

      await prisma.billingAccount.update({
        where: { id: billing.id },
        data: { status: "PAST_DUE" },
      });

      // Create a notification for the org owner
      const ownerMembership = await prisma.teamMember.findFirst({
        where: { organizationId: billing.organizationId, role: "OWNER" },
      });

      if (ownerMembership) {
        await prisma.notification.create({
          data: {
            organizationId: billing.organizationId,
            userId: ownerMembership.userId,
            type: "SYSTEM",
            title: "Payment Failed",
            body: "Your latest invoice payment failed. Please update your payment method to avoid service interruption.",
            channel: "IN_APP",
          },
        });
      }
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const stripeCustomerId = session.customer as string;

      if (!stripeCustomerId) break;

      // Link Stripe customer to billing account if not already linked
      const billing = await prisma.billingAccount.findFirst({
        where: {
          OR: [
            { stripeCustomerId },
            // Match by metadata if customer ID wasn't set yet
            ...(session.metadata?.organizationId
              ? [{ organizationId: session.metadata.organizationId }]
              : []),
          ],
        },
      });

      if (billing && !billing.stripeCustomerId) {
        await prisma.billingAccount.update({
          where: { id: billing.id },
          data: { stripeCustomerId },
        });
      }
      break;
    }

    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  return json({ received: true });
}

/**
 * Map a Stripe subscription to our billing tier.
 * Uses product metadata or price lookup keys to determine the tier.
 */
function mapSubscriptionToTier(
  subscription: Stripe.Subscription
): "FREE" | "STARTER" | "PRO" | "BUSINESS" | "ENTERPRISE" {
  const item = subscription.items.data[0];
  if (!item) return "FREE";

  // Check price lookup key first (e.g., "starter_monthly", "pro_monthly")
  const lookupKey = item.price.lookup_key?.toUpperCase() ?? "";

  if (lookupKey.includes("ENTERPRISE")) return "ENTERPRISE";
  if (lookupKey.includes("BUSINESS")) return "BUSINESS";
  if (lookupKey.includes("PRO")) return "PRO";
  if (lookupKey.includes("STARTER")) return "STARTER";

  // Fallback: check product metadata
  const tierMeta = (item.price.metadata?.tier ?? "").toUpperCase();
  if (tierMeta === "ENTERPRISE") return "ENTERPRISE";
  if (tierMeta === "BUSINESS") return "BUSINESS";
  if (tierMeta === "PRO") return "PRO";
  if (tierMeta === "STARTER") return "STARTER";

  return "FREE";
}
