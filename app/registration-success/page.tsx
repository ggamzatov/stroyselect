import Link from "next/link";

export default function RegistrationSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-slate-950">
          Регистрация выполнена
        </h1>

        <p className="mt-4 text-slate-600">
          Проверьте электронную почту и подтвердите создание
          учетной записи.
        </p>

        <Link
          href="/login"
          className="mt-8 inline-flex rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white"
        >
          Перейти ко входу
        </Link>
      </div>
    </main>
  );
}