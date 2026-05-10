import { Request, Response } from "express";
import { assert } from "chai";
import { SensorList } from "../../../../sensors/list/SensorList";
import { addAsync, deleteAsync, get, updateAsync } from "../handlers/SensorHandlers";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import sinon from "sinon";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { SensorBase } from "../../../../sensors/base/SensorBase";
import { Models } from "@sproot/sproot-common/dist/sensors/Models";
import { setValidatedContractRequestData } from "../../../validation/validateRequest";

function createMockResponse(validatedRequestData: Record<string, unknown> = {}): Response {
  const response = {
    locals: {
      defaultProperties: {
        timestamp: new Date().toISOString(),
        requestId: "1234",
      },
    },
  } as unknown as Response;

  setValidatedContractRequestData(response, validatedRequestData);

  return response;
}

describe("SensorHandlers.ts tests", () => {
  describe("get", () => {
    let sensorList: sinon.SinonStubbedInstance<SensorList>;
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
    const mockResponse = createMockResponse();
    beforeEach(() => {
      sensorList = sinon.createStubInstance(SensorList);
      sinon.stub(sensorList, "sensorData").value(sensorData);
    });
    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 and one sensor", () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => sensorList,
        },
        params: { sensorId: 1 },
      } as unknown as Request;

      const success = get(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal((success.content?.data as Array<SDBSensor>).length, 1);
      assert.deepEqual(success.content?.data, [sensorData[1]]);
    });

    it("should return a 200 and all of the sensors", () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => sensorList,
        },
        params: {},
      } as unknown as Request;

      const success = get(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(
        (success.content?.data as Array<SDBSensor>).length,
        Object.keys(sensorData).length
      );
      assert.deepEqual(success.content?.data, Object.values(sensorData));
    });

    it("should return a 404 and a 'Not Found' error", () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => sensorList,
        },
        originalUrl: "/api/v2/sensors/-1",
        params: { sensorId: "-1" },
      } as unknown as Request;
      const error = get(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/sensors/-1");
      assert.equal(error.error["details"].at(0), "Sensor with ID -1 not found.");
    });
  });

  describe("addAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<MockSprootDB>;
    let sensorList: sinon.SinonStubbedInstance<SensorList>;
    beforeEach(() => {
      sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addSensorAsync.resolves();
      sensorList = sinon.createStubInstance(SensorList);
      sensorList.regenerateAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    const mockResponse = createMockResponse();

    it("should return a 201 and add a new sensor", async () => {
      const mockResponse = createMockResponse();
      const newSensor = {
        name: "test sensor 4",
        model: Models.DS18B20,
        address: "28-00002",
        color: "#000000",
        subcontrollerId: null,
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

      let success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, { ...newSensor, pin: undefined });
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDB.addSensorAsync.calledOnce);
      assert.isTrue(sensorList.regenerateAsync.calledOnce);

      newSensor.model = "CAPACITIVE_MOISTURE_SENSOR";
      newSensor.pin = "4";
      success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, newSensor);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDB.addSensorAsync.calledTwice);
      assert.isTrue(sensorList.regenerateAsync.calledTwice);
    });

    it("should prefer validated create body data over raw request body", async () => {
      const mockResponse = createMockResponse({
        body: {
          name: "Validated Sensor",
          model: Models.DS18B20,
          address: "28-validated",
          color: "#ffffff",
          subcontrollerId: 1,
        },
      });

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
        body: {
          name: "Raw Sensor",
          model: Models.BME280,
          address: "0x76",
          color: "#000000",
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, {
        name: "Validated Sensor",
        model: Models.DS18B20,
        address: "28-validated",
        color: "#ffffff",
        subcontrollerId: 1,
        pin: undefined,
      });
    });

    it("should return a 400 for remaining model validation errors", async () => {
      const newSensor = {
        name: "test sensor 4",
        model: Models.ADS1115,
        address: "0x48",
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

      let error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], ["Missing required field: pin"]);
      assert.isTrue(sprootDB.addSensorAsync.notCalled);
      assert.isTrue(sensorList.regenerateAsync.notCalled);

      newSensor.model = "Not A Valid Model" as keyof typeof Models;
      newSensor.pin = "4";
      error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], [
        `Invalid model: Not A Valid Model. Supported models are: ${Object.keys(Models).join(", ")}`,
      ]);
      assert.isTrue(sprootDB.addSensorAsync.notCalled);
      assert.isTrue(sensorList.regenerateAsync.notCalled);
    });

    it("should return a 503 if the database is unreachable", async () => {
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

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], ["Failed to add sensor to database", "DB Error"]);
    });
  });

  describe("updateAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<MockSprootDB>;
    let sensorList: sinon.SinonStubbedInstance<SensorList>;
    beforeEach(() => {
      sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.updateSensorAsync.resolves();
      sensorList = sinon.createStubInstance(SensorList);
      sensorList.regenerateAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    const mockResponse = createMockResponse();

    it("should return a 200 and update an existing sensor", async () => {
      const mockResponse = createMockResponse();
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
        params: { sensorId: 1 },
        body: updatedSensor,
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, updatedSensor[1]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDB.updateSensorAsync.calledOnce);
      assert.isTrue(sensorList.regenerateAsync.calledOnce);
    });

    it("should prefer validated update params and body over raw request data", async () => {
      const sensors = {
        1: {
          id: 1,
          name: "original sensor",
          model: "DS18B20",
          address: "28-00002",
          color: "#000000",
          pin: "1",
        } as SDBSensor,
        2: {
          id: 2,
          name: "validated target",
          model: "BME280",
          address: "0x76",
          color: "#111111",
          pin: "2",
        } as SDBSensor,
      };
      sinon.stub(sensorList, "sensorData").value(sensors);
      const mockResponse = createMockResponse({
        params: { sensorId: 2 },
        body: { name: "validated update", color: "#abcdef" },
      });

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
        params: { sensorId: "1" },
        body: { name: "raw update", color: "#123456" },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal((success.content?.data as SDBSensor).id, 2);
      assert.equal((success.content?.data as SDBSensor).name, "validated update");
      assert.equal((success.content?.data as SDBSensor).color, "#abcdef");
    });

    it("should return a 400 and details for the invalid request", async () => {
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
        params: {},
        body: updatedSensor,
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], ["Invalid or missing sensor ID."]);
      assert.isTrue(sprootDB.updateSensorAsync.notCalled);
      assert.isTrue(sensorList.regenerateAsync.notCalled);
    });

    it("should return a 404 and a 'Not Found' error", async () => {
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
        params: { sensorId: -1 },
        body: updatedSensor,
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/sensors/-1");
      assert.deepEqual(error.error["details"], ["Sensor with ID -1 not found."]);
      assert.isTrue(sprootDB.updateSensorAsync.notCalled);
      assert.isTrue(sensorList.regenerateAsync.notCalled);
    });

    it("should return a 503 if the database is unreachable", async () => {
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
        params: { sensorId: 1 },
        body: updatedSensor,
      } as unknown as Request;

      sprootDB.updateSensorAsync.rejects(new Error("DB Error"));

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
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

  describe("deleteAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<MockSprootDB>;
    let sensorList: sinon.SinonStubbedInstance<SensorList>;
    beforeEach(() => {
      sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.deleteSensorAsync.resolves();
      sensorList = sinon.createStubInstance(SensorList);
      sensorList.regenerateAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    const mockResponse = createMockResponse();

    it("should return a 200 and delete an existing sensor", async () => {
      const mockResponse = createMockResponse();
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
        params: { sensorId: 1 },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.content?.data, "Sensor deleted successfully.");
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDB.deleteSensorAsync.calledOnce);
      assert.isTrue(sensorList.regenerateAsync.calledOnce);
    });

    it("should prefer validated delete params over raw request params", async () => {
      const deletedSensor = {
        1: {
          id: 1,
          name: "raw target",
          model: "DS18B20",
          address: "28-00002",
          color: "#000000",
        } as SDBSensor,
        2: {
          id: 2,
          name: "validated target",
          model: "BME280",
          address: "0x76",
          color: "#ffffff",
        } as SDBSensor,
      };
      sinon.stub(sensorList, "sensorData").value(deletedSensor);
      const mockResponse = createMockResponse({ params: { sensorId: 2 } });

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
        params: { sensorId: "1" },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.isTrue(sprootDB.deleteSensorAsync.calledOnceWith(2));
    });

    it("should return a 400 and details for the invalid request", async () => {
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
        params: {},
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], ["Invalid or missing sensor ID."]);
      assert.isTrue(sprootDB.deleteSensorAsync.notCalled);
      assert.isTrue(sensorList.regenerateAsync.notCalled);
    });

    it("should return a 404 and a 'Not Found' error", async () => {
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
        params: { sensorId: -1 },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/sensors/-1");
      assert.deepEqual(error.error["details"], ["Sensor with ID -1 not found."]);
      assert.isTrue(sprootDB.deleteSensorAsync.notCalled);
      assert.isTrue(sensorList.regenerateAsync.notCalled);
    });

    it("should return a 503 if the database is unreachable", async () => {
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
        params: { sensorId: 1 },
      } as unknown as Request;

      sprootDB.deleteSensorAsync.rejects(new Error("DB Error"));

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.equal(error.error.url, "/api/v2/sensors");
      assert.deepEqual(error.error["details"], [
        "Failed to delete sensor from database.",
        "DB Error",
      ]);
      assert.isTrue(sprootDB.deleteSensorAsync.calledOnce);
      assert.isTrue(sensorList.regenerateAsync.notCalled);
    });
  });
});
