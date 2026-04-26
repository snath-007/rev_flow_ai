import postgres from "postgres";

export function createSqlClient(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to create a Postgres client");
  }

  return postgres(databaseUrl);
}

