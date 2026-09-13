import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, ShieldCheck, Sparkles } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getServiceCategories } from "@/features/contractors/queries/get-service-categories";
import { ProjectForm } from "@/features/projects/components/project-form";
import styles from "@/features/projects/components/project-intake-layout.module.css";

export default async function NewProjectPage() {
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");
  const categories = await getServiceCategories();

  return (
    <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1120px]">
        <Link href="/customer/dashboard" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> На главную
        </Link>

        <header className="mt-5 max-w-3xl sm:mt-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Новая задача
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Что нужно сделать?</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Сначала расскажите о задаче. Затем мы уточним только те детали, которые нужны для точного подбора подрядчика.
          </p>
        </header>

        <div className="mt-5 flex flex-wrap gap-2 sm:mt-6" aria-label="Преимущества">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />Проверенные специалисты</span>
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold"><Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />Черновик сохраняется автоматически</span>
        </div>

        <div className={styles.shell}>
          <ProjectForm categories={categories} />
        </div>
      </div>
    </main>
  );
}
