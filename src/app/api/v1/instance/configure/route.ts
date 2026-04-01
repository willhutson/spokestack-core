import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";

/**
 * PUT /api/v1/instance/configure
 * Configures the org's deployed instance: domain, channels, branding.
 * If a custom domain is provided, calls Vercel API to add it to the project.
 */
export async function PUT(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { domain, channels, branding } = body as {
    domain?: string;
    channels?: { whatsapp?: boolean; voice?: boolean; webWidget?: boolean };
    branding?: { logoUrl?: string; primaryColor?: string; orgName?: string };
  };

  // Upsert OrgSettings
  const settings = await prisma.orgSettings.upsert({
    where: { organizationId: auth.organizationId },
    update: {
      ...(domain !== undefined ? { customDomain: domain } : {}),
      ...(channels !== undefined ? { channels } : {}),
      ...(branding !== undefined ? { branding } : {}),
    },
    create: {
      organizationId: auth.organizationId,
      ...(domain ? { customDomain: domain } : {}),
      ...(channels ? { channels } : {}),
      ...(branding ? { branding } : {}),
    },
  });

  // If custom domain provided, call Vercel API to add it
  let domainStatus: "pending" | "active" | "error" | undefined;
  if (domain) {
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;

    if (vercelToken && vercelProjectId) {
      try {
        const res = await fetch(
          `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: domain }),
          }
        );

        if (res.ok) {
          domainStatus = "pending";
        } else {
          const data = await res.json();
          console.error("Vercel domain API error:", data);
          domainStatus = "error";
        }
      } catch (err) {
        console.error("Vercel domain API call failed:", err);
        domainStatus = "error";
      }
    } else {
      domainStatus = "pending"; // No Vercel credentials — skip API call
    }
  }

  return json({
    success: true,
    ...(domainStatus !== undefined ? { domainStatus } : {}),
    settings: {
      id: settings.id,
      organizationId: settings.organizationId,
      timezone: settings.timezone,
      language: settings.language,
      customDomain: settings.customDomain,
      channels: settings.channels,
      branding: settings.branding,
      onboardingComplete: settings.onboardingComplete,
    },
  });
}
