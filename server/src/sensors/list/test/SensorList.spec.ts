import { BME280 } from "@sproot/sproot-server/src/sensors/BME280";
import { DS18B20 } from "@sproot/sproot-server/src/sensors/DS18B20";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBExternalDevice } from "@sproot/sproot-common/dist/database/SDBExternalDevice";
import { SensorList } from "../SensorList";

import { assert } from "chai";
import nock from "nock";
import * as sinon from "sinon";
import winston from "winston";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { ChartSeries, DataSeries } from "@sproot/utility/ChartData";
import { MdnsService } from "../../../system/MdnsService";

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
    sinon.stub(BME280.prototype, "initAsync").resolves({
      id: 1,
      name: "test sensor 1",
      model: "BME280",
      address: "0x76",
      lastReading: { humidity: "", pressure: "", temperature: "" },
      lastReadingTime: null,
      units: { temperature: "°C", humidity: "%", pressure: "hPa" },
      [Symbol.asyncDispose]: async () => {},
      getChartData: () => {
        return { data: {} as Record<ReadingType, DataSeries>, series: {} as ChartSeries };
      },
    } as BME280);
    const addSensorSpy = sinon.spy(mockSprootDB, "addSensorAsync");

    await using sensorList = new SensorList(mockSprootDB, mockMdnsService, 5, 5, 3, 5, logger);
    await sensorList.initializeOrRegenerateAsync();

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
    await sensorList.initializeOrRegenerateAsync();
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
    sinon
      .stub(BME280.prototype, "initAsync")
      .resolves(new BME280(mockBME280Data, mockSprootDB, mockMdnsService, 5, 5, 3, 5, logger));

    await using sensorList = new SensorList(mockSprootDB, mockMdnsService, 5, 5, 3, 5, logger);
    await sensorList.initializeOrRegenerateAsync();
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
    await using sensorList = new SensorList(mockSprootDB, mockMdnsService, 5, 5, 3, 5, logger);

    await sensorList.initializeOrRegenerateAsync();

    mockBME280Data["address"] = "0x76";
    getSensorsStub.resolves([mockBME280Data, mockDS18B20Data]);
    sinon
      .stub(MockSprootDB.prototype, "getDS18B20AddressesAsync")
      .resolves([{ address: "28-00000" } as SDBSensor]);
    getAddressesStub.resolves(["28-00000"]);
    sinon
      .stub(BME280.prototype, "initAsync")
      .resolves(new BME280(mockBME280Data, mockSprootDB, mockMdnsService, 5, 5, 3, 5, logger));
    await sensorList.initializeOrRegenerateAsync();

    mockDS18B20Data["address"] = "28-00000";
    getSensorsStub.resolves([mockBME280Data, mockDS18B20Data, mockSensorData]);
    await sensorList.initializeOrRegenerateAsync();

    assert.isTrue(loggerSpy.calledThrice);
  });

  it("should handle errors when reading sensors", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 2",
      model: "DS18B20",
      address: "28-00000",
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
    sinon.stub(MockSprootDB.prototype, "getSensorsAsync").resolves([mockDS18B20Data]);
    sinon.stub(DS18B20, "getAddressesAsync").resolves(["28-00000"]);
    sinon.stub(DS18B20.prototype, "takeReadingAsync").rejects();

    await using sensorList = new SensorList(mockSprootDB, mockMdnsService, 5, 5, 3, 5, logger);
    await sensorList.initializeOrRegenerateAsync();
  });

  it("should add unrecognized (ESP32) DS18B20 sensors to the database", async function () {
    const mockMdnsService = sinon.createStubInstance(MdnsService);
    mockMdnsService.getIPAddressByHostName.returns("127.0.0.12");
    const scope1 = nock("http://127.0.0.12")
      .get("/api/sensors/ds18b20/addresses")
      .reply(200, { addresses: ["28-00000", "28-00001", "28-00002"] }); // Three devices on remote device
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
      hostName: "sproot-device-7ab3.local",
    } as SDBSensor;
    const mockDS18B20Data3 = {
      id: 3,
      name: "test sensor 3",
      model: "DS18B20",
      address: "28-00002",
      hostName: "sproot-device-7ab3.local",
    } as SDBSensor;
    const mockDS18B20Data4 = {
      id: 4,
      name: "test sensor 4",
      model: "DS18B20",
      address: "28-00000",
      hostName: "sproot-device-7ab3.local",
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
    sinon.stub(MockSprootDB.prototype, "getExternalDevicesAsync").resolves([
      {
        id: 1,
        hostName: "sproot-device-7ab3.local",
        type: "ESP32",
        name: "Test ESP32",
        secureToken: null,
      } as SDBExternalDevice,
    ]);
    const mockGetDS18B20AddressesAsync = sinon.stub(
      MockSprootDB.prototype,
      "getDS18B20AddressesAsync",
    );
    mockGetDS18B20AddressesAsync.resolves([mockDS18B20Data1, mockDS18B20Data2]);

    const addSensorSpy = sinon.spy(mockSprootDB, "addSensorAsync");
    const ds18b20GetAddressesStub = sinon.stub(DS18B20, "getAddressesAsync").resolves([]);
    await using sensorList = new SensorList(mockSprootDB, mockMdnsService, 5, 5, 3, 5, logger);

    await sensorList.initializeOrRegenerateAsync();
    assert.equal(addSensorSpy.callCount, 2);

    assert.equal(addSensorSpy.getCalls()[0]!.args[0].address, "28-00000");
    assert.equal(addSensorSpy.getCalls()[0]!.args[0].model, "ESP32_DS18B20");
    assert.equal(addSensorSpy.getCalls()[0]!.args[0].hostName, "sproot-device-7ab3.local");

    assert.equal(addSensorSpy.getCalls()[1]!.args[0].address, "28-00002");
    assert.equal(addSensorSpy.getCalls()[1]!.args[0].model, "ESP32_DS18B20");
    assert.equal(addSensorSpy.getCalls()[1]!.args[0].hostName, "sproot-device-7ab3.local");

    // Simulate connecting some DS18B20s and re-running initialization.
    addSensorSpy.resetHistory();
    ds18b20GetAddressesStub.resolves(["28-00003", "28-00004", "28-00005"]); // 28-00003, 28-00004 - local devices, 28-00005 - remote device
    const scope2 = nock("http://127.0.0.12")
      .get("/api/sensors/ds18b20/addresses")
      .reply(200, { addresses: ["28-00000", "28-00001", "28-00002", "28-00006"] });

    mockGetDS18B20AddressesAsync.resolves([
      mockDS18B20Data1,
      mockDS18B20Data2,
      mockDS18B20Data3,
      mockDS18B20Data4,
    ]);

    await sensorList.initializeOrRegenerateAsync();

    assert.equal(addSensorSpy.callCount, 3);

    assert.equal(addSensorSpy.getCalls()[0]!.args[0].address, "28-00006");
    assert.equal(addSensorSpy.getCalls()[0]!.args[0].model, "ESP32_DS18B20");
    assert.equal(addSensorSpy.getCalls()[0]!.args[0].hostName, "sproot-device-7ab3.local");

    assert.equal(addSensorSpy.getCalls()[1]!.args[0].address, "28-00003");
    assert.equal(addSensorSpy.getCalls()[1]!.args[0].model, "DS18B20");
    assert.isUndefined(addSensorSpy.getCalls()[1]!.args[0].hostName);

    assert.equal(addSensorSpy.getCalls()[2]!.args[0].address, "28-00005");
    assert.equal(addSensorSpy.getCalls()[2]!.args[0].model, "DS18B20");
    assert.isUndefined(addSensorSpy.getCalls()[2]!.args[0].hostName);

    scope1.done();
    scope2.done();
  });
});
