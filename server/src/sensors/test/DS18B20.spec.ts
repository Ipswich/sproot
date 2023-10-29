import ds18b20 from "ds18b20";
import { DS18B20 } from "../DS18B20";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/SensorBase";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
const sandbox = sinon.createSandbox();
const mockSprootDB = new MockSprootDB();
const env = process.env;

describe("DS18B20.ts tests", function () {
  this.afterEach(() => {
    process.env = env;
    sandbox.restore();
  });

  it("should initialize a DS18B20 sensor", async function () {
    const mockDS18B20Data = {
      id: 1,
      description: "test sensor 1",
      model: "DS18B20",
      address: "28-00000",
    } as SDBSensor;
    sandbox
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();

    const ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, logger);

    assert.isTrue(ds18b20Sensor instanceof DS18B20);
    assert.equal(ds18b20Sensor.id, mockDS18B20Data.id);
    assert.equal(ds18b20Sensor.description, mockDS18B20Data.description);
    assert.equal(ds18b20Sensor.model, mockDS18B20Data.model);
    assert.equal(ds18b20Sensor.address, mockDS18B20Data.address);
    assert.equal(ds18b20Sensor.units[ReadingType.temperature], "°C");
  });

  it("should get a reading from a DS18B20 sensor", async function () {
    const mockDS18B20Data = {
      id: 1,
      description: "test sensor 1",
      model: "DS18B20",
      address: "28-00000",
    } as SDBSensor;
    sandbox
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();
    const mockReading = 21.2;
    sandbox.stub(ds18b20, "temperatureSync").returns(mockReading);

    const ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, logger);
    await ds18b20Sensor.getReadingAsync();

    assert.equal(ds18b20Sensor.lastReading[ReadingType.temperature], String(mockReading));
  });

  it("should get all DS18B20 addresses", async function () {
    sandbox.stub(ds18b20, "sensors").yields(null, ["28-00000", "28-00001", "28-00002"]);

    sandbox
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();

    const addresses = await DS18B20.getAddressesAsync(logger);

    assert.equal(addresses.length, 3);
    assert.equal(addresses[0], "28-00000");
    assert.equal(addresses[1], "28-00001");
    assert.equal(addresses[2], "28-00002");
  });

  it("should load cached readings from the database, clearing any old ones", async function () {
    const mockDS18B20Data = {
      id: 1,
      description: "test sensor 1",
      model: "DS18B20",
      address: "28-00000",
    } as SDBSensor;
    let recordsToLoad = 2;
    const getSensorReadingsAsyncStub = sandbox
      .stub(mockSprootDB, "getSensorReadingsAsync")
      .resolves([
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
      ]);

    sandbox
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();

    const ds18b20Sensor = await new DS18B20(mockDS18B20Data, mockSprootDB, logger).initAsync();

    assert.equal(ds18b20Sensor?.cachedReadings[ReadingType.temperature].length, recordsToLoad);
    assert.equal(ds18b20Sensor?.cachedReadings[ReadingType.temperature][0]?.data, "1");
    assert.equal(ds18b20Sensor?.cachedReadings[ReadingType.temperature][1]?.data, "2");

    recordsToLoad = 1;
    getSensorReadingsAsyncStub.resolves([
      {
        data: "1",
        metric: ReadingType.temperature,
        units: "°C",
        logTime: new Date().toISOString(),
      } as SDBReading,
    ]);
    await ds18b20Sensor?.initAsync();
    assert.equal(ds18b20Sensor?.cachedReadings[ReadingType.temperature].length, recordsToLoad);
    assert.equal(ds18b20Sensor?.cachedReadings[ReadingType.temperature][0]?.data, "1");
  });

  it("should update cached readings with the last reading", async () => {
    process.env["MAX_SENSOR_READING_CACHE_SIZE"] = "1";
    const mockDS18B20Data = {
      id: 1,
      description: "test sensor 1",
      model: "ds18b20",
      address: "28-00000",
    } as SDBSensor;
    let mockReading = {
      temperature: 21.2,
    };
    sandbox
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();
    const ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, logger);
    ds18b20Sensor.lastReading[ReadingType.temperature] = String(mockReading.temperature);

    ds18b20Sensor.addLastReadingToDatabaseAsync();

    assert.equal(
      ds18b20Sensor.cachedReadings[ReadingType.temperature][0]?.data,
      String(mockReading.temperature),
    );
    assert.equal(ds18b20Sensor.cachedReadings[ReadingType.temperature].length, 1);

    //Add another reading to make sure it gets shifted out
    mockReading = {
      temperature: 21.3,
    };
    ds18b20Sensor.lastReading[ReadingType.temperature] = String(mockReading.temperature);

    ds18b20Sensor.addLastReadingToDatabaseAsync();

    assert.equal(
      ds18b20Sensor.cachedReadings[ReadingType.temperature][0]?.data,
      String(mockReading.temperature),
    );
    assert.equal(ds18b20Sensor.cachedReadings[ReadingType.temperature].length, 1);
  });

  it("should log errors on getting addresses and readings, ", async function () {
    sandbox.stub(ds18b20, "sensors").yields(new Error("test error"), null);
    sandbox
      .stub(ds18b20, "temperatureSync")
      .throws(
        new Error(
          "ENOENT: no such file or directory, open '/sys/bus/w1/devices/w1_bus_master1/w1_master_slaves'",
        ),
      );

    sandbox
      .stub(winston, "createLogger")
      .callsFake(() => ({ info: () => {}, error: () => {} }) as unknown as winston.Logger);
    const logger = winston.createLogger();

    await DS18B20.getAddressesAsync(logger);
    const addresses = await DS18B20.getAddressesAsync(logger);
    const mockDS18B20Data = {
      id: 1,
      description: "test sensor 1",
      model: "DS18B20",
      address: "28-00000",
    } as SDBSensor;
    const ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, logger);
    await ds18b20Sensor.getReadingAsync();
    await ds18b20Sensor.getReadingAsync();

    assert.equal(addresses.length, 0);
    assert.equal(ds18b20Sensor.lastReading[ReadingType.temperature], undefined);
  });
});
