import { DS18B20 } from "@sproot/sproot-server/src/sensors/DS18B20";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBSubcontroller } from "@sproot/sproot-common/dist/database/SDBSubcontroller";
import { SensorList } from "../SensorList";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
import { MdnsService } from "../../../system/MdnsService";
import { ESP32_DS18B20 } from "../../ESP32_DS18B20";

const mockSprootDB = new MockSprootDB();

describe("SensorList.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });

  it("should create, update, and delete sensors, adding a DS18B20 to MockSprootDB", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    const getSensorsAsyncStub = sinon.stub(MockSprootDB.prototype, "getSensorsAsync").resolves([
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
    sinon
      .stub(MockSprootDB.prototype, "getDS18B20AddressesAsync")
      .resolves([{ address: "28-00000" } as SDBSensor, { address: "28-00001" } as SDBSensor]);
    sinon.stub(DS18B20, "getAddressesAsync").resolves(["28-00000", "28-00001", "28-00002"]);
    const addSensorSpy = sinon.spy(mockSprootDB, "addSensorAsync");

    await using sensorList = await SensorList.createInstanceAsync(
      mockSprootDB,
      mockMdnsService,
      5,
      5,
      3,
      5,
      logger,
    );

    assert.equal(addSensorSpy.callCount, 1);
    assert.equal(Object.keys(sensorList.sensors).length, 3);

    getSensorsAsyncStub.resolves([
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
    sinon.stub(MockSprootDB.prototype, "getSensorsAsync").resolves([
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
    sinon
      .stub(MockSprootDB.prototype, "getDS18B20AddressesAsync")
      .resolves([{ address: "28-00000" } as SDBSensor]);
    sinon.stub(DS18B20, "getAddressesAsync").resolves(["28-00000"]);

    await using sensorList = await SensorList.createInstanceAsync(
      mockSprootDB,
      mockMdnsService,
      5,
      5,
      3,
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
    assert.exists(sensorList.sensors["1"]!["sprootDB"]);
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

    const getSensorsStub = sinon
      .stub(MockSprootDB.prototype, "getSensorsAsync")
      .resolves([mockBME280Data]);
    const getAddressesStub = sinon.stub(DS18B20, "getAddressesAsync").resolves([]);
    await using sensorList = await SensorList.createInstanceAsync(
      mockSprootDB,
      mockMdnsService,
      5,
      5,
      3,
      5,
      logger,
    );

    mockBME280Data["address"] = "0x76";
    getSensorsStub.resolves([mockBME280Data, mockDS18B20Data]);
    sinon
      .stub(MockSprootDB.prototype, "getDS18B20AddressesAsync")
      .resolves([{ address: "28-00000" } as SDBSensor]);
    getAddressesStub.resolves(["28-00000"]);
    await sensorList.regenerateAsync();

    mockDS18B20Data["address"] = "28-00000";
    getSensorsStub.resolves([mockBME280Data, mockDS18B20Data, mockSensorData]);
    await sensorList.regenerateAsync();

    assert.isTrue(loggerSpy.calledThrice);
  });

  it("should add unrecognized (ESP32) DS18B20 sensors to the database", async function () {
    const clock = sinon.useFakeTimers();
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    mockMdnsService.getIPAddressByHostName.returns("127.0.0.12");

    // We're not using nock here because apparently fake timers skips node IO calls.
    const mockESP32DS18B20 = sinon.stub(ESP32_DS18B20, "getAddressesAsync");
    mockESP32DS18B20.callsFake(async (ipAddress?: string) => {
      if (ipAddress === "127.0.0.12") {
        return ["28-00000", "28-00001", "28-00002"];
      }
      return [];
    });
    const mockDS18B20Data1 = {
      id: 1,
      name: "test sensor 1",
      model: "DS18B20",
      address: "28-00004",
    } as SDBSensor;
    const mockDS18B20Data2 = {
      id: 2,
      name: "test sensor 2",
      model: "ESP32_DS18B20",
      address: "28-00001", // Already exists in DB and on remote
      subcontrollerId: 1,
    } as SDBSensor;
    const mockDS18B20Data3 = {
      id: 3,
      name: "test sensor 3",
      model: "DS18B20",
      address: "28-00002",
      subcontrollerId: 1,
    } as SDBSensor;
    const mockDS18B20Data4 = {
      id: 4,
      name: "test sensor 4",
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
    sinon.stub(MockSprootDB.prototype, "getSubcontrollersAsync").resolves([
      {
        id: 1,
        hostName: "sproot-device-7ab3.local",
        type: "ESP32",
        name: "Test ESP32",
        secureToken: null,
      } as SDBSubcontroller,
    ]);
    const mockGetDS18B20AddressesAsync = sinon.stub(
      MockSprootDB.prototype,
      "getDS18B20AddressesAsync",
    );
    mockGetDS18B20AddressesAsync.resolves([mockDS18B20Data1, mockDS18B20Data2]);

    const addSensorSpy = sinon.stub(mockSprootDB, "addSensorAsync");
    const ds18b20GetAddressesStub = sinon.stub(DS18B20, "getAddressesAsync").resolves([]);
    await using sensorList = await SensorList.createInstanceAsync(
      mockSprootDB,
      mockMdnsService,
      5,
      5,
      3,
      5,
      logger,
    );

    assert.equal(addSensorSpy.callCount, 2);

    assert.equal(addSensorSpy.getCalls()[0]!.args[0].address, "28-00000");
    assert.equal(addSensorSpy.getCalls()[0]!.args[0].model, "ESP32_DS18B20");
    assert.equal(addSensorSpy.getCalls()[0]!.args[0].subcontrollerId, 1);

    assert.equal(addSensorSpy.getCalls()[1]!.args[0].address, "28-00002");
    assert.equal(addSensorSpy.getCalls()[1]!.args[0].model, "ESP32_DS18B20");
    assert.equal(addSensorSpy.getCalls()[1]!.args[0].subcontrollerId, 1);

    // Simulate connecting some DS18B20s.
    addSensorSpy.resetHistory();
    ds18b20GetAddressesStub.resolves(["28-00003", "28-00004", "28-00005"]); // 28-00003, 28-00004 - local devices, 28-00005 - remote device
    mockESP32DS18B20.callsFake(async (ipAddress?: string) => {
      if (ipAddress === "127.0.0.12") {
        return ["28-00000", "28-00001", "28-00002", "28-00006"];
      }
      return [];
    });
    mockGetDS18B20AddressesAsync.resolves([
      mockDS18B20Data1,
      mockDS18B20Data2,
      mockDS18B20Data3,
      mockDS18B20Data4,
    ]);

    // Shouldn't retriger adding unrecognized sensors
    await sensorList.regenerateAsync();
    assert.equal(addSensorSpy.callCount, 0);

    // Advance the clock to trigger the periodic check
    await clock.tickAsync(5100);

    assert.equal(addSensorSpy.callCount, 3);

    assert.equal(addSensorSpy.getCalls()[0]!.args[0].address, "28-00006");
    assert.equal(addSensorSpy.getCalls()[0]!.args[0].model, "ESP32_DS18B20");
    assert.equal(addSensorSpy.getCalls()[0]!.args[0].subcontrollerId, 1);

    assert.equal(addSensorSpy.getCalls()[1]!.args[0].address, "28-00003");
    assert.equal(addSensorSpy.getCalls()[1]!.args[0].model, "DS18B20");
    assert.isUndefined(addSensorSpy.getCalls()[1]!.args[0].subcontrollerId);

    assert.equal(addSensorSpy.getCalls()[2]!.args[0].address, "28-00005");
    assert.equal(addSensorSpy.getCalls()[2]!.args[0].model, "DS18B20");
    assert.isUndefined(addSensorSpy.getCalls()[2]!.args[0].subcontrollerId);

    clock.restore();
  });
});
