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

const createMockSensorsRepo = (): ISensorsRepository => ({
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

  it("should create, update, and delete sensors, adding a DS18B20", async function () {
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
    sinon
      .stub(mockSensorsRepo, "getDS18B20AddressesAsync")
      .resolves([{ address: "28-00000" } as SDBSensor, { address: "28-00001" } as SDBSensor]);
    sinon.stub(DS18B20, "getAddressesAsync").resolves(["28-00000", "28-00001", "28-00002"]);

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
    sinon
      .stub(mockSensorsRepo, "getDS18B20AddressesAsync")
      .resolves([{ address: "28-00000" } as SDBSensor]);
    sinon.stub(DS18B20, "getAddressesAsync").resolves(["28-00000"]);

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
    const getAddressesStub = sinon.stub(DS18B20, "getAddressesAsync").resolves([]);
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
    sinon
      .stub(mockSensorsRepo, "getDS18B20AddressesAsync")
      .resolves([{ address: "28-00000" } as SDBSensor]);
    getAddressesStub.resolves(["28-00000"]);
    await sensorList.regenerateAsync();

    mockDS18B20Data["address"] = "28-00000";
    getSensorsStub.resolves([mockBME280Data, mockDS18B20Data, mockSensorData]);
    await sensorList.regenerateAsync();

    assert.isTrue(loggerSpy.calledThrice);
  });

  describe("getAvailableDevices", function () {
    it("should return all I2C addresses when filterUsed is false", async function () {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
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

      const devices = await sensorList.getAvailableDevices("BME280", false);

      assert.equal(devices.length, 2);
      assert.include(
        devices.map((d) => d.address),
        "0x76",
      );
      assert.include(
        devices.map((d) => d.address),
        "0x77",
      );
      assert.isTrue(devices.every((d) => d.alias === null));
      assert.isTrue(devices.every((d) => d.pins === null));
      assert.isTrue(devices.every((d) => d.subcontrollerId === null));
    });

    it("should return all I2C addresses with pins for ADS1115 when filterUsed is false", async function () {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
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

      const devices = await sensorList.getAvailableDevices("ADS1115", false);

      assert.equal(devices.length, 4);
      assert.include(
        devices.map((d) => d.address),
        "0x48",
      );
      assert.include(
        devices.map((d) => d.address),
        "0x49",
      );
      assert.include(
        devices.map((d) => d.address),
        "0x4A",
      );
      assert.include(
        devices.map((d) => d.address),
        "0x4B",
      );
      assert.deepEqual(devices[0]!.pins, ["0", "1", "2", "3"]);
    });

    it("should filter used I2C addresses when filterUsed is true", async function () {
      const clock = sinon.useFakeTimers();
      const mockMdnsService = sinon.createStubInstance(MdnsService);
      const stubbedSensorsRepo = createMockSensorsRepo();
      sinon
        .stub(stubbedSensorsRepo, "getByModelAsync")
        .resolves([{ id: 1, name: "used sensor", model: "BME280", address: "0x76" } as SDBSensor]);
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
        stubbedSensorsRepo,
        mockSubcontrollersRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );

      const devices = await sensorList.getAvailableDevices("BME280", true);

      assert.equal(devices.length, 1);
      assert.equal(devices[0]!.address, "0x77");
      clock.restore();
    });

    it("should filter used pins for I2C sensors with pins", async function () {
      const clock = sinon.useFakeTimers();
      const mockMdnsService = sinon.createStubInstance(MdnsService);
      const stubbedSensorsRepo = createMockSensorsRepo();
      sinon
        .stub(stubbedSensorsRepo, "getByModelAsync")
        .resolves([
          { id: 1, name: "used sensor", model: "ADS1115", address: "0x48", pin: "0" } as SDBSensor,
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
        stubbedSensorsRepo,
        mockSubcontrollersRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );

      const devices = await sensorList.getAvailableDevices("ADS1115", true);

      assert.equal(devices.length, 3);
      const unusedDevice = devices.find((d) => d.address === "0x49");
      assert.exists(unusedDevice);
      assert.deepEqual(unusedDevice!.pins, ["0", "1", "2", "3"]);
      clock.restore();
    });

    it("should check shared model group for ADS1115 and capacitive moisture sensors", async function () {
      const clock = sinon.useFakeTimers();
      const mockMdnsService = sinon.createStubInstance(MdnsService);
      const stubbedSensorsRepo = createMockSensorsRepo();
      sinon.stub(stubbedSensorsRepo, "getByModelAsync").callsFake(async (model) => {
        if (model === "ADS1115") {
          return [{ id: 1, name: "ads sensor", model: "ADS1115", address: "0x48" } as SDBSensor];
        }
        if (model === "CAPACITIVE_MOISTURE_SENSOR") {
          return [
            {
              id: 2,
              name: "moisture sensor",
              model: "CAPACITIVE_MOISTURE_SENSOR",
              address: "0x48",
              pin: "1",
            } as SDBSensor,
          ];
        }
        return [] as SDBSensor[];
      });
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
        stubbedSensorsRepo,
        mockSubcontrollersRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );

      const devices = await sensorList.getAvailableDevices("ADS1115", true);

      assert.equal(devices.length, 3);
      assert.isTrue(devices.every((d) => d.address !== "0x48"));
      const addr49 = devices.find((d) => d.address === "0x49");
      assert.exists(addr49);
      assert.deepEqual(addr49!.pins, ["0", "1", "2", "3"]);
      clock.restore();
    });

    it("should return empty array for unknown model", async function () {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
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

      const devices = await sensorList.getAvailableDevices("UNKNOWN_MODEL", false);

      assert.equal(devices.length, 0);
    });

    it("should return empty array for DS18B20 when filterUsed is false", async function () {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
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
      sinon.stub(DS18B20, "getAddressesAsync").resolves([]);

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

      const devices = await sensorList.getAvailableDevices("DS18B20", false);

      assert.equal(devices.length, 0);
    });
  });

  describe("getAvailableDevices additional", () => {
    it("should return static I2C addresses with alias: null for BME280 when filterUsed=false", async () => {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
      sinon.stub(winston, "createLogger").callsFake(
        () =>
          ({
            info: () => {},
            error: () => {},
            startTimer: () => ({ done: () => {} }) as winston.Profiler,
          }) as unknown as winston.Logger,
      );
      const logger = winston.createLogger();
      await using sensorList = await SensorList.createInstanceAsync(
        new MemoryEventBus(logger),
        mockSensorsRepo,
        mockSubcontrollersRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );
      const result = await sensorList.getAvailableDevices("BME280", false);
      assert.deepEqual(result, [
        { alias: null, address: "0x76", pins: null, subcontrollerId: null },
        { alias: null, address: "0x77", pins: null, subcontrollerId: null },
      ]);
    });

    it("should filter used addresses for I2C sensors when filterUsed=true", async () => {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
      sinon.stub(winston, "createLogger").callsFake(
        () =>
          ({
            info: () => {},
            error: () => {},
            startTimer: () => ({ done: () => {} }) as winston.Profiler,
          }) as unknown as winston.Logger,
      );
      const logger = winston.createLogger();
      await using sensorList = await SensorList.createInstanceAsync(
        new MemoryEventBus(logger),
        mockSensorsRepo,
        mockSubcontrollersRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );
      sinon.stub(mockSensorsRepo, "getByModelAsync").resolves([
        {
          id: 1,
          name: "test",
          model: "ADS1115",
          address: "0x48",
          pin: "0",
          color: "#000000",
          subcontrollerId: null,
          deviceZoneId: null,
          lowCalibrationPoint: null,
          highCalibrationPoint: null,
        } as SDBSensor,
      ]);
      const result = await sensorList.getAvailableDevices("ADS1115", true);
      assert.lengthOf(result, 3);
      assert.isTrue(result.some((d) => d.address === "0x49"));
      assert.deepEqual(
        result.find((d) => d.address === "0x49"),
        {
          alias: null,
          address: "0x49",
          pins: ["0", "1", "2", "3"],
          subcontrollerId: null,
        },
      );
    });

    it("should share used-pin tracking between ADS1115 and CAPACITIVE_MOISTURE_SENSOR", async () => {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
      sinon.stub(winston, "createLogger").callsFake(
        () =>
          ({
            info: () => {},
            error: () => {},
            startTimer: () => ({ done: () => {} }) as winston.Profiler,
          }) as unknown as winston.Logger,
      );
      const logger = winston.createLogger();
      await using sensorList = await SensorList.createInstanceAsync(
        new MemoryEventBus(logger),
        mockSensorsRepo,
        mockSubcontrollersRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );
      sinon
        .stub(mockSensorsRepo, "getByModelAsync")
        .onFirstCall()
        .resolves([
          {
            id: 1,
            name: "test",
            model: "ADS1115",
            address: "0x48",
            pin: "1",
            color: "#000000",
            subcontrollerId: null,
            deviceZoneId: null,
            lowCalibrationPoint: null,
            highCalibrationPoint: null,
          } as SDBSensor,
        ])
        .onSecondCall()
        .resolves([] as SDBSensor[])
        .onCall(2)
        .resolves([
          {
            id: 2,
            name: "test",
            model: "CAPACITIVE_MOISTURE_SENSOR",
            address: "0x48",
            pin: "2",
            color: "#000000",
            subcontrollerId: null,
            deviceZoneId: null,
            lowCalibrationPoint: null,
            highCalibrationPoint: null,
          } as SDBSensor,
        ])
        .onCall(3)
        .resolves([] as SDBSensor[]);
      const result = await sensorList.getAvailableDevices("CAPACITIVE_MOISTURE_SENSOR", true);
      assert.deepEqual(
        result.find((d) => d.address === "0x49"),
        {
          alias: null,
          address: "0x49",
          pins: ["0", "1", "2", "3"],
          subcontrollerId: null,
        },
      );
    });

    it("should return detected DS18B20 addresses filtered by used", async () => {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
      sinon.stub(winston, "createLogger").callsFake(
        () =>
          ({
            info: () => {},
            error: () => {},
            startTimer: () => ({ done: () => {} }) as winston.Profiler,
          }) as unknown as winston.Logger,
      );
      const logger = winston.createLogger();
      await using sensorList = await SensorList.createInstanceAsync(
        new MemoryEventBus(logger),
        mockSensorsRepo,
        mockSubcontrollersRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );
      sinon.stub(mockSensorsRepo, "getDS18B20AddressesAsync").resolves([
        {
          id: 1,
          name: "test",
          model: "DS18B20",
          address: "28-00000abc1234",
          subcontrollerId: null,
          color: "#000000",
          pin: null,
          deviceZoneId: null,
          lowCalibrationPoint: null,
          highCalibrationPoint: null,
        } as SDBSensor,
      ]);
      sinon.stub(DS18B20, "getAddressesAsync").resolves(["28-00000abc1234", "28-00000def5678"]);
      const result = await sensorList.getAvailableDevices("DS18B20", true);
      assert.lengthOf(result, 1);
      assert.equal(result[0]!.address, "28-00000def5678");
    });

    it("should return DS18B20 addresses with subcontrollerId for ESP32_DS18B20", async () => {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
      sinon.stub(winston, "createLogger").callsFake(
        () =>
          ({
            info: () => {},
            error: () => {},
            startTimer: () => ({ done: () => {} }) as winston.Profiler,
          }) as unknown as winston.Logger,
      );
      const logger = winston.createLogger();
      await using sensorList = await SensorList.createInstanceAsync(
        new MemoryEventBus(logger),
        mockSensorsRepo,
        mockSubcontrollersRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );
      sinon.stub(mockSubcontrollersRepo, "getAllAsync").resolves([
        {
          id: 3,
          hostName: "esp32-greenhouse",
          type: "ESP32",
          name: "Test ESP32",
          secureToken: null,
        } as SDBSubcontroller,
      ]);
      mockMdnsService.getIPAddressByHostName.returns("192.168.1.100");
      sinon.stub(ESP32_DS18B20, "getAddressesAsync").resolves(["28-00000esp0001"]);
      sinon.stub(DS18B20, "getAddressesAsync").resolves([]);
      sinon.stub(mockSensorsRepo, "getDS18B20AddressesAsync").resolves([]);
      const result = await sensorList.getAvailableDevices("ESP32_DS18B20", false);
      assert.lengthOf(result, 1);
      assert.equal(result[0]!.subcontrollerId, 3);
    });
  });

  describe("detectDS18B20AddressesAsync", () => {
    it("should detect local DS18B20 addresses with subcontrollerId=null", async () => {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
      sinon.stub(winston, "createLogger").callsFake(
        () =>
          ({
            info: () => {},
            error: () => {},
            startTimer: () => ({ done: () => {} }) as winston.Profiler,
          }) as unknown as winston.Logger,
      );
      const logger = winston.createLogger();
      await using sensorList = await SensorList.createInstanceAsync(
        new MemoryEventBus(logger),
        mockSensorsRepo,
        mockSubcontrollersRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );
      sinon.stub(DS18B20, "getAddressesAsync").resolves(["28-00000abc1234"]);
      sinon.stub(mockSubcontrollersRepo, "getAllAsync").resolves([]);
      const result = await sensorList.detectDS18B20AddressesAsync();
      assert.lengthOf(result, 1);
      assert.equal(result[0]!.address, "28-00000abc1234");
      assert.isNull(result[0]!.subcontrollerId);
    });

    it("should detect ESP32 DS18B20 addresses with correct subcontrollerId", async () => {
      const mockMdnsService = sinon.createStubInstance(MdnsService);
      sinon.stub(winston, "createLogger").callsFake(
        () =>
          ({
            info: () => {},
            error: () => {},
            startTimer: () => ({ done: () => {} }) as winston.Profiler,
          }) as unknown as winston.Logger,
      );
      const logger = winston.createLogger();
      await using sensorList = await SensorList.createInstanceAsync(
        new MemoryEventBus(logger),
        mockSensorsRepo,
        mockSubcontrollersRepo,
        mockMdnsService,
        5,
        5,
        5,
        logger,
      );
      sinon.stub(mockSubcontrollersRepo, "getAllAsync").resolves([
        {
          id: 3,
          hostName: "esp32-greenhouse",
          type: "ESP32",
          name: "Test ESP32",
          secureToken: null,
        } as SDBSubcontroller,
      ]);
      mockMdnsService.getIPAddressByHostName.returns("192.168.1.100");
      sinon.stub(ESP32_DS18B20, "getAddressesAsync").resolves(["28-00000esp0001"]);
      sinon.stub(DS18B20, "getAddressesAsync").resolves([]);
      const result = await sensorList.detectDS18B20AddressesAsync();
      assert.lengthOf(result, 1);
      assert.equal(result[0]!.address, "28-00000esp0001");
      assert.equal(result[0]!.subcontrollerId, 3);
    });
  });
});
