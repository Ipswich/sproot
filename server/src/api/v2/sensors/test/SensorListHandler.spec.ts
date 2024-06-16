import { assert } from "chai";
import { SensorList } from "../../../../sensors/list/SensorList";
import sensorListHandler from "../handlers/SensorListHandler";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import winston from "winston";
import { BME280 } from "../../../../sensors/BME280";
import { DS18B20 } from "../../../../sensors/DS18B20";
import sinon from "sinon";

const sandbox = sinon.createSandbox();
const mockSprootDB = new MockSprootDB();

describe("SensorListHandler.ts tests", () => {
  afterEach(() => {
    sandbox.restore();
  });

  it("should return a record of string:sensors", async () => {
    sandbox.stub(MockSprootDB.prototype, "getSensorsAsync").resolves([
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
    sandbox.stub(BME280.prototype, "initAsync").resolves({
      id: 1,
      name: "test sensor 1",
      model: "BME280",
      address: "0x76",
      lastReading: { humidity: "50", pressure: "400", temperature: "25" },
      lastReadingTime: null,
      units: { temperature: "°C", humidity: "%", pressure: "hPa" },
      disposeAsync: async () => {},
      chartData: {
        getOne: (_key: ReadingType) => {},
      },
    } as BME280);

    const sensorList = new SensorList(mockSprootDB, 5, 5, 3, 5, logger);
    try {
      await sensorList.initializeOrRegenerateAsync();

      assert.deepEqual(sensorListHandler(sensorList), Object.values(sensorList.sensorData));

      assert.deepEqual(sensorListHandler(sensorList, "-1"), []);
      assert.deepEqual(sensorListHandler(sensorList, "1"), [
        {
          id: 1,
          name: "test sensor 1",
          model: "BME280",
          address: "0x76",
          lastReading: { humidity: "50.000", pressure: "400.000", temperature: "25.000" },
          lastReadingTime: null,
          units: { temperature: "°C", humidity: "%", pressure: "hPa" },
        },
      ]);
    } finally {
      sensorList.disposeAsync();
    }
  });
});
