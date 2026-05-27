import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, isValidSupabaseUrl } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null | undefined;

export const createClient = (): SupabaseClient | null => {
  if (browserClient !== undefined) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  if (!isValidSupabaseUrl(supabaseUrl) || !supabaseAnonKey) {
    browserClient = null;
    return null;
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey!);
  return browserClient;
};
