import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/src/api/v2/Responses";

import { assert } from "chai";
import sinon from "sinon";
import { SprootDB } from "../../../../database/SprootDB";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { SDBSensorCondition } from "@sproot/database/SDBSensorCondition";
import { getAllAsync, getOneOfByTypeAsync, getByTypeAsync, addAsync, updateAsync, deleteAsync } from "../handlers/ConditionHandlers";
import { SDBOutputCondition } from "@sproot/database/SDBOutputCondition";
import { AutomationDataManager } from "../../../../automation/AutomationDataManager";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";
import { OutputList } from "../../../../outputs/list/OutputList";
import { SensorList } from "../../../../sensors/list/SensorList";

describe("ConditionHandlers.ts", () => {
  describe("getAllAsync", () => {
    afterEach(() => {
      sinon.restore();
    });
    it('should return a 200 and all of the conditions for a given automation', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([{ id: 1, groupType: "allOf", sensorId: 1, readingType: "temperature", operator: "equal", comparisonValue: 50 } as SDBSensorCondition]);
      sprootDB.getOutputConditionsAsync.resolves([{ id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 } as SDBOutputCondition]);
      sprootDB.getTimeConditionsAsync.resolves([{ id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const success = await getAllAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "sensor": { "allOf": [{ "id": 1, "groupType": "allOf", "sensorId": 1, "readingType": "temperature", "operator": "equal", "comparisonValue": 50 }], "anyOf": [], "oneOf": [] }, "output": { "allOf": [{ id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 }], "anyOf": [], "oneOf": [] }, "time": { "allOf": [{ id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" }], "anyOf": [], "oneOf": [] } });
    });

    it('should return a 400 if the automationId is invalid', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sinon.createStubInstance(SprootDB);
            }
          }
        },
        params: {
          automationId: null
        }
      } as unknown as Request;

      const error = await getAllAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation Id."]);
    });

    it('should return a 404 if the automation does not exist', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const error = await getAllAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it('should return a 503 if the database is unreachable', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const error = await getAllAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });

  describe("getTypeAsync", () => {
    it("should return a 200 and all of the conditions of a given type for a given automation (sensor)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([{ id: 1, groupType: "allOf", sensorId: 1, readingType: "temperature", operator: "equal", comparisonValue: 50 } as SDBSensorCondition]);
      sprootDB.getOutputConditionsAsync.resolves([{ id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 } as SDBOutputCondition]);
      sprootDB.getTimeConditionsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor"
        }
      } as unknown as Request;

      const success = await getByTypeAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "allOf": [{ "id": 1, "groupType": "allOf", "sensorId": 1, "readingType": "temperature", "operator": "equal", "comparisonValue": 50 }], "anyOf": [], "oneOf": [] });
    });

    it('should return a 200 and all of the conditions of a given type for a given automation (output)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([{ id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 } as SDBOutputCondition]);
      sprootDB.getTimeConditionsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "output"
        }
      } as unknown as Request;

      const success = await getByTypeAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "allOf": [{ id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 }], "anyOf": [], "oneOf": [] });
    });

    it('should return a 200 and all of the conditions of a given type for a given automation (time)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([{ id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "time"
        }
      } as unknown as Request;

      const success = await getByTypeAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "allOf": [{ id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" }], "anyOf": [], "oneOf": [] });
    });

    it("should return a 400 and details for the invalid request", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sinon.createStubInstance(SprootDB);
            }
          }
        },
        params: {
          automationId: null,
          type: "test"
        }
      } as unknown as Request;

      const error = await getByTypeAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation Id.", "Invalid or missing condition type."]);
    });

    it("should return a 404 if the automation does not exist", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor"
        }
      } as unknown as Request;

      const error = await getByTypeAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it('should return a 503 if the database is unreachable', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor"
        }
      } as unknown as Request;

      const error = await getByTypeAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });

  describe("getOneOfByTypeAsync", () => {
    it('should return a 200 and the condition of a given type and conditionId for a given automation (sensor)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([
        { id: 1, groupType: "allOf", sensorId: 1, readingType: "temperature", operator: "equal", comparisonValue: 50 } as SDBSensorCondition,
        { id: 2, groupType: "allOf", sensorId: 1, readingType: "temperature", operator: "equal", comparisonValue: 50 } as SDBSensorCondition]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const success = await getOneOfByTypeAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "id": 1, "groupType": "allOf", "sensorId": 1, "readingType": "temperature", "operator": "equal", "comparisonValue": 50 });
    });

    it('should return a 200 and the condition of a given type and conditionId for a given automation (output)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([
        { id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 } as SDBOutputCondition,
        { id: 2, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 } as SDBOutputCondition]);
      sprootDB.getTimeConditionsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "output",
          conditionId: "1"
        }
      } as unknown as Request;

      const success = await getOneOfByTypeAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "id": 1, "groupType": "allOf", "outputId": 1, "operator": "equal", "comparisonValue": 50 });
    });

    it('should return a 200 and the condition of a given type and conditionId for a given automation (time)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([]);
      sprootDB.getOutputConditionsAsync.resolves([]);
      sprootDB.getTimeConditionsAsync.resolves([
        { id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition,
        { id: 2, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "time",
          conditionId: "1"
        }
      } as unknown as Request;

      const success = await getOneOfByTypeAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "id": 1, "groupType": "allOf", "startTime": "12:00", "endTime": "13:00" });
    });

    it('should return a 400 and details for the invalid request', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sinon.createStubInstance(SprootDB);
            }
          }
        },
        params: {
          automationId: null,
          type: null,
          conditionId: null
        }
      } as unknown as Request;

      const error = await getOneOfByTypeAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation Id.", "Invalid or missing condition type.", "Invalid or missing condition Id."]);
    });

    it('should return a 404 if the automation does not exist', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const error = await getOneOfByTypeAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it('should return a 404 if the condition does not exist', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const error = await getOneOfByTypeAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Condition with Id 1 not found."]);
    });

    it('should return a 503 if the database is unreachable', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const error = await getOneOfByTypeAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });

  describe("addAsync", () => {
    it('should return a 201 and the sensor condition added to the automation', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const sensorList = sinon.createStubInstance(SensorList);
      sinon.stub(sensorList, "sensors").value({'1': { id: 1, name: "Sensor 1", type: "temperature" }});
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.addSensorConditionAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
              case "sensorList":
                return sensorList;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor"
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: "temperature"
        }
      } as unknown as Request;

      const success = await addAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "id": 1, "groupType": "allOf", "sensorId": 1, "readingType": "temperature", "operator": "equal", "comparisonValue": 50 });
    });

    it('should return a 201 and the output condition added to the automation', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({'1': { id: 1, name: "Output 1",}});
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.addOutputConditionAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          automationId: "1",
          type: "output"
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          outputId: 1
        }
      } as unknown as Request;

      const success = await addAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "id": 1, "groupType": "allOf", "outputId": 1, "operator": "equal", "comparisonValue": 50 });
    });

    it('should return a 201 and the time condition added to the automation', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.addTimeConditionAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "time"
        },
        body: {
          groupType: "allOf",
          startTime: "12:00",
          endTime: "13:00"
        }
      } as unknown as Request;

      const success = await addAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "id": 1, "groupType": "allOf", "startTime": "12:00", "endTime": "13:00" });
    });

    it('should return a 400 and details for the invalid request (missing automation Id or type)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sinon.createStubInstance(SprootDB);
              case "automationDataManager":
                return sinon.createStubInstance(AutomationDataManager);
            }
          }
        },
        params: {
          automationId: null,
          type: "test"
        },
        body: {
          groupType: null,
          operator: null,
          comparisonValue: null,
          sensorId: null,
          readingType: null
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation Id.", "Invalid or missing condition type."]);
    });

    it('should return a 400 and details for the invalid request (sensor)', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return sinon.createStubInstance(AutomationDataManager);
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor"
        },
        body: {
          groupType: null,
          operator: null,
          comparisonValue: null,
          sensorId: null,
          readingType: null
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing condition groupType.", "Invalid or missing operator.", "Invalid or missing comparison value.", "Invalid or missing sensor Id.", "Invalid or missing reading type."]);
    });

    it('should return a 400 and details for the invalid request (output)', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "output"
        },
        body: {
          groupType: null,
          operator: null,
          comparisonValue: null,
          outputId: null
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing condition groupType.", "Invalid or missing operator.", "Invalid or missing comparison value.", "Invalid or missing output Id."]);
    });

    it('should return a 400 and details for the invalid request (time)', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "time"
        },
        body: {
          groupType: null,
          startTime: "test1",
          endTime: "test"
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing condition groupType.", "Invalid or missing start time.", "Invalid or missing end time."]);
    });

    it('should return a 404 if the automation does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor"
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: "temperature"
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it('should return a 503 if the database is unreachable', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.rejects(new Error("Database unreachable"));
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor"
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: "temperature"
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });

  describe("updateAsync", () => {
    it('should return a 200 and the sensor condition updated for the automation', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([{ id: 1, groupType: "allOf", sensorId: 1, readingType: "temperature", operator: "equal", comparisonValue: 50 } as SDBSensorCondition]);
      sprootDB.updateSensorConditionAsync.resolves();
      const outputList = sinon.createStubInstance(OutputList);
      const sensorList = sinon.createStubInstance(SensorList);
      sinon.stub(sensorList, "sensors").value({'2': { id: 2, name: "Sensor 1", type: "temperature" }});
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
              case "sensorList":
                return sensorList;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        },
        body: {
          groupType: "anyOf",
          operator: "less",
          comparisonValue: 51,
          sensorId: 2,
          readingType: "humidity"
        }
      } as unknown as Request;

      const success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "id": 1, "groupType": "anyOf", "sensorId": 2, "readingType": "humidity", "operator": "less", "comparisonValue": 51 });
    });

    it('should return a 200 and the output condition updated for the automation', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getOutputConditionsAsync.resolves([{ id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 } as SDBOutputCondition]);
      sprootDB.updateOutputConditionAsync.resolves();
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({'2': { id: 2, name: "Output 1",}});
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          automationId: "1",
          type: "output",
          conditionId: "1"
        },
        body: {
          groupType: "anyOf",
          operator: "less",
          comparisonValue: 51,
          outputId: 2
        }
      } as unknown as Request;

      const success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "id": 1, "groupType": "anyOf", "outputId": 2, "operator": "less", "comparisonValue": 51 });
    });

    it('should return a 200 and the time condition updated for the automation', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getTimeConditionsAsync.resolves([{ id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition]);
      sprootDB.updateTimeConditionAsync.resolves();
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "time",
          conditionId: "1"
        },
        body: {
          groupType: "anyOf",
          startTime: "13:00",
          endTime: "14:00"
        }
      } as unknown as Request;

      const success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { "id": 1, "groupType": "anyOf", "startTime": "13:00", "endTime": "14:00" });
    });

    it('should return a 400 and details for the invalid request (missing automation Id, type, or conditionId)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sinon.createStubInstance(SprootDB);
              case "automationDataManager":
                return sinon.createStubInstance(AutomationDataManager);
            }
          }
        },
        params: {
          automationId: null,
          type: null,
          conditionId: null
        },
        body: {
          groupType: null,
          operator: null,
          comparisonValue: null,
          sensorId: null,
          readingType: null
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation Id.", "Invalid or missing condition type.", "Invalid or missing condition Id."]);
    });

    it('should return a 400 and details for the invalid request (sensor)', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([{ id: 1, groupType: "allOf", sensorId: 1, readingType: "temperature", operator: "equal", comparisonValue: 50 } as SDBSensorCondition]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        },
        body: {
          groupType: "test",
          operator: "test",
          comparisonValue: "test",
          sensorId: "test",
          readingType: "test"
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Invalid or missing condition groupType.", "Invalid operator.", "Invalid comparison value.", "Invalid sensor Id.", "Invalid reading type."]);
    });

    it('should return a 400 and details for the invalid request (output)', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getOutputConditionsAsync.resolves([{ id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 } as SDBOutputCondition]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "output",
          conditionId: "1"
        },
        body: {
          groupType: null,
          operator: "test",
          comparisonValue: "test",
          outputId: "test"
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Invalid operator.", "Invalid comparison value.", "Invalid output Id."]);
    });

    it('should return a 400 and details for the invalid request (time)', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getTimeConditionsAsync.resolves([{ id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "time",
          conditionId: "1"
        },
        body: {
          groupType: null,
          startTime: "test",
          endTime: "test"
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Invalid start time.", "Invalid end time."]);
    });

    it('should return a 404 if the automation does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        },
        body: {
          groupType: "anyOf",
          operator: "less",
          comparisonValue: 51,
          sensorId: 2,
          readingType: "humidity"
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it('should return a 404 if the condition does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        },
        body: {
          groupType: "anyOf",
          operator: "less",
          comparisonValue: 51,
          sensorId: 2,
          readingType: "humidity"
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Sensor condition with Id 1 not found."]);
    });

    it('should return a 503 if the database is unreachable', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.rejects(new Error("Database unreachable"));
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        },
        body: {
          groupType: "anyOf",
          operator: "less",
          comparisonValue: 51,
          sensorId: 2,
          readingType: "humidity"
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });

  describe('deleteAsync', () => {
    it('should return a 200 with a message (sensor)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([{ id: 1, groupType: "allOf", sensorId: 1, readingType: "temperature", operator: "equal", comparisonValue: 50 } as SDBSensorCondition]);
      sprootDB.deleteSensorConditionAsync.resolves();
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const success = await deleteAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { message: "Condition deleted successfully." });
    })

    it('should return a 200 with a message (output)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getOutputConditionsAsync.resolves([{ id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 } as SDBOutputCondition]);
      sprootDB.deleteOutputConditionAsync.resolves();
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "output",
          conditionId: "1"
        }
      } as unknown as Request;

      const success = await deleteAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { message: "Condition deleted successfully." });
    });

    it('should return a 200 with a message (time)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getTimeConditionsAsync.resolves([{ id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition]);
      sprootDB.deleteTimeConditionAsync.resolves();
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
            }
          }
        },
        params: {
          automationId: "1",
          type: "time",
          conditionId: "1"
        }
      } as unknown as Request;

      const success = await deleteAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { message: "Condition deleted successfully." });
    });

    it('should return a 400 and details for the invalid request (missing automation Id, type, or conditionId)', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sinon.createStubInstance(SprootDB);
              case "automationDataManager":
                return sinon.createStubInstance(AutomationDataManager);
            }
          }
        },
        params: {
          automationId: null,
          type: null,
          conditionId: null
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation Id.", "Invalid or missing condition type.", "Invalid or missing condition Id."]);
    });

    it('should return a 404 if the automation does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return sinon.createStubInstance(AutomationDataManager);
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it('should return a 404 if the condition does not exist', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "Automation 1", operator: "and" } as SDBAutomation]);
      sprootDB.getSensorConditionsAsync.resolves([]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return sinon.createStubInstance(AutomationDataManager);
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Sensor condition with Id 1 not found."]);
    });

    it('should return a 503 if the database is unreachable', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.rejects(new Error("Database unreachable"));
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return sinon.createStubInstance(AutomationDataManager);
            }
          }
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });
});