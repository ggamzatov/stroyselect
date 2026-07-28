import { logoutUser } from "@/features/auth/actions/logout";

export function LogoutButton() {
  return (
    <form action={logoutUser}>
      <button
        type="submit"
        className="text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        Выйти
      </button>
    </form>
  );
}