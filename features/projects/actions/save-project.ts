"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { projectSchema, type ProjectInput } from "@/features/projects/schemas/project-schema";

export type SaveProjectResult = { success: boolean; message: string; projectId?: string };
type ExistingProjectRow = { id: string; status: string };

const nullable = (value: string | undefined) => value || null;

export async function saveProject(input: ProjectInput, projectId?: string): Promise<SaveProjectResult> {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте заполнение формы" };

  const auth = await requireActiveUser();
  if (!auth.success) {
    if (auth.reason === "unauthorized") redirect("/login");
    return { success: false, message: auth.message };
  }
  if (auth.profile.role !== "customer") return { success: false, message: "Создавать проекты может только заказчик" };

  const values = parsed.data;
  const brief = [
    nullable(values.workType), nullable(values.scopeDetails), nullable(values.currentCondition),
    nullable(values.finishLevel), nullable(values.dimensions), nullable(values.materialPreferences),
    nullable(values.permitReadiness), nullable(values.designReadiness), nullable(values.travelConstraints),
  ];

  try {
    if (projectId) {
      const existingResult = await db.query<ExistingProjectRow>(
        `SELECT id, status FROM public.projects WHERE id = $1 AND customer_id = $2 LIMIT 1`,
        [projectId, auth.user.id]
      );
      const existingProject = existingResult.rows[0];
      if (!existingProject) return { success: false, message: "Проект не найден" };
      if (existingProject.status !== "draft") return { success: false, message: "Редактировать можно только черновик" };

      const result = await db.query<{ id: string }>(`
        UPDATE public.projects SET
          category_id=$1, title=$2, description=$3, property_type=$4,
          work_type=$5, scope_details=$6, current_condition=$7, finish_level=$8,
          dimensions=$9, material_preferences=$10, permit_readiness=$11,
          design_readiness=$12, travel_constraints=$13,
          region=$14, city=$15, address=$16, budget_min=$17, budget_max=$18,
          desired_start_date=$19, desired_end_date=$20, updated_at=now()
        WHERE id=$21 AND customer_id=$22 AND status='draft'
        RETURNING id`,
        [values.categoryId, values.title, values.description, values.propertyType, ...brief,
          values.region, values.city, nullable(values.address), values.budgetMin ?? null,
          values.budgetMax ?? null, nullable(values.desiredStartDate), nullable(values.desiredEndDate),
          projectId, auth.user.id]
      );
      if (!result.rows[0]) return { success: false, message: "Не удалось обновить проект" };

      revalidatePath("/customer/projects");
      revalidatePath(`/customer/projects/${projectId}/edit`);
      revalidatePath(`/customer/projects/${projectId}`);
      revalidatePath("/customer/dashboard");
      return { success: true, message: "Черновик обновлён", projectId };
    }

    const result = await db.query<{ id: string }>(`
      INSERT INTO public.projects (
        customer_id, category_id, title, description, property_type,
        work_type, scope_details, current_condition, finish_level, dimensions,
        material_preferences, permit_readiness, design_readiness, travel_constraints,
        region, city, address, budget_min, budget_max, desired_start_date, desired_end_date, status
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,'draft'
      ) RETURNING id`,
      [auth.user.id, values.categoryId, values.title, values.description, values.propertyType, ...brief,
        values.region, values.city, nullable(values.address), values.budgetMin ?? null,
        values.budgetMax ?? null, nullable(values.desiredStartDate), nullable(values.desiredEndDate)]
    );
    const project = result.rows[0];
    if (!project) return { success: false, message: "Не удалось создать проект" };

    revalidatePath("/customer/projects");
    revalidatePath("/customer/dashboard");
    return { success: true, message: "Черновик проекта создан", projectId: project.id };
  } catch (error) {
    console.error("Ошибка сохранения проекта:", error);
    return { success: false, message: projectId ? "Не удалось обновить проект" : "Не удалось создать проект" };
  }
}
