import postgres from "postgres";

export function getDatabaseUrl(
  databaseUrl = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL,
) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create a Postgres client");
  }

  return databaseUrl;
}

export function createSqlClient(databaseUrl = process.env.DATABASE_URL) {
  return postgres(getDatabaseUrl(databaseUrl));
}

export async function checkDatabaseConnection(
  databaseUrl = process.env.DATABASE_URL,
) {
  const sql = createSqlClient(databaseUrl);

  try {
    const result = await sql<{ ok: number }[]>`select 1 as ok`;
    return result[0]?.ok === 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
