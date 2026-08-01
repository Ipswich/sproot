import { describe, it } from "mocha";
import { assert } from "chai";
import sinon from "sinon";
import { Knex } from "knex";
import { RetentionRepository } from "../RetentionRepository";

describe("RetentionRepository", () => {
  let knex: sinon.SinonStubbedInstance<Knex>;
  let repo: RetentionRepository;

  beforeEach(() => {
    knex = {
      raw: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<Knex>;
    repo = new RetentionRepository(knex as unknown as Knex);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("hasRetentionPolicyAsync", () => {
    function createMockWithResult(firstResult: { job_id: number } | undefined): Knex {
      const queryBuilder = {
        select: sinon.stub().returns({
          where: sinon.stub().returns({
            where: sinon.stub().returns({
              first: sinon.stub().resolves(firstResult),
            }),
          }),
        }),
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockKnex = ((_tableName: string) => queryBuilder) as unknown as Knex;

      return mockKnex;
    }

    it("returns true when a retention policy exists", async () => {
      const mockKnex = createMockWithResult({ job_id: 5001 });
      const testRepo = new RetentionRepository(mockKnex);
      const result = await testRepo.hasRetentionPolicyAsync("sensor_data");
      assert.isTrue(result);
    });

    it("returns false when no retention policy exists", async () => {
      const mockKnex = createMockWithResult(undefined);
      const testRepo = new RetentionRepository(mockKnex);
      const result = await testRepo.hasRetentionPolicyAsync("unknown_table");
      assert.isFalse(result);
    });
  });

  describe("removeRetentionPolicyAsync", () => {
    it("calls remove_retention_policy for the given table", async () => {
      knex.raw.resolves();
      await repo.removeRetentionPolicyAsync("sensor_data");
      assert.isTrue(knex.raw.calledWith("SELECT remove_retention_policy('sensor_data')"));
    });
  });

  describe("addRetentionPolicyAsync", () => {
    it("calls add_retention_policy with the correct interval", async () => {
      knex.raw.resolves();
      await repo.addRetentionPolicyAsync("sensor_data", "30 days");
      assert.isTrue(
        knex.raw.calledWith(
          "SELECT add_retention_policy('sensor_data', drop_after => INTERVAL '30 days')",
        ),
      );
    });
  });

  describe("getPolicyJobIdAsync", () => {
    function createMockWithResult(firstResult: { job_id: number } | undefined): Knex {
      const queryBuilder = {
        select: sinon.stub().returns({
          where: sinon.stub().returns({
            where: sinon.stub().returns({
              first: sinon.stub().resolves(firstResult),
            }),
          }),
        }),
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockKnex = ((_tableName: string) => queryBuilder) as unknown as Knex;

      return mockKnex;
    }

    it("returns the job_id for a retention policy", async () => {
      const mockKnex = createMockWithResult({ job_id: 5001 });
      const testRepo = new RetentionRepository(mockKnex);
      const result = await testRepo.getPolicyJobIdAsync("sensor_data");
      assert.equal(result, 5001);
    });

    it("returns null when no retention policy exists", async () => {
      const mockKnex = createMockWithResult(undefined);
      const testRepo = new RetentionRepository(mockKnex);
      const result = await testRepo.getPolicyJobIdAsync("unknown_table");
      assert.equal(result, null);
    });
  });

  describe("runPolicyJobAsync", () => {
    it("calls CALL run_job with the job ID", async () => {
      const execStub = sinon.stub().resolves();
      const rawStub = sinon.stub().returns({ exec: execStub });
      const mockKnex = {
        raw: rawStub,
      } as unknown as Knex;
      const testRepo = new RetentionRepository(mockKnex);
      await testRepo.runPolicyJobAsync(5001);
      assert.isTrue(rawStub.calledWith("CALL run_job(?)", [5001]));
      assert.isTrue(execStub.calledOnce);
    });
  });

  describe("table name validation", () => {
    it("throws on invalid table names with special characters", async () => {
      const mockKnex = {
        raw: sinon.stub().resolves(),
      } as unknown as Knex;
      const testRepo = new RetentionRepository(mockKnex);
      await assert.isRejected(
        testRepo.addRetentionPolicyAsync("invalid-table", "30 days"),
        /Invalid table name/,
      );
    });

    it("accepts valid table names with underscores", async () => {
      knex.raw.resolves();
      await repo.addRetentionPolicyAsync("sensor_data_5m", "30 days");
      assert.isTrue(knex.raw.called);
    });
  });
});
