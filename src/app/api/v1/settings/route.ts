import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";

/**
 * GET /api/v1/settings
 * Get organization settings.
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const [org, existingSettings] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: auth.organizationId },
      select: { name: true },
    }),
    prisma.orgSettings.findUnique({
      where: { organizationId: auth.organizationId },
    }),
  ]);

  // Auto-create defaults if none exist
  const settings = existingSettings ?? await prisma.orgSettings.create({
    data: { organizationId: auth.organizationId },
  });

  return json({
    settings,
    name: org?.name ?? "",
    timezone: settings.timezone,
    language: settings.language,
  });
}

/**
 * PATCH /api/v1/settings
 * Update organization settings.
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can update settings");
  }

  const body = await req.json();
  const { timezone, language, weekStartDay, onboardingComplete } = body;

  // Ensure settings exist
  const existing = await prisma.orgSettings.findUnique({
    where: { organizationId: auth.organizationId },
  });

  if (!existing) {
    // Create with provided values
    const settings = await prisma.orgSettings.create({
      data: {
        organizationId: auth.organizationId,
        ...(timezone !== undefined ? { timezone } : {}),
        ...(language !== undefined ? { language } : {}),
        ...(weekStartDay !== undefined ? { weekStartDay } : {}),
        ...(onboardingComplete !== undefined ? { onboardingComplete } : {}),
      },
    });
    return json({ settings });
  }

  const settings = await prisma.orgSettings.update({
    where: { organizationId: auth.organizationId },
    data: {
      ...(timezone !== undefined ? { timezone } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(weekStartDay !== undefined ? { weekStartDay } : {}),
      ...(onboardingComplete !== undefined ? { onboardingComplete } : {}),
    },
  });

  return json({ settings });
}
