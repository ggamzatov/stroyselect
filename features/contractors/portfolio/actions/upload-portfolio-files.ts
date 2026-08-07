"use server";

import { revalidatePath } from "next/cache";

import { createClient } from
  "@/lib/supabase/server";

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

  const rawFiles =
    formData.getAll("files");

  const files =
    rawFiles.filter(
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

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      success: false,
      message:
        "Необходимо войти",
    };
  }

  const {
    data: company,
    error:
      companyError,
  } =
    await supabase
      .from(
        "contractor_companies"
      )
      .select("id")
      .eq(
        "owner_id",
        user.id
      )
      .maybeSingle();

  if (
    companyError ||
    !company
  ) {
    return {
      success: false,
      message:
        "Компания подрядчика не найдена",
    };
  }

  const {
    data:
      portfolioProject,
    error:
      portfolioError,
  } =
    await supabase
      .from(
        "contractor_portfolio_projects"
      )
      .select(
        "id, contractor_id"
      )
      .eq(
        "id",
        portfolioProjectId
      )
      .eq(
        "contractor_id",
        company.id
      )
      .maybeSingle();

  if (
    portfolioError ||
    !portfolioProject
  ) {
    return {
      success: false,
      message:
        "Объект портфолио не найден",
    };
  }

  const {
    data: existingFiles,
    error:
      existingFilesError,
  } =
    await supabase
      .from(
        "contractor_portfolio_files"
      )
      .select(
        "sort_order"
      )
      .eq(
        "portfolio_project_id",
        portfolioProjectId
      )
      .order(
        "sort_order",
        {
          ascending:
            false,
        }
      );

  if (
    existingFilesError
  ) {
    console.error(
      "Ошибка загрузки существующих фотографий:",
      existingFilesError
    );

    return {
      success: false,
      message:
        "Не удалось подготовить загрузку",
    };
  }

  let nextSortOrder =
    existingFiles?.[0]
      ?.sort_order !==
      undefined
      ? Number(
          existingFiles[0]
            .sort_order
        ) + 1
      : 0;

  for (const file of files) {
    const extension =
      getFileExtension(
        file.name,
        file.type
      );

    const fileName =
      `${crypto.randomUUID()}.${extension}`;

    const storagePath =
      `${company.id}/${portfolioProjectId}/${fileName}`;

    const {
      error:
        uploadError,
    } =
      await supabase.storage
        .from(
          PORTFOLIO_BUCKET
        )
        .upload(
          storagePath,
          file,
          {
            contentType:
              file.type,
            upsert: false,
          }
        );

    if (uploadError) {
      console.error(
        "Ошибка загрузки фотографии портфолио:",
        uploadError
      );

      return {
        success: false,
        message:
          `Не удалось загрузить «${file.name}»`,
      };
    }

    const {
      error:
        metadataError,
    } =
      await supabase
        .from(
          "contractor_portfolio_files"
        )
        .insert({
          portfolio_project_id:
            portfolioProjectId,

          uploaded_by:
            user.id,

          storage_bucket:
            PORTFOLIO_BUCKET,

          storage_path:
            storagePath,

          file_name:
            file.name,

          file_size:
            file.size,

          mime_type:
            file.type,

          sort_order:
            nextSortOrder,
        });

    if (
      metadataError
    ) {
      console.error(
        "Ошибка сохранения метаданных фотографии:",
        metadataError
      );

      await supabase.storage
        .from(
          PORTFOLIO_BUCKET
        )
        .remove([
          storagePath,
        ]);

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