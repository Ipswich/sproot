import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { assert } from "chai";
import * as sinon from "sinon";
import { OutputCache } from "../OutputCache";
import { MockSprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import winston from "winston";

describe("OutputCache.ts", function () {
  const mockSprootDB = new MockSprootDB();
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
      sinon.stub(mockSprootDB, "getOutputStatesAsync").resolves([
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
      const outputCache = new OutputCache(2, mockSprootDB, logger);
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
      const outputCache = new OutputCache(2, mockSprootDB, logger);
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
      const outputCache = new OutputCache(2, mockSprootDB, logger);
      const data = { value: 100 } as SDBOutputState;
      outputCache.addData(data);
      outputCache.addData(data);
      outputCache.addData(data);

      assert.equal(outputCache.get().length, 2);
    });
  });

  describe("clear", function () {
    it("should clear the cache", function () {
      const outputCache = new OutputCache(2, mockSprootDB, logger);
      const data = { value: 100 } as SDBOutputState;

      outputCache.addData(data);
      assert.equal(outputCache.get().length, 1);

      outputCache.clear();
      assert.equal(outputCache.get().length, 0);
    });
  });
});
