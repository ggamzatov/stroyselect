import "server-only";

import { db } from
  "@/lib/db/pool";

export async function testDatabaseConnection() {
  const result =
    await db.query<{
      database_name: string;
      database_user: string;
      postgres_version: string;
    }>(`
      select
        current_database()
          as database_name,

        current_user
          as database_user,

        version()
          as postgres_version
    `);

  return result.rows[0];
}