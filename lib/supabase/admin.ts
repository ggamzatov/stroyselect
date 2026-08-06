import "server-only";

import { createClient } from
  "@supabase/supabase-js";

function getSupabaseUrl() {
  const value =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error(
      "Не задан NEXT_PUBLIC_SUPABASE_URL"
    );
  }

  return value;
}

function getSupabaseServiceRoleKey() {
  const value =
    process.env
      .SUPABASE_SERVICE_ROLE_KEY;

  if (!value) {
    throw new Error(
      "Не задан SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return value;
}

export function createAdminClient() {
  return createClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );
}