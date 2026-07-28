import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Регистрация",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto flex max-w-xl flex-col items-center">
        <Link
          href="/"
          className="mb-8 text-xl font-bold text-slate-950"
        >
          СтройВыбор
        </Link>

        <RegisterForm />

        <p className="mt-6 text-sm text-slate-600">
          Уже зарегистрированы?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-700 hover:underline"
          >
            Войти
          </Link>
        </p>
      </div>
    </main>
  );
}