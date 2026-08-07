import { redirect } from "next/navigation";

import {
  Hammer,
} from "lucide-react";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getServiceCategories } from
  "@/features/contractors/queries/get-service-categories";

import { ProjectForm } from
  "@/features/projects/components/project-form";

export default async function NewProjectPage() {
  const { profile } =
    await getCurrentProfile();

  if (
    profile.role !== "customer"
  ) {
    redirect("/dashboard");
  }

  const categories =
    await getServiceCategories();

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container max-w-5xl py-8 md:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />

          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_25px_rgba(107,70,50,0.20)]">
              <Hammer className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-primary">
                Новый проект
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-foreground md:text-4xl">
                Разместить строительную заявку
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Расскажите о будущем объекте,
                бюджете и желаемых сроках.
                Проект сначала сохранится как
                черновик — вы сможете проверить
                его перед публикацией.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <ProjectForm
            categories={
              categories
            }
          />
        </div>
      </div>
    </main>
  );
}