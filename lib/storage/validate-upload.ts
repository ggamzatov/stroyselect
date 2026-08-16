import "server-only";

export const MAX_STANDARD_UPLOAD_BYTES = 20 * 1024 * 1024;

const MIME_KINDS = new Map<string, "jpeg" | "png" | "webp" | "pdf" | "zip" | "ole">([
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "zip"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "zip"],
  ["application/msword", "ole"],
  ["application/vnd.ms-excel", "ole"],
]);

export async function validateUploadedFile(
  file: File,
  options: { maxBytes?: number; allowedMimeTypes?: ReadonlySet<string> } = {}
): Promise<{ ok: true; buffer: Buffer } | { ok: false; message: string }> {
  const maxBytes = options.maxBytes ?? MAX_STANDARD_UPLOAD_BYTES;
  if (file.size <= 0) return { ok: false, message: "Файл пустой" };
  if (file.size > maxBytes) return { ok: false, message: `Размер файла не должен превышать ${Math.floor(maxBytes / 1024 / 1024)} МБ` };
  if (options.allowedMimeTypes && !options.allowedMimeTypes.has(file.type)) return { ok: false, message: "Этот формат файла не поддерживается" };

  const kind = MIME_KINDS.get(file.type);
  if (!kind) return { ok: false, message: "Тип файла не разрешён" };
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasSignature(buffer, kind)) {
    return { ok: false, message: "Содержимое файла не соответствует заявленному формату" };
  }
  return { ok: true, buffer };
}

function hasSignature(buffer: Buffer, kind: "jpeg" | "png" | "webp" | "pdf" | "zip" | "ole") {
  if (kind === "jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (kind === "png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (kind === "webp") return buffer.length >= 12 && buffer.subarray(0,4).toString("ascii") === "RIFF" && buffer.subarray(8,12).toString("ascii") === "WEBP";
  if (kind === "pdf") return buffer.length >= 5 && buffer.subarray(0,5).toString("ascii") === "%PDF-";
  if (kind === "zip") return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03,0x05,0x07].includes(buffer[2]) && [0x04,0x06,0x08].includes(buffer[3]);
  return buffer.length >= 8 && buffer.subarray(0,8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]));
}
