import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState.js";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase.js";
import { OutputCache } from "../OutputCache.js";
import { OutputChartData } from "../OutputChartData.js";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB.js";
import { formatDateForChart } from "@sproot/sproot-common/dist/utility/DisplayFormats.js";

import { assert } from "chai";
import winston from "winston";

describe("OutputChartData.ts tests", function () {
  const mockSprootDB = new MockSprootDB();
  let logger: winston.Logger;
  describe("constructor", function () {
    it("should create a new OutputChartData object with default values", function () {
      const outputChartData5 = new OutputChartData(3, 5);
      const outputChartData3 = new OutputChartData(3, 3);

      const fiveMinutes = 1000 * 60 * 5;
      const threeMinutes = 1000 * 60 * 3;
      const fiveMinuteDate = new Date(Math.floor(new Date().getTime() / fiveMinutes) * fiveMinutes);
      const threeMinuteDate = new Date(
        Math.floor(new Date().getTime() / threeMinutes) * threeMinutes,
      );
      const earlierFiveMinuteDate = new Date(fiveMinuteDate.getTime() - fiveMinutes);
      const earliestFiveMinuteDate = new Date(earlierFiveMinuteDate.getTime() - fiveMinutes);
      const earlierThreeMinuteDate = new Date(threeMinuteDate.getTime() - threeMinutes);
      const earliestThreeMinuteDate = new Date(earlierThreeMinuteDate.getTime() - threeMinutes);

      assert.equal(outputChartData5.get().data.length, 3);
      assert.equal(outputChartData3.get().data.length, 3);

      assert.isTrue(
        outputChartData5
          .get()
          .data[0]?.name.includes(earliestFiveMinuteDate.getMinutes().toString()),
      );
      assert.isTrue(
        outputChartData5
          .get()
          .data[1]?.name.includes(earlierFiveMinuteDate.getMinutes().toString()),
      );
      assert.isTrue(
        outputChartData5.get().data[2]?.name.includes(fiveMinuteDate.getMinutes().toString()),
      );
      assert.isTrue(
        outputChartData3
          .get()
          .data[0]?.name.includes(earliestThreeMinuteDate.getMinutes().toString()),
      );
      assert.isTrue(
        outputChartData3
          .get()
          .data[1]?.name.includes(earlierThreeMinuteDate.getMinutes().toString()),
      );
      assert.isTrue(
        outputChartData3.get().data[2]?.name.includes(threeMinuteDate.getMinutes().toString()),
      );
    });

    it("should create a new OutputChartData object with custom values", function () {
      const outputChartData = new OutputChartData(2, 5, [
        { name: "3/3 6:40 pm" },
        { name: "3/3 6:45 pm" },
      ]);

      assert.equal(outputChartData.get().data.length, 2);
      assert.isTrue(outputChartData.get().data[0]?.name.includes("6:40 pm"));
      assert.isTrue(outputChartData.get().data[1]?.name.includes("6:45 pm"));
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
          controlMode: ControlMode.automatic,
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
        { name: formatDateForChart(new Date("2024-03-03T18:40:01Z")) },
        { name: formatDateForChart(new Date("2024-03-03T18:45:01Z")) },
        { name: formatDateForChart(new Date("2024-03-03T18:50:01Z")) },
      ]);
      outputChartData.loadChartData(outputCache.get(), "Test");

      assert.equal(outputChartData.get().data.length, 3);
      assert.equal(outputChartData.get().data[0]?.["Test"], 100);
      assert.equal(outputChartData.get().data[1]?.["Test"], 30);
      assert.equal(outputChartData.get().data[2]?.["Test"], 0);
    });
  });

  describe("updateChartData", function () {
    it("should update the chart data with the last entry in the passed cache", function () {
      const outputChartData = new OutputChartData(4, 5, []);
      //No data should get nothing added
      outputChartData.updateChartData([], "Test");
      assert.isEmpty(outputChartData.get().data);

      //Only one of these should be added.
      outputChartData.updateChartData(
        [{ value: 100, logTime: "2024-03-03T03:30:01Z" } as SDBOutputState],
        "Test",
      );
      outputChartData.updateChartData(
        [{ value: 100, logTime: "2024-03-03T03:30:01Z" } as SDBOutputState],
        "Test",
      );

      assert.equal(outputChartData.get().data.length, 1);
      assert.equal(outputChartData.get().data[0]?.["Test"], 100);
      assert.isString(outputChartData.get().data[0]?.name);
    });
  });

  describe("shouldUpdateChartData", function () {
    it("should return true if the last entry in the cache is different from the last entry in the chart data", function () {
      const outputChartData = new OutputChartData(4, 5, [
        { name: formatDateForChart(new Date("2024-03-03T18:45:01Z")), Test: 200 },
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
        { name: formatDateForChart(new Date("2024-03-03T18:45:01Z")), Test: 100 },
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
