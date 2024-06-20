import { Request, Response } from "express";

import { assert } from "chai";
import { SensorList } from "../../../../sensors/list/SensorList";
import {
  addSensorHandlerAsync,
  deleteSensorHandlerAsync,
  getSensorHandler,
  updateSensorHandlerAsync,
} from "../handlers/SensorHandlers";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import sinon from "sinon";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { SensorBase } from "../../../../sensors/base/SensorBase";

const sandbox = sinon.createSandbox();

describe("SensorHandlers.ts tests", () => {
  afterEach(() => {
    sandbox.restore();
  });

  describe("getSensorDataHandler", () => {
    const sensorList = sinon.createStubInstance(SensorList);
    const sensorData = {
      1: {
        id: 1,
        name: "test sensor 1",
        model: "BME280",
        address: "0x76",
        lastReading: { humidity: "50.000", pressure: "400.000", temperature: "25.000" },
        lastReadingTime: null,
        units: { temperature: "°C", humidity: "%", pressure: "hPa" },
      } as SensorBase,
      2: {
        id: 2,
        name: "test sensor 2",
        model: "DS18B20",
        address: "28-00001",
        lastReading: { temperature: "25.000" },
        lastReadingTime: null,
        units: { temperature: "°C" },
      } as SensorBase,
    };
    sinon.stub(sensorList, "sensorData").value(sensorData);

    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    it("should return a 200 and one sensor", async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => sensorList,
        },
        params: { id: 1 },
      } as unknown as Request;
      const success = getSensorHandler(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal((success.content?.data as Array<SDBSensor>).length, 1);
      assert.deepEqual(success.content?.data, [sensorData[1]]);
    });

    it("should return a 200 and all of the sensors", async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => sensorList,
        },
        params: {},
      } as unknown as Request;

      const success = getSensorHandler(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(
        (success.content?.data as Array<SDBSensor>).length,
        Object.keys(sensorData).length,
      );
      assert.deepEqual(success.content?.data, Object.values(sensorData));
    });

    it("should return a 404 and an error", async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => sensorList,
        },
        originalUrl: "/api/v2/sensors/-1",
        params: { id: "-1" },
      } as unknown as Request;
      const error = getSensorHandler(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/sensors/-1");
      assert.equal(error.error["details"].at(0), "Sensor with ID -1 not found.");
    });
  });

  describe("addSensorHandlerAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<MockSprootDB>;
    let sensorList: sinon.SinonStubbedInstance<SensorList>;
    beforeEach(() => {
      sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addSensorAsync.resolves();
      sensorList = sinon.createStubInstance(SensorList);
      sensorList.initializeOrRegenerateAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    it("should return a 201 and add a new sensor", async () => {
      const newSensor = {
        name: "test sensor 4",
        model: "DS18B20",
        address: "28-00002",
        color: "#000000",
      } as SDBSensor;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        body: newSensor,
      } as unknown as Request;

      const success = (await addSensorHandlerAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, newSensor);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDB.addSensorAsync.calledOnce);
      assert.isTrue(sensorList.initializeOrRegenerateAsync.calledOnce);
    });

    it("should return a 400 and details for each missing required field", async () => {
      const newSensor = {} as SDBSensor;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        originalUrl: "/api/v2/sensors",
        body: newSensor,
      } as unknown as Request;

      const error = (await addSensorHandlerAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], [
        "Missing required field: name",
        "Missing required field: model",
        "Missing required field: address",
      ]);
      assert.isTrue(sprootDB.addSensorAsync.notCalled);
      assert.isTrue(sensorList.initializeOrRegenerateAsync.notCalled);
    });

    it("should return a 503 and an error", async () => {
      const newSensor = {
        name: "test sensor 4",
        model: "DS18B20",
        address: "28-00002",
        color: "#000000",
      } as SDBSensor;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        originalUrl: "/api/v2/sensors",
        body: newSensor,
      } as unknown as Request;

      sprootDB.addSensorAsync.rejects(new Error("DB Error"));

      const error = (await addSensorHandlerAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], ["Failed to add sensor to database", "DB Error"]);
    });
  });

  describe("updateSensorHandlerAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<MockSprootDB>;
    let sensorList: sinon.SinonStubbedInstance<SensorList>;
    beforeEach(() => {
      sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.updateSensorAsync.resolves();
      sensorList = sinon.createStubInstance(SensorList);
      sensorList.initializeOrRegenerateAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    it("should return a 200 and update an existing sensor", async () => {
      const updatedSensor = {
        1: {
          id: 1,
          name: "test sensor 4",
          model: "DS18B20",
          address: "28-00002",
          color: "#000000",
        } as SDBSensor,
      };
      sinon.stub(sensorList, "sensorData").value(updatedSensor);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        params: { id: 1 },
        body: updatedSensor,
      } as unknown as Request;

      const success = (await updateSensorHandlerAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, updatedSensor[1]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDB.updateSensorAsync.calledOnce);
      assert.isTrue(sensorList.initializeOrRegenerateAsync.calledOnce);
    });

    it("should return a 400 and an error", async () => {
      const updatedSensor = {
        1: {
          id: 1,
          name: "test sensor 4",
          model: "DS18B20",
          address: "28-00002",
          color: "#000000",
        } as SDBSensor,
      };
      sinon.stub(sensorList, "sensorData").value(updatedSensor);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        originalUrl: "/api/v2/sensors",
        params: { id: "string" },
        body: updatedSensor,
      } as unknown as Request;

      const error = (await updateSensorHandlerAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], ["Invalid sensor Id."]);
      assert.isTrue(sprootDB.updateSensorAsync.notCalled);
      assert.isTrue(sensorList.initializeOrRegenerateAsync.notCalled);
    });

    it("should return a 404 and an error", async () => {
      const updatedSensor = {
        1: {
          id: 1,
          name: "test sensor 4",
          model: "DS18B20",
          address: "28-00002",
          color: "#000000",
        } as SDBSensor,
      };
      sinon.stub(sensorList, "sensorData").value(updatedSensor);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        originalUrl: "/api/v2/sensors/-1",
        params: { id: -1 },
        body: updatedSensor,
      } as unknown as Request;

      const error = (await updateSensorHandlerAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/sensors/-1");
      assert.deepEqual(error.error["details"], ["Sensor with ID -1 not found."]);
      assert.isTrue(sprootDB.updateSensorAsync.notCalled);
      assert.isTrue(sensorList.initializeOrRegenerateAsync.notCalled);
    });

    it("should return a 503 and an error", async () => {
      const updatedSensor = {
        1: {
          id: 1,
          name: "test sensor 4",
          model: "DS18B20",
          address: "28-00002",
          color: "#000000",
        } as SDBSensor,
      };
      sinon.stub(sensorList, "sensorData").value(updatedSensor);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        originalUrl: "/api/v2/sensors",
        params: { id: 1 },
        body: updatedSensor,
      } as unknown as Request;

      sprootDB.updateSensorAsync.rejects(new Error("DB Error"));

      const error = (await updateSensorHandlerAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], [
        "Failed to update sensor in database.",
        "DB Error",
      ]);
    });
  });

  describe("deleteSensorHandlerAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<MockSprootDB>;
    let sensorList: sinon.SinonStubbedInstance<SensorList>;
    beforeEach(() => {
      sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.deleteSensorAsync.resolves();
      sensorList = sinon.createStubInstance(SensorList);
      sensorList.initializeOrRegenerateAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    it("should return a 200 and delete an existing sensor", async () => {
      const deletedSensor = {
        1: {
          id: 1,
          name: "test sensor 4",
          model: "DS18B20",
          address: "28-00002",
          color: "#000000",
        } as SDBSensor,
      };
      sinon.stub(sensorList, "sensorData").value(deletedSensor);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        params: { id: 1 },
      } as unknown as Request;

      const success = (await deleteSensorHandlerAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.content?.data, "Sensor deleted successfully.");
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDB.deleteSensorAsync.calledOnce);
      assert.isTrue(sensorList.initializeOrRegenerateAsync.calledOnce);
    });

    it("should return a 400 and an error", async () => {
      const deletedSensor = {
        1: {
          id: 1,
          name: "test sensor 4",
          model: "DS18B20",
          address: "28-00002",
          color: "#000000",
        } as SDBSensor,
      };
      sinon.stub(sensorList, "sensorData").value(deletedSensor);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        originalUrl: "/api/v2/sensors",
        params: { id: "string" },
      } as unknown as Request;

      const error = (await deleteSensorHandlerAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], ["Invalid sensor Id."]);
      assert.isTrue(sprootDB.deleteSensorAsync.notCalled);
      assert.isTrue(sensorList.initializeOrRegenerateAsync.notCalled);
    });

    it("should return a 404 and an error", async () => {
      const deletedSensor = {
        1: {
          id: 1,
          name: "test sensor 4",
          model: "DS18B20",
          address: "28-00002",
          color: "#000000",
        } as SDBSensor,
      };
      sinon.stub(sensorList, "sensorData").value(deletedSensor);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        originalUrl: "/api/v2/sensors/-1",
        params: { id: -1 },
      } as unknown as Request;

      const error = (await deleteSensorHandlerAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/sensors/-1");
      assert.deepEqual(error.error["details"], ["Sensor with ID -1 not found."]);
      assert.isTrue(sprootDB.deleteSensorAsync.notCalled);
      assert.isTrue(sensorList.initializeOrRegenerateAsync.notCalled);
    });

    it("should return a 503 and an error", async () => {
      const deletedSensor = {
        1: {
          id: 1,
          name: "test sensor 4",
          model: "DS18B20",
          address: "28-00002",
          color: "#000000",
        } as SDBSensor,
      };
      sinon.stub(sensorList, "sensorData").value(deletedSensor);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "sensorList":
                return sensorList;
            }
          },
        },
        originalUrl: "/api/v2/sensors",
        params: { id: 1 },
      } as unknown as Request;

      sprootDB.deleteSensorAsync.rejects(new Error("DB Error"));

      const error = (await deleteSensorHandlerAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], [
        "Failed to delete sensor from database.",
        "DB Error",
      ]);
    });
  });
});
