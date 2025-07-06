import { ADS1115, Ads1115Device } from "@sproot/sproot-server/src/sensors/ADS1115";

import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";

import { assert } from "chai";
import * as sinon from "sinon";
import winston from "winston";
const mockSprootDB = new MockSprootDB();

describe("ADS1115.ts tests", function () {
  afterEach(() => {
    sinon.restore();
  });
  it("should initialize an ADS1115 sensor", async () => {
    const mockADS1115Data = {
      id: 1,
      name: "test sensor 1",
      model: "ADS1115",
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

    sinon
      .stub(Ads1115Device, "openAsync")
      .resolves({ measureAsync: async (_mux, _gain) => 1234 } as Ads1115Device);

    const ads1115Sensor = await new ADS1115(
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
    assert.isTrue(ads1115Sensor instanceof ADS1115);
    assert.equal(ads1115Sensor!.id, mockADS1115Data.id);
    assert.equal(ads1115Sensor!.name, mockADS1115Data.name);
    assert.equal(ads1115Sensor!.model, mockADS1115Data.model);
    assert.equal(ads1115Sensor!.address, mockADS1115Data.address);
    assert.equal(ads1115Sensor!.pin, mockADS1115Data.pin);
    assert.equal(ads1115Sensor!.units[ReadingType.voltage], "V");

    await ads1115Sensor!.disposeAsync();
  });

  it("should take a reading from an ADS1115 sensor", async () => {
    const mockADS1115Data = {
      id: 1,
      name: "test sensor 1",
      model: "ADS1115",
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
    const openStub = sinon.stub(Ads1115Device, "openAsync").resolves({
      measureAsync: async (_mux, _gain) => mockReading,
    } as Ads1115Device);
    let ads1115Sensor = await new ADS1115(
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

    assert.isTrue(openStub.calledOnce);
    assert.equal(ads1115Sensor!.lastReading[ReadingType.voltage], String(mockReading / 10000));

    await ads1115Sensor?.disposeAsync();

    // GetReading throws an errror
    ads1115Sensor = await new ADS1115(
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

    openStub.rejects(new Error("Failed to open sensor"));
    await ads1115Sensor!.takeReadingAsync();
    assert.isUndefined(ads1115Sensor!.lastReading[ReadingType.voltage]);
    assert.isTrue(loggerSpy.calledOnce);

    //Cleanup
    await ads1115Sensor?.disposeAsync();
  });
});
