import bme280, { Bme280 } from "bme280";
import { BME280 } from "@sproot/sproot-server/src/sensors/BME280";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
const mockSprootDB = new MockSprootDB();

describe("BME280.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });
  it("should initialize a BME280 sensor", async () => {
    const mockBME280Data = {
      id: 1,
      name: "test sensor 1",
      model: "BME280",
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
    sinon.stub(bme280, "open").resolves({ close: async function () {} } as Bme280); // Don't create a real sensor - needs I2C bus

    sinon.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();

    const bme280Sensor = await new BME280(
      mockBME280Data,
      mockSprootDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    assert.equal(bme280Sensor!.getCachedReadings()[ReadingType.temperature]!.length, 2);
    assert.isTrue(bme280Sensor instanceof BME280);
    assert.equal(bme280Sensor!.id, mockBME280Data.id);
    assert.equal(bme280Sensor!.name, mockBME280Data.name);
    assert.equal(bme280Sensor!.model, mockBME280Data.model);
    assert.equal(bme280Sensor!.address, mockBME280Data.address);
    assert.equal(bme280Sensor!.units[ReadingType.temperature], "°C");
    assert.equal(bme280Sensor!.units[ReadingType.humidity], "%rH");
    assert.equal(bme280Sensor!.units[ReadingType.pressure], "hPa");

    //Cleanup
    await bme280Sensor?.disposeAsync();
  });

  it("should get a reading from a BME280 sensor", async () => {
    const mockBME280Data = {
      id: 1,
      name: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    const mockReading = {
      temperature: 21.2,
      humidity: 45.6,
      pressure: 1013.2,
    };
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
    const readStub = sinon.stub().resolves(mockReading as bme280.data);
    const closeStub = sinon.stub().resolves();
    const openStub = sinon.stub(bme280, "open").resolves({
      read: readStub as Bme280["read"],
      close: closeStub as Bme280["close"],
    } as Bme280); // Don't create a real sensor - needs I2C bus

    let bme280Sensor = await new BME280(
      mockBME280Data,
      mockSprootDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    await bme280Sensor!.takeReadingAsync();

    assert.isTrue(readStub.calledOnce);
    assert.equal(
      bme280Sensor!.lastReading[ReadingType.temperature],
      String(mockReading.temperature),
    );
    assert.equal(bme280Sensor!.lastReading[ReadingType.humidity], String(mockReading.humidity));
    assert.equal(bme280Sensor!.lastReading[ReadingType.pressure], String(mockReading.pressure));

    await bme280Sensor?.disposeAsync();

    // GetReading throws an errror
    bme280Sensor = await new BME280(mockBME280Data, mockSprootDB, 5, 5, 3, 5, logger).initAsync();

    openStub.rejects(new Error("Failed to open sensor"));
    await bme280Sensor!.takeReadingAsync();
    assert.isUndefined(bme280Sensor!.lastReading[ReadingType.temperature]);
    assert.isUndefined(bme280Sensor!.lastReading[ReadingType.humidity]);
    assert.isUndefined(bme280Sensor!.lastReading[ReadingType.pressure]);
    assert.isTrue(loggerSpy.calledOnce);

    //Cleanup
    await bme280Sensor?.disposeAsync();
  });
});
