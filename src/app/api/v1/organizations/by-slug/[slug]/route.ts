import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, error } from "@/lib/api";

interface Params {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/v1/organizations/by-slug/:slug
 * Public endpoint for service-to-service lookups (e.g., agentvbx webhook routing).
 * Returns org ID, active channels, and active status.
 * Does NOT return sensitive data (billing, members, etc.).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  if (!slug) {
    return error("slug is required");
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      settings: {
        select: {
          channels: true,
          customDomain: true,
        },
      },
    },
  });

  if (!org) {
    return error("Organization not found", 404);
  }

  // Parse channels config — default all to false if not set
  const channelsRaw = (org.settings?.channels as Record<string, boolean>) ?? {};
  const channels: Record<string, boolean> = {
    whatsapp: channelsRaw.whatsapp ?? false,
    voice: channelsRaw.voice ?? false,
    web: channelsRaw.web ?? true, // Web widget enabled by default
    sms: channelsRaw.sms ?? false,
  };

  return json({
    id: org.id,
    orgId: org.id,
    name: org.name,
    slug: org.slug,
    channels,
    customDomain: org.settings?.customDomain ?? null,
    active: true,
  });
}
