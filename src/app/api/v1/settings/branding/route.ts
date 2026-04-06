import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized, forbidden } from "@/lib/api";

const VALID_THEMES = [
  "obsidian", "volt", "indigo", "canvas", "monolith", "copper", "sage",
] as const;

/**
 * GET /api/v1/settings/branding
 * Return current branding (theme, logo, primaryColor).
 */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const settings = await prisma.orgSettings.findUnique({
    where: { organizationId: auth.organizationId },
    select: { branding: true },
  });

  return json(settings?.branding ?? { theme: "obsidian" });
}

/**
 * PATCH /api/v1/settings/branding
 * Update branding fields (theme, logoUrl, primaryColor).
 */
export async function PATCH(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  if (auth.role !== "OWNER" && auth.role !== "ADMIN") {
    return forbidden("Only owners and admins can update branding");
  }

  const body = await req.json();
  const { theme, logoUrl, primaryColor } = body;

  if (theme && !VALID_THEMES.includes(theme)) {
    return error("Invalid theme", 400);
  }

  // Ensure settings exist
  let settings = await prisma.orgSettings.findUnique({
    where: { organizationId: auth.organizationId },
    select: { branding: true },
  });

  if (!settings) {
    await prisma.orgSettings.create({
      data: { organizationId: auth.organizationId },
    });
    settings = { branding: null };
  }

  const currentBranding = (settings.branding as Record<string, unknown>) ?? {};

  const updatedBranding = {
    ...currentBranding,
    ...(theme !== undefined && { theme }),
    ...(logoUrl !== undefined && { logoUrl }),
    ...(primaryColor !== undefined && { primaryColor }),
  };

  await prisma.orgSettings.update({
    where: { organizationId: auth.organizationId },
    data: { branding: updatedBranding },
  });

  return json({ ok: true, branding: updatedBranding });
}
