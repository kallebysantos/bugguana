// These are automatically injected
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

export function getConfig() {
  if (
    !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey
  ) {
    return MissingConfigError;
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
  };
}

export const MissingConfigError = "Missing 'SUPABASE_*' environment config";
