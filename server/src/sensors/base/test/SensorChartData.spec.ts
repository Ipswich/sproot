import { MockSprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import winston from "winston";

import { assert } from "chai";
import * as sinon from "sinon";
import { SensorChartData } from "../SensorChartData";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
import { ChartData, DataSeries } from "@sproot/sproot-common/src/utility/ChartData";
import { SensorCache } from "../SensorCache";
import { SDBReading } from "@sproot/sproot-common/src/database/SDBReading";

describe("SensorChartData.ts tests", function () {
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

  describe("constructor", function () {
    it("should create a new SensorChartData object with custom values", function () {
      const dataSeries = {} as Record<ReadingType, DataSeries>;
      dataSeries.temperature = [
        { name: "6:40 pm", value: 100 },
        { name: "6:45 pm", value: 30 },
      ];
      const sensorChartData = new SensorChartData(2, 5, dataSeries);

      assert.equal(sensorChartData.get().data[ReadingType.temperature].length, 2);
      assert.isTrue(
        sensorChartData.get().data[ReadingType.temperature][0]?.name.includes("6:40 pm"),
      );
      assert.isTrue(
        sensorChartData.get().data[ReadingType.temperature][1]?.name.includes("6:45 pm"),
      );
    });
  });

  describe("loadChartData", function () {
    it("should load chart data from the given cache into existing chart data", function () {
      const humidityCache = new SensorCache(4, mockSprootDB, logger);
      humidityCache.addData(
        {
          logTime: new Date().toISOString(),
          units: "%rH",
          metric: ReadingType.humidity,
          data: "30",
        } as SDBReading,
        new Date(),
      );
      const temperatureCache = new SensorCache(4, mockSprootDB, logger);
      temperatureCache.addData(
        {
          logTime: "2024-03-03T18:40:01Z",
          units: "°C",
          metric: ReadingType.temperature,
          data: "100",
        } as SDBReading,
        new Date("2024-03-03T18:40:01Z"),
      );
      temperatureCache.addData(
        {
          logTime: "2024-03-03T18:45:01Z",
          units: "°C",
          metric: ReadingType.temperature,
          data: "30",
        } as SDBReading,
        new Date("2024-03-03T18:45:01Z"),
      );
      temperatureCache.addData(
        {
          logTime: "2022-03-03T18:47:01Z",
          units: "°C",
          metric: ReadingType.temperature,
          data: "100",
        } as SDBReading,
        new Date("2022-03-03T18:47:01Z"),
      ); //should be ignored by chart data
      temperatureCache.addData(
        {
          logTime: "2024-03-03T18:50:01Z",
          units: "°C",
          metric: ReadingType.temperature,
          data: "0",
        } as SDBReading,
        new Date("2024-03-03T18:50:01Z"),
      );

      const dataSeriesRecord = {} as Record<ReadingType, DataSeries>;
      dataSeriesRecord.temperature = [
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:40:01Z")) },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")) },
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:50:01Z")) },
      ];

      const sensorChartData = new SensorChartData(4, 5, dataSeriesRecord);
      sensorChartData.loadChartData(
        humidityCache.get(ReadingType.humidity),
        "Test",
        ReadingType.humidity,
      );
      sensorChartData.loadChartData(
        temperatureCache.get(ReadingType.temperature),
        "Test",
        ReadingType.temperature,
      );
      assert.equal(Object.keys(sensorChartData.get()).length, 2);
      assert.equal(sensorChartData.get().data[ReadingType.humidity].length, 4);
      assert.equal(sensorChartData.get().data[ReadingType.humidity][0]?.["Test"], undefined);

      assert.equal(sensorChartData.get().data[ReadingType.temperature].length, 3);
      assert.equal(sensorChartData.get().data[ReadingType.temperature][0]?.["Test"], 100);
      assert.equal(sensorChartData.get().data[ReadingType.temperature][1]?.["Test"], 30);
      assert.equal(sensorChartData.get().data[ReadingType.temperature][2]?.["Test"], 0);
    });
  });

  describe("updateChartData", function () {
    it("should update the chart data with the last entry in the passed cache, adding a key if necessary", function () {
      const sensorChartData = new SensorChartData(4, 5);
      assert.equal(Object.keys(sensorChartData.get().data).length, 0);

      sensorChartData.updateChartData(
        [
          {
            metric: ReadingType.temperature,
            units: "°C",
            data: "100",
            logTime: "2024-03-03T03:30:01Z",
          } as SDBReading,
        ],
        "Test",
        ReadingType.temperature,
      );
      sensorChartData.updateChartData(
        [
          {
            metric: ReadingType.humidity,
            units: "%rH",
            data: "30",
            logTime: "2024-03-03T03:30:01Z",
          } as SDBReading,
        ],
        "Test",
        ReadingType.humidity,
      );

      //These two should be ignored (duplicate entry, and empty cache data)
      sensorChartData.updateChartData(
        [
          {
            metric: ReadingType.humidity,
            units: "%rH",
            data: "30",
            logTime: "2024-03-03T03:30:01Z",
          } as SDBReading,
        ],
        "Test",
        ReadingType.humidity,
      );
      sensorChartData.updateChartData([], "Test", ReadingType.temperature);

      assert.equal(Object.keys(sensorChartData.get().data).length, 2);

      assert.equal(sensorChartData.get().data[ReadingType.temperature].length, 4);
      assert.equal(sensorChartData.get().data[ReadingType.temperature].slice(-1)[0]?.["Test"], 100);
      assert.isString(sensorChartData.get().data[ReadingType.temperature][0]?.name);

      assert.equal(sensorChartData.get().data[ReadingType.humidity].length, 4);
      assert.equal(sensorChartData.get().data[ReadingType.humidity].slice(-1)[0]?.["Test"], 30);
      assert.isString(sensorChartData.get().data[ReadingType.humidity][0]?.name);
    });
  });

  describe("shouldUpdateChartData", function () {
    it("should return true if the last entry in the cache is different from the last entry in the chart data", function () {
      const dataSeriesRecord = {} as Record<ReadingType, DataSeries>;
      dataSeriesRecord.temperature = [
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")) },
      ];
      const sensorChartData = new SensorChartData(4, 5, dataSeriesRecord);

      const sensorCache = new SensorCache(4, mockSprootDB, logger);
      sensorCache.addData(
        {
          logTime: "2024-03-03T18:50:01Z",
          metric: ReadingType.temperature,
          units: "°C",
          data: "100",
        } as SDBReading,
        new Date("2024-03-03T18:50:01Z"),
      );

      assert.isTrue(
        sensorChartData.shouldUpdateChartData(
          ReadingType.temperature,
          sensorCache.get(ReadingType.temperature).slice(-1)[0],
        ),
      );
    });

    it("should return false if the last entry in the cache is the same as the last entry in the chart data", function () {
      const dataSeriesRecord = {} as Record<ReadingType, DataSeries>;
      dataSeriesRecord.temperature = [
        { name: ChartData.formatDateForChart(new Date("2024-03-03T18:45:01Z")) },
      ];
      const sensorChartData = new SensorChartData(4, 5, dataSeriesRecord);

      const sensorCache = new SensorCache(4, mockSprootDB, logger);
      sensorCache.addData(
        {
          logTime: "2024-03-03T18:49:01Z",
          metric: ReadingType.temperature,
          units: "°C",
          data: "100",
        } as SDBReading,
        new Date("2024-03-03T18:49:01Z"),
      );
      assert.isFalse(
        sensorChartData.shouldUpdateChartData(
          ReadingType.temperature,
          sensorCache.get(ReadingType.temperature).slice(-1)[0],
        ),
      );
    });
  });
});
