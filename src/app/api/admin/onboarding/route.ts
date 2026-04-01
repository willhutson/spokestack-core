import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth";
import { json, error, unauthorized } from "@/lib/api";
import { ModuleType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const {
    orgName,
    modules,
    departments,
    primaryColor,
    logoUrl,
    tagline,
  } = body as {
    orgName?: string;
    modules?: string[];
    departments?: { name: string; lead?: string }[];
    primaryColor?: string;
    logoUrl?: string;
    tagline?: string;
  };

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update organization name if provided
      if (orgName) {
        await tx.organization.update({
          where: { id: auth.organizationId },
          data: { name: orgName },
        });
      }

      // 2. Upsert OrgSettings — timezone, language, onboardingComplete, branding
      await tx.orgSettings.upsert({
        where: { organizationId: auth.organizationId },
        create: {
          organizationId: auth.organizationId,
          timezone: "UTC",
          language: "en",
          onboardingComplete: true,
          branding: { primaryColor, logoUrl, tagline },
        },
        update: {
          onboardingComplete: true,
          branding: { primaryColor, logoUrl, tagline },
        },
      });

      // 3. Create Team records for each department
      if (departments?.length) {
        await tx.team.createMany({
          data: departments.map((d) => ({
            organizationId: auth.organizationId,
            name: d.name,
            description: d.lead ? `Lead: ${d.lead}` : null,
          })),
        });
      }

      // 4. Install OrgModule records for selected modules
      if (modules?.length) {
        const validTypes = Object.values(ModuleType);
        const validModules = modules.filter((m) =>
          validTypes.includes(m as ModuleType),
        );
        if (validModules.length) {
          await tx.orgModule.createMany({
            data: validModules.map((m) => ({
              organizationId: auth.organizationId,
              moduleType: m as ModuleType,
              active: true,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    // 5. Set onboarding_complete cookie so middleware can check without a DB call
    const res = json({ success: true, onboardingComplete: true });
    res.cookies.set("onboarding_complete", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
    return res;
  } catch (e) {
    console.error("Onboarding error:", e);
    return error("Failed to complete onboarding", 500);
  }
}
