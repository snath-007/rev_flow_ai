import { loadEnv } from "./env.js";

loadEnv();

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSqlClient } from "./client.js";

type MigrationRow = {
  id: string;
};

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, "migrations");

async function ensureMigrationsTable(sql: ReturnType<typeof createSqlClient>) {
  await sql`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `;
}

async function getAppliedMigrationIds(sql: ReturnType<typeof createSqlClient>) {
  const rows = await sql<MigrationRow[]>`
    select id
    from schema_migrations
    order by id
  `;

  return new Set(rows.map((row) => row.id));
}

async function run() {
  const sql = createSqlClient();

  try {
    await ensureMigrationsTable(sql);

    const appliedMigrationIds = await getAppliedMigrationIds(sql);
    const migrationFiles = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of migrationFiles) {
      if (appliedMigrationIds.has(file)) {
        console.log(`Skipping ${file}`);
        continue;
      }

      const migrationSql = await readFile(path.join(migrationsDir, file), "utf8");

      await sql.begin(async (tx) => {
        await tx.unsafe(migrationSql);
        await tx`
          insert into schema_migrations (id)
          values (${file})
        `;
      });

      console.log(`Applied ${file}`);
    }

    console.log("Database migrations complete");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

