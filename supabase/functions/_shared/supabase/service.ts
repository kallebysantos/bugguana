import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { Database } from "./types.ts";
import { getConfig } from "./config.ts";

let database: SupabaseClient<Database> | undefined = undefined;
const config = getConfig();

export type GetDatabaseOptions = {
  authorization?: string;
  serviceRole?: boolean;
};

export type GetDatavaseResult = SupabaseClient<Database> | string;
export function getDatabase(
  { authorization, serviceRole }: GetDatabaseOptions,
): GetDatavaseResult {
  if (typeof config === "string") return config;

  const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = config;

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
