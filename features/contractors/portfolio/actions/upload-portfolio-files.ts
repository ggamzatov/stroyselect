"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { db } from
  "@/lib/db/pool";

import {
  requireActiveUser,
} from "@/lib/auth/require-active-user";

import {
  s3,
} from "@/lib/storage/s3";

const PORTFOLIO_BUCKET =
  "contractor-portfolio";

const MAX_FILE_SIZE =
  20 * 1024 * 1024;

const MAX_FILES = 10;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export type UploadPortfolioFilesResult = {
  success: boolean;
  message: string;
};

export async function uploadPortfolioFiles(
  formData: FormData
): Promise<UploadPortfolioFilesResult> {
  const portfolioProjectId =
    String(
      formData.get(
        "portfolioProjectId"
      ) ?? ""
    );

  const files =
    formData
      .getAll("files")
      .filter(
        (
          value
        ): value is File =>
          value instanceof File &&
          value.size > 0
      );

  if (!portfolioProjectId) {
    return {
      success: false,
      message:
        "Объект портфолио не указан",
    };
  }

  if (files.length === 0) {
    return {
      success: false,
      message:
        "Выберите фотографии",
    };
  }

  if (
    files.length >
    MAX_FILES
  ) {
    return {
      success: false,
      message:
        `За один раз можно загрузить не более ${MAX_FILES} фотографий`,
    };
  }

  for (const file of files) {
    if (
      !ALLOWED_TYPES.includes(
        file.type
      )
    ) {
      return {
        success: false,
        message:
          `Файл «${file.name}» имеет неподдерживаемый формат`,
      };
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return {
        success: false,
        message:
          `Файл «${file.name}» превышает 20 МБ`,
      };
    }
  }

  const auth =
    await requireActiveUser();

  if (!auth.success) {
    return {
      success: false,
      message: auth.message,
    };
  }

  if (
    auth.profile.role !==
    "contractor"
  ) {
    return {
      success: false,
      message:
        "Доступно только подрядчику",
    };
  }

  const projectResult =
    await db.query<{
      project_id: string;
      contractor_id: string;
    }>(
      `
        SELECT
          cpp.id AS project_id,
          cc.id AS contractor_id
        FROM
          public.contractor_portfolio_projects cpp
        JOIN
          public.contractor_companies cc
            ON cc.id =
              cpp.contractor_id
        WHERE
          cpp.id = $1
          AND cc.owner_id = $2
        LIMIT 1
      `,
      [
        portfolioProjectId,
        auth.user.id,
      ]
    );

  const project =
    projectResult.rows[0];

  if (!project) {
    return {
      success: false,
      message:
        "Объект портфолио не найден",
    };
  }

  const orderResult =
    await db.query<{
      max_sort_order:
        number | null;
    }>(
      `
        SELECT
          MAX(sort_order)
            AS max_sort_order
        FROM
          public.contractor_portfolio_files
        WHERE
          portfolio_project_id = $1
      `,
      [
        portfolioProjectId,
      ]
    );

  let nextSortOrder =
    Number(
      orderResult.rows[0]
        ?.max_sort_order
    );

  if (
    !Number.isFinite(
      nextSortOrder
    )
  ) {
    nextSortOrder = -1;
  }

  nextSortOrder += 1;

  for (const file of files) {
    const extension =
      getFileExtension(
        file.name,
        file.type
      );

    const objectName =
      `${crypto.randomUUID()}.${extension}`;

    const storagePath =
      `${project.contractor_id}/${portfolioProjectId}/${objectName}`;

    const bytes =
      Buffer.from(
        await file.arrayBuffer()
      );

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket:
            PORTFOLIO_BUCKET,

          Key:
            storagePath,

          Body:
            bytes,

          ContentType:
            file.type,
        })
      );
    } catch (error) {
      console.error(
        "Ошибка загрузки фотографии в MinIO:",
        error
      );

      return {
        success: false,
        message:
          `Не удалось загрузить «${file.name}»`,
      };
    }

    try {
      await db.query(
        `
          INSERT INTO
            public.contractor_portfolio_files (
              portfolio_project_id,
              uploaded_by,
              storage_bucket,
              storage_path,
              file_name,
              file_size,
              mime_type,
              sort_order
            )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )
        `,
        [
          portfolioProjectId,
          auth.user.id,
          PORTFOLIO_BUCKET,
          storagePath,
          file.name,
          file.size,
          file.type,
          nextSortOrder,
        ]
      );
    } catch (error) {
      console.error(
        "Ошибка сохранения метаданных фотографии:",
        error
      );

      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket:
              PORTFOLIO_BUCKET,

            Key:
              storagePath,
          })
        );
      } catch (
        cleanupError
      ) {
        console.error(
          "Не удалось удалить MinIO объект после ошибки metadata:",
          cleanupError
        );
      }

      return {
        success: false,
        message:
          `Не удалось сохранить «${file.name}»`,
      };
    }

    nextSortOrder += 1;
  }

  revalidatePath(
    "/contractor/company"
  );

  return {
    success: true,
    message:
      files.length === 1
        ? "Фотография добавлена"
        : `Загружено фотографий: ${files.length}`,
  };
}

function getFileExtension(
  name: string,
  mimeType: string
) {
  const fromName =
    name
      .split(".")
      .pop()
      ?.toLowerCase();

  if (
    fromName &&
    [
      "jpg",
      "jpeg",
      "png",
      "webp",
    ].includes(
      fromName
    )
  ) {
    return fromName;
  }

  switch (mimeType) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "jpg";
  }
}