import "server-only";

import { cookies } from "next/headers";

export type CurrentUser = {
  id: string;
};

const USER_COOKIE =
  "stroyselect_user_id";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore =
    await cookies();

  const userId =
    cookieStore.get(
      USER_COOKIE
    )?.value;

  if (!userId) {
    return null;
  }

  return {
    id:
      userId,
  };
}