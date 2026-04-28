import { expect } from "chai";
import {
  assertMySqlRuntimeIsAllowed,
  assertPostgresRuntimeStateIsAllowed,
  getRejectMySqlRuntimeFromEnvironment,
  type BridgeMigrationState,
} from "../BridgeRuntimeGuard";

describe("BridgeRuntimeGuard", () => {
  describe("assertMySqlRuntimeIsAllowed", () => {
    it("allows mysql runtime during bridge mode", () => {
      expect(() => assertMySqlRuntimeIsAllowed("mysql2", false)).to.not.throw();
    });

    it("rejects mysql runtime when explicitly disabled", () => {
      expect(() => assertMySqlRuntimeIsAllowed("mysql2", true)).to.throw(
        "This release no longer supports MySQL runtime.",
      );
    });

    it("does not reject postgres when mysql rejection is enabled", () => {
      expect(() => assertMySqlRuntimeIsAllowed("pg", true)).to.not.throw();
    });
  });

  describe("assertPostgresRuntimeStateIsAllowed", () => {
    it("allows postgres runtime when no bridge metadata is present", () => {
      expect(() => assertPostgresRuntimeStateIsAllowed(null)).to.not.throw();
    });

    it("allows postgres runtime after cutover is complete", () => {
      expect(() => assertPostgresRuntimeStateIsAllowed(createMigrationState({}))).to.not.throw();
    });

    it("rejects postgres runtime when bridge validation is incomplete", () => {
      expect(() =>
        assertPostgresRuntimeStateIsAllowed(
          createMigrationState({
            phase: "validated_pending_cutover",
            authoritativeClient: "mysql2",
          }),
        ),
      ).to.throw("PostgreSQL runtime is not ready because bridge cutover is incomplete.");
    });

    it("includes the last error when postgres runtime is blocked", () => {
      expect(() =>
        assertPostgresRuntimeStateIsAllowed(
          createMigrationState({
            phase: "cutover_failed",
            authoritativeClient: "mysql2",
            lastError: "validation mismatch",
          }),
        ),
      ).to.throw("last_error=validation mismatch");
    });
  });

  describe("getRejectMySqlRuntimeFromEnvironment", () => {
    const originalValue = process.env["REJECT_MYSQL_RUNTIME"];

    afterEach(() => {
      if (originalValue == null) {
        delete process.env["REJECT_MYSQL_RUNTIME"];
      } else {
        process.env["REJECT_MYSQL_RUNTIME"] = originalValue;
      }
    });

    it("returns true for truthy values", () => {
      process.env["REJECT_MYSQL_RUNTIME"] = "true";
      expect(getRejectMySqlRuntimeFromEnvironment()).to.equal(true);
    });

    it("returns false by default", () => {
      delete process.env["REJECT_MYSQL_RUNTIME"];
      expect(getRejectMySqlRuntimeFromEnvironment()).to.equal(false);
    });
  });
});

function createMigrationState(overrides: Partial<BridgeMigrationState>): BridgeMigrationState {
  return {
    activeRunId: 1,
    phase: "cutover_complete",
    authoritativeClient: "pg",
    sourceDatabase: "sproot",
    targetDatabase: "sproot",
    lastError: null,
    ...overrides,
  };
}
