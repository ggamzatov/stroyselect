"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";
import { logApplicationError } from "@/lib/observability/application-errors";
import { writeAdminAudit } from "@/lib/observability/admin-audit";

const categorySchema = z.object({ name: z.string().trim().min(2).max(120) });
const citySchema = z.object({
  name: z.string().trim().min(2).max(120),
  region: z.string().trim().max(160).optional(),
});

async function requireAdmin() {
  const auth = await requireStaffUser();
  if (auth.profile.role !== "admin") throw new Error("Недостаточно прав");
  return auth;
}

export async function addServiceCategory(formData: FormData): Promise<void> {
  const { user } = await requireAdmin();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;

  try {
    const result = await db.query<{ id: number | string }>(
      `INSERT INTO public.service_categories(name, slug, is_active)
       VALUES($1, $2, true)
       RETURNING id`,
      [parsed.data.name, `custom-${randomUUID().slice(0, 12)}`]
    );
    await writeAdminAudit({
      actorId: user.id,
      action: "service_category_created",
      entityType: "service_category",
      entityId: String(result.rows[0]?.id ?? ""),
      metadata: { name: parsed.data.name },
    });
  } catch (error) {
    const pg = error as { code?: string };
    if (pg.code !== "23505") {
      console.error("Ошибка добавления специальности:", error);
      await logApplicationError({
        userId: user.id,
        source: "action",
        message: error instanceof Error ? error.message : "Ошибка добавления специальности",
        stack: error instanceof Error ? error.stack ?? null : null,
        route: "/admin/catalog",
        metadata: { action: "addServiceCategory" },
      });
    }
    return;
  }

  revalidateCatalog();
}

export async function addContractorCity(formData: FormData): Promise<void> {
  const { user } = await requireAdmin();
  const parsed = citySchema.safeParse({
    name: formData.get("name"),
    region: String(formData.get("region") ?? "").trim() || undefined,
  });
  if (!parsed.success) return;

  try {
    const result = await db.query<{ id: string }>(
      `INSERT INTO public.contractor_cities(name, region, created_by)
       VALUES($1, $2, $3::uuid)
       RETURNING id`,
      [parsed.data.name, parsed.data.region ?? null, user.id]
    );
    await writeAdminAudit({
      actorId: user.id,
      action: "contractor_city_created",
      entityType: "contractor_city",
      entityId: result.rows[0]?.id ?? null,
      metadata: { name: parsed.data.name, region: parsed.data.region ?? null },
    });
  } catch (error) {
    const pg = error as { code?: string };
    if (pg.code !== "23505") {
      console.error("Ошибка добавления города:", error);
      await logApplicationError({
        userId: user.id,
        source: "action",
        message: error instanceof Error ? error.message : "Ошибка добавления города",
        stack: error instanceof Error ? error.stack ?? null : null,
        route: "/admin/catalog",
        metadata: { action: "addContractorCity" },
      });
    }
    return;
  }

  revalidateCatalog();
}

export async function setServiceCategoryActive(formData: FormData): Promise<void> {
  const { user } = await requireAdmin();
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  if (!Number.isInteger(id) || id <= 0) return;

  const result = await db.query(
    `UPDATE public.service_categories SET is_active=$1 WHERE id=$2 RETURNING id`,
    [active, id]
  );
  if (result.rowCount) {
    await writeAdminAudit({
      actorId: user.id,
      action: active ? "service_category_enabled" : "service_category_disabled",
      entityType: "service_category",
      entityId: String(id),
    });
  }
  revalidateCatalog();
}

export async function setContractorCityActive(formData: FormData): Promise<void> {
  const { user } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  if (!z.string().uuid().safeParse(id).success) return;

  const result = await db.query(
    `UPDATE public.contractor_cities SET is_active=$1, updated_at=now() WHERE id=$2::uuid RETURNING id`,
    [active, id]
  );
  if (result.rowCount) {
    await writeAdminAudit({
      actorId: user.id,
      action: active ? "contractor_city_enabled" : "contractor_city_disabled",
      entityType: "contractor_city",
      entityId: id,
    });
  }
  revalidateCatalog();
}

function revalidateCatalog() {
  revalidatePath("/admin/catalog");
  revalidatePath("/contractor/company");
  revalidatePath("/customer/contractors");
}
