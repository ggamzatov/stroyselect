"use server";

import { redirect } from
  "next/navigation";

import {
  destroyCurrentSession,
} from "@/lib/auth/session";

export async function signOut() {
  await destroyCurrentSession();

  redirect("/login");
}