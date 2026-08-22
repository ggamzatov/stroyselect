import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { getServiceCategories } from "@/features/contractors/queries/get-service-categories";
import { getMyProject } from "@/features/projects/queries/get-my-project";
import { ProjectForm } from "@/features/projects/components/project-form";

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
    <main className="min-h-screen bg-background">
      <div className="app-container max-w-5xl py-8 md:py-12">
        <Link href={`/customer/projects/${id}`} className="text-sm font-medium text-primary">
          ← Вернуться к проекту
        </Link>

        <div className="mt-5">
          <p className="text-sm font-semibold text-primary">Черновик проекта</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] md:text-4xl">
            Уточнить строительный бриф
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Пройдите шаги брифа и добавьте данные, которые помогут точнее подобрать подрядчиков.
          </p>
        </div>

        <div className="mt-8">
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
