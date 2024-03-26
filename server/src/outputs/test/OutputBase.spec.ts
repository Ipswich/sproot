import {
  OutputCache,
  OutputChartData,
  OutputState,
} from "@sproot/sproot-server/src/outputs/OutputBase";
import { MockSprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import { ControlMode } from "@sproot/sproot-common/src/outputs/IOutputBase";
import winston from "winston";

import { assert } from "chai";
import * as sinon from "sinon";
import { SDBOutputState } from "@sproot/sproot-common/src/database/SDBOutputState";
import { ChartData } from "@sproot/sproot-common/src/utility/IChartable";
const sandbox = sinon.createSandbox();

describe("OutputBase.ts tests", function () {
  const mockSprootDB = new MockSprootDB();
  let logger: winston.Logger;

  beforeEach(() => {
    sandbox.stub(winston, "createLogger").callsFake(
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
    sandbox.restore();
  });

  describe("OutputState class", function () {
    describe("constructor", function () {
      it("should create a new OutputState object with default values", function () {
        const outputState = new OutputState(mockSprootDB);

        assert.equal(outputState.value, 0);
        assert.equal(outputState.controlMode, ControlMode.schedule);
      });
    });

    describe("updateControlMode", function () {
      it("should update the control mode of the output state", function () {
        const outputState = new OutputState(mockSprootDB);

        outputState.updateControlMode(ControlMode.manual);
        assert.equal(outputState.controlMode, ControlMode.manual);

        outputState.updateControlMode(ControlMode.schedule);
        assert.equal(outputState.controlMode, ControlMode.schedule);
      });
    });

    describe("setNewState", function () {
      it("should update the value of the output state", function () {
        const outputState = new OutputState(mockSprootDB);

        const newState = { value: 100 } as SDBOutputState;
        //We're not in manual, should have no effect
        outputState.setNewState(newState, ControlMode.manual);
        assert.equal(outputState.value, 0);

        //But we are in schedule, so ... effect.
        outputState.setNewState(newState, ControlMode.schedule);
        assert.equal(outputState.value, 100);
      });
    });

    describe("addCurrentStateToDatabaseAsync()", function () {
      it("should add the current state to the database", async function () {
        const dbStub = sinon.stub(mockSprootDB, "addOutputStateAsync");
        const outputState = new OutputState(mockSprootDB);

        //Start in schedule, set schedule value to 100
        let newState = { value: 100 } as SDBOutputState;
        outputState.setNewState({ value: 100 } as SDBOutputState, ControlMode.schedule);
        await outputState.addCurrentStateToDatabaseAsync(1);
        dbStub.calledOnceWith({ id: 1, value: 100, controlMode: ControlMode.schedule });
        dbStub.resetHistory();

        //Stay in schedule, set schedule value to 0
        newState = { value: 0 } as SDBOutputState;
        outputState.setNewState(newState, ControlMode.schedule);
        await outputState.addCurrentStateToDatabaseAsync(1);
        dbStub.calledOnceWith({ id: 1, value: 0, controlMode: ControlMode.schedule });
        dbStub.resetHistory();

        //Stay in schedule, set manual value to 100
        newState = { value: 100 } as SDBOutputState;
        outputState.setNewState(newState, ControlMode.manual);
        await outputState.addCurrentStateToDatabaseAsync(1);
        dbStub.calledOnceWith({ id: 1, value: 0, controlMode: ControlMode.schedule });
        dbStub.resetHistory();

        //Swap to manual, value be 100 now
        outputState.updateControlMode(ControlMode.manual);
        await outputState.addCurrentStateToDatabaseAsync(1);
        dbStub.calledOnceWith({ id: 1, value: 100, controlMode: ControlMode.manual });
        dbStub.resetHistory();
      });
    });
  });

  describe("OutputCache class", function () {
    describe("loadCacheFromDatabaseAsync", function () {
      it("should load the cache from the database", async function () {
        sinon.stub(mockSprootDB, "getOutputStatesAsync").resolves([
          {
            controlMode: ControlMode.schedule,
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
        await outputCache.loadCacheFromDatabaseAsync(1, 9000);

        assert.equal(outputCache.get().length, 2);
        assert.equal(outputCache.get()[0]!.controlMode, ControlMode.schedule);
        assert.equal(outputCache.get()[0]!.value, 100);
        assert.isTrue(
          outputCache.get()[0]!.logTime.includes("Z") &&
            outputCache.get()[0]!.logTime.includes("T"),
        );
        assert.equal(outputCache.get()[1]!.controlMode, ControlMode.manual);
        assert.equal(outputCache.get()[1]!.value, 200);
        assert.isTrue(
          outputCache.get()[1]!.logTime.includes("Z") &&
            outputCache.get()[1]!.logTime.includes("T"),
        );
      });
    });

    describe("addData", function () {
      it("should add data to the cache", function () {
        const outputCache = new OutputCache(2, mockSprootDB, logger);
        const data = { controlMode: ControlMode.schedule, value: 100 } as SDBOutputState;
        outputCache.addData(data);

        assert.equal(outputCache.get().length, 1);
        assert.equal(outputCache.get()[0]!.controlMode, ControlMode.schedule);
        assert.equal(outputCache.get()[0]!.value, 100);
        assert.isTrue(
          outputCache.get()[0]!.logTime.includes("Z") &&
            outputCache.get()[0]!.logTime.includes("T"),
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

  describe("OutputChartData class", function () {
    describe("constructor", function () {
      it("should create a new OutputChartData object with default values", function () {
        const outputChartData = new OutputChartData(2, 5);

        const fiveMinutes = 1000 * 60 * 5;
        const fiveMinuteDate = new Date(
          Math.floor(new Date().getTime() / fiveMinutes) * fiveMinutes,
        );
        const earlierfiveMinuteDate = new Date(fiveMinuteDate.getTime() - fiveMinutes);

        assert.equal(outputChartData.get().length, 2);
        assert.isTrue(
          outputChartData.get()[0]?.name.includes(earlierfiveMinuteDate.getMinutes().toString()),
        );
        assert.isTrue(
          outputChartData.get()[1]?.name.includes(fiveMinuteDate.getMinutes().toString()),
        );
      });

      it("should create a new OutputChartData object with custom values", function () {
        const outputChartData = new OutputChartData(2, 5, [
          { name: "3/3 6:40 pm" },
          { name: "3/3 6:45 pm" },
        ]);

        assert.equal(outputChartData.get().length, 2);
        assert.isTrue(outputChartData.get()[0]?.name.includes("6:40 pm"));
        assert.isTrue(outputChartData.get()[1]?.name.includes("6:45 pm"));
      });
    });

    describe("loadChartData", function () {
      it("should load chart data from the given cache into existing chart data", function () {
        const outputCache = new OutputCache(4, mockSprootDB, logger);
        outputCache.addData(
          {
            logTime: "2024-03-03T18:40:01Z",
            controlMode: ControlMode.manual,
            value: 100,
          } as SDBOutputState,
          new Date("2024-03-03T18:40:01Z"),
        );
        outputCache.addData(
          {
            logTime: "2024-03-03T18:45:01Z",
            controlMode: ControlMode.schedule,
            value: 30,
          } as SDBOutputState,
          new Date("2024-03-03T18:45:01Z"),
        );
        outputCache.addData(
          {
            logTime: "2024-03-03T18:47:01Z",
            controlMode: ControlMode.manual,
            value: 0,
          } as SDBOutputState,
          new Date("2024-03-03T18:47:01Z"),
        ); //should be ignored
        outputCache.addData(
          {
            logTime: "2024-03-03T18:50:01Z",
            controlMode: ControlMode.manual,
            value: 0,
          } as SDBOutputState,
          new Date("2024-03-03T18:50:01Z"),
        );
        const outputChartData = new OutputChartData(4, 5, [
          { name: ChartData.formatDateForChart(new Date("2024-03-03T18:40:01Z")) },
          { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")) },
          { name: ChartData.formatDateForChart(new Date("2024-03-03T18:50:01Z")) },
        ]);
        outputChartData.loadChartData(outputCache.get(), "Test");

        assert.equal(outputChartData.get().length, 3);
        assert.equal(outputChartData.get()[0]?.["Test"], 100);
        assert.equal(outputChartData.get()[1]?.["Test"], 30);
        assert.equal(outputChartData.get()[2]?.["Test"], 0);
      });
    });

    describe("updateChartData", function () {
      it("should update the chart data with the last entry in the passed cache", function () {
        const outputChartData = new OutputChartData(4, 5, []);
        outputChartData.updateChartData(
          [{ value: 100, logTime: "2024-03-03T03:30:01Z" } as SDBOutputState],
          "Test",
        );

        assert.equal(outputChartData.get().length, 1);
        assert.equal(outputChartData.get()[0]?.["Test"], 100);
        assert.isString(outputChartData.get()[0]?.name);
      });
    });

    describe("shouldUpdateChartData", function () {
      it("should return true if the last entry in the cache is different from the last entry in the chart data", function () {
        const outputChartData = new OutputChartData(4, 5, [
          { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")), Test: 200 },
        ]);

        const outputCache = new OutputCache(4, mockSprootDB, logger);
        outputCache.addData(
          {
            logTime: "2024-03-03T18:50:01Z",
            controlMode: ControlMode.manual,
            value: 100,
          } as SDBOutputState,
          new Date("2024-03-03T18:50:01Z"),
        );

        assert.isTrue(outputChartData.shouldUpdateChartData(outputCache.get().slice(-1)[0]));
      });

      it("should return false if the last entry in the cache is the same as the last entry in the chart data", function () {
        const outputChartData = new OutputChartData(4, 5, [
          { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")), Test: 100 },
        ]);

        const outputCache = new OutputCache(4, mockSprootDB, logger);
        outputCache.addData(
          {
            logTime: "2024-03-03T18:49:01Z",
            controlMode: ControlMode.manual,
            value: 100,
          } as SDBOutputState,
          new Date("2024-03-03T18:49:01Z"),
        );
        assert.isFalse(outputChartData.shouldUpdateChartData(outputCache.get().slice(-1)[0]));
      });
    });
  });
});
