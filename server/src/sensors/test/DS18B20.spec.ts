import { promises } from "fs";

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
const MAX_CACHE_SIZE = process.env["MAX_CACHE_SIZE"];

describe("DS18B20.ts tests", function () {
  afterEach(() => {
    process.env["MAX_CACHE_SIZE"] = MAX_CACHE_SIZE;
    sandbox.restore();
  });

  it("should create but not initialize a DS18B20 sensor", async function () {
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 1",
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

    const ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, logger);

    assert.isTrue(ds18b20Sensor instanceof DS18B20);
    assert.equal(ds18b20Sensor.id, mockDS18B20Data.id);
    assert.equal(ds18b20Sensor.name, mockDS18B20Data.name);
    assert.equal(ds18b20Sensor.model, mockDS18B20Data.model);
    assert.equal(ds18b20Sensor.address, mockDS18B20Data.address);
    assert.equal(ds18b20Sensor.units[ReadingType.temperature], "°C");
  });

  it("should get a reading from a DS18B20 sensor, gracefully handling errors", async function () {
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 1",
      model: "DS18B20",
      address: "28-00000",
    } as SDBSensor;
    const loggerSpy = sandbox.spy();
    sandbox.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: loggerSpy,
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();
    let mockReading = "47 01 55 05 7f a5 a5 66 eb : crc=eb YES\n47 01 55 05 7f a5 a5 66 eb t=20437";
    const readFileStub = sandbox.stub(promises, "readFile").resolves(mockReading);

    let ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, logger);
    await ds18b20Sensor.getReadingAsync();

    assert.equal(ds18b20Sensor.lastReading[ReadingType.temperature], String(20.437));

    mockReading = "47 01 55 05 7f a5 a5 66 eb : crc=eb NO\n47 01 55 05 7f a5 a5 66 eb t=20437";
    readFileStub.resolves(mockReading);
    ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, logger);

    await ds18b20Sensor.getReadingAsync();
    assert.isUndefined(ds18b20Sensor.lastReading[ReadingType.temperature]);
    assert.isTrue(loggerSpy.calledOnce);
  });

  it("should get all DS18B20 addresses", async function () {
    sandbox.stub(promises, "readFile").resolves("28-00000\n28-00001\n28-00002\n");
    const addresses = await DS18B20.getAddressesAsync();

    assert.equal(addresses.length, 3);
    assert.equal(addresses[0], "28-00000");
    assert.equal(addresses[1], "28-00001");
    assert.equal(addresses[2], "28-00002");
  });

  it("should load cached readings from the database, initializing a sensor", async function () {
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 1",
      model: "DS18B20",
      address: "28-00000",
    } as SDBSensor;
    const recordsToLoad = 2;
    sandbox.stub(mockSprootDB, "getSensorReadingsAsync").resolves([
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

    sandbox.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();

    const ds18b20Sensor = await new DS18B20(mockDS18B20Data, mockSprootDB, logger).initAsync();

    assert.equal(ds18b20Sensor!.cachedReadings[ReadingType.temperature].length, recordsToLoad);
    assert.equal(ds18b20Sensor!.cachedReadings[ReadingType.temperature][0]!.data, "1");
    assert.equal(ds18b20Sensor!.cachedReadings[ReadingType.temperature][1]!.data, "2");

    // Cleanup
    ds18b20Sensor!.disposeAsync();
  });

  it("should update cached readings with the last reading", async () => {
    process.env["MAX_CACHE_SIZE"] = "1";
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 1",
      model: "ds18b20",
      address: "28-00000",
    } as SDBSensor;
    let mockReading = {
      temperature: 21.2,
    };
    sandbox.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    const logger = winston.createLogger();
    const ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, logger);
    ds18b20Sensor.lastReading[ReadingType.temperature] = String(mockReading.temperature);
    ds18b20Sensor.lastReadingTime = new Date("2000-01-01T00:00:00.000Z");

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
});
