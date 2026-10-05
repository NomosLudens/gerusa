import { Client } from "pg";
import { getRuntimeDatabaseUrl, getRuntimeEnv } from "@/server/runtime/context";

export type SqlExecutor = {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    statement: string,
    parameters?: readonly unknown[],
  ): Promise<readonly T[]>;
  close(): void;
  transaction?<T>(fn: (transaction: SqlExecutor) => Promise<T>): Promise<T>;
};

type BunSqlClient = {
  unsafe<T extends Record<string, unknown> = Record<string, unknown>>(
    statement: string,
    parameters?: readonly unknown[],
  ): Promise<readonly T[]>;
  close(): void;
  begin?<T>(fn: (transaction: BunSqlClient) => Promise<T>): Promise<T>;
};

type BunRuntime = { SQL?: new (url: string) => BunSqlClient };

export function createWorkerPostgresExecutor(connectionString: string): SqlExecutor {
  const client = new Client({ connectionString });
  let connected: Promise<void> | undefined;

  const connect = async () => {
    if (!connected) connected = client.connect().then(() => undefined);
    await connected;
  };

  const query = async <T extends Record<string, unknown> = Record<string, unknown>>(
    statement: string,
    parameters?: readonly unknown[],
  ): Promise<readonly T[]> => {
    await connect();
    const result = await client.query<T>(statement, parameters ? [...parameters] : undefined);
    return result.rows;
  };

  return {
    query,
    close: () => {
      void client.end().catch(() => undefined);
    },
    transaction: async <T>(fn: (transaction: SqlExecutor) => Promise<T>): Promise<T> => {
      await connect();
      await client.query("BEGIN");
      const transaction: SqlExecutor = { query, close: () => undefined };
      try {
        const value = await fn(transaction);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    },
  };
}

/** Adapter for local Bun.SQL or the Worker connection exposed through runtime bindings. */
export function createBunPostgresExecutor(databaseUrl: string): SqlExecutor {
  if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
    throw new TypeError("KALLISTIS_DATABASE_URL must be a PostgreSQL URL");
  }
  const hyperdriveConnectionString = getRuntimeEnv().hyperdrive?.connectionString;
  if (hyperdriveConnectionString) return createWorkerPostgresExecutor(hyperdriveConnectionString);

  const runtime = (globalThis as unknown as { Bun?: BunRuntime }).Bun;
  if (!runtime?.SQL) throw new Error("Bun.SQL is required for the local PostgreSQL adapter");
  const client = new runtime.SQL(databaseUrl);
  return {
    query: (statement, parameters) => client.unsafe(statement, parameters),
    close: () => client.close(),
    transaction: client.begin
      ? (fn) =>
          client.begin!(async (transaction) =>
            fn({
              query: (statement, parameters) => transaction.unsafe(statement, parameters),
              close: () => undefined,
            }),
          )
      : undefined,
  };
}

export { getRuntimeDatabaseUrl };
