import { ESP32_DS18B20 } from "../ESP32_DS18B20";
import { ISensorsRepository } from "@sproot/common/database/sensors/ISensorsRepository";
import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { SDBReading } from "@sproot/common/database/SDBReading";
import { SDBSensor } from "@sproot/common/database/SDBSensor";

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

describe("ESP32_DS18B20.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });

  it("should create but not initialize a DS18B20 sensor", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    const mockSubcontroller = {
      id: 1,
      name: "sproot-device-7ab3",
      hostName: "sproot-device-7ab3.local",
    } as SDBSubcontroller;
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 1",
      model: "DS18B20",
      address: "28-00000",
      subcontrollerId: 1,
    } as SDBSensor;
    sinon.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();

    await using ds18b20Sensor = await ESP32_DS18B20.createInstanceAsync(
      mockDS18B20Data,
      mockSubcontroller,
      mockSensorsRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );

    assert.isTrue(ds18b20Sensor instanceof ESP32_DS18B20);
    assert.equal(ds18b20Sensor!.id, mockDS18B20Data.id);
    assert.equal(ds18b20Sensor!.name, mockDS18B20Data.name);
    assert.equal(ds18b20Sensor!.model, mockDS18B20Data.model);
    assert.equal(ds18b20Sensor!.address, mockDS18B20Data.address);
    assert.equal(ds18b20Sensor!.units[ReadingType.temperature], "°C");
  });

  it("should get a reading from a DS18B20 sensor, gracefully handling errors", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    const mockSubcontroller = {
      id: 1,
      name: "sproot-device-7ab3",
      hostName: "sproot-device-7ab3.local",
    } as SDBSubcontroller;
    mockMdnsService.getIPAddressByHostName.returns("127.0.0.10");
    const scope = nock("http://127.0.0.10");
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 1",
      model: "DS18B20",
      address: "28-00000",
      subcontrollerId: 1,
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
    let mockReading = "20.437";
    scope
      .get("/api/sensors/ds18b20/28-00000")
      .reply(200, { temperature: mockReading, address: "28-00000" });

    await using ds18b20Sensor = await ESP32_DS18B20.createInstanceAsync(
      mockDS18B20Data,
      mockSubcontroller,
      mockSensorsRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );
    await ds18b20Sensor!.takeReadingAsync();

    assert.equal(ds18b20Sensor!.lastReading[ReadingType.temperature], String(20.437));

    //Not a number reading
    mockReading = "lol";
    scope
      .get("/api/sensors/ds18b20/28-00000")
      .reply(200, { temperature: "lol", address: "28-00000" });
    await using ds18b20Sensor2 = await ESP32_DS18B20.createInstanceAsync(
      mockDS18B20Data,
      mockSubcontroller,
      mockSensorsRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );

    await ds18b20Sensor2!.takeReadingAsync();
    assert.isUndefined(ds18b20Sensor2!.lastReading[ReadingType.temperature]);
    assert.isTrue(loggerSpy.calledOnce);
    loggerSpy.resetHistory();

    //Error reading
    scope.get("/api/sensors/ds18b20/28-00000").reply(500, { error: "Device error" });
    await using ds18b20Sensor4 = await ESP32_DS18B20.createInstanceAsync(
      mockDS18B20Data,
      mockSubcontroller,
      mockSensorsRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );

    await ds18b20Sensor4!.takeReadingAsync();
    assert.isUndefined(ds18b20Sensor4!.lastReading[ReadingType.temperature]);
    assert.isTrue(loggerSpy.calledOnce);
    scope.done();
  });

  it("should get all DS18B20 addresses", async function () {
    const scope = nock("http://127.0.0.11")
      .get("/api/sensors/ds18b20/addresses")
      .reply(200, {
        addresses: ["28-0311977965c0", "28-031197797be0", "28-03119779f5f2"],
      });
    const addresses = await ESP32_DS18B20.getAddressesAsync("127.0.0.11");

    assert.equal(addresses.length, 3);
    assert.equal(addresses[0], "28-0311977965c0");
    assert.equal(addresses[1], "28-031197797be0");
    assert.equal(addresses[2], "28-03119779f5f2");
    scope.done();
  });

  it("should load cached readings from the database, initializing a sensor", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    const mockSubcontroller = {
      id: 1,
      name: "sproot-device-7ab3",
      hostName: "sproot-device-7ab3.local",
    } as SDBSubcontroller;
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 1",
      model: "DS18B20",
      address: "28-00000",
      subcontrollerId: 1,
    } as SDBSensor;
    const recordsToLoad = 2;
    sinon.stub(mockSensorsRepo, "getBucketedSensorReadingsAsync").resolves([
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
        logTime: new Date(new Date().getTime() - 60000).toISOString(),
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

    await using ds18b20Sensor = await ESP32_DS18B20.createInstanceAsync(
      mockDS18B20Data,
      mockSubcontroller,
      mockSensorsRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );

    assert.equal(
      ds18b20Sensor!.getCachedReadings()[ReadingType.temperature]!.length,
      recordsToLoad,
    );
    assert.equal(ds18b20Sensor!.getCachedReadings()[ReadingType.temperature]![0]!.data, "1");
    assert.equal(ds18b20Sensor!.getCachedReadings()[ReadingType.temperature]![1]!.data, "2");
  });
});
