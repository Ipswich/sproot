import knex, { Knex } from "knex";
import { Logger } from "winston";
import {
  buildKnexConfiguration,
  getConnectionConfigurationFromPrefix,
} from "../cli/mysqlToPostgresBridgeShared";
import { runBridgeCutoverAsync } from "../cli/mysqlToPostgresBridgeCutover";
import { runBridgePreflightAsync } from "../cli/mysqlToPostgresBridge";
import { getBridgeMigrationStateIfPresentAsync } from "./BridgeRuntimeGuard";
import { getKnexConnectionAsync, type KnexConnectionOptions } from "./KnexUtilities";
import { getDatabaseClientFromEnvironment, isMySqlClient } from "./DatabaseClient";

type StartupLogger = Pick<Logger, "info" | "warn">;

type AutomaticBridgeDependencies = {
  getKnexConnectionAsync: (options?: KnexConnectionOptions) => Promise<Knex>;
  runBridgePreflightAsync: () => Promise<void>;
  runBridgeCutoverAsync: () => Promise<void>;
  getBridgeMigrationStateIfPresentAsync: (connection: Knex) => Promise<{
    phase: string;
    authoritativeClient: string;
  } | null>;
  createKnexConnection: (configuration: ReturnType<typeof buildKnexConfiguration>) => Knex;
};

const DEFAULT_DEPENDENCIES: AutomaticBridgeDependencies = {
  getKnexConnectionAsync,
  runBridgePreflightAsync,
  runBridgeCutoverAsync,
  getBridgeMigrationStateIfPresentAsync,
  createKnexConnection: (configuration) => knex(configuration),
};

export async function getStartupKnexConnectionAsync(
  logger: StartupLogger,
  dependencies: AutomaticBridgeDependencies = DEFAULT_DEPENDENCIES,
): Promise<Knex> {
  if (!shouldAttemptAutomaticBridgeMigration()) {
    return dependencies.getKnexConnectionAsync();
  }

  applySourceBridgeEnvironmentFromRuntime();
  const targetConfiguration = getConnectionConfigurationFromPrefix("TARGET_");

  try {
    const targetProbeConnection = await ensureTargetDatabaseIsReadyAsync(
      targetConfiguration,
      dependencies,
    );
    try {
      const migrationState =
        await dependencies.getBridgeMigrationStateIfPresentAsync(targetProbeConnection);
      if (
        migrationState?.authoritativeClient === "pg" &&
        migrationState.phase === "cutover_complete"
      ) {
        logger.info("Detected completed PostgreSQL cutover. Starting on PostgreSQL.");
        switchRuntimeEnvironmentToTarget();
        return dependencies.getKnexConnectionAsync();
      }
    } finally {
      await targetProbeConnection.destroy();
    }

    logger.info("Automatic PostgreSQL migration is enabled. Attempting seamless bridge cutover.");
    await dependencies.runBridgePreflightAsync();
    await dependencies.runBridgeCutoverAsync();
    switchRuntimeEnvironmentToTarget();
    logger.info("Automatic PostgreSQL bridge cutover completed. Continuing startup on PostgreSQL.");
    return dependencies.getKnexConnectionAsync();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Automatic PostgreSQL migration failed during startup; continuing on MySQL. ${message}`,
    );
    return dependencies.getKnexConnectionAsync();
  }
}

export function shouldAttemptAutomaticBridgeMigration(): boolean {
  if (!isAutomaticBridgeMigrationEnabled()) {
    return false;
  }

  return isMySqlClient(getDatabaseClientFromEnvironment()) && hasTargetDatabaseConfiguration();
}

export function applySourceBridgeEnvironmentFromRuntime(): void {
  copyRuntimeEnvironmentValue("SOURCE_DATABASE_CLIENT", "DATABASE_CLIENT");
  copyRuntimeEnvironmentValue("SOURCE_DATABASE_HOST", "DATABASE_HOST");
  copyRuntimeEnvironmentValue("SOURCE_DATABASE_PORT", "DATABASE_PORT");
  copyRuntimeEnvironmentValue("SOURCE_DATABASE_USER", "DATABASE_USER");
  copyRuntimeEnvironmentValue("SOURCE_DATABASE_PASSWORD", "DATABASE_PASSWORD");
  copyRuntimeEnvironmentValue("SOURCE_DATABASE_NAME", "DATABASE_NAME");
}

export function switchRuntimeEnvironmentToTarget(): void {
  process.env["DATABASE_CLIENT"] = process.env["TARGET_DATABASE_CLIENT"];
  process.env["DATABASE_HOST"] = process.env["TARGET_DATABASE_HOST"];
  process.env["DATABASE_PORT"] = process.env["TARGET_DATABASE_PORT"];
  process.env["DATABASE_USER"] = process.env["TARGET_DATABASE_USER"];
  process.env["DATABASE_PASSWORD"] = process.env["TARGET_DATABASE_PASSWORD"];

  if (process.env["TARGET_DATABASE_NAME"] != null) {
    process.env["DATABASE_NAME"] = process.env["TARGET_DATABASE_NAME"];
  }
}

async function ensureTargetDatabaseIsReadyAsync(
  targetConfiguration: ReturnType<typeof getConnectionConfigurationFromPrefix>,
  dependencies: AutomaticBridgeDependencies,
): Promise<Knex> {
  await withTemporaryRuntimeEnvironment(
    {
      DATABASE_CLIENT: targetConfiguration.client,
      DATABASE_HOST: targetConfiguration.host,
      DATABASE_PORT: String(targetConfiguration.port),
      DATABASE_USER: targetConfiguration.user,
      DATABASE_PASSWORD: targetConfiguration.password,
      DATABASE_NAME: targetConfiguration.database,
    },
    async () => {
      const targetConnection = await dependencies.getKnexConnectionAsync({
        ensureDatabase: true,
        runMigrations: false,
        runSeeds: false,
      });
      await targetConnection.destroy();
    },
  );

  return dependencies.createKnexConnection(buildKnexConfiguration(targetConfiguration));
}

function isAutomaticBridgeMigrationEnabled(): boolean {
  const value = process.env["AUTO_DATABASE_MIGRATION"]?.trim().toLowerCase();
  return value == null || value === "1" || value === "true" || value === "yes";
}

function hasTargetDatabaseConfiguration(): boolean {
  return [
    process.env["TARGET_DATABASE_CLIENT"],
    process.env["TARGET_DATABASE_HOST"],
    process.env["TARGET_DATABASE_PORT"],
    process.env["TARGET_DATABASE_USER"],
    process.env["TARGET_DATABASE_PASSWORD"],
  ].every((value) => value != null && value.trim() !== "");
}

async function withTemporaryRuntimeEnvironment<T>(
  values: Record<string, string | undefined>,
  callback: () => Promise<T>,
): Promise<T> {
  const originalEnvironment = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value == null) {
        delete process.env[key];
        continue;
      }

      process.env[key] = value;
    }

    return await callback();
  } finally {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value == null) {
        delete process.env[key];
        continue;
      }

      process.env[key] = value;
    }
  }
}

function copyRuntimeEnvironmentValue(targetName: string, sourceName: string): void {
  if (process.env[targetName] != null) {
    return;
  }

  const value = process.env[sourceName];
  if (value != null) {
    process.env[targetName] = value;
  }
}
