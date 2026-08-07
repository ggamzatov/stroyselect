export function getCategoryLabel(
  value: string
) {
  const labels: Record<
    string,
    string
  > = {
    before_photo:
      "Фото до начала",

    progress_photo:
      "Фото процесса",

    after_photo:
      "Фото результата",

    document:
      "Документ или акт",

    invoice:
      "Чек или счёт",

    other:
      "Другое",
  };

  return (
    labels[value] ??
    value
  );
}

export function getFileTypeLabel(
  mimeType: string
) {
  if (
    mimeType ===
    "application/pdf"
  ) {
    return "PDF-документ";
  }

  if (
    mimeType.includes(
      "word"
    ) ||
    mimeType.includes(
      "wordprocessingml"
    )
  ) {
    return "Документ Word";
  }

  if (
    mimeType.includes(
      "excel"
    ) ||
    mimeType.includes(
      "spreadsheet"
    )
  ) {
    return "Таблица Excel";
  }

  if (
    mimeType.startsWith(
      "image/"
    )
  ) {
    return "Фотография";
  }

  return "Документ";
}

export function formatFileSize(
  value:
    | number
    | string
) {
  const bytes =
    Number(value);

  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes < 0
  ) {
    return "Размер неизвестен";
  }

  if (bytes < 1024) {
    return `${bytes} Б`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} КБ`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} МБ`;
}

export function formatFileDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ru-RU",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}

export function isImageFile(
  mimeType: string
) {
  return mimeType.startsWith(
    "image/"
  );
}