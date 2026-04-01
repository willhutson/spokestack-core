import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { json, error } from "@/lib/api";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://dufujpalmzbbwtofpgyv.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_i6oqMxrglFTbVpmzFMtUuA_eehALBQR";

/**
 * POST /api/v1/auth/login
 * Authenticate with email + password. Returns access/refresh tokens
 * and user data including org memberships. Used by the CLI.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { email, password } = body;

  if (!email || !password) {
    return error("email and password are required");
  }

  // Authenticate with Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (authError || !authData.session) {
    return error(authError?.message || "Invalid credentials", 401);
  }

  const session = authData.session;

  // Look up the SpokeStack user with org memberships
  const user = await prisma.user.findUnique({
    where: { supabaseId: authData.user.id },
    include: {
      memberships: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!user) {
    return error("User account not found. Sign up at spokestack-core.vercel.app first.", 404);
  }

  return json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      memberships: user.memberships.map((m) => ({
        organization: {
          id: m.organization.id,
          slug: m.organization.slug,
          name: m.organization.name,
        },
        role: m.role,
      })),
    },
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at
      ? session.expires_at * 1000 // Convert to milliseconds
      : Date.now() + 3600_000,
  });
}
