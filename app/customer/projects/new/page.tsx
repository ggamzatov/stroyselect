import { redirect } from "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getServiceCategories } from
  "@/features/contractors/queries/get-service-categories";

import { ProjectForm } from
  "@/features/projects/components/project-form";

export default async function NewProjectPage() {
  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const categories =
    await getServiceCategories();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-slate-500">
          Новый проект
        </p>

        <h1 className="mt-1 text-3xl font-bold">
          Разместить строительную заявку
        </h1>

        <p className="mt-3 text-slate-600">
          Опишите задачу, бюджет и сроки.
          Сначала проект сохранится как черновик.
        </p>

        <div className="mt-8">
          <ProjectForm
            categories={categories}
          />
        </div>
      </div>
    </main>
  );
}