import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getMyContractorCompany } from
  "@/features/contractors/queries/get-my-contractor-company";

import { getServiceCategories } from
  "@/features/contractors/queries/get-service-categories";

import { ContractorCompanyForm } from
  "@/features/contractors/components/contractor-company-form";

export default async function ContractorCompanyPage() {
  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "contractor") {
    redirect("/dashboard");
  }

  const [company, categories] =
    await Promise.all([
      getMyContractorCompany(),
      getServiceCategories(),
    ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/contractor/dashboard"
            className="text-xl font-bold"
          >
            СтройВыбор
          </Link>

          <Link
            href="/contractor/dashboard"
            className="text-sm font-medium text-slate-600"
          >
            Вернуться в кабинет
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm text-slate-500">
            Профиль подрядчика
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Данные компании
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            Эти сведения будут использоваться
            для проверки и подбора подходящих
            строительных проектов.
          </p>
        </div>

        <ContractorCompanyForm
          categories={categories}
          company={company}
        />
      </div>
    </main>
  );
}