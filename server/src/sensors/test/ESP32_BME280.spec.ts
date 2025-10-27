import { ESP32_BME280 } from "@sproot/sproot-server/src/sensors/ESP32_BME280";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";

import { assert } from "chai";
import nock from "nock";
import * as sinon from "sinon";
import winston from "winston";
const mockSprootDB = new MockSprootDB();

describe("ESP32_BME280.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });
  it("should initialize a BME280 sensor", async () => {
    const mockBME280Data = {
      id: 1,
      name: "test sensor 1",
      model: "ESP32_BME280",
      address: "0x76",
    } as SDBSensor;
    sinon.stub(mockSprootDB, "getSensorReadingsAsync").resolves([
      {
        data: "1",
        metric: ReadingType.temperature,
        units: "°C",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "2",
        metric: ReadingType.temperature,
        units: "°C",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "1",
        metric: ReadingType.humidity,
        units: "%rH",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "2",
        metric: ReadingType.humidity,
        units: "%rH",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "1",
        metric: ReadingType.pressure,
        units: "hPa",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "2",
        metric: ReadingType.pressure,
        units: "hPa",
        logTime: new Date().toISOString(),
      } as SDBReading,
    ]);

    sinon.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();

    await using bme280Sensor = await new ESP32_BME280(
      mockBME280Data,
      mockSprootDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    assert.equal(bme280Sensor!.getCachedReadings()[ReadingType.temperature]!.length, 2);
    assert.isTrue(bme280Sensor instanceof ESP32_BME280);
    assert.equal(bme280Sensor!.id, mockBME280Data.id);
    assert.equal(bme280Sensor!.name, mockBME280Data.name);
    assert.equal(bme280Sensor!.model, mockBME280Data.model);
    assert.equal(bme280Sensor!.address, mockBME280Data.address);
    assert.equal(bme280Sensor!.units[ReadingType.temperature], "°C");
    assert.equal(bme280Sensor!.units[ReadingType.humidity], "%rH");
    assert.equal(bme280Sensor!.units[ReadingType.pressure], "hPa");
  });

  it("should get a reading from a BME280 sensor", async () => {
    let callCount = 0;
    const mockReading = {
      temperature: 21.2,
      humidity: 45.6,
      pressure: 1013.2,
    };
    const scope = nock("http://127.0.0.3")
      .get("/api/sensors/bme280/0x76")
      .reply(200, () => {
        callCount++;
        return mockReading;
      });
    const mockBME280Data = {
      id: 1,
      name: "test sensor 1",
      model: "ESP32_BME280",
      externalAddress: "http://127.0.0.3",
      address: "0x76",
    } as SDBSensor;
    const loggerSpy = sinon.spy();
    sinon.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: loggerSpy,
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();

    await using bme280Sensor = await new ESP32_BME280(
      mockBME280Data,
      mockSprootDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    await bme280Sensor!.takeReadingAsync();

    assert.equal(callCount, 1);
    assert.equal(
      bme280Sensor!.lastReading[ReadingType.temperature],
      String(mockReading.temperature),
    );
    assert.equal(bme280Sensor!.lastReading[ReadingType.humidity], String(mockReading.humidity));
    assert.equal(bme280Sensor!.lastReading[ReadingType.pressure], String(mockReading.pressure));

    // GetReading throws an errror
    await using bme280Sensor2 = await new ESP32_BME280(
      mockBME280Data,
      mockSprootDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    scope.get("/api/sensors/bme280/0x76").reply(500, () => {
      {
        return { error: "Internal Server Error" };
      }
    });

    await bme280Sensor2!.takeReadingAsync();
    assert.isUndefined(bme280Sensor2!.lastReading[ReadingType.temperature]);
    assert.isUndefined(bme280Sensor2!.lastReading[ReadingType.humidity]);
    assert.isUndefined(bme280Sensor2!.lastReading[ReadingType.pressure]);

    scope.done();
  });
});
