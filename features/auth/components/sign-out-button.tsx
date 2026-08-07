import {
  LogOut,
} from "lucide-react";

import { signOut } from
  "@/features/auth/actions/sign-out";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900/50 dark:hover:bg-red-950/30 dark:hover:text-red-300 sm:px-4"
      >
        <LogOut className="h-4 w-4" />

        <span className="hidden sm:inline">
          Выйти
        </span>
      </button>
    </form>
  );
}