import bme280, { Bme280 } from "bme280";
import { BME280 } from "../BME280";
import { MockSprootDB } from "../../database/types/ISprootDB";
import { ReadingType } from "../types/SensorBase";
import { SDBSensor } from "../../database/types/SDBSensor";
import { SDBReading } from "../../database/types/SDBReading";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
const sandbox = sinon.createSandbox();
const mockSprootDB = new MockSprootDB();
const env = process.env;

describe("BME280.ts tests", function () {
  this.afterEach(() => {
    sandbox.restore();
    process.env = env;
  });

  it("should initialize a BME280 sensor", async () => {
    const mockBME280Data = {
      id: 1,
      description: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    sandbox
      .stub(bme280, "open")
      .resolves({ close: async function () {} } as Bme280); // Don't create a real sensor - needs I2C bus

    sandbox
      .stub(winston, "createLogger")
      .callsFake(
        () =>
          ({ info: () => {}, error: () => {} }) as unknown as winston.Logger,
      );
    const logger = winston.createLogger();

    const bme280Sensor = await new BME280(
      mockBME280Data,
      mockSprootDB,
      logger,
    ).initAsync();

    assert.isTrue(bme280Sensor instanceof BME280);
    assert.equal(bme280Sensor!.id, mockBME280Data.id);
    assert.equal(bme280Sensor!.description, mockBME280Data.description);
    assert.equal(bme280Sensor!.model, mockBME280Data.model);
    assert.equal(bme280Sensor!.address, mockBME280Data.address);
    assert.equal(bme280Sensor!.units[ReadingType.temperature], "°C");
    assert.equal(bme280Sensor!.units[ReadingType.humidity], "%rH");
    assert.equal(bme280Sensor!.units[ReadingType.pressure], "hPa");
  });

  it("should load cached readings from the database", async () => {
    const recordsToLoad = 2;
    const mockBME280Data = {
      id: 1,
      description: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    sandbox.stub(mockSprootDB, "getSensorReadingsAsync").resolves([
      {
        data: "1",
        metric: ReadingType.temperature,
        unit: "°C",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "2",
        metric: ReadingType.temperature,
        unit: "°C",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "1",
        metric: ReadingType.humidity,
        unit: "%rH",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "2",
        metric: ReadingType.humidity,
        unit: "%rH",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "1",
        metric: ReadingType.pressure,
        unit: "hPa",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "2",
        metric: ReadingType.pressure,
        unit: "hPa",
        logTime: new Date().toISOString(),
      } as SDBReading,
    ]);
    sandbox
      .stub(winston, "createLogger")
      .callsFake(
        () =>
          ({ info: () => {}, error: () => {} }) as unknown as winston.Logger,
      );
    const logger = winston.createLogger();
    const bme280Sensor = new BME280(mockBME280Data, mockSprootDB, logger);

    await bme280Sensor.loadCachedReadingsFromDatabaseAsync(recordsToLoad);

    assert.lengthOf(
      bme280Sensor.cachedReadings[ReadingType.temperature],
      recordsToLoad,
    );
    assert.lengthOf(
      bme280Sensor.cachedReadings[ReadingType.humidity],
      recordsToLoad,
    );
    assert.lengthOf(
      bme280Sensor.cachedReadings[ReadingType.pressure],
      recordsToLoad,
    );
  });

  it("should dispose of a BME280 sensor", async () => {
    const mockBME280Data = {
      id: 1,
      description: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    sandbox
      .stub(winston, "createLogger")
      .callsFake(
        () =>
          ({ info: () => {}, error: () => {} }) as unknown as winston.Logger,
      );
    const logger = winston.createLogger();
    const closeStub = sandbox.stub().resolves();
    sandbox
      .stub(bme280, "open")
      .resolves({ close: closeStub as Bme280["close"] } as Bme280); // Don't create a real sensor - needs I2C bus

    const bme280Sensor = await new BME280(
      mockBME280Data,
      mockSprootDB,
      logger,
    ).initAsync();
    await bme280Sensor!.disposeAsync();

    assert.isTrue(closeStub.calledOnce);
  });

  it("should get a reading from a BME280 sensor, updating the cache", async () => {
    process.env["MAX_SENSOR_READING_CACHE_SIZE"] = "2";
    const mockBME280Data = {
      id: 1,
      description: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    const mockReading = {
      temperature: 21.2,
      humidity: 45.6,
      pressure: 1013.2,
    };
    sandbox
      .stub(winston, "createLogger")
      .callsFake(
        () =>
          ({ info: () => {}, error: () => {} }) as unknown as winston.Logger,
      );
    const logger = winston.createLogger();
    const readStub = sandbox.stub().resolves(mockReading as bme280.data);
    sandbox
      .stub(bme280, "open")
      .resolves({ read: readStub as Bme280["read"] } as Bme280); // Don't create a real sensor - needs I2C bus

    sandbox.stub(mockSprootDB, "getSensorReadingsAsync").resolves([
      {
        data: "1",
        metric: ReadingType.temperature,
        unit: "°C",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "2",
        metric: ReadingType.temperature,
        unit: "°C",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "1",
        metric: ReadingType.humidity,
        unit: "%rH",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "2",
        metric: ReadingType.humidity,
        unit: "%rH",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "1",
        metric: ReadingType.pressure,
        unit: "hPa",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "2",
        metric: ReadingType.pressure,
        unit: "hPa",
        logTime: new Date().toISOString(),
      } as SDBReading,
    ]);
    const bme280Sensor = await new BME280(
      mockBME280Data,
      mockSprootDB,
      logger,
    ).initAsync();

    assert.equal(
      bme280Sensor!.cachedReadings[ReadingType.temperature].length,
      2,
    );
    assert.equal(bme280Sensor!.cachedReadings[ReadingType.humidity].length, 2);
    assert.equal(bme280Sensor!.cachedReadings[ReadingType.pressure].length, 2);
    await bme280Sensor!.getReadingAsync();

    assert.equal(
      bme280Sensor!.cachedReadings[ReadingType.temperature].length,
      2,
    );
    assert.equal(bme280Sensor!.cachedReadings[ReadingType.humidity].length, 2);
    assert.equal(bme280Sensor!.cachedReadings[ReadingType.pressure].length, 2);

    assert.isTrue(readStub.calledOnce);
    assert.equal(
      bme280Sensor!.lastReading[ReadingType.temperature],
      String(mockReading.temperature),
    );
    assert.equal(
      bme280Sensor!.lastReading[ReadingType.humidity],
      String(mockReading.humidity),
    );
    assert.equal(
      bme280Sensor!.lastReading[ReadingType.pressure],
      String(mockReading.pressure),
    );
  });
});
