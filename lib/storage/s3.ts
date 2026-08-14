import "server-only";

import {
  S3Client,
} from "@aws-sdk/client-s3";

function getRequiredEnv(
  name: string
) {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `${name} не указан`
    );
  }

  return value;
}

export const s3 =
  new S3Client({
    endpoint:
      getRequiredEnv(
        "S3_ENDPOINT"
      ),

    region:
      process.env.S3_REGION ??
      "ru-1",

    credentials: {
      accessKeyId:
        getRequiredEnv(
          "S3_ACCESS_KEY"
        ),

      secretAccessKey:
        getRequiredEnv(
          "S3_SECRET_KEY"
        ),
    },

    forcePathStyle:
      process.env
        .S3_FORCE_PATH_STYLE !==
      "false",
  });