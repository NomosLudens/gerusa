import pg from "pg";

const connectionString = process.env.GERUSA_DATABASE_URL;

if (!connectionString) {
  console.error("GERUSA_DATABASE_URL is required for the server-side smoke.");
  process.exit(1);
}

const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });

try {
  await client.connect();
  const result = await client.query("SELECT current_database() AS database, current_user AS role");
  const { database, role } = result.rows[0] ?? {};

  if (database !== "gerusa" || role !== "gerusa") {
    throw new Error("Configured connection is not isolated to Gerusa.");
  }

  console.log("GERUSA_DATABASE_CONNECTION=PASS");
} catch {
  console.error(
    "GERUSA_DATABASE_CONNECTION=FAIL: check server-side config and database availability.",
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
