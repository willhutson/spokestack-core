import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const settings = await prisma.orgSettings.findUnique({
    where: { organizationId: auth.organizationId },
    select: { onboardingComplete: true },
  });

  return json({ onboardingComplete: settings?.onboardingComplete ?? false });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const { complete = true } = body;

  const settings = await prisma.orgSettings.upsert({
    where: { organizationId: auth.organizationId },
    update: { onboardingComplete: complete },
    create: {
      organizationId: auth.organizationId,
      onboardingComplete: complete,
    },
  });

  return json({ onboardingComplete: settings.onboardingComplete });
}
