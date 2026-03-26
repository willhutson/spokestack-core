import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * GET /api/v1/billing
 * Get current billing status for the authenticated user's organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: auth.organizationId },
  });

  if (!billing) return error("Billing account not found", 404);

  const tier = await prisma.billingTier.findUnique({
    where: { type: billing.tier },
  });

  return json({ billing, tier });
}

/**
 * POST /api/v1/billing
 * Initiate tier upgrade. In production, this creates a Stripe Checkout session.
 * For now, returns the target tier info.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { targetTier } = body;

  if (
    !targetTier ||
    !["STARTER", "PRO", "BUSINESS", "ENTERPRISE"].includes(targetTier)
  ) {
    return error("Valid targetTier is required (STARTER, PRO, BUSINESS, ENTERPRISE)");
  }

  const billing = await prisma.billingAccount.findUnique({
    where: { organizationId: auth.organizationId },
  });

  if (!billing) return error("Billing account not found", 404);

  const tier = await prisma.billingTier.findUnique({
    where: { type: targetTier },
  });

  if (!tier) return error("Tier not found", 404);

  // TODO: Create Stripe Checkout session and return URL
  // For now, directly update the tier (dev mode)
  const updated = await prisma.billingAccount.update({
    where: { organizationId: auth.organizationId },
    data: { tier: targetTier },
  });

  return json({
    billing: updated,
    message: `Upgraded to ${targetTier}. Agent capabilities expanded.`,
  });
}
