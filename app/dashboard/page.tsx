import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export default async function DashboardRedirectPage() {
  const { profile } = await getCurrentProfile();

  if (profile.role === "customer") {
    redirect("/customer/dashboard");
  }

  if (profile.role === "contractor") {
    redirect("/contractor/dashboard");
  }

  if (
    profile.role === "admin" ||
    profile.role === "moderator" ||
    profile.role === "manager"
  ) {
    redirect("/admin/dashboard");
  }

  redirect("/");
}