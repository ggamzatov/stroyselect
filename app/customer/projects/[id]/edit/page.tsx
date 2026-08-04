import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from
  "@/lib/auth/get-current-profile";

import { getServiceCategories } from
  "@/features/contractors/queries/get-service-categories";

import { getMyProject } from
  "@/features/projects/queries/get-my-project";
  
import { ProjectForm } from
  "@/features/projects/components/project-form";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProjectPage({
  params,
}: Props) {
  const { id } = await params;

  const { profile } =
    await getCurrentProfile();

  if (profile.role !== "customer") {
    redirect("/dashboard");
  }

  const [project, categories] =
    await Promise.all([
      getMyProject(id),
      getServiceCategories(),
    ]);

  if (project.status !== "draft") {
    redirect(`/customer/projects/${id}`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href={`/customer/projects/${id}`}
          className="text-sm font-medium text-blue-700"
        >
          ← Вернуться к проекту
        </Link>

        <h1 className="mt-5 text-3xl font-bold">
          Редактирование проекта
        </h1>

        <p className="mt-3 text-slate-600">
          После публикации обычное редактирование
          будет заблокировано.
        </p>

        <div className="mt-8">
          <ProjectForm
            categories={categories}
            project={{
              id: project.id,
              category_id: project.category_id,
              title: project.title,
              description: project.description,
              property_type:
                project.property_type ??
                "private_house",
              region: project.region,
              city: project.city,
              address: project.address,
              budget_min:
                project.budget_min === null
                  ? null
                  : Number(project.budget_min),
              budget_max:
                project.budget_max === null
                  ? null
                  : Number(project.budget_max),
              desired_start_date:
                project.desired_start_date,
              desired_end_date:
                project.desired_end_date,
            }}
          />
        </div>
      </div>
    </main>
  );
}