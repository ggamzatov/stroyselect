import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/storage/s3";

const ALLOWED_BUCKETS = new Set([
  "contractor-portfolio",
  "project-files",
  "chat-files",
]);

const DEFAULT_EXPIRES_IN = 5 * 60;
const MAX_EXPIRES_IN = 15 * 60;

type GetSignedFileUrlOptions = {
  bucket: string;
  key: string;
  expiresIn?: number;
};

export async function getSignedFileUrl({
  bucket,
  key,
  expiresIn = DEFAULT_EXPIRES_IN,
}: GetSignedFileUrlOptions) {
  if (!ALLOWED_BUCKETS.has(bucket)) {
    throw new Error("Недопустимое хранилище файла");
  }

  const normalizedKey = key.trim();
  if (!normalizedKey || normalizedKey.startsWith("/") || normalizedKey.includes("\\")) {
    throw new Error("Некорректный ключ файла");
  }

  const safeExpiresIn = Math.min(
    MAX_EXPIRES_IN,
    Math.max(30, Math.trunc(expiresIn))
  );

  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: normalizedKey,
    }),
    { expiresIn: safeExpiresIn }
  );
}
