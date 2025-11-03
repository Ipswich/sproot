import { ESP32_CapacitiveMoistureSensor } from "../ESP32_CapacitiveMoistureSensor";

import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { ESP32_ADS1115Response } from "../ESP32_ADS1115";

import { assert } from "chai";
import nock from "nock";
import * as sinon from "sinon";
import winston from "winston";
import { MdnsService } from "../../system/MdnsService";
import { SDBSubcontroller } from "@sproot/sproot-common/dist/database/SDBSubcontroller";
const mockSprootDB = new MockSprootDB();

describe("ESP32_CapacitiveMoistureSensor.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });

  it("should initialize an ESP32_CapacitiveMoistureSensor", async () => {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    const mockSubcontroller = {
      id: 1,
      name: "sproot-device-7ab3",
      hostName: "sproot-device-7ab3.local",
    } as SDBSubcontroller;
    const mockSensorData = {
      id: 1,
      name: "test sensor 1",
      model: "CAPACITIVE_MOISTURE_SENSOR",
      subcontrollerId: 1,
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

    await using sensor = await new ESP32_CapacitiveMoistureSensor(
      mockSensorData,
      mockSubcontroller,
      mockSprootDB,
      mockMdnsService,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    assert.isNotNull(sensor);
    assert.instanceOf(sensor, ESP32_CapacitiveMoistureSensor);
    assert.equal(sensor.id, mockSensorData.id);
    assert.equal(sensor.name, mockSensorData.name);
    assert.equal(sensor.model, mockSensorData.model);
    assert.equal(sensor.address, mockSensorData.address);
    assert.equal(sensor.pin, mockSensorData.pin);
    assert.equal(sensor.units[ReadingType.moisture], "%");
  });

  it("should take a reading from a CapacitiveMoistureSensor", async () => {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    const mockSubcontroller = {
      id: 1,
      name: "sproot-device-7ab3",
      hostName: "sproot-device-7ab3.local",
    } as SDBSubcontroller;
    mockMdnsService.getIPAddressByHostName.returns("127.0.0.9");
    const stubbedMockDB = sinon.createStubInstance(MockSprootDB);
    stubbedMockDB.getSensorReadingsAsync.resolves([]);
    const mockReading = 15000;
    let callCount = 0;
    const scope = nock("http://127.0.0.9")
      .get("/api/sensors/ads1115/0x48/0?gain=1")
      .twice()
      .reply(200, () => {
        callCount++;
        return { voltage: mockReading } as ESP32_ADS1115Response;
      });

    const mockADS1115Data = {
      id: 1,
      name: "test sensor 1",
      subcontrollerId: 1,
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
    await using capacitiveMoistureSensor = await new ESP32_CapacitiveMoistureSensor(
      mockADS1115Data,
      mockSubcontroller,
      stubbedMockDB,
      mockMdnsService,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    await capacitiveMoistureSensor!.takeReadingAsync();

    assert.equal(callCount, 1);
    assert.equal(
      capacitiveMoistureSensor!.lastReading[ReadingType.moisture],
      String(85.71428571428572), // calibrated value
    );

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
    await using capacitiveMoistureSensor2 = await new ESP32_CapacitiveMoistureSensor(
      mockADS1115Data,
      mockSubcontroller,
      stubbedMockDB,
      mockMdnsService,
      500,
      500,
      3,
      5,
      logger,
    ).initAsync();
    await capacitiveMoistureSensor2!.takeReadingAsync();
    assert.equal(callCount, 2);
    assert.equal(
      capacitiveMoistureSensor2!.lastReading[ReadingType.moisture],
      String(24.28571428571429), // calibrated value
    );

    // GetReading throws an errror
    await using capacitiveMoistureSensor3 = await new ESP32_CapacitiveMoistureSensor(
      mockADS1115Data,
      mockSubcontroller,
      stubbedMockDB,
      mockMdnsService,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    scope.get("/api/sensors/ads1115/0x48/0?gain=1").reply(500, "{ error: 'Device error' }");
    await capacitiveMoistureSensor3!.takeReadingAsync();
    assert.isUndefined(capacitiveMoistureSensor3!.lastReading[ReadingType.moisture]);
    assert.isTrue(loggerSpy.calledOnce);
    scope.done();
  });
});
