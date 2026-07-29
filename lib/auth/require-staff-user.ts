import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const STAFF_ROLES = [
  "admin",
  "moderator",
  "manager",
] as const;

export async function requireStaffUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name,
        role,
        is_blocked
      `)
      .eq("id", user.id)
      .single();

  if (
    profileError ||
    !profile ||
    profile.is_blocked ||
    !STAFF_ROLES.includes(
      profile.role as (typeof STAFF_ROLES)[number]
    )
  ) {
    redirect("/dashboard");
  }

  return {
    user,
    profile,
  };
}