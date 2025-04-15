import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { Database } from "./types.ts";

// These are automatically injected
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

let database: SupabaseClient<Database> | undefined = undefined;

export type GetDatabaseOptions = {
  authorization?: string;
  serviceRole?: boolean;
};

export type GetDatavaseResult = SupabaseClient<Database> | string;
export function getDatabase(
  { authorization, serviceRole }: GetDatabaseOptions,
): GetDatavaseResult {
  if (
    !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey
  ) {
    return MissingConfigError;
  }

  const headers = authorization && ({
    global: {
      headers: {
        authorization: authorization.includes("Bearer")
          ? authorization
          : `Bearer ${authorization}`,
      },
    },
  });

  const key = serviceRole ? supabaseServiceKey : supabaseAnonKey;

  if (!database) {
    database = createClient<Database>(supabaseUrl, key, {
      ...headers,
      auth: {
        persistSession: false,
      },
    });
  }

  return database;
}

export const MissingConfigError = "Missing 'SUPABASE_*' environment config";
