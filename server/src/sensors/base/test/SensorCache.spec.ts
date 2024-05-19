import { MockSprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import winston from "winston";

import { assert } from "chai";
import * as sinon from "sinon";
import { SDBReading } from "@sproot/sproot-common/src/database/SDBReading";
import { SensorCache } from "../SensorCache";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";
const sandbox = sinon.createSandbox();

describe("SensorCache.ts tests", function () {
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

  describe("loadCacheFromDatabaseAsync", function () {
    it("should load the cache from the database", async function () {
      sinon.stub(mockSprootDB, "getSensorReadingsAsync").resolves([
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
      const sensorCache = new SensorCache(2, mockSprootDB, logger);
      await sensorCache.loadCacheFromDatabaseAsync(1, 9000);

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
      const sensorCache = new SensorCache(2, mockSprootDB, logger);
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
      const outputCache = new SensorCache(2, mockSprootDB, logger);
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
      const outputCache = new SensorCache(2, mockSprootDB, logger);
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
