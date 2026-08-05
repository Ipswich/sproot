import { DS18B20 } from "../../DS18B20";
import type { ISensorsRepository } from "../../../database/repositories/sensors/ISensorsRepository";
import type { ISubcontrollersRepository } from "../../../database/repositories/subcontrollers/ISubcontrollersRepository";
import { SDBSensor } from "@sproot/common/database/SDBSensor";
import { SDBSubcontroller } from "@sproot/common/database/SDBSubcontroller";
import { SensorList } from "../SensorList";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
import { MdnsService } from "../../../system/MdnsService";
import { ESP32_DS18B20 } from "../../ESP32_DS18B20";
import { MemoryEventBus } from "../../../eventbus/MemoryEventBus";
import { Models } from "@sproot/common/sensors/Models";

const createMockSensorsRepo = (): ISensorsRepository => ({
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
  getDataAsync: async () => ({ xAxis: { field: "time", values: [] }, data: null }),
});

const createMockSubcontrollersRepo = (): ISubcontrollersRepository => ({
  getAllAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => 0,
  deleteAsync: async () => 0,
});

const mockSensorsRepo = createMockSensorsRepo();
const mockSubcontrollersRepo = createMockSubcontrollersRepo();

describe("SensorList.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });

  it("should create, update, and delete sensors without auto-adding DS18B20 devices", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    const getAllAsyncStub = sinon.stub(mockSensorsRepo, "getAllAsync").resolves([
      {
        id: 1,
        name: "test sensor 1",
        model: "BME280",
        address: "0x76",
      } as SDBSensor,
      {
        id: 2,
        name: "test sensor 2",
        model: "DS18B20",
        address: "28-00000",
      } as SDBSensor,
      {
        id: 3,
        name: "test sensor 3",
        model: "DS18B20",
        address: "28-00001",
      } as SDBSensor,
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
    const eventBus = new MemoryEventBus(logger);
    const addSensorSpy = sinon.spy(mockSensorsRepo, "addAsync");

    await using sensorList = await SensorList.createInstanceAsync(
      eventBus,
      mockSensorsRepo,
      mockSubcontrollersRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );

    assert.equal(addSensorSpy.callCount, 0);
    assert.equal(Object.keys(sensorList.sensors).length, 3);

    getAllAsyncStub.resolves([
      {
        id: 2,
        name: "2 rosnes tset",
        model: "DS18B20",
        address: "28-00000",
      } as SDBSensor,
      {
        id: 3,
        name: "test sensor 3",
        model: "DS18B20",
        address: "28-00001",
      } as SDBSensor,
    ]);
    await sensorList.regenerateAsync();
    assert.equal(Object.keys(sensorList.sensors).length, 2);
    assert.equal(sensorList.sensors["2"]!.name, "2 rosnes tset");
  });

  it("should return sensor data (no functions included in result)", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    const mockBME280Data = {
      id: 1,
      name: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    sinon.stub(mockSensorsRepo, "getAllAsync").resolves([
      mockBME280Data,
      {
        id: 2,
        name: "test sensor 2",
        model: "DS18B20",
        address: "28-00000",
      } as SDBSensor,
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
    const eventBus = new MemoryEventBus(logger);
    await using sensorList = await SensorList.createInstanceAsync(
      eventBus,
      mockSensorsRepo,
      mockSubcontrollersRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );

    const sensorData = sensorList.sensorData;

    assert.equal(sensorData["1"]!["name"], "test sensor 1");
    assert.equal(sensorData["1"]!["model"], "BME280");
    assert.equal(sensorData["1"]!["address"], "0x76");
    assert.equal(sensorData["2"]!["name"], "test sensor 2");
    assert.equal(sensorData["2"]!["model"], "DS18B20");
    assert.equal(sensorData["2"]!["address"], "28-00000");
    assert.exists(sensorList.sensors["1"]!["sensorsRepository"]);
  });

  it("should handle errors when building sensors", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    const mockBME280Data = {
      id: 1,
      name: "test sensor 1",
      model: "BME280",
      address: null,
    } as SDBSensor;
    const mockDS18B20Data = {
      id: 2,
      name: "test sensor 2",
      model: "DS18B20",
      address: null,
    } as SDBSensor;
    const mockSensorData = {
      id: 3,
      name: "test sensor 3",
      model: "not a recognized model" as string,
      address: null,
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
    const eventBus = new MemoryEventBus(logger);

    const getSensorsStub = sinon.stub(mockSensorsRepo, "getAllAsync").resolves([mockBME280Data]);
    await using sensorList = await SensorList.createInstanceAsync(
      eventBus,
      mockSensorsRepo,
      mockSubcontrollersRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );

    mockBME280Data["address"] = "0x76";
    getSensorsStub.resolves([mockBME280Data, mockDS18B20Data]);
    await sensorList.regenerateAsync();

    mockDS18B20Data["address"] = "28-00000";
    getSensorsStub.resolves([mockBME280Data, mockDS18B20Data, mockSensorData]);
    await sensorList.regenerateAsync();

    assert.isTrue(loggerSpy.calledThrice);
  });

  it("should expose available sensor devices with shared pin filtering", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    mockMdnsService.getIPAddressByHostName.returns("127.0.0.12");
    const mockESP32DS18B20 = sinon.stub(ESP32_DS18B20, "getAddressesAsync");
    mockESP32DS18B20.callsFake(async (ipAddress?: string) => {
      if (ipAddress === "127.0.0.12") {
        return ["28-10000", "28-10001"];
      }
      return [];
    });
    const mockSensorData1 = {
      id: 1,
      name: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    const mockSensorData2 = {
      id: 2,
      name: "test sensor 2",
      model: "ADS1115",
      address: "0x48",
      pin: "0",
    } as SDBSensor;
    const mockSensorData3 = {
      id: 3,
      name: "test sensor 3",
      model: "CAPACITIVE_MOISTURE_SENSOR",
      address: "0x48",
      pin: "2",
    } as SDBSensor;
    const mockSensorData4 = {
      id: 4,
      name: "test sensor 4",
      model: "DS18B20",
      address: "28-00000",
    } as SDBSensor;
    const mockSensorData5 = {
      id: 5,
      name: "test sensor 5",
      model: "ESP32_DS18B20",
      address: "28-10000",
      subcontrollerId: 1,
    } as SDBSensor;
    const mockSensorData6 = {
      id: 6,
      name: "test sensor 6",
      model: "ESP32_ADS1115",
      address: "0x49",
      pin: "1",
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
    const eventBus = new MemoryEventBus(logger);
    sinon.stub(mockSubcontrollersRepo, "getAllAsync").resolves([
      {
        id: 1,
        hostName: "sproot-device-7ab3.local",
        type: "ESP32",
        name: "Test ESP32",
        secureToken: null,
      } as SDBSubcontroller,
    ]);
    sinon.stub(mockSensorsRepo, "getAllAsync").resolves([
      mockSensorData1,
      mockSensorData2,
      mockSensorData3,
      mockSensorData4,
      mockSensorData5,
      mockSensorData6,
    ]);
    sinon.stub(DS18B20, "getAddressesAsync").resolves(["28-00000", "28-00001"]);

    await using sensorList = await SensorList.createInstanceAsync(
      eventBus,
      mockSensorsRepo,
      mockSubcontrollersRepo,
      mockMdnsService,
      5,
      5,
      5,
      logger,
    );

    assert.deepEqual(await sensorList.getAvailableDevices(Models.BME280), [
      {
        alias: null,
        address: "0x77",
        pins: null,
        subcontrollerId: null,
        externalId: null,
      },
    ]);

    assert.deepEqual(await sensorList.getAvailableDevices(Models.ADS1115, "0x48"), [
      {
        alias: null,
        address: "0x48",
        pins: ["1", "3"],
        subcontrollerId: null,
        externalId: null,
      },
    ]);

    assert.deepEqual(await sensorList.getAvailableDevices(Models.CAPACITIVE_MOISTURE_SENSOR, "0x48"), [
      {
        alias: null,
        address: "0x48",
        pins: ["1", "3"],
        subcontrollerId: null,
        externalId: null,
      },
    ]);

    assert.deepEqual(await sensorList.getAvailableDevices(Models.DS18B20), [
      {
        alias: null,
        address: "28-00001",
        pins: null,
        subcontrollerId: null,
        externalId: null,
      },
    ]);

    assert.deepEqual(await sensorList.getAvailableDevices(Models.ESP32_DS18B20, undefined, true, 1), [
      {
        alias: "Test ESP32",
        address: "28-10001",
        pins: null,
        subcontrollerId: 1,
        externalId: null,
      },
    ]);

    assert.deepEqual(await sensorList.getAvailableDevices(Models.ESP32_ADS1115, "0x49", true, 1), [
      {
        alias: null,
        address: "0x49",
        pins: ["0", "2", "3"],
        subcontrollerId: 1,
        externalId: null,
      },
    ]);
  });
});
