import { redirect } from
  "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { DashboardHeader } from
  "@/features/layout/components/dashboard-header";

type Props = {
  children:
    React.ReactNode;
};

export default async function ContractorLayout({
  children,
}: Props) {
  const {
    profile,
  } =
    await getCurrentProfile();

  if (
    profile.role !==
    "contractor"
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      {children}
    </div>
  );
}