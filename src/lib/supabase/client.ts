"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is required. Run: spokestack setup");
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Run: spokestack setup");
  return key;
}

export function createClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseAnonKey());
}
