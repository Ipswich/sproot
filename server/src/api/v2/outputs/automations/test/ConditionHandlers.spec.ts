import { Request, Response } from "express";
import { OutputList } from "../../../../../outputs/list/OutputList";
import { addAsync, deleteAsync, get, updateAsync } from "../handlers/ConditionHandlers";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/src/api/v2/Responses";

import { assert } from "chai";
import sinon from "sinon";
import { SprootDB } from "../../../../../database/SprootDB";
import { Automation } from "../../../../../automation/Automation";
import { ReadingType } from "@sproot/sproot-common/src/sensors/ReadingType";

describe("ConditionHandlers.ts", () => {
  describe("get", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    let sprootDB = sinon.createStubInstance(SprootDB);
    sprootDB.addSensorAutomationConditionAsync.resolves(1);
    sprootDB.addOutputAutomationConditionAsync.resolves(1);
    sprootDB.addTimeAutomationConditionAsync.resolves(1);
    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        }
      }
    } as unknown as Response;
    const automation1 = new Automation(1, "Automation 1", 1, "and", sprootDB);
    automation1.conditions.addSensorConditionAsync("allOf", "equal", 50, 1, ReadingType.temperature);
    const automation2 = new Automation(2, "Automation 2", 2, "or", sprootDB);
    automation2.conditions.addOutputConditionAsync("anyOf", "equal", 50, 1);

    const automations = {
      "1": automation1,
      "2": automation2
    };

    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({
        "1": {
          id: "1",
          model: "PCA9685",
          address: 0x40,
          name: "test",
          pin: 0,
          isPwm: true,
          isInvertedPwm: false,
          color: "red",
          state: 0,
          getAutomations: function () {
            return automations
          },
        }
      });
    });

    it('should return a 200 and a list of conditions for a given automation', () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          outputId: "1",
          automationId: "1",
        }
      } as unknown as Request;

      const success = get(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, [{ "1": { "sensor": { "allOf": [{ "id": 1, "groupType": "allOf", "sensorId": 1, "readingType": "temperature", "operator": "equal", "comparisonValue": 50 }], "anyOf": [], "oneOf": [] }, "output": { "allOf": [], "anyOf": [], "oneOf": [] }, "time": { "allOf": [], "anyOf": [], "oneOf": [] } } }]);
    });

    it('should return a 200 and a list of conditions for a given automation and type', () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor"
        }
      } as unknown as Request;

      const success = get(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, [{ "1": { "allOf": [{ "id": 1, "groupType": "allOf", "sensorId": 1, "readingType": "temperature", "operator": "equal", "comparisonValue": 50 }], "anyOf": [], "oneOf": [] } }]);
    });

    it('should return a 200 and a list of conditions for a given automation, type, and conditionId', () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const success = get(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, [{ "id": 1, "groupType": "allOf", "sensorId": 1, "readingType": "temperature", "operator": "equal", "comparisonValue": 50 }]);
    });

    it('should return a 400 if the outputId is invalid', () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          outputId: null,
          automationId: "1",
        }
      } as unknown as Request;

      const error = get(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Output ID not provided."]);
    })

    it('should return a 400 if the automationId is invalid', () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          outputId: "1",
          automationId: null,
        }
      } as unknown as Request;

      const error = get(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Automation ID not provided."]);
    })

    it('should return a 400 if the type is invalid', () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "test"
        }
      } as unknown as Request;

      const error = get(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid condition type."]);
    });

    it('should return a 400 if the conditionId is invalid', () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
          conditionId: "test"
        }
      } as unknown as Request;

      const error = get(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid condition ID."]);
    });

    it('should return a 404 if the output does not exist', () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          outputId: "2",
          automationId: "1",
        }
      } as unknown as Request;

      const error = get(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Output with ID 2 not found."]);
    });

    it('should return a 404 if the automation does not exist', () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          outputId: "1",
          automationId: "3",
        }
      } as unknown as Request;

      const error = get(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with ID 3 not found."]);
    });

    it('should return a 404 if the condition does not exist', () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
          conditionId: "2"
        }
      } as unknown as Request;

      const error = get(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Sensor condition with ID 2 not found."]);
    });
  });

  describe("addAsync", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    let sprootDB: sinon.SinonStubbedInstance<SprootDB>;
    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        }
      }
    } as unknown as Response;

    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
      sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.addSensorAutomationConditionAsync.resolves(1);
      sprootDB.addOutputAutomationConditionAsync.resolves(1);
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      const automation1 = new Automation(1, "Automation 1", 1, "and", sprootDB);
      const automation2 = new Automation(2, "Automation 2", 2, "or", sprootDB);

      const automations = {
        "1": automation1,
        "2": automation2
      };
      sinon.stub(outputList, "outputs").value({
        "1": {
          id: "1",
          model: "PCA9685",
          address: 0x40,
          name: "test",
          pin: 0,
          isPwm: true,
          isInvertedPwm: false,
          color: "red",
          state: 0,
          getAutomations: function () {
            return automations
          },
        }
      });
    });

    it('should return a 201 and the new sensor condition for a given automation', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: ReadingType.temperature
        }
      } as unknown as Request;

      const success = await addAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.id, 1);
      assert.equal(success.content?.data.groupType, "allOf");
      assert.equal(success.content?.data.sensorId, 1);
      assert.equal(success.content?.data.readingType, "temperature");
      assert.equal(success.content?.data.operator, "equal");
      assert.equal(success.content?.data.comparisonValue, 50);
    });

    it('should return a 201 and the new output condition for a given automation', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "output",
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
      assert.equal(success.content?.data.id, 1);
      assert.equal(success.content?.data.groupType, "allOf");
      assert.equal(success.content?.data.outputId, 1);
      assert.equal(success.content?.data.operator, "equal");
      assert.equal(success.content?.data.comparisonValue, 50);
    });

    it('should return a 201 and the new time condition for a given automation', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "time",
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
      assert.equal(success.content?.data.id, 1);
      assert.equal(success.content?.data.groupType, "allOf");
      assert.equal(success.content?.data.startTime, "12:00");
      assert.equal(success.content?.data.endTime, "13:00");
    });

    it('should return a 400 if the outputId is invalid', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: null,
          automationId: "1",
          type: "sensor",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: ReadingType.temperature
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing output ID."]);
    });

    it('should return a 400 if the automationId is invalid', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: null,
          type: "sensor",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: ReadingType.temperature
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation ID."]);
    });

    it('should return a 400 if the type is invalid', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "test",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: ReadingType.temperature
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing condition type."]);
    });

    it('should return a 404 if the output does not exist', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: "2",
          automationId: "1",
          type: "sensor",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: ReadingType.temperature
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Output with ID 2 not found."]);
    });

    it('should return a 404 if the automation does not exist', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "3",
          type: "sensor",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: ReadingType.temperature
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with ID 3 not found."]);
    });

    it('should return a 400 and details for the invalid request (sensor)', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
        },
        body: {
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing condition groupType.", "Invalid or missing operator.", "Invalid or missing comparison value.", "Invalid or missing sensor ID.", "Invalid or missing reading type."]);
    });

    it('should return a 400 and details for the invalid request (output)', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "output",
        },
        body: {
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing condition groupType.", "Invalid or missing operator.", "Invalid or missing comparison value.", "Invalid or missing output ID."]);
    });

    it('should return a 400 and details for the invalid request (time)', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "time",
        },
        body: {
          startTime: "test",
          endTime: "test"
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing condition groupType.", "Invalid start time.", "Invalid end time."]);
    });

    it('should return a 503 if the database is unreachable', async () => {
      sprootDB.addSensorAutomationConditionAsync.rejects(new Error("Test error"));
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: ReadingType.temperature
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Test error"]);
    });
  });

  describe('updateAsync', () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    let sprootDB: sinon.SinonStubbedInstance<SprootDB>;
    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        }
      }
    } as unknown as Response;

    beforeEach(async () => {
      outputList = sinon.createStubInstance(OutputList);
      sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.addSensorAutomationConditionAsync.resolves(1);
      sprootDB.addOutputAutomationConditionAsync.resolves(1);
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      sprootDB.updateSensorAutomationConditionAsync.resolves();
      sprootDB.updateOutputAutomationConditionAsync.resolves();
      sprootDB.updateTimeAutomationConditionAsync.resolves();
      const automation1 = new Automation(1, "Automation 1", 1, "and", sprootDB);
      await automation1.conditions.addSensorConditionAsync("allOf", "greater", 50, 1, ReadingType.temperature);
      await automation1.conditions.addOutputConditionAsync("anyOf", "less", 50, 1);
      await automation1.conditions.addTimeConditionAsync("oneOf", "12:00", "13:00");

      const automations = {
        "1": automation1,
      };

      sinon.stub(outputList, "outputs").value({
        "1": {
          id: "1",
          model: "PCA9685",
          address: 0x40,
          name: "test",
          pin: 0,
          isPwm: true,
          isInvertedPwm: false,
          color: "red",
          state: 0,
          getAutomations: function () {
            return automations
          },
        }
      });
    });

    it('should return a 200 and the updated sensor condition', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        },
        body: {}
      } as unknown as Request;

      let success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.id, 1);
      assert.equal(success.content?.data.groupType, "allOf");
      assert.equal(success.content?.data.sensorId, 1);
      assert.equal(success.content?.data.readingType, "temperature");
      assert.equal(success.content?.data.operator, "greater");
      assert.equal(success.content?.data.comparisonValue, 50);

      mockRequest.body = {
        groupType: "anyOf",
        operator: "equal",
        comparisonValue: 51,
        sensorId: 2,
        readingType: ReadingType.humidity
      }

      success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.id, 1);
      assert.equal(success.content?.data.groupType, "anyOf");
      assert.equal(success.content?.data.sensorId, 2);
      assert.equal(success.content?.data.readingType, "humidity");
      assert.equal(success.content?.data.operator, "equal");
      assert.equal(success.content?.data.comparisonValue, 51);
    });

    it('should return a 200 and the updated output condition', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "output",
          conditionId: "1"
        },
        body: {}
      } as unknown as Request;

      let success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.id, 1);
      assert.equal(success.content?.data.groupType, "anyOf");
      assert.equal(success.content?.data.outputId, 1);
      assert.equal(success.content?.data.operator, "less");
      assert.equal(success.content?.data.comparisonValue, 50);

      mockRequest.body = {
        groupType: "anyOf",
        operator: "equal",
        comparisonValue: 51,
        outputId: 2
      }
      success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.id, 1);
      assert.equal(success.content?.data.groupType, "anyOf");
      assert.equal(success.content?.data.outputId, 2);
      assert.equal(success.content?.data.operator, "equal");
      assert.equal(success.content?.data.comparisonValue, 51);
    });

    it('should return a 200 and the updated time condition', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "time",
          conditionId: "1"
        },
        body: {
        }
      } as unknown as Request;

      let success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.id, 1);
      assert.equal(success.content?.data.groupType, "oneOf");
      assert.equal(success.content?.data.startTime, "12:00");
      assert.equal(success.content?.data.endTime, "13:00");

      mockRequest.body = {
        groupType: "anyOf",
        startTime: "13:00",
        endTime: "14:00"
      }
      success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.id, 1);
      assert.equal(success.content?.data.groupType, "anyOf");
      assert.equal(success.content?.data.startTime, "13:00");
      assert.equal(success.content?.data.endTime, "14:00");
    });

    it('should return a 400 and details for the invalid request', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
        },
        body: {
        }
      } as unknown as Request;

      let error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing output ID.", "Invalid or missing automation ID.", "Invalid or missing condition type.", "Invalid or missing condition ID."]);

      mockRequest.params = {
        outputId: "1",
        automationId: "1",
        type: "sensor",
        conditionId: "1"
      };

      mockRequest.body = {
        groupType: "",
        operator: "",
        comparisonValue: "test",
        sensorId: "test",
        readingType: "test"
      }

      error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing condition groupType.", "Invalid or missing operator.", "Invalid or missing comparison value.", "Invalid or missing sensor ID.", "Invalid or missing reading type."]);

      mockRequest.params["type"] = "output";
      mockRequest.body = {
        groupType: "",
        operator: "",
        comparisonValue: "test",
        outputId: "test"
      }
      error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing condition groupType.", "Invalid or missing operator.", "Invalid or missing comparison value.", "Invalid or missing output ID."]);

      mockRequest.params["type"] = "time";
      mockRequest.body = {
        groupType: "",
        startTime: "test",
        endTime: "test"
      }
      error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing condition groupType.", "Invalid start time.", "Invalid end time."]);
    });


    it('should return a 404 if the output does not exist', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "2",
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        },
        body: {
          groupType: "anyOf",
          operator: "equal",
          comparisonValue: 51,
          sensorId: 2,
          readingType: ReadingType.humidity
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Output with ID 2 not found."]);
    });

    it('should return a 404 if the automation does not exist', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "3",
          type: "sensor",
          conditionId: "1"
        },
        body: {
          groupType: "anyOf",
          operator: "equal",
          comparisonValue: 51,
          sensorId: 2,
          readingType: ReadingType.humidity
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with ID 3 not found."]);
    });

    it('should return a 404 if the condition does not exist', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
          conditionId: "2"
        },
        body: {
          groupType: "anyOf",
          operator: "equal",
          comparisonValue: 51,
          sensorId: 2,
          readingType: ReadingType.humidity
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Sensor condition with ID 2 not found."]);
    });

    it('should return a 503 if the database is unreachable', async () => {
      sprootDB.updateSensorAutomationConditionAsync.rejects(new Error("Test error"));
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        },
        body: {
          groupType: "anyOf",
          operator: "equal",
          comparisonValue: 51,
          sensorId: 2,
          readingType: ReadingType.humidity
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Test error"]);
    });
  });

  describe("deleteAsync", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    let sprootDB: sinon.SinonStubbedInstance<SprootDB>;
    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        }
      }
    } as unknown as Response;

    beforeEach(async () => {
      outputList = sinon.createStubInstance(OutputList);
      sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.addSensorAutomationConditionAsync.resolves(1);
      sprootDB.addOutputAutomationConditionAsync.resolves(1);
      sprootDB.addTimeAutomationConditionAsync.resolves(1);
      const automation1 = new Automation(1, "Automation 1", 1, "and", sprootDB);
      await automation1.conditions.addSensorConditionAsync("allOf", "equal", 50, 1, ReadingType.temperature);

      const automations = {
        "1": automation1
      };

      sinon.stub(outputList, "outputs").value({
        "1": {
          id: "1",
          model: "PCA9685",
          address: 0x40,
          name: "test",
          pin: 0,
          isPwm: true,
          isInvertedPwm: false,
          color: "red",
          state: 0,
          getAutomations: function () {
            return automations
          },
        }
      });
    });

    it('should return a 200 and delete a sensor condition', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const success = await deleteAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.message, "Condition deleted successfully.");
    });

    it('should return a 200 and delete an output condition', async () => {
      const automation1 = new Automation(1, "Automation 1", 1, "and", sprootDB);
      await automation1.conditions.addOutputConditionAsync("anyOf", "equal", 50, 1);
      const automations = {
        "1": automation1
      };

      sinon.stub(outputList, "outputs").value({
        "1": {
          id: "1",
          model: "PCA9685",
          address: 0x40,
          name: "test",
          pin: 0,
          isPwm: true,
          isInvertedPwm: false,
          color: "red",
          state: 0,
          getAutomations: function () {
            return automations
          },
        }
      });

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "output",
          conditionId: "1"
        }
      } as unknown as Request;

      const success = await deleteAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.message, "Condition deleted successfully.");
    });

    it('should return a 200 and delete a time condition', async () => {
      const automation1 = new Automation(1, "Automation 1", 1, "and", sprootDB);
      await automation1.conditions.addTimeConditionAsync("oneOf", "12:00", "13:00");
      const automations = {
        "1": automation1
      };

      sinon.stub(outputList, "outputs").value({
        "1": {
          id: "1",
          model: "PCA9685",
          address: 0x40,
          name: "test",
          pin: 0,
          isPwm: true,
          isInvertedPwm: false,
          color: "red",
          state: 0,
          getAutomations: function () {
            return automations
          },
        }
      });

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "time",
          conditionId: "1"
        }
      } as unknown as Request;

      const success = await deleteAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.message, "Condition deleted successfully.");
    });

    it('should return a 400 and details for the invalid request', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: null,
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
      assert.deepEqual(error.error.details, ["Invalid or missing output ID.", "Invalid or missing automation ID.", "Invalid or missing condition type.", "Invalid or missing condition ID."]);
    });

    it('should return a 404 if the output does not exist', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "2",
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Output with ID 2 not found."]);
    });

    it('should return a 404 if the automation does not exist', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "2",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with ID 2 not found."]);
    });

    it('should return a 404 if the condition does not exist', async () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
          conditionId: "2"
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Sensor condition with ID 2 not found."]);
    });

    it('should return a 503 if the database is unreachable', async () => {
      sprootDB.deleteSensorAutomationConditionAsync.rejects(new Error("Test error"));
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
              case "sprootDB":
                return sprootDB;
            }
          }
        },
        params: {
          outputId: "1",
          automationId: "1",
          type: "sensor",
          conditionId: "1"
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Test error"]);
    });
  });
});