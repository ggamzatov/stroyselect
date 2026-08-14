import "server-only";

import crypto from "node:crypto";

import { cookies, headers } from "next/headers";

import { db } from
  "@/lib/db/pool";

const SESSION_COOKIE =
  "stroyselect_session";

const SESSION_TTL_DAYS =
  30;

type SessionRow = {
  user_id: string;
  expires_at:
    Date | string;
  revoked_at:
    Date | string | null;
};

function hashToken(
  token: string
) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function createSessionToken() {
  return crypto
    .randomBytes(32)
    .toString("base64url");
}

function getSessionExpiresAt() {
  const expiresAt =
    new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      SESSION_TTL_DAYS
  );

  return expiresAt;
}

export async function createUserSession(
  userId: string
) {
  const token =
    createSessionToken();

  const tokenHash =
    hashToken(token);

  const expiresAt =
    getSessionExpiresAt();

  const headerStore =
    await headers();

  const userAgent =
    headerStore.get(
      "user-agent"
    );

  const forwardedFor =
    headerStore.get(
      "x-forwarded-for"
    );

  const ipAddress =
    forwardedFor
      ?.split(",")[0]
      ?.trim() ||
    null;

  await db.query(
    `
      INSERT INTO
        public.auth_sessions (
          user_id,
          token_hash,
          expires_at,
          user_agent,
          ip_address
        )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5
      )
    `,
    [
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    ]
  );

  const cookieStore =
    await cookies();

  cookieStore.set(
    SESSION_COOKIE,
    token,
    {
      httpOnly:
        true,

      secure:
        process.env
          .NODE_ENV ===
        "production",

      sameSite:
        "lax",

      path:
        "/",

      expires:
        expiresAt,
    }
  );
}

export async function getCurrentSessionUserId(): Promise<
  string | null
> {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE
    )?.value;

  if (!token) {
    return null;
  }

  const tokenHash =
    hashToken(token);

  const result =
    await db.query<SessionRow>(
      `
        SELECT
          user_id,
          expires_at,
          revoked_at
        FROM
          public.auth_sessions
        WHERE
          token_hash = $1
        LIMIT 1
      `,
      [
        tokenHash,
      ]
    );

  const session =
    result.rows[0];

  if (!session) {
    return null;
  }

  if (
    session.revoked_at
  ) {
    return null;
  }

  const expiresAt =
    session.expires_at
      instanceof Date
      ? session.expires_at
      : new Date(
          session.expires_at
        );

  if (
    expiresAt.getTime() <=
    Date.now()
  ) {
    return null;
  }

  await db.query(
    `
      UPDATE
        public.auth_sessions
      SET
        last_seen_at = now()
      WHERE
        token_hash = $1
    `,
    [
      tokenHash,
    ]
  );

  return session.user_id;
}

export async function destroyCurrentSession() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      SESSION_COOKIE
    )?.value;

  if (token) {
    const tokenHash =
      hashToken(token);

    await db.query(
      `
        UPDATE
          public.auth_sessions
        SET
          revoked_at = now()
        WHERE
          token_hash = $1
          AND revoked_at IS NULL
      `,
      [
        tokenHash,
      ]
    );
  }

  cookieStore.delete(
    SESSION_COOKIE
  );
}