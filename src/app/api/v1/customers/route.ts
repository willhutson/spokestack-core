import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { moduleGuard } from "@/lib/guard/module-guard";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/customers
 * List customers for the organization.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { company: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: { orders: { take: 5, orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return json({ customers });
}

/**
 * POST /api/v1/customers
 * Create a new customer.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const guard = await moduleGuard(auth.organizationId, "ORDERS");
  if (!guard.allowed) return forbidden(guard.message);

  const body = await req.json();
  const { name, email, phone, company, metadata } = body;

  if (!name) return error("name is required");

  const customer = await prisma.customer.create({
    data: {
      organizationId: auth.organizationId,
      name,
      email,
      phone,
      company,
      metadata,
    },
  });

  return json({ customer }, 201);
}
