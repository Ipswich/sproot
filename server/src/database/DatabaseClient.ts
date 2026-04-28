export type SupportedDatabaseClient = "mysql2" | "pg";

const MYSQL_CLIENT_ALIASES = new Set(["mysql", "mysql2", "mariadb"]);
const POSTGRES_CLIENT_ALIASES = new Set(["pg", "postgres", "postgresql"]);

export function normalizeDatabaseClient(clientName?: string | null): SupportedDatabaseClient {
  const normalizedClientName = clientName?.trim().toLowerCase();
  if (!normalizedClientName || MYSQL_CLIENT_ALIASES.has(normalizedClientName)) {
    return "mysql2";
  }

  if (POSTGRES_CLIENT_ALIASES.has(normalizedClientName)) {
    return "pg";
  }

  throw new Error(`Unsupported DATABASE_CLIENT value: ${clientName}`);
}

export function getDatabaseClientFromEnvironment(): SupportedDatabaseClient {
  return normalizeDatabaseClient(process.env["DATABASE_CLIENT"]);
}

export function isMySqlClient(client: SupportedDatabaseClient): client is "mysql2" {
  return client === "mysql2";
}

export function isPostgresClient(client: SupportedDatabaseClient): client is "pg" {
  return client === "pg";
}

export function getDefaultPortForClient(client: SupportedDatabaseClient): number {
  return isPostgresClient(client) ? 5432 : 3306;
}

export function getDatabasePortFromEnvironment(client: SupportedDatabaseClient): number {
  const rawPort = process.env["DATABASE_PORT"];
  if (!rawPort) {
    return getDefaultPortForClient(client);
  }

  const port = parseInt(rawPort, 10);
  if (Number.isNaN(port)) {
    throw new Error(`Invalid DATABASE_PORT value: ${rawPort}`);
  }

  return port;
}

export function getAdministrativeDatabaseName(client: SupportedDatabaseClient): string | null {
  return isPostgresClient(client) ? "postgres" : null;
}

export function getMigrationDirectoryForClient(
  client: SupportedDatabaseClient,
  extension: ".js" | ".ts",
): string {
  const sourceRoot = extension === ".ts" ? "src" : "dist";
  const migrationDirectoryName = isPostgresClient(client) ? "migrations-postgres" : "migrations";
  return `${sourceRoot}/database/${migrationDirectoryName}`;
}
