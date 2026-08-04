import { ESP32_CapacitiveMoistureSensor } from "../ESP32_CapacitiveMoistureSensor";

import { ISensorsRepository } from "../../database/repositories/sensors/ISensorsRepository";
import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { SDBSensor } from "@sproot/common/database/SDBSensor";
import { SDBReading } from "@sproot/common/database/SDBReading";
import { ESP32_Ads1115Device, ESP32_ADS1115Response } from "../ESP32_ADS1115";

import { assert } from "chai";
import nock from "nock";
import * as sinon from "sinon";
import winston from "winston";
import { MdnsService } from "../../system/MdnsService";
import { SDBSubcontroller } from "@sproot/common/database/SDBSubcontroller";
import { DeviceDataQueryRow } from "@sproot/common/api/v2/QueryTypes";

const mockSensorsRepo: ISensorsRepository = {
  getAllAsync: async () => [],
  getByIdAsync: async () => [],
  getDS18B20AddressesAsync: async () => [],
  getByModelAsync: async () => [],
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

    sinon.stub(mockSensorsRepo, "getBucketedSensorReadingsAsync").resolves([
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

    await using sensor = await ESP32_CapacitiveMoistureSensor.createInstanceAsync(
      mockSensorData,
      mockSubcontroller,
      mockSensorsRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );

    assert.isNotNull(sensor);
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
    const stubbedMockSensorsRepo: ISensorsRepository = {
      ...mockSensorsRepo,
      getSensorReadingsAsync: sinon.stub().resolves([]),
      getBucketedSensorReadingsAsync: sinon.stub().resolves(undefined),
      updateSensorCalibrationAsync: sinon.stub().resolves(undefined),
    };
    const mockReading = 15000;
    let callCount = 0;
    const scope = nock("http://127.0.0.9")
      .get("/api/sensors/ads1115/0x48/0?gain=1")
      .twice()
      .reply(200, () => {
        callCount++;
        return {
          readings: {
            raw: mockReading,
            voltage: ESP32_Ads1115Device.computeVoltage(mockReading, "1"),
          },
        } as ESP32_ADS1115Response;
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
    await using capacitiveMoistureSensor = await ESP32_CapacitiveMoistureSensor.createInstanceAsync(
      mockADS1115Data,
      mockSubcontroller,
      stubbedMockSensorsRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );

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

    (stubbedMockSensorsRepo.getSensorReadingsAsync as any).resolves(mockedReadings);
    await using capacitiveMoistureSensor2 =
      await ESP32_CapacitiveMoistureSensor.createInstanceAsync(
        mockADS1115Data,
        mockSubcontroller,
        stubbedMockSensorsRepo,
        mockMdnsService,
        500,
        500,
        5,
        logger,
      );
    await capacitiveMoistureSensor2!.takeReadingAsync();
    assert.equal(callCount, 2);
    assert.equal(
      capacitiveMoistureSensor2!.lastReading[ReadingType.moisture],
      String(24.28571428571429), // calibrated value
    );

    // GetReading throws an errror
    await using capacitiveMoistureSensor3 =
      await ESP32_CapacitiveMoistureSensor.createInstanceAsync(
        mockADS1115Data,
        mockSubcontroller,
        stubbedMockSensorsRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );

    scope.get("/api/sensors/ads1115/0x48/0?gain=1").reply(500, "{ error: 'Device error' }");
    await capacitiveMoistureSensor3!.takeReadingAsync();
    assert.isUndefined(capacitiveMoistureSensor3!.lastReading[ReadingType.moisture]);
    assert.isTrue(loggerSpy.calledOnce);
    scope.done();
  });
});
