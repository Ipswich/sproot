import "dotenv/config";
import { BME280 } from "../BME280";
import { DS18B20 } from "../DS18B20";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/SensorBase";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SensorList } from "../SensorList";

import bme280, { Bme280 } from "bme280";
import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
import * as sinon from "sinon";
import winston from "winston";

const sandbox = sinon.createSandbox();
const mockSprootDB = new MockSprootDB();
const MAX_CACHE_SIZE = process.env["MAX_CACHE_SIZE"];
const MAX_CHART_DATA_POINTS = process.env["MAX_CHART_DATA_POINTS"];

describe("SensorList.ts tests", function () {
  afterEach(() => {
    process.env["MAX_CACHE_SIZE"] = MAX_CACHE_SIZE;
    process.env["MAX_CHART_DATA_POINTS"] = MAX_CHART_DATA_POINTS;
    sandbox.restore();
  });

  it("should create, update, and delete sensors, adding a DS18B20 to MockSprootDB", async function () {
    const getSensorsAsyncStub = sandbox.stub(MockSprootDB.prototype, "getSensorsAsync").resolves([
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
    sandbox.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();
    sandbox
      .stub(MockSprootDB.prototype, "getDS18B20AddressesAsync")
      .resolves([{ address: "28-00000" } as SDBSensor, { address: "28-00001" } as SDBSensor]);
    sandbox.stub(DS18B20, "getAddressesAsync").resolves(["28-00000", "28-00001", "28-00002"]);
    sandbox
      .stub(BME280.prototype, "initAsync")
      .resolves({ id: 1, disposeAsync: async () => {} } as BME280);
    const addSensorSpy = sandbox.spy(mockSprootDB, "addSensorAsync");

    const sensorList = new SensorList(mockSprootDB, logger);
    try {
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
    } finally {
      //Cleanup
      await sensorList.disposeAsync();
    }
  });

  it("should return sensor data (no functions included in result)", async function () {
    const mockBME280Data = {
      id: 1,
      name: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    sandbox.stub(MockSprootDB.prototype, "getSensorsAsync").resolves([
      mockBME280Data,
      {
        id: 2,
        name: "test sensor 2",
        model: "DS18B20",
        address: "28-00000",
      } as SDBSensor,
    ]);
    sandbox.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();
    sandbox
      .stub(MockSprootDB.prototype, "getDS18B20AddressesAsync")
      .resolves([{ address: "28-00000" } as SDBSensor]);
    sandbox.stub(DS18B20, "getAddressesAsync").resolves(["28-00000"]);
    sandbox
      .stub(BME280.prototype, "initAsync")
      .resolves(new BME280(mockBME280Data, mockSprootDB, logger));

    const sensorList = new SensorList(mockSprootDB, logger);
    try {
      await sensorList.initializeOrRegenerateAsync();
      const sensorData = sensorList.sensorData;

      assert.equal(sensorData["1"]!["name"], "test sensor 1");
      assert.equal(sensorData["1"]!["model"], "BME280");
      assert.equal(sensorData["1"]!["address"], "0x76");
      assert.equal(sensorData["2"]!["name"], "test sensor 2");
      assert.equal(sensorData["2"]!["model"], "DS18B20");
      assert.equal(sensorData["2"]!["address"], "28-00000");
      assert.exists(sensorList.sensors["1"]!["sprootDB"]);
    } finally {
      //Cleanup
      await sensorList.disposeAsync();
    }
  });

  it("should load and maintain chart data", async function () {
    process.env["MAX_CHART_DATA_POINTS"] = "2";
    const mockBME280Data = {
      id: 1,
      name: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    sandbox.stub(mockSprootDB, "getSensorReadingsAsync").resolves([
      {
        data: "1",
        metric: ReadingType.temperature,
        units: "°C",
        logTime: "2024-01-01 00:00:00",
      } as SDBReading,
      {
        data: "1",
        metric: ReadingType.humidity,
        units: "%rH",
        logTime: "2024-01-01 00:00:00",
      } as SDBReading,
      {
        data: "1",
        metric: ReadingType.pressure,
        units: "hPa",
        logTime: "2024-01-01 00:00:00",
      } as SDBReading,
      //These should be ignored, as minutes % 5 != 0
      {
        data: "1.101010",
        metric: ReadingType.temperature,
        units: "°C",
        logTime: "2024-01-01 00:01:00",
      } as SDBReading,
      {
        data: "1.101010",
        metric: ReadingType.humidity,
        units: "%rH",
        logTime: "2024-01-01 00:01:00",
      } as SDBReading,
      {
        data: "1.101010",
        metric: ReadingType.pressure,
        units: "hPa",
        logTime: "2024-01-01 00:01:00",
      } as SDBReading,
    ]);
    sandbox.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    sandbox.stub(MockSprootDB.prototype, "getSensorsAsync").resolves([mockBME280Data]);
    sandbox.stub(MockSprootDB.prototype, "addSensorReadingAsync").resolves();
    sandbox.stub(bme280, "open").resolves({ close: async function () {} } as Bme280); // Don't create a real sensor - needs I2C bus
    const sensorList = new SensorList(mockSprootDB, winston.createLogger());
    try {
      //Method is called in this function, and we need something to update in the next step
      //loadChartDataFromCachedReadings
      await sensorList.initializeOrRegenerateAsync();

      assert.equal(sensorList.chartData["temperature"].length, 1);
      assert.equal(sensorList.chartData["humidity"].length, 1);
      assert.equal(sensorList.chartData["pressure"].length, 1);

      assert.equal(sensorList.chartData["temperature"][0]?.name, "12/31 4:00 pm");
      assert.equal(sensorList.chartData["humidity"][0]?.name, "12/31 4:00 pm");
      assert.equal(sensorList.chartData["pressure"][0]?.name, "12/31 4:00 pm");
      assert.equal(sensorList.chartData["temperature"][0]?.units, "°C");
      assert.equal(sensorList.chartData["humidity"][0]?.units, "%rH");
      assert.equal(sensorList.chartData["pressure"][0]?.units, "hPa");

      assert.equal(sensorList.chartData["temperature"][0]!["test sensor 1"], "1.000");
      assert.equal(sensorList.chartData["humidity"][0]!["test sensor 1"], "1.000");
      assert.equal(sensorList.chartData["pressure"][0]!["test sensor 1"], "1.000");

      sensorList.sensors["1"]!.lastReadingTime = new Date("2024-01-01T00:00:00.000Z");
      sensorList.sensors["1"]!.lastReading[ReadingType.temperature] = "3";
      sensorList.sensors["1"]!.lastReading[ReadingType.humidity] = "3";
      sensorList.sensors["1"]!.lastReading[ReadingType.pressure] = "3";

      // Should add values
      sensorList.sensors["1"]!.addLastReadingToDatabaseAsync();
      sensorList.updateChartDataFromLastCacheReading();

      assert.equal(sensorList.chartData["temperature"].length, 2);
      assert.equal(sensorList.chartData["humidity"].length, 2);
      assert.equal(sensorList.chartData["pressure"].length, 2);

      sensorList.sensors["1"]!.lastReadingTime = new Date("2024-01-01T00:00:00.000Z");
      sensorList.sensors["1"]!.lastReading[ReadingType.temperature] = "3";
      sensorList.sensors["1"]!.lastReading[ReadingType.humidity] = "3";
      sensorList.sensors["1"]!.lastReading[ReadingType.pressure] = "3";
      sensorList.sensors["1"]!.addLastReadingToDatabaseAsync();
      sensorList.updateChartDataFromLastCacheReading();

      // Should not have changed because ENV limit
      assert.equal(sensorList.chartData["temperature"].length, 2);
      assert.equal(sensorList.chartData["humidity"].length, 2);
      assert.equal(sensorList.chartData["pressure"].length, 2);
    } finally {
      await sensorList.disposeAsync();
    }
  });

  it("should handle errors when building sensors", async function () {
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
      model: "not a recognized model",
      address: null,
    } as SDBSensor;
    const loggerSpy = sinon.spy();
    sandbox.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: loggerSpy,
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();

    const getSensorsStub = sandbox
      .stub(MockSprootDB.prototype, "getSensorsAsync")
      .resolves([mockBME280Data]);
    const getAddressesStub = sandbox.stub(DS18B20, "getAddressesAsync").resolves([]);
    const sensorList = new SensorList(mockSprootDB, logger);

    try {
      await sensorList.initializeOrRegenerateAsync();

      mockBME280Data["address"] = "0x76";
      getSensorsStub.resolves([mockBME280Data, mockDS18B20Data]);
      sandbox
        .stub(MockSprootDB.prototype, "getDS18B20AddressesAsync")
        .resolves([{ address: "28-00000" } as SDBSensor]);
      getAddressesStub.resolves(["28-00000"]);
      sandbox
        .stub(BME280.prototype, "initAsync")
        .resolves(new BME280(mockBME280Data, mockSprootDB, logger));
      await sensorList.initializeOrRegenerateAsync();

      mockDS18B20Data["address"] = "28-00000";
      getSensorsStub.resolves([mockBME280Data, mockDS18B20Data, mockSensorData]);
      await sensorList.initializeOrRegenerateAsync();

      assert.isTrue(loggerSpy.calledThrice);

      //Cleanup
    } finally {
      await sensorList.disposeAsync();
    }
  });

  it("should handle errors when reading sensors", async function () {
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 2",
      model: "DS18B20",
      address: "28-00000",
    } as SDBSensor;
    sandbox.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();
    sandbox.stub(MockSprootDB.prototype, "getSensorsAsync").resolves([mockDS18B20Data]);
    sandbox.stub(DS18B20, "getAddressesAsync").resolves(["28-00000"]);
    sandbox.stub(DS18B20.prototype, "getReadingAsync").rejects();

    const sensorList = new SensorList(mockSprootDB, logger);
    try {
      await sensorList.initializeOrRegenerateAsync();
    } finally {
      //Cleanup
      await sensorList.disposeAsync();
    }
  });
});
