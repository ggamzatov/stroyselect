import { redirect } from "next/navigation";

import { ContractorShell } from "@/components/stroy/contractor-shell";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import { getMyNotifications } from "@/features/notifications/queries/get-my-notifications";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";

type Props = {
  children: React.ReactNode;
};

export default async function ContractorLayout({ children }: Props) {
  const [{ profile }, notificationData] = await Promise.all([
    getCurrentProfile(),
    getMyNotifications(),
  ]);

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const profileName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Пользователь";

  return (
    <ContractorShell
      profileName={profileName}
      notificationControl={
        <NotificationCenter
          userId={profile.id}
          notifications={notificationData.notifications}
          unreadCount={notificationData.unreadCount}
        />
      }
      signOutControl={<SignOutButton />}
    >
      {children}
    </ContractorShell>
  );
}
