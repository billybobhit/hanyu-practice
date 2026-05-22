export function getSupabaseEnv() {
  const supabaseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = cleanEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return { supabaseUrl, supabaseAnonKey };
}

export function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanEnvValue(value: string | undefined) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}
