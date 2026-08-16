"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db/pool";
import { requireStaffUser } from "@/lib/auth/require-staff-user";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Укажите название специальности").max(120),
});

const citySchema = z.object({
  name: z.string().trim().min(2, "Укажите город").max(120),
  region: z.string().trim().max(160).optional(),
});

async function requireAdmin() {
  const auth = await requireStaffUser();
  if (auth.profile.role !== "admin") {
    throw new Error("Недостаточно прав");
  }
  return auth;
}

export async function addServiceCategory(formData: FormData) {
  const { user } = await requireAdmin();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные" };

  const name = parsed.data.name;
  const slug = `custom-${randomUUID().slice(0, 12)}`;

  try {
    await db.query(
      `INSERT INTO public.service_categories(name, slug, is_active)
       VALUES($1, $2, true)`,
      [name, slug]
    );
  } catch (error) {
    const pg = error as { code?: string };
    if (pg.code === "23505") return { success: false, message: "Такая специальность уже существует" };
    console.error("Ошибка добавления специальности:", { userId: user.id, error });
    return { success: false, message: "Не удалось добавить специальность" };
  }

  revalidateCatalog();
  return { success: true, message: "Специальность добавлена" };
}

export async function addContractorCity(formData: FormData) {
  const { user } = await requireAdmin();
  const parsed = citySchema.safeParse({
    name: formData.get("name"),
    region: String(formData.get("region") ?? "").trim() || undefined,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Проверьте данные" };

  try {
    await db.query(
      `INSERT INTO public.contractor_cities(name, region, created_by)
       VALUES($1, $2, $3::uuid)`,
      [parsed.data.name, parsed.data.region ?? null, user.id]
    );
  } catch (error) {
    const pg = error as { code?: string };
    if (pg.code === "23505") return { success: false, message: "Такой город уже есть в справочнике" };
    console.error("Ошибка добавления города:", { userId: user.id, error });
    return { success: false, message: "Не удалось добавить город" };
  }

  revalidateCatalog();
  return { success: true, message: "Город добавлен" };
}

export async function setServiceCategoryActive(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  if (!Number.isInteger(id) || id <= 0) return { success: false, message: "Некорректная специальность" };

  await db.query(`UPDATE public.service_categories SET is_active=$1 WHERE id=$2`, [active, id]);
  revalidateCatalog();
  return { success: true, message: active ? "Специальность включена" : "Специальность скрыта" };
}

export async function setContractorCityActive(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  if (!z.string().uuid().safeParse(id).success) return { success: false, message: "Некорректный город" };

  await db.query(`UPDATE public.contractor_cities SET is_active=$1, updated_at=now() WHERE id=$2::uuid`, [active, id]);
  revalidateCatalog();
  return { success: true, message: active ? "Город включён" : "Город скрыт" };
}

function revalidateCatalog() {
  revalidatePath("/admin/catalog");
  revalidatePath("/contractor/company");
  revalidatePath("/customer/contractors");
}
