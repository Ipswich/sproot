import { ESP32_ADS1115 } from "@sproot/sproot-server/src/sensors/ESP32_ADS1115";

import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";

import { assert } from "chai";
import nock from "nock";
import * as sinon from "sinon";
import winston from "winston";
const mockSprootDB = new MockSprootDB();

describe("ESP32_ADS1115.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });
  it("should initialize an ESP32_ADS1115 sensor", async () => {
    const mockADS1115Data = {
      id: 1,
      name: "test sensor 1",
      model: "ESP32_ADS1115",
      address: "0x48",
      pin: "0",
    } as SDBSensor;
    sinon.stub(mockSprootDB, "getSensorReadingsAsync").resolves([
      {
        data: "1.23",
        metric: ReadingType.voltage,
        units: "V",
        logTime: new Date().toISOString(),
      } as SDBReading,
      {
        data: "2.34",
        metric: ReadingType.voltage,
        units: "V",
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

    await using ads1115Sensor = await new ESP32_ADS1115(
      mockADS1115Data,
      ReadingType.voltage,
      "2/3",
      mockSprootDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    assert.equal(ads1115Sensor!.getCachedReadings()[ReadingType.voltage]!.length, 2);
    assert.isTrue(ads1115Sensor instanceof ESP32_ADS1115);
    assert.equal(ads1115Sensor!.id, mockADS1115Data.id);
    assert.equal(ads1115Sensor!.name, mockADS1115Data.name);
    assert.equal(ads1115Sensor!.model, mockADS1115Data.model);
    assert.equal(ads1115Sensor!.address, mockADS1115Data.address);
    assert.equal(ads1115Sensor!.pin, mockADS1115Data.pin);
    assert.equal(ads1115Sensor!.units[ReadingType.voltage], "V");
  });

  it("should take a reading from an ESP32_ADS1115 sensor", async () => {
    let callCount = 0;
    const scope = nock("http://127.0.0.5")
      .get(new RegExp("^/api/sensors/ads1115/0x48/[0-3]"))
      .reply(200, () => {
        callCount++;
        return { channel: 0, voltage: 1234, raw: 1234 };
      });
    const mockADS1115Data = {
      id: 1,
      name: "test sensor 1",
      model: "ESP32_ADS1115",
      externalAddress: "http://127.0.0.5",
      address: "0x48",
      pin: "0",
    } as SDBSensor;
    const mockReading = 1234;
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

    await using ads1115Sensor = await new ESP32_ADS1115(
      mockADS1115Data,
      ReadingType.voltage,
      "2/3",
      mockSprootDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();

    await ads1115Sensor!.takeReadingAsync();

    assert.equal(callCount, 1);
    assert.equal(ads1115Sensor!.lastReading[ReadingType.voltage], String(mockReading / 10000));

    // GetReading throws an errror
    await using ads1115Sensor2 = await new ESP32_ADS1115(
      mockADS1115Data,
      ReadingType.voltage,
      "2/3",
      mockSprootDB,
      5,
      5,
      3,
      5,
      logger,
    ).initAsync();
    scope.get(new RegExp("^/api/sensors/ads1115/0x48/[0-3]")).reply(500, () => {
      return { error: "Internal Server Error" };
    });

    await ads1115Sensor2!.takeReadingAsync();
    assert.isUndefined(ads1115Sensor2!.lastReading[ReadingType.voltage]);
    assert.isTrue(loggerSpy.calledOnce);
    scope.done();
  });
});
