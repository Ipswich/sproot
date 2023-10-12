import bme280, { Bme280 } from "bme280";
import { BME280 } from "../BME280";
import { MockSprootDB } from "../../database/types/ISprootDB";
import { ReadingType } from "../types/SensorBase";
import { SDBSensor } from "../../database/types/SDBSensor";

import { assert } from "chai";
import * as sinon from "sinon";
const sandbox = sinon.createSandbox();
const mockSprootDB = new MockSprootDB();

describe("BME280.ts tests", function () {
  this.afterEach(() => {
    sandbox.restore();
  });

  it("should initialize a BME280 sensor", async () => {
    const mockBME280Data = {
      id: 1,
      description: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    sandbox
      .stub(bme280, "open")
      .resolves({ close: async function () {} } as Bme280); // Don't create a real sensor - needs I2C bus

    const bme280Sensor = await new BME280(
      mockBME280Data,
      mockSprootDB,
    ).initAsync();

    assert.isTrue(bme280Sensor instanceof BME280);
    assert.equal(bme280Sensor.id, mockBME280Data.id);
    assert.equal(bme280Sensor.description, mockBME280Data.description);
    assert.equal(bme280Sensor.model, mockBME280Data.model);
    assert.equal(bme280Sensor.address, mockBME280Data.address);
    assert.equal(bme280Sensor.units[ReadingType.temperature], "°C");
    assert.equal(bme280Sensor.units[ReadingType.humidity], "%rH");
    assert.equal(bme280Sensor.units[ReadingType.pressure], "hPa");
  });

  it("should dispose of a BME280 sensor", async () => {
    const mockBME280Data = {
      id: 1,
      description: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    const closeStub = sandbox.stub().resolves();
    sandbox
      .stub(bme280, "open")
      .resolves({ close: closeStub as Bme280["close"] } as Bme280); // Don't create a real sensor - needs I2C bus

    const bme280Sensor = await new BME280(
      mockBME280Data,
      mockSprootDB,
    ).initAsync();
    await bme280Sensor.disposeAsync();

    assert.isTrue(closeStub.calledOnce);
  });

  it("should get a reading from a BME280 sensor", async () => {
    const mockBME280Data = {
      id: 1,
      description: "test sensor 1",
      model: "BME280",
      address: "0x76",
    } as SDBSensor;
    const mockReading = { temperature: 21.2, humidity: 45.6, pressure: 1013.2 };
    const readStub = sandbox.stub().resolves(mockReading as bme280.data);
    sandbox
      .stub(bme280, "open")
      .resolves({ read: readStub as Bme280["read"] } as Bme280); // Don't create a real sensor - needs I2C bus

    const bme280Sensor = await new BME280(
      mockBME280Data,
      mockSprootDB,
    ).initAsync();
    await bme280Sensor.getReadingAsync();

    assert.isTrue(readStub.calledOnce);
    assert.equal(
      bme280Sensor.lastReading[ReadingType.temperature],
      String(mockReading.temperature),
    );
    assert.equal(
      bme280Sensor.lastReading[ReadingType.humidity],
      String(mockReading.humidity),
    );
    assert.equal(
      bme280Sensor.lastReading[ReadingType.pressure],
      String(mockReading.pressure),
    );
  });
});
