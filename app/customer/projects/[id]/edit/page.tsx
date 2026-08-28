import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  PencilLine,
  ShieldCheck,
} from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getServiceCategories } from "@/features/contractors/queries/get-service-categories";
import { getMyProject } from "@/features/projects/queries/get-my-project";
import { ProjectForm } from "@/features/projects/components/project-form";
import styles from "@/features/projects/components/project-intake-layout.module.css";

type Props = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Props) {
  const { id } = await params;
  const { profile } = await getCurrentProfile();
  if (profile.role !== "customer") redirect("/dashboard");

  const [project, categories] = await Promise.all([
    getMyProject(id),
    getServiceCategories(),
  ]);

  if (project.status !== "draft") redirect(`/customer/projects/${id}`);

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10 xl:py-8">
      <div className="mx-auto max-w-[1320px]">
        <Link
          href={`/customer/projects/${id}`}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Вернуться к проекту
        </Link>

        <section className="ui-v2-panel relative mt-3 overflow-hidden p-5 sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_68%_38%,rgba(170,216,190,0.48),transparent_60%)] lg:block" />
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/70 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-primary">
                <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                Черновик проекта
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-foreground sm:text-4xl lg:text-[2.9rem] lg:leading-[1.06]">
                Уточните детали проекта
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Набор вопросов автоматически зависит от выбранной услуги. Изменения сохраняются в этом же черновике и не создают новый проект.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <InfoChip icon={<CheckCircle2 className="h-4 w-4" />} text="Один черновик" />
                <InfoChip icon={<ShieldCheck className="h-4 w-4" />} text="Данные можно проверить" />
                <InfoChip icon={<Clock3 className="h-4 w-4" />} text="Сохранение между шагами" />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/88 p-4 shadow-[var(--shadow-soft)] backdrop-blur-sm sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                  <PencilLine className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">Редактируется существующий проект</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    После сохранения вы вернётесь к карточке проекта, где сможете проверить данные и продолжить работу с заявкой.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.shell}>
          <ProjectForm
            categories={categories}
            project={{
              id: project.id,
              category_id: project.category_id,
              title: project.title,
              description: project.description,
              property_type: project.property_type ?? "private_house",
              work_type: project.work_type,
              scope_details: project.scope_details,
              current_condition: project.current_condition,
              finish_level: project.finish_level,
              dimensions: project.dimensions,
              material_preferences: project.material_preferences,
              permit_readiness: project.permit_readiness,
              design_readiness: project.design_readiness,
              travel_constraints: project.travel_constraints,
              region: project.region,
              city: project.city,
              address: project.address,
              budget_min: project.budget_min,
              budget_max: project.budget_max,
              desired_start_date: project.desired_start_date,
              desired_end_date: project.desired_end_date,
            }}
          />
        </div>
      </div>
    </main>
  );
}

function InfoChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card/80 px-3 text-xs font-semibold text-foreground shadow-sm">
      <span className="text-primary" aria-hidden="true">{icon}</span>
      {text}
    </span>
  );
}
