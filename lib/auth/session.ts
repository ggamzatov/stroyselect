import "server-only";

import crypto from "node:crypto";

import { cookies, headers } from "next/headers";

import { db } from "@/lib/db/pool";

const SESSION_COOKIE = "stroyselect_session";
const SESSION_TTL_DAYS = 30;
const LAST_SEEN_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

type SessionRow = {
  user_id: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  last_seen_at: Date | string;
};

function hashToken(token: string) {
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
  const expiresAt = new Date();
  expiresAt.setDate(
    expiresAt.getDate() + SESSION_TTL_DAYS
  );
  return expiresAt;
}

function toDate(value: Date | string) {
  return value instanceof Date
    ? value
    : new Date(value);
}

async function getRequestMetadata() {
  const headerStore = await headers();

  const userAgent =
    headerStore.get("user-agent");

  /*
   * x-forwarded-for доверяем только как диагностическому полю.
   * Он не участвует в авторизации или проверке сессии.
   */
  const forwardedFor =
    headerStore.get("x-forwarded-for");

  const ipAddress =
    forwardedFor
      ?.split(",")[0]
      ?.trim() || null;

  return {
    userAgent,
    ipAddress,
  };
}

export async function createUserSession(
  userId: string
) {
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = getSessionExpiresAt();
  const { userAgent, ipAddress } =
    await getRequestMetadata();

  await db.query(
    `
      INSERT INTO public.auth_sessions (
        user_id,
        token_hash,
        expires_at,
        user_agent,
        ip_address
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    ]
  );

  const cookieStore = await cookies();

  cookieStore.set(
    SESSION_COOKIE,
    token,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    }
  );
}

export async function getCurrentSessionUserId(): Promise<
  string | null
> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  const result = await db.query<SessionRow>(
    `
      SELECT
        user_id,
        expires_at,
        revoked_at,
        last_seen_at
      FROM public.auth_sessions
      WHERE token_hash = $1
      LIMIT 1
    `,
    [tokenHash]
  );

  const session = result.rows[0];

  if (!session || session.revoked_at) {
    return null;
  }

  const expiresAt = toDate(session.expires_at);

  if (
    !Number.isFinite(expiresAt.getTime()) ||
    expiresAt.getTime() <= Date.now()
  ) {
    return null;
  }

  /*
   * Не пишем last_seen_at на каждый Server Component/Action.
   * Иначе один просмотр страницы создаёт несколько UPDATE.
   */
  const lastSeenAt = toDate(session.last_seen_at);

  if (
    !Number.isFinite(lastSeenAt.getTime()) ||
    Date.now() - lastSeenAt.getTime() >=
      LAST_SEEN_UPDATE_INTERVAL_MS
  ) {
    await db.query(
      `
        UPDATE public.auth_sessions
        SET last_seen_at = now()
        WHERE token_hash = $1
          AND revoked_at IS NULL
          AND expires_at > now()
          AND last_seen_at <
            now() - interval '5 minutes'
      `,
      [tokenHash]
    );
  }

  return session.user_id;
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const tokenHash = hashToken(token);

    await db.query(
      `
        UPDATE public.auth_sessions
        SET revoked_at = now()
        WHERE token_hash = $1
          AND revoked_at IS NULL
      `,
      [tokenHash]
    );
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function revokeAllUserSessions(
  userId: string
) {
  await db.query(
    `
      UPDATE public.auth_sessions
      SET revoked_at = now()
      WHERE user_id = $1
        AND revoked_at IS NULL
    `,
    [userId]
  );
}
