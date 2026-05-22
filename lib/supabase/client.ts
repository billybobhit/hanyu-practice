import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, isValidSupabaseUrl } from "@/lib/supabase/env";

export const createClient = (): SupabaseClient | null => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  if (!isValidSupabaseUrl(supabaseUrl) || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey!);
};
