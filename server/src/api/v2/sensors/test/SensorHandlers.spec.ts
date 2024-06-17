import { Request, Response } from "express";

import { assert } from "chai";
import { SensorList } from "../../../../sensors/list/SensorList";
import { getSensorDataHandler } from "../handlers/SensorHandlers";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import winston from "winston";
import { BME280 } from "../../../../sensors/BME280";
import { DS18B20 } from "../../../../sensors/DS18B20";
import sinon from "sinon";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";

const sandbox = sinon.createSandbox();
let mockSprootDB = new MockSprootDB();

describe("SensorHandlers.ts tests", () => {
  beforeEach(() => {
    //Stub logger
    sandbox.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );

    //Stub database
    sandbox
      .stub(MockSprootDB.prototype, "getDS18B20AddressesAsync")
      .resolves([{ address: "28-00000" } as SDBSensor, { address: "28-00001" } as SDBSensor]);
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

    //Stub classes
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
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("getSensorDataHandler", () => {
    it("should return a SuccessResponse or a FailureResponse", async () => {
      const logger = winston.createLogger();
      const sensorList = new SensorList(mockSprootDB, 5, 5, 3, 5, logger);
      const mockResponse = {
        locals: {
          defaultProperties: {
            statusCode: 200,
            requestId: "1234",
          },
        },
      } as unknown as Response;

      try {
        await sensorList.initializeOrRegenerateAsync();

        let mockRequest = {
          app: {
            get: (_dependency: string) => sensorList,
          },
          params: {},
        } as unknown as Request;

        let success = getSensorDataHandler(mockRequest, mockResponse) as SuccessResponse;
        console.log(success.content?.data);
        console.log(Object.values(sensorList.sensorData));
        assert.deepEqual(success.content?.data, Object.values(sensorList.sensorData));

        mockRequest = {
          app: {
            get: (_dependency: string) => sensorList,
          },
          params: { id: 1 },
        } as unknown as Request;
        success = getSensorDataHandler(mockRequest, mockResponse) as SuccessResponse;
        assert.deepEqual(success.content?.data, [
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

        mockRequest = {
          app: {
            get: (_dependency: string) => sensorList,
          },
          originalUrl: "/api/v2/sensors/-1",
          params: { id: "-1" },
        } as unknown as Request;
        let error = getSensorDataHandler(mockRequest, mockResponse) as ErrorResponse;
        assert.equal(error.error.name, "Not Found");
        assert.equal(error.error.url, "/api/v2/sensors/-1");
        assert.equal(error.error["details"].at(0), "Sensor with ID -1 not found.");
      } finally {
        sensorList.disposeAsync();
      }
    });
  });

  // describe("addSensorHandlerAsync", () => {
  //   it ('should add a new sensor to sensorList and regenerate', async () => {
  //     const newSensor = {
  //       name: "test sensor 4",
  //       model: "DS18B20",
  //       address: "28-00002",
  //       color: "#000000",
  //     } as SDBSensor;

  //   });
  // });
});
