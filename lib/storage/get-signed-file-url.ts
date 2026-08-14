import "server-only";

import {
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

import {
  s3,
} from "@/lib/storage/s3";

type GetSignedFileUrlOptions = {
  bucket: string;
  key: string;
  expiresIn?: number;
};

export async function getSignedFileUrl({
  bucket,
  key,
  expiresIn = 3600,
}: GetSignedFileUrlOptions) {
  const command =
    new GetObjectCommand({
      Bucket:
        bucket,

      Key:
        key,
    });

  return getSignedUrl(
    s3,
    command,
    {
      expiresIn,
    }
  );
}