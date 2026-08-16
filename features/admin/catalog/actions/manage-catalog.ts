"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";
import { logApplicationError } from "@/lib/observability/application-errors";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
});

const citySchema = z.object({
  name: z.string().trim().min(2).max(120),
  region: z.string().trim().max(160).optional(),
});

async function requireAdmin() {
  const auth = await requireStaffUser();
  if (auth.profile.role !== "admin") {
    throw new Error("Недостаточно прав");
  }
  return auth;
}

export async function addServiceCategory(formData: FormData): Promise<void> {
  const { user } = await requireAdmin();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return;

  try {
    await db.query(
      `INSERT INTO public.service_categories(name, slug, is_active)
       VALUES($1, $2, true)`,
      [parsed.data.name, `custom-${randomUUID().slice(0, 12)}`]
    );
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
    await db.query(
      `INSERT INTO public.contractor_cities(name, region, created_by)
       VALUES($1, $2, $3::uuid)`,
      [parsed.data.name, parsed.data.region ?? null, user.id]
    );
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
  await requireAdmin();
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  if (!Number.isInteger(id) || id <= 0) return;

  await db.query(`UPDATE public.service_categories SET is_active=$1 WHERE id=$2`, [active, id]);
  revalidateCatalog();
}

export async function setContractorCityActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  if (!z.string().uuid().safeParse(id).success) return;

  await db.query(`UPDATE public.contractor_cities SET is_active=$1, updated_at=now() WHERE id=$2::uuid`, [active, id]);
  revalidateCatalog();
}

function revalidateCatalog() {
  revalidatePath("/admin/catalog");
  revalidatePath("/contractor/company");
  revalidatePath("/customer/contractors");
}
