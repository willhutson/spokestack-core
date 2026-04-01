import { createClient } from "@/lib/supabase/client";

/**
 * Get auth headers for client-side API calls.
 * Returns { Authorization: "Bearer <token>" } or empty object.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}
