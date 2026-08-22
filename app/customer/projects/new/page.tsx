import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getServiceCategories } from "@/features/contractors/queries/get-service-categories";
import { ProjectForm } from "@/features/projects/components/project-form";
import styles from "@/features/projects/components/project-intake-layout.module.css";

export default async function NewProjectPage() {
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");

  const categories = await getServiceCategories();

  return (
    <main className="min-h-screen bg-background">
      <div className="app-container max-w-7xl py-8 md:py-12">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Новый проект</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-foreground md:text-[2.65rem] md:leading-[1.08]">
            Создание проекта
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
            Ответьте только на вопросы, которые относятся к выбранной услуге. Мы используем эти данные,
            чтобы подобрать подходящих исполнителей и получить более точные предложения.
          </p>
        </header>

        <div className={styles.shell}>
          <ProjectForm categories={categories} />
        </div>
      </div>
    </main>
  );
}
