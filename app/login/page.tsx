import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = {
  title: "Вход",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <Link
          href="/"
          className="mb-8 text-xl font-bold text-slate-950"
        >
          СтройВыбор
        </Link>

        <LoginForm />

        <p className="mt-6 text-sm text-slate-600">
          Нет учетной записи?{" "}
          <Link
            href="/register"
            className="font-semibold text-blue-700 hover:underline"
          >
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </main>
  );
}