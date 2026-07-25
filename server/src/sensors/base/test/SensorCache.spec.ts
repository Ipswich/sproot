import { ISensorsRepository } from "@sproot/common/dist/database/sensors/ISensorsRepository";
import winston from "winston";

import { assert } from "chai";
import * as sinon from "sinon";
import { SDBReading } from "@sproot/common/dist/database/SDBReading";
import { SensorCache } from "../SensorCache";
import { ReadingType } from "@sproot/common/dist/sensors/ReadingType";
import { DeviceDataQueryRow } from "@sproot/common/dist/api/v2/QueryTypes";

const mockSensorsRepo: ISensorsRepository = {
  getAllAsync: async () => [],
  getByIdAsync: async () => [],
  getDS18B20AddressesAsync: async () => [],
  addAsync: async () => {},
  updateAsync: async () => {},
  updateSensorCalibrationAsync: async () => {},
  deleteAsync: async () => {},
  addSensorReadingAsync: async () => {},
  getSensorReadingsAsync: async () => [],
  getBucketedSensorReadingsAsync: async () => [],
  getDataAsync: async () => ({
    xAxis: { field: "time", values: [] },
    data: {} as DeviceDataQueryRow,
  }),
};

describe("SensorCache.ts tests", function () {
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
      sinon.stub(mockSensorsRepo, "getBucketedSensorReadingsAsync").resolves([
        {
          data: "100",
          units: "°C",
          metric: ReadingType.temperature,
          logTime: "2024-03-03T03:29:01Z",
        } as SDBReading,
        {
          data: "100",
          units: "%rH",
          metric: ReadingType.humidity,
          logTime: "2024-03-03T03:29:01Z",
        } as SDBReading,
        {
          data: "101",
          units: "°C",
          metric: ReadingType.temperature,
          logTime: "2024-03-03T03:29:01Z",
        } as SDBReading,
        {
          data: "101",
          units: "%rH",
          metric: ReadingType.humidity,
          logTime: "2024-03-03T03:29:01Z",
        } as SDBReading,
      ]);
      const sensorCache = new SensorCache(2, mockSensorsRepo, logger);
      await sensorCache.loadFromDatabaseAsync(1, 9000);

      assert.equal(sensorCache.get(ReadingType.temperature).length, 2);
      assert.equal(sensorCache.get(ReadingType.humidity).length, 2);

      assert.equal(sensorCache.get(ReadingType.temperature)[0]!.units, "°C");
      assert.equal(sensorCache.get(ReadingType.temperature)[0]!.data, "100");
      assert.isTrue(
        sensorCache.get(ReadingType.temperature)[0]!.logTime.includes("Z") &&
          sensorCache.get(ReadingType.temperature)[0]!.logTime.includes("T"),
      );
      assert.equal(sensorCache.get(ReadingType.temperature)[1]!.data, "101");
      assert.isTrue(
        sensorCache.get(ReadingType.temperature)[1]!.logTime.includes("Z") &&
          sensorCache.get(ReadingType.temperature)[1]!.logTime.includes("T"),
      );
    });
  });

  describe("addData", function () {
    it("should add data to the cache", function () {
      const sensorCache = new SensorCache(2, mockSensorsRepo, logger);
      const data = {
        data: "100",
        units: "°C",
        metric: ReadingType.temperature,
        logTime: "2024-03-03T03:29:01Z",
      } as SDBReading;

      assert.isEmpty(sensorCache.get(ReadingType.temperature));
      sensorCache.addData(data);

      assert.equal(sensorCache.get(ReadingType.temperature).length, 1);
      assert.equal(sensorCache.get(ReadingType.temperature)[0]!.units, "°C");
      assert.equal(sensorCache.get(ReadingType.temperature)[0]!.data, "100");
      assert.isTrue(
        sensorCache.get(ReadingType.temperature)[0]!.logTime.includes("Z") &&
          sensorCache.get(ReadingType.temperature)[0]!.logTime.includes("T"),
      );
    });

    it("should remove the oldest data if the cache is full", function () {
      const outputCache = new SensorCache(2, mockSensorsRepo, logger);
      const temperatureData = {
        data: "100",
        units: "°C",
        metric: ReadingType.temperature,
        logTime: "2024-03-03T03:29:01Z",
      } as SDBReading;
      const humidityData = {
        data: "50",
        units: "%rH",
        metric: ReadingType.humidity,
        logTime: "2024-03-03T03:29:01Z",
      } as SDBReading;
      outputCache.addData(temperatureData);
      outputCache.addData(temperatureData);
      outputCache.addData(temperatureData);

      outputCache.addData(humidityData);
      outputCache.addData(humidityData);
      outputCache.addData(humidityData);

      assert.equal(outputCache.get(ReadingType.temperature).length, 2);
      assert.equal(outputCache.get(ReadingType.humidity).length, 2);
    });
  });

  describe("clear", function () {
    it("should clear the cache", function () {
      const outputCache = new SensorCache(2, mockSensorsRepo, logger);
      const temperatureData = {
        data: "100",
        units: "°C",
        metric: ReadingType.temperature,
        logTime: "2024-03-03T03:29:01Z",
      } as SDBReading;
      const humidityData = {
        data: "50",
        units: "%rH",
        metric: ReadingType.humidity,
        logTime: "2024-03-03T03:29:01Z",
      } as SDBReading;

      outputCache.addData(temperatureData);
      outputCache.addData(humidityData);
      assert.equal(outputCache.get(ReadingType.temperature).length, 1);
      assert.equal(outputCache.get(ReadingType.humidity).length, 1);

      outputCache.clear();
      assert.equal(outputCache.get(ReadingType.temperature).length, 0);
      assert.equal(outputCache.get(ReadingType.humidity).length, 0);
    });
  });
});
