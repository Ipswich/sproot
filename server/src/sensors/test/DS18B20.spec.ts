import { promises } from "fs";

import { DS18B20 } from "@sproot/sproot-server/src/sensors/DS18B20";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
const mockSprootDB = new MockSprootDB();

describe("DS18B20.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });

  it("should create but not initialize a DS18B20 sensor", async function () {
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 1",
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

    const ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, 5, 5, 3, 5, logger);

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
    let mockReading = "47 01 55 05 7f a5 a5 66 eb : crc=eb YES\n47 01 55 05 7f a5 a5 66 eb t=20437";
    const readFileStub = sinon.stub(promises, "readFile").resolves(mockReading);

    let ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, 5, 5, 3, 5, logger);
    await ds18b20Sensor.takeReadingAsync();

    assert.equal(ds18b20Sensor.lastReading[ReadingType.temperature], String(20.437));

    //Not a number reading
    mockReading = "47 01 55 05 7f a5 a5 66 eb : crc=eb YES\n47 01 55 05 7f a5 a5 66 eb t=test";
    readFileStub.resolves(mockReading);
    ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, 5, 5, 3, 5, logger);

    await ds18b20Sensor.takeReadingAsync();
    assert.isUndefined(ds18b20Sensor.lastReading[ReadingType.temperature]);
    assert.isTrue(loggerSpy.calledOnce);
    loggerSpy.resetHistory();

    //No reading whatsoever
    mockReading = "YES";
    readFileStub.resolves(mockReading);
    ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, 5, 5, 3, 5, logger);

    await ds18b20Sensor.takeReadingAsync();
    assert.isUndefined(ds18b20Sensor.lastReading[ReadingType.temperature]);
    assert.isTrue(loggerSpy.calledOnce);
    loggerSpy.resetHistory();

    //Error reading
    mockReading = "47 01 55 05 7f a5 a5 66 eb : crc=eb NO\n47 01 55 05 7f a5 a5 66 eb t=20437";
    readFileStub.resolves(mockReading);
    ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB, 5, 5, 3, 5, logger);

    await ds18b20Sensor.takeReadingAsync();
    assert.isUndefined(ds18b20Sensor.lastReading[ReadingType.temperature]);
    assert.isTrue(loggerSpy.calledOnce);
  });

  it("should get all DS18B20 addresses", async function () {
    sinon
      .stub(promises, "readFile")
      .resolves("28-0311977965c0\n28-031197797be0\n28-03119779f5f2\nundefined\n00-a88000000000\n");
    const addresses = await DS18B20.getAddressesAsync();

    assert.equal(addresses.length, 3);
    assert.equal(addresses[0], "28-0311977965c0");
    assert.equal(addresses[1], "28-031197797be0");
    assert.equal(addresses[2], "28-03119779f5f2");
  });

  it("should load cached readings from the database, initializing a sensor", async function () {
    const mockDS18B20Data = {
      id: 1,
      name: "test sensor 1",
      model: "DS18B20",
      address: "28-00000",
    } as SDBSensor;
    const recordsToLoad = 2;
    sinon.stub(mockSprootDB, "getSensorReadingsAsync").resolves([
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

    const ds18b20Sensor = await new DS18B20(
      mockDS18B20Data,
      mockSprootDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    assert.equal(
      ds18b20Sensor!.getCachedReadings()[ReadingType.temperature]!.length,
      recordsToLoad,
    );
    assert.equal(ds18b20Sensor!.getCachedReadings()[ReadingType.temperature]![0]!.data, "1");
    assert.equal(ds18b20Sensor!.getCachedReadings()[ReadingType.temperature]![1]!.data, "2");

    // Cleanup
    ds18b20Sensor!.disposeAsync();
  });
});
