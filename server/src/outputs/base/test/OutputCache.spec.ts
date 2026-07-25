import { SDBOutputState } from "@sproot/common/dist/database/SDBOutputState";
import { ControlMode } from "@sproot/common/dist/outputs/IOutputBase";
import { assert } from "chai";
import * as sinon from "sinon";
import { OutputCache } from "../OutputCache";
import { IOutputsRepository } from "@sproot/common/dist/database/ISprootDB";
import winston from "winston";
import { DeviceDataQueryRow } from "@sproot/common/dist/api/v2/QueryTypes";

const mockOutputsRepo: IOutputsRepository = {
  getAllAsync: async () => [],
  getByIdAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
  updateLastOutputStateAsync: async () => {},
  getLastOutputStateAsync: async () => [],
  addOutputStateAsync: async () => {},
  getOutputStatesAsync: async () => [],
  getBucketedOutputStatesAsync: async () => [],
  getDataAsync: async () => ({
    xAxis: { field: "time", values: [] },
    data: {} as DeviceDataQueryRow,
  }),
};

describe("OutputCache.ts", function () {
  let logger: winston.Logger;

  beforeEach(() => {
    sinon.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    logger = winston.createLogger();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("loadCacheFromDatabaseAsync", function () {
    it("should load the cache from the database", async function () {
      sinon.stub(mockOutputsRepo, "getBucketedOutputStatesAsync").resolves([
        {
          controlMode: ControlMode.automatic,
          value: 100,
          logTime: "2024-03-03T03:29:01Z",
        } as SDBOutputState,
        {
          controlMode: ControlMode.manual,
          value: 200,
          logTime: "2024-03-03T03:30:01Z",
        } as SDBOutputState,
      ]);
      const outputCache = new OutputCache(2, mockOutputsRepo, logger);
      await outputCache.loadFromDatabaseAsync(1, 9000);

      assert.equal(outputCache.get().length, 2);
      assert.equal(outputCache.get()[0]!.controlMode, ControlMode.automatic);
      assert.equal(outputCache.get()[0]!.value, 100);
      assert.isTrue(
        outputCache.get()[0]!.logTime.includes("Z") && outputCache.get()[0]!.logTime.includes("T"),
      );
      assert.equal(outputCache.get()[1]!.controlMode, ControlMode.manual);
      assert.equal(outputCache.get()[1]!.value, 200);
      assert.isTrue(
        outputCache.get()[1]!.logTime.includes("Z") && outputCache.get()[1]!.logTime.includes("T"),
      );
    });
  });

  describe("addData", function () {
    it("should add data to the cache", function () {
      const outputCache = new OutputCache(2, mockOutputsRepo, logger);
      //This one should get skipped
      const badData = { controlMode: ControlMode.automatic } as SDBOutputState;
      outputCache.addData(badData);
      assert.isEmpty(outputCache.get());

      //This one should be added
      const data = { controlMode: ControlMode.automatic, value: 100 } as SDBOutputState;
      outputCache.addData(data);

      assert.equal(outputCache.get().length, 1);
      assert.equal(outputCache.get()[0]!.controlMode, ControlMode.automatic);
      assert.equal(outputCache.get()[0]!.value, 100);
      assert.isTrue(
        outputCache.get()[0]!.logTime.includes("Z") && outputCache.get()[0]!.logTime.includes("T"),
      );
    });

    it("should remove the oldest data if the cache is full", function () {
      const outputCache = new OutputCache(2, mockOutputsRepo, logger);
      const data = { value: 100 } as SDBOutputState;
      outputCache.addData(data);
      outputCache.addData(data);
      outputCache.addData(data);

      assert.equal(outputCache.get().length, 2);
    });
  });

  describe("clear", function () {
    it("should clear the cache", function () {
      const outputCache = new OutputCache(2, mockOutputsRepo, logger);
      const data = { value: 100 } as SDBOutputState;

      outputCache.addData(data);
      assert.equal(outputCache.get().length, 1);

      outputCache.clear();
      assert.equal(outputCache.get().length, 0);
    });
  });
});
