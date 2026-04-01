import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { json, error } from "@/lib/api";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://dufujpalmzbbwtofpgyv.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_i6oqMxrglFTbVpmzFMtUuA_eehALBQR";

/**
 * POST /api/v1/auth/refresh
 * Refresh an expired access token. Used by the CLI for
 * seamless token rotation.
 */
export async function POST(req: NextRequest) {
  let body: { refreshToken?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body");
  }

  const { refreshToken } = body;

  if (!refreshToken) {
    return error("refreshToken is required");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error: refreshError } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (refreshError || !data.session) {
    return error(
      refreshError?.message || "Token refresh failed. Please login again.",
      401
    );
  }

  return json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at
      ? data.session.expires_at * 1000
      : Date.now() + 3600_000,
  });
}
