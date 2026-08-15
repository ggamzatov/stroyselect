"use server";

import { revalidatePath } from "next/cache";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

import { db } from "@/lib/db/pool";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { s3 } from "@/lib/storage/s3";

export type DeletePortfolioFileResult = {
  success: boolean;
  message: string;
};

type PortfolioFileRow = {
  id: string;
  portfolio_project_id: string;
  storage_bucket: string;
  storage_path: string;
};

export async function deletePortfolioFile(
  fileId: string
): Promise<DeletePortfolioFileResult> {
  const auth = await requireActiveUser();

  if (!auth.success) {
    return { success: false, message: auth.message };
  }

  if (auth.profile.role !== "contractor") {
    return { success: false, message: "Доступно только подрядчику" };
  }

  if (!fileId) {
    return { success: false, message: "Фотография не указана" };
  }

  let file: PortfolioFileRow | undefined;

  try {
    const result = await db.query<PortfolioFileRow>(
      `
        SELECT
          cpf.id,
          cpf.portfolio_project_id,
          cpf.storage_bucket,
          cpf.storage_path
        FROM public.contractor_portfolio_files cpf
        JOIN public.contractor_portfolio_projects cpp
          ON cpp.id = cpf.portfolio_project_id
        JOIN public.contractor_companies cc
          ON cc.id = cpp.contractor_id
        WHERE cpf.id = $1
          AND cc.owner_id = $2
        LIMIT 1
      `,
      [fileId, auth.user.id]
    );

    file = result.rows[0];
  } catch (error) {
    console.error("Ошибка поиска фотографии портфолио:", error);
    return { success: false, message: "Не удалось получить фотографию" };
  }

  if (!file) {
    return {
      success: false,
      message: "Фотография не найдена или у вас нет доступа",
    };
  }

  /*
   * Удаляем метаданные первой операцией. Если S3 временно недоступен,
   * останется только сиротский объект, а не битая ссылка в приложении.
   */
  try {
    const result = await db.query<{ id: string }>(
      `
        DELETE FROM public.contractor_portfolio_files cpf
        USING public.contractor_portfolio_projects cpp,
              public.contractor_companies cc
        WHERE cpf.id = $1
          AND cpp.id = cpf.portfolio_project_id
          AND cc.id = cpp.contractor_id
          AND cc.owner_id = $2
        RETURNING cpf.id
      `,
      [file.id, auth.user.id]
    );

    if (!result.rows[0]) {
      return {
        success: false,
        message: "Фотография уже удалена или у вас нет доступа",
      };
    }
  } catch (error) {
    console.error("Ошибка удаления записи фотографии:", error);
    return { success: false, message: "Не удалось удалить фотографию" };
  }

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: file.storage_bucket,
        Key: file.storage_path,
      })
    );
  } catch (error) {
    console.error("Запись фотографии удалена, но объект S3 удалить не удалось:", {
      fileId: file.id,
      bucket: file.storage_bucket,
      storagePath: file.storage_path,
      error,
    });
  }

  revalidatePath("/contractor/company");
  revalidatePath("/contractor/dashboard");

  return { success: true, message: "Фотография удалена" };
}
