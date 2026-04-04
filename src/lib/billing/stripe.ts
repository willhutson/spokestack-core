import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { BillingTierType, ModuleType } from "@prisma/client";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
  }
  return _stripe;
}

/**
 * Stripe price IDs mapped to each paid tier.
 * Values come from env vars in production; defaults are placeholders.
 */
export const TIER_PRICES: Record<
  Exclude<BillingTierType, "FREE" | "ENTERPRISE">,
  string
> = {
  STARTER: process.env.STRIPE_PRICE_STARTER ?? "price_xxx",
  PRO: process.env.STRIPE_PRICE_PRO ?? "price_yyy",
  BUSINESS: process.env.STRIPE_PRICE_BUSINESS ?? "price_zzz",
};

/**
 * Create a Stripe Customer and link it to the org's BillingAccount.
 */
export async function createStripeCustomer(
  orgId: string,
  email: string
): Promise<string> {
  const customer = await getStripe().customers.create({
    email,
    metadata: { organizationId: orgId },
  });

  await prisma.billingAccount.update({
    where: { organizationId: orgId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout session for upgrading to a paid tier.
 * Returns the Checkout URL the client should redirect to.
 */
export async function createCheckoutSession(
  orgId: string,
  targetTier: Exclude<BillingTierType, "FREE" | "ENTERPRISE">
): Promise<string> {
  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: orgId },
  });

  if (!billing) {
    throw new Error("BillingAccount not found for org " + orgId);
  }

  let customerId = billing.stripeCustomerId;

  // Auto-create a Stripe customer if one doesn't exist yet
  if (!customerId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: { include: { user: true }, take: 1 } },
    });
    const ownerEmail =
      org?.members[0]?.user?.email ?? "billing@spokestack.io";
    customerId = await createStripeCustomer(orgId, ownerEmail);
  }

  const priceId = TIER_PRICES[targetTier];
  if (!priceId) {
    throw new Error("No price configured for tier " + targetTier);
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?canceled=1`,
    metadata: { organizationId: orgId, targetTier },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return session.url;
}

/**
 * Process incoming Stripe webhook events.
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.organizationId;
      const targetTier = session.metadata?.targetTier as BillingTierType | undefined;

      if (orgId && targetTier) {
        await upgradeTier(orgId, targetTier);
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId) {
        const billing = await prisma.billingAccount.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (billing) {
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

          // Keep account active
          await prisma.billingAccount.update({
            where: { id: billing.id },
            data: { status: "ACTIVE" },
          });
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;

      if (customerId) {
        const billing = await prisma.billingAccount.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (billing) {
          const periodEnd = new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000);
          const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED"> = {
            active: "ACTIVE",
            past_due: "PAST_DUE",
            canceled: "CANCELED",
            unpaid: "PAST_DUE",
          };

          await prisma.billingAccount.update({
            where: { id: billing.id },
            data: {
              status: statusMap[subscription.status] ?? "ACTIVE",
              currentPeriodEnd: periodEnd,
            },
          });
        }
      }
      break;
    }
  }
}

/**
 * Upgrade an org to a higher tier. Updates the BillingAccount directly.
 */
export async function upgradeTier(
  orgId: string,
  targetTier: BillingTierType
): Promise<void> {
  await prisma.billingAccount.update({
    where: { organizationId: orgId },
    data: { tier: targetTier, status: "ACTIVE" },
  });
}

/**
 * Downgrade an org to a lower tier.
 * Data is preserved but access is restricted to the new tier's modules.
 * OrgModules above the tier ceiling are deactivated, not deleted.
 */
export async function downgradeTier(
  orgId: string,
  targetTier: BillingTierType
): Promise<void> {
  // Determine which core modules the new tier grants
  const TIER_MODULES: Record<BillingTierType, ModuleType[]> = {
    FREE: ["TASKS"],
    STARTER: ["TASKS", "PROJECTS"],
    PRO: ["TASKS", "PROJECTS", "BRIEFS"],
    BUSINESS: ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"],
    ENTERPRISE: ["TASKS", "PROJECTS", "BRIEFS", "ORDERS"],
  };

  const allowedModules = TIER_MODULES[targetTier];

  // Deactivate installed modules that exceed the new tier
  await prisma.orgModule.updateMany({
    where: {
      organizationId: orgId,
      moduleType: { notIn: allowedModules },
      active: true,
    },
    data: { active: false },
  });

  await prisma.billingAccount.update({
    where: { organizationId: orgId },
    data: { tier: targetTier },
  });
}

/**
 * Construct a Stripe webhook event from the raw request body + signature.
 * Useful in the API route handler.
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return getStripe().webhooks.constructEvent(body, signature, webhookSecret);
}
