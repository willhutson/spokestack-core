"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dufujpalmzbbwtofpgyv.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZnVqcGFsbXpiYnd0b2ZwZ3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5MzQ3MzAsImV4cCI6MjA5MDUxMDczMH0.Bd_7ccCEffRjjEdzGMnFeE4sqaKiYPEtAyK3sXC5wh8";

export function createClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
