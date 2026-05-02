import { expect } from "chai";
import { Knex } from "knex";
import sinon from "sinon";
import { getKnexConfigForEnvironment } from "../../knexfile";
import {
  applySourceBridgeEnvironmentFromRuntime,
  getStartupKnexConnectionAsync,
  shouldAttemptAutomaticBridgeMigration,
  switchRuntimeEnvironmentToTarget,
} from "../AutomaticBridgeMigration";

describe("AutomaticBridgeMigration", () => {
  const trackedEnvironmentVariables = [
    "AUTO_DATABASE_MIGRATION",
    "DATABASE_CLIENT",
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
    "DATABASE_NAME",
    "SOURCE_DATABASE_CLIENT",
    "SOURCE_DATABASE_HOST",
    "SOURCE_DATABASE_PORT",
    "SOURCE_DATABASE_USER",
    "SOURCE_DATABASE_PASSWORD",
    "SOURCE_DATABASE_NAME",
    "TARGET_DATABASE_CLIENT",
    "TARGET_DATABASE_HOST",
    "TARGET_DATABASE_PORT",
    "TARGET_DATABASE_USER",
    "TARGET_DATABASE_PASSWORD",
    "TARGET_DATABASE_NAME",
  ];

  let originalEnvironment: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnvironment = captureEnvironment(trackedEnvironmentVariables);
    process.env["DATABASE_CLIENT"] = "mysql2";
    process.env["DATABASE_HOST"] = "127.0.0.1";
    process.env["DATABASE_PORT"] = "3306";
    process.env["DATABASE_USER"] = "root";
    process.env["DATABASE_PASSWORD"] = "root";
  });

  afterEach(() => {
    restoreEnvironment(originalEnvironment);
    sinon.restore();
  });

  it("does not attempt automatic migration without target configuration", () => {
    delete process.env["TARGET_DATABASE_CLIENT"];
    delete process.env["TARGET_DATABASE_HOST"];
    delete process.env["TARGET_DATABASE_PORT"];
    delete process.env["TARGET_DATABASE_USER"];
    delete process.env["TARGET_DATABASE_PASSWORD"];
    delete process.env["TARGET_DATABASE_NAME"];

    expect(shouldAttemptAutomaticBridgeMigration()).to.equal(false);
  });

  it("copies runtime database settings into SOURCE_ variables when absent", () => {
    applySourceBridgeEnvironmentFromRuntime();

    expect(process.env["SOURCE_DATABASE_CLIENT"]).to.equal("mysql2");
    expect(process.env["SOURCE_DATABASE_HOST"]).to.equal("127.0.0.1");
    expect(process.env["SOURCE_DATABASE_PORT"]).to.equal("3306");
    expect(process.env["SOURCE_DATABASE_USER"]).to.equal("root");
    expect(process.env["SOURCE_DATABASE_PASSWORD"]).to.equal("root");
  });

  it("does not stringify an absent runtime database name into SOURCE_DATABASE_NAME", () => {
    delete process.env["DATABASE_NAME"];

    applySourceBridgeEnvironmentFromRuntime();

    expect(process.env["SOURCE_DATABASE_NAME"]).to.equal(undefined);
  });

  it("switches the runtime environment to PostgreSQL after cutover", () => {
    process.env["TARGET_DATABASE_CLIENT"] = "pg";
    process.env["TARGET_DATABASE_HOST"] = "127.0.0.1";
    process.env["TARGET_DATABASE_PORT"] = "5432";
    process.env["TARGET_DATABASE_USER"] = "postgres";
    process.env["TARGET_DATABASE_PASSWORD"] = "postgres";
    process.env["TARGET_DATABASE_NAME"] = "sproot-bridge-target";

    switchRuntimeEnvironmentToTarget();

    expect(process.env["DATABASE_CLIENT"]).to.equal("pg");
    expect(process.env["DATABASE_HOST"]).to.equal("127.0.0.1");
    expect(process.env["DATABASE_PORT"]).to.equal("5432");
    expect(process.env["DATABASE_USER"]).to.equal("postgres");
    expect(process.env["DATABASE_PASSWORD"]).to.equal("postgres");
    expect(process.env["DATABASE_NAME"]).to.equal("sproot-bridge-target");
  });

  it("switches to PostgreSQL immediately when cutover metadata is already complete", async () => {
    setTargetEnvironment();
    const logger = createLogger();
    const pgProbeConnection = createFakeKnexConnection();
    const pgRuntimeConnection = createFakeKnexConnection();
    const getKnexConnectionAsync = sinon
      .stub()
      .onFirstCall()
      .resolves(pgProbeConnection)
      .onSecondCall()
      .resolves(pgRuntimeConnection);
    const runBridgePreflightAsync = sinon.stub().resolves();
    const runBridgeCutoverAsync = sinon.stub().resolves();
    const getBridgeMigrationStateIfPresentAsync = sinon.stub().resolves({
      phase: "cutover_complete",
      authoritativeClient: "pg",
    });
    const createKnexConnection = sinon.stub().returns(createFakeKnexConnection());

    const connection = await getStartupKnexConnectionAsync(logger, {
      getKnexConnectionAsync,
      runBridgePreflightAsync,
      runBridgeCutoverAsync,
      getBridgeMigrationStateIfPresentAsync,
      createKnexConnection,
    });

    expect(connection).to.equal(pgRuntimeConnection);
    expect(runBridgePreflightAsync.called).to.equal(false);
    expect(runBridgeCutoverAsync.called).to.equal(false);
    expect((pgProbeConnection.destroy as sinon.SinonStub).calledOnce).to.equal(true);
    expect(process.env["DATABASE_CLIENT"]).to.equal("pg");
  });

  it("attempts bridge migration and then switches runtime to PostgreSQL", async () => {
    setTargetEnvironment();
    const logger = createLogger();
    const pgProbeConnection = createFakeKnexConnection();
    const pgRuntimeConnection = createFakeKnexConnection();
    const getKnexConnectionAsync = sinon
      .stub()
      .onFirstCall()
      .resolves(pgProbeConnection)
      .onSecondCall()
      .resolves(pgRuntimeConnection);
    const runBridgePreflightAsync = sinon.stub().resolves();
    const runBridgeCutoverAsync = sinon.stub().resolves();
    const getBridgeMigrationStateIfPresentAsync = sinon.stub().resolves({
      phase: "validated_pending_cutover",
      authoritativeClient: "mysql2",
    });
    const createKnexConnection = sinon.stub().returns(createFakeKnexConnection());

    const connection = await getStartupKnexConnectionAsync(logger, {
      getKnexConnectionAsync,
      runBridgePreflightAsync,
      runBridgeCutoverAsync,
      getBridgeMigrationStateIfPresentAsync,
      createKnexConnection,
    });

    expect(connection).to.equal(pgRuntimeConnection);
    expect(runBridgePreflightAsync.calledOnce).to.equal(true);
    expect(runBridgeCutoverAsync.calledOnce).to.equal(true);
    expect(process.env["DATABASE_CLIENT"]).to.equal("pg");
  });

  it("falls back to MySQL when automatic migration fails", async () => {
    setTargetEnvironment();
    const logger = createLogger();
    const pgProbeConnection = createFakeKnexConnection();
    const mysqlRuntimeConnection = createFakeKnexConnection();
    const getKnexConnectionAsync = sinon
      .stub()
      .onFirstCall()
      .resolves(pgProbeConnection)
      .onSecondCall()
      .resolves(mysqlRuntimeConnection);
    const runBridgePreflightAsync = sinon.stub().rejects(new Error("postgres unavailable"));
    const runBridgeCutoverAsync = sinon.stub().resolves();
    const getBridgeMigrationStateIfPresentAsync = sinon.stub().resolves(null);
    const createKnexConnection = sinon.stub().returns(createFakeKnexConnection());

    const connection = await getStartupKnexConnectionAsync(logger, {
      getKnexConnectionAsync,
      runBridgePreflightAsync,
      runBridgeCutoverAsync,
      getBridgeMigrationStateIfPresentAsync,
      createKnexConnection,
    });

    expect(connection).to.equal(mysqlRuntimeConnection);
    expect(process.env["DATABASE_CLIENT"]).to.equal("mysql2");
    expect(logger.warn.calledOnce).to.equal(true);
    expect(runBridgeCutoverAsync.called).to.equal(false);
  });

  it("resolves knex configuration from the current runtime environment", () => {
    process.env["NODE_ENV"] = "development";
    process.env["DATABASE_CLIENT"] = "mysql2";
    process.env["DATABASE_HOST"] = "127.0.0.1";
    process.env["DATABASE_PORT"] = "3306";
    process.env["DATABASE_USER"] = "root";
    process.env["DATABASE_PASSWORD"] = "root";

    const mysqlConfig = getKnexConfigForEnvironment(process.env["NODE_ENV"]);

    process.env["DATABASE_CLIENT"] = "pg";
    process.env["DATABASE_HOST"] = "127.0.0.1";
    process.env["DATABASE_PORT"] = "5432";
    process.env["DATABASE_USER"] = "postgres";
    process.env["DATABASE_PASSWORD"] = "postgres";

    const pgConfig = getKnexConfigForEnvironment(process.env["NODE_ENV"]);

    expect(mysqlConfig?.client).to.equal("mysql2");
    expect(pgConfig?.client).to.equal("pg");
    expect((pgConfig?.connection as Knex.PgConnectionConfig).port).to.equal(5432);
  });
});

function setTargetEnvironment(): void {
  process.env["TARGET_DATABASE_CLIENT"] = "pg";
  process.env["TARGET_DATABASE_HOST"] = "127.0.0.1";
  process.env["TARGET_DATABASE_PORT"] = "5432";
  process.env["TARGET_DATABASE_USER"] = "postgres";
  process.env["TARGET_DATABASE_PASSWORD"] = "postgres";
  process.env["TARGET_DATABASE_NAME"] = "sproot-bridge-target";
}

function createLogger() {
  return {
    info: sinon.stub(),
    warn: sinon.stub(),
  };
}

function createFakeKnexConnection(): Knex {
  return {
    destroy: sinon.stub().resolves(),
  } as unknown as Knex;
}

function captureEnvironment(keys: string[]): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreEnvironment(environment: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(environment)) {
    if (value == null) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}
