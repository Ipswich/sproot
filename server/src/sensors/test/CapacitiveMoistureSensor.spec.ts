import { CapacitiveMoistureSensor } from "../CapacitiveMoistureSensor";
import { Ads1115Device } from "../ADS1115";

import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
const mockSprootDB = new MockSprootDB();

describe("CapacitiveMoistureSensor.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });

  it("should initialize a CapacitiveMoistureSensor", async () => {
    const mockSensorData = {
      id: 1,
      name: "test sensor 1",
      model: "CAPACITIVE_MOISTURE_SENSOR",
      address: "0x48",
      pin: "0",
    } as SDBSensor;

    sinon.stub(mockSprootDB, "getSensorReadingsAsync").resolves([
      {
        data: "1",
        metric: ReadingType.moisture,
        units: "%",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "99",
        metric: ReadingType.moisture,
        units: "%",
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

    sinon
      .stub(Ads1115Device, "openAsync")
      .resolves({ measureAsync: async (_mux, _gain) => 15000 } as Ads1115Device);

    await using sensor = await new CapacitiveMoistureSensor(
      mockSensorData,
      mockSprootDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    assert.isNotNull(sensor);
    assert.instanceOf(sensor, CapacitiveMoistureSensor);
    assert.equal(sensor.id, mockSensorData.id);
    assert.equal(sensor.name, mockSensorData.name);
    assert.equal(sensor.model, mockSensorData.model);
    assert.equal(sensor.address, mockSensorData.address);
    assert.equal(sensor.pin, mockSensorData.pin);
    assert.equal(sensor.units[ReadingType.moisture], "%");
  });

  it("should take a reading from a CapacitiveMoistureSensor", async () => {
    const stubbedMockDB = sinon.createStubInstance(MockSprootDB);
    const mockReading = 15000;
    stubbedMockDB.getSensorReadingsAsync.resolves([]);

    const mockADS1115Data = {
      id: 1,
      name: "test sensor 1",
      model: "ADS1115",
      address: "0x48",
      pin: "0",
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
    const openStub = sinon.stub(Ads1115Device, "openAsync").resolves({
      measureAsync: async (_mux, _gain) => mockReading,
      [Symbol.asyncDispose]: async () => {},
    } as Ads1115Device);
    await using capacitiveMoistureSensor = await new CapacitiveMoistureSensor(
      mockADS1115Data,
      stubbedMockDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    await capacitiveMoistureSensor!.takeReadingAsync();

    assert.isTrue(openStub.calledOnce);
    assert.equal(
      capacitiveMoistureSensor!.lastReading[ReadingType.moisture],
      String(85.71428571428572), // calibrated value
    );
    openStub.resetHistory();

    // GetReading with cached values should average the readings
    const mockedReadings = [];
    const now = new Date().getTime() - 900000; // 15 minutes ago
    let i = 0;
    // 10 of these get loaded in, and of those, 5 are old and should not count
    for (i; i < 10; i++) {
      mockedReadings.push({
        data: `${i}`,
        metric: ReadingType.moisture,
        units: "%",
        logTime: new Date(now).toISOString(),
      } as SDBReading);
    }
    for (i; i < 15; i++) {
      mockedReadings.push({
        data: `${i}`,
        metric: ReadingType.moisture,
        units: "%",
        logTime: new Date(now + i * 60000).toISOString(),
      } as SDBReading);
    }

    stubbedMockDB.getSensorReadingsAsync.resolves(mockedReadings);
    await using capacitiveMoistureSensor2 = await new CapacitiveMoistureSensor(
      mockADS1115Data,
      stubbedMockDB,
      500,
      500,
      3,
      5,
      logger,
    ).initAsync();
    await capacitiveMoistureSensor2!.takeReadingAsync();
    assert.isTrue(openStub.calledOnce);
    assert.equal(
      capacitiveMoistureSensor2!.lastReading[ReadingType.moisture],
      String(24.28571428571429), // calibrated value
    );

    openStub.resetHistory();

    // GetReading throws an errror
    await using capacitiveMoistureSensor3 = await new CapacitiveMoistureSensor(
      mockADS1115Data,
      stubbedMockDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    openStub.rejects(new Error("Failed to open sensor"));
    await capacitiveMoistureSensor3!.takeReadingAsync();
    assert.isUndefined(capacitiveMoistureSensor3!.lastReading[ReadingType.moisture]);
    assert.isTrue(loggerSpy.calledOnce);
  });
});
