import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/common/api/v2/Responses";

import { assert } from "chai";
import sinon from "sinon";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { SDBSensorCondition } from "@sproot/database/SDBSensorCondition";
import {
  getAllAsync,
  getOneOfByTypeAsync,
  getByTypeAsync,
  addAsync,
  updateAsync,
  deleteAsync,
} from "../handlers/ConditionHandlers";
import { SDBOutputCondition } from "@sproot/database/SDBOutputCondition";
import { AutomationService } from "../../../../automation/AutomationService";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";
import { OutputList } from "../../../../outputs/list/OutputList";
import { SensorList } from "../../../../sensors/list/SensorList";

import { SDBWeekdayCondition } from "@sproot/database/SDBWeekdayCondition";
import { SDBMonthCondition } from "@sproot/database/SDBMonthCondition";
import { SDBDateRangeCondition } from "@sproot/database/SDBDateRangeCondition";
import winston from "winston";
import { MemoryEventBus } from "../../../../eventbus/MemoryEventBus";

const createStubSprootDB = () => {
  const sprootDB = createMockSprootDB() as any;
  sprootDB.automations = {
    getAllAsync: sinon.stub(),
    getByIdAsync: sinon.stub(),
  } as any;
  sprootDB.automations.conditions = {
    sensor: {
      getAsync: sinon.stub(),
      addAsync: sinon.stub(),
      updateAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
    },
    output: {
      getAsync: sinon.stub(),
      addAsync: sinon.stub(),
      updateAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
    },
    time: {
      getAsync: sinon.stub(),
      addAsync: sinon.stub(),
      updateAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
    },
    weekday: {
      getAsync: sinon.stub(),
      addAsync: sinon.stub(),
      updateAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
    },
    month: {
      getAsync: sinon.stub(),
      addAsync: sinon.stub(),
      updateAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
    },
    dateRange: {
      getAsync: sinon.stub(),
      addAsync: sinon.stub(),
      updateAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
    },
  };
  sprootDB.automations.actions = {
    output: {
      getAsync: sinon.stub(),
      getAllAsync: sinon.stub(),
      getOutputActionAsync: sinon.stub(),
      addAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
    },
    notification: {
      getAsync: sinon.stub(),
      getAllAsync: sinon.stub(),
      getNotificationActionByIdAsync: sinon.stub(),
      addAsync: sinon.stub(),
      deleteAsync: sinon.stub(),
    },
  };
  return sprootDB;
};

describe("ConditionHandlers.ts", () => {
  let mockLogger: winston.Logger;

  const createAutomationServiceAsync = (sprootDB: any) =>
    AutomationService.createInstanceAsync(
      sprootDB.automations,
      new MemoryEventBus(mockLogger),
      mockLogger,
    );

  before(() => {
    sinon.stub(winston, "createLogger").callsFake(
      () =>
        ({
          info: () => {},
          error: () => {},
          debug: () => {},
          warn: () => {},
          verbose: () => {},
          startTimer: () => ({ done: () => {} }) as winston.Profiler,
        }) as unknown as winston.Logger,
    );
    mockLogger = winston.createLogger();
  });

  after(() => {
    sinon.restore();
  });

  describe("getAllAsync", () => {
    afterEach(() => {
      sinon.restore();
    });
    it("should return a 200 and all of the conditions for a given automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          sensorId: 1,
          readingType: "temperature",
          operator: "equal",
          comparisonValue: 50,
        } as SDBSensorCondition,
      ]);
      sprootDB.automations.conditions.output.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          outputId: 1,
          operator: "equal",
          comparisonValue: 50,
        } as SDBOutputCondition,
      ]);
      sprootDB.automations.conditions.time.getAsync.resolves([
        { id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 127 } as SDBWeekdayCondition,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 127 } as SDBWeekdayCondition,
      ]);
      sprootDB.automations.conditions.month.getAsync.resolves([
        { id: 1, groupType: "allOf", months: 4095 } as SDBMonthCondition,
      ]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          startMonth: 1,
          startDate: 1,
          endMonth: 12,
          endDate: 31,
        } as SDBDateRangeCondition,
      ]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const success = (await getAllAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        sensor: {
          allOf: [
            {
              id: 1,
              groupType: "allOf",
              sensorId: 1,
              readingType: "temperature",
              operator: "equal",
              comparisonValue: 50,
            },
          ],
          anyOf: [],
          oneOf: [],
        },
        output: {
          allOf: [
            { id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 },
          ],
          anyOf: [],
          oneOf: [],
        },
        time: {
          allOf: [{ id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" }],
          anyOf: [],
          oneOf: [],
        },
        weekday: {
          allOf: [{ id: 1, groupType: "allOf", weekdays: 127 }],
          anyOf: [],
          oneOf: [],
        },
        month: {
          allOf: [{ id: 1, groupType: "allOf", months: 4095 }],
          anyOf: [],
          oneOf: [],
        },
        dateRange: {
          allOf: [
            { id: 1, groupType: "allOf", startMonth: 1, startDate: 1, endMonth: 12, endDate: 31 },
          ],
          anyOf: [],
          oneOf: [],
        },
      });
    });

    it("should return a 400 if the automationId is invalid", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return createStubSprootDB();
            }
          },
        },
        params: {
          automationId: null,
        },
      } as unknown as Request;

      const error = (await getAllAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation Id."]);
    });

    it("should return a 404 if the automation does not exist", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const error = (await getAllAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const error = (await getAllAsync(mockRequest, mockResponse)) as ErrorResponse;
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
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          sensorId: 1,
          readingType: "temperature",
          operator: "equal",
          comparisonValue: 50,
        } as SDBSensorCondition,
      ]);
      sprootDB.automations.conditions.output.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          outputId: 1,
          operator: "equal",
          comparisonValue: 50,
        } as SDBOutputCondition,
      ]);
      sprootDB.automations.conditions.time.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.month.getAsync.resolves([]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
        },
      } as unknown as Request;

      const success = (await getByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        allOf: [
          {
            id: 1,
            groupType: "allOf",
            sensorId: 1,
            readingType: "temperature",
            operator: "equal",
            comparisonValue: 50,
          },
        ],
        anyOf: [],
        oneOf: [],
      });
    });

    it("should return a 200 and all of the conditions of a given type for a given automation (output)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      sprootDB.automations.conditions.output.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          outputId: 1,
          operator: "equal",
          comparisonValue: 50,
        } as SDBOutputCondition,
      ]);
      sprootDB.automations.conditions.time.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.month.getAsync.resolves([]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "output",
        },
      } as unknown as Request;

      const success = (await getByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        allOf: [{ id: 1, groupType: "allOf", outputId: 1, operator: "equal", comparisonValue: 50 }],
        anyOf: [],
        oneOf: [],
      });
    });

    it("should return a 200 and all of the conditions of a given type for a given automation (time)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      sprootDB.automations.conditions.output.getAsync.resolves([]);
      sprootDB.automations.conditions.time.getAsync.resolves([
        { id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.month.getAsync.resolves([]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "time",
        },
      } as unknown as Request;

      const success = (await getByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        allOf: [{ id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" }],
        anyOf: [],
        oneOf: [],
      });
    });

    it("should return a 200 and all of the conditions of a given type for a given automation (weekday)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      sprootDB.automations.conditions.output.getAsync.resolves([]);
      sprootDB.automations.conditions.time.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 127 } as SDBWeekdayCondition,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 127 } as SDBWeekdayCondition,
      ]);
      sprootDB.automations.conditions.month.getAsync.resolves([]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "weekday",
        },
      } as unknown as Request;

      const success = (await getByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        allOf: [{ id: 1, groupType: "allOf", weekdays: 127 }],
        anyOf: [],
        oneOf: [],
      });
    });

    it("should return a 200 and all of the conditions of a given type for a given automation (month)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      sprootDB.automations.conditions.output.getAsync.resolves([]);
      sprootDB.automations.conditions.time.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.month.getAsync.resolves([
        { id: 1, groupType: "allOf", months: 4095 } as SDBMonthCondition,
      ]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "month",
        },
      } as unknown as Request;

      const success = (await getByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        allOf: [{ id: 1, groupType: "allOf", months: 4095 }],
        anyOf: [],
        oneOf: [],
      });
    });

    it("should return a 200 and all of the conditions of a given type for a given automation (date range)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      sprootDB.automations.conditions.output.getAsync.resolves([]);
      sprootDB.automations.conditions.time.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.month.getAsync.resolves([]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          startMonth: 1,
          startDate: 1,
          endMonth: 12,
          endDate: 31,
        } as SDBDateRangeCondition,
      ]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "date-range",
        },
      } as unknown as Request;

      const success = (await getByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        allOf: [
          {
            id: 1,
            groupType: "allOf",
            startMonth: 1,
            startDate: 1,
            endMonth: 12,
            endDate: 31,
          } as SDBDateRangeCondition,
        ],
        anyOf: [],
        oneOf: [],
      });
    });

    it("should return a 400 and details for the invalid request", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return createStubSprootDB();
            }
          },
        },
        params: {
          automationId: null,
          type: "test",
        },
      } as unknown as Request;

      const error = (await getByTypeAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing automation Id.",
        "Invalid or missing condition type.",
      ]);
    });

    it("should return a 404 if the automation does not exist", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
        },
      } as unknown as Request;

      const error = (await getByTypeAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
        },
      } as unknown as Request;

      const error = (await getByTypeAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });

  describe("getOneOfByTypeAsync", () => {
    it("should return a 200 and the condition of a given type and conditionId for a given automation (sensor)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          sensorId: 1,
          readingType: "temperature",
          operator: "equal",
          comparisonValue: 50,
        } as SDBSensorCondition,
        {
          id: 2,
          groupType: "allOf",
          sensorId: 1,
          readingType: "temperature",
          operator: "equal",
          comparisonValue: 50,
        } as SDBSensorCondition,
      ]);
      sprootDB.automations.conditions.output.getAsync.resolves([]);
      sprootDB.automations.conditions.time.getAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await getOneOfByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        sensorId: 1,
        readingType: "temperature",
        operator: "equal",
        comparisonValue: 50,
      });
    });

    it("should return a 200 and the condition of a given type and conditionId for a given automation (output)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      sprootDB.automations.conditions.output.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          outputId: 1,
          operator: "equal",
          comparisonValue: 50,
        } as SDBOutputCondition,
        {
          id: 2,
          groupType: "allOf",
          outputId: 1,
          operator: "equal",
          comparisonValue: 50,
        } as SDBOutputCondition,
      ]);
      sprootDB.automations.conditions.time.getAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "output",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await getOneOfByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        outputId: 1,
        operator: "equal",
        comparisonValue: 50,
      });
    });

    it("should return a 200 and the condition of a given type and conditionId for a given automation (time)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      sprootDB.automations.conditions.output.getAsync.resolves([]);
      sprootDB.automations.conditions.time.getAsync.resolves([
        { id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition,
        { id: 2, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition,
      ]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "time",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await getOneOfByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        startTime: "12:00",
        endTime: "13:00",
      });
    });

    it("should return a 200 and the condition of a given type and conditionId for a given automation (weekday)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      sprootDB.automations.conditions.output.getAsync.resolves([]);
      sprootDB.automations.conditions.time.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 127 } as SDBWeekdayCondition,
        { id: 2, groupType: "allOf", weekdays: 63 } as SDBWeekdayCondition,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 127 } as SDBWeekdayCondition,
        { id: 2, groupType: "allOf", weekdays: 63 } as SDBWeekdayCondition,
      ]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "weekday",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await getOneOfByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        weekdays: 127,
      });
    });

    it("should return a 200 and the condition of a given type and conditionId for a given automation (month)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      sprootDB.automations.conditions.output.getAsync.resolves([]);
      sprootDB.automations.conditions.time.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.month.getAsync.resolves([
        { id: 1, groupType: "allOf", months: 4095 } as SDBMonthCondition,
        { id: 2, groupType: "allOf", months: 2047 } as SDBMonthCondition,
      ]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "month",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await getOneOfByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        months: 4095,
      });
    });

    it("should return a 200 and the condition of a given type and conditionId for a given automation (date range)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      sprootDB.automations.conditions.output.getAsync.resolves([]);
      sprootDB.automations.conditions.time.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([]);
      sprootDB.automations.conditions.month.getAsync.resolves([]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          startMonth: 1,
          startDate: 1,
          endMonth: 12,
          endDate: 31,
        } as SDBDateRangeCondition,
        {
          id: 2,
          groupType: "allOf",
          startMonth: 1,
          startDate: 1,
          endMonth: 6,
          endDate: 30,
        } as SDBDateRangeCondition,
      ]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "date-range",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await getOneOfByTypeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        startMonth: 1,
        startDate: 1,
        endMonth: 12,
        endDate: 31,
      });
    });

    it("should return a 400 and details for the invalid request", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return createStubSprootDB();
            }
          },
        },
        params: {
          automationId: null,
          type: null,
          conditionId: null,
        },
      } as unknown as Request;

      const error = (await getOneOfByTypeAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing automation Id.",
        "Invalid or missing condition type.",
        "Invalid or missing condition Id.",
      ]);
    });

    it("should return a 404 if the automation does not exist", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
      } as unknown as Request;

      const error = (await getOneOfByTypeAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it("should return a 404 if the condition does not exist", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
      } as unknown as Request;

      const error = (await getOneOfByTypeAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Condition with Id 1 not found."]);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
      } as unknown as Request;

      const error = (await getOneOfByTypeAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });

  describe("addAsync", () => {
    let sprootDB: any;
    beforeEach(() => {
      sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
    });
    it("should return a 201 and the sensor condition added to the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sensorList = sinon.createStubInstance(SensorList);
      sinon
        .stub(sensorList, "sensors")
        .value({ "1": { id: 1, name: "Sensor 1", type: "temperature" } });
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.addAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
              case "sensorList":
                return sensorList;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: "temperature",
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        sensorId: 1,
        readingType: "temperature",
        operator: "equal",
        comparisonValue: 50,
        comparisonLookback: null,
      });
    });

    it("should return a 201 and the output condition added to the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({ "1": { id: 1, name: "Output 1" } });
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.output.addAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          automationId: "1",
          type: "output",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          outputId: 1,
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        outputId: 1,
        operator: "equal",
        comparisonValue: 50,
        comparisonLookback: null,
      });
    });

    it("should return a 201 and the time condition added to the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.time.addAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "time",
        },
        body: {
          groupType: "allOf",
          startTime: "12:00",
          endTime: "13:00",
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        startTime: "12:00",
        endTime: "13:00",
      });
    });

    it("should return a 201 and the weekday condition added to the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.weekday.addAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "weekday",
        },
        body: {
          groupType: "allOf",
          weekdays: 127,
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        weekdays: 127,
      });
    });

    it("should return a 201 and the month condition added to the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.month.addAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "month",
        },
        body: {
          groupType: "allOf",
          months: 4095,
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        months: 4095,
      });
    });

    it("should return a 201 and the date range condition added to the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.dateRange.addAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "date-range",
        },
        body: {
          groupType: "allOf",
          startMonth: 1,
          startDate: 1,
          endMonth: 12,
          endDate: 31,
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "allOf",
        startMonth: 1,
        startDate: 1,
        endMonth: 12,
        endDate: 31,
      });
    });

    it("should return a 400 and details for the invalid request (missing automation Id or type)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return createStubSprootDB();
              case "automationService":
                return sinon.createStubInstance(AutomationService);
            }
          },
        },
        params: {
          automationId: null,
          type: "test",
        },
        body: {
          groupType: null,
          operator: null,
          comparisonValue: null,
          sensorId: null,
          readingType: null,
        },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing automation Id.",
        "Invalid or missing condition type.",
      ]);
    });

    it("should return a 400 and details for the invalid request (sensor)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return sinon.createStubInstance(AutomationService);
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
        },
        body: {
          groupType: null,
          operator: null,
          comparisonValue: null,
          sensorId: null,
          readingType: null,
        },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing condition groupType.",
        "Invalid or missing operator.",
        "Invalid or missing comparison value.",
        "Invalid or missing sensor Id.",
        "Invalid or missing reading type.",
      ]);
    });

    it("should return a 400 and details for the invalid request (output)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "output",
        },
        body: {
          groupType: null,
          operator: null,
          comparisonValue: null,
          outputId: null,
        },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing condition groupType.",
        "Invalid or missing operator.",
        "Invalid or missing comparison value.",
        "Invalid or missing output Id.",
      ]);
    });

    it("should return a 400 and details for the invalid request (time)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "time",
        },
        body: {
          groupType: null,
          startTime: "test1",
          endTime: "test",
        },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing condition groupType.",
        "Invalid or missing start time.",
        "Invalid or missing end time.",
      ]);
    });

    it("should return a 400 and details for the invalid request (weekday)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "weekday",
        },
        body: {
          groupType: null,
          weekdays: -1,
        },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing condition groupType.",
        "Invalid or missing weekdays. Weekdays should be a number between 0 and 127.",
      ]);
    });

    it("should return a 400 and details for the invalid request (month)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "month",
        },
        body: {
          groupType: null,
          months: -1,
        },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing condition groupType.",
        "Invalid or missing months. Months should be a number between 0 and 4095.",
      ]);
    });

    it("should return a 400 and details for the invalid request (date range)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "date-range",
        },
        body: {
          groupType: null,
          months: 16,
        },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing condition groupType.",
        "Invalid or missing start month.",
        "Invalid or missing start date.",
        "Invalid or missing end month.",
        "Invalid or missing end date.",
      ]);
    });

    it("should return a 404 if the automation does not exist", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: "temperature",
        },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.rejects(new Error("Database unreachable"));
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
        },
        body: {
          groupType: "allOf",
          operator: "equal",
          comparisonValue: 50,
          sensorId: 1,
          readingType: "temperature",
        },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });

  describe("updateAsync", () => {
    let sprootDB: any;
    beforeEach(() => {
      sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
    });
    it("should return a 200 and the sensor condition updated for the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          sensorId: 1,
          readingType: "temperature",
          operator: "equal",
          comparisonValue: 50,
        } as SDBSensorCondition,
      ]);
      sprootDB.automations.conditions.sensor.updateAsync.resolves();
      const sensorList = sinon.createStubInstance(SensorList);
      sinon
        .stub(sensorList, "sensors")
        .value({ "2": { id: 2, name: "Sensor 1", type: "temperature" } });
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
              case "sensorList":
                return sensorList;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
        body: {
          groupType: "anyOf",
          operator: "less",
          comparisonValue: 51,
          sensorId: 2,
          readingType: "humidity",
        },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "anyOf",
        sensorId: 2,
        readingType: "humidity",
        operator: "less",
        comparisonValue: 51,
        comparisonLookback: undefined,
      });
    });

    it("should return a 200 and the output condition updated for the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.output.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          outputId: 1,
          operator: "equal",
          comparisonValue: 50,
        } as SDBOutputCondition,
      ]);
      sprootDB.automations.conditions.output.updateAsync.resolves();
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({ "2": { id: 2, name: "Output 1" } });
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
              case "outputList":
                return outputList;
            }
          },
        },
        params: {
          automationId: "1",
          type: "output",
          conditionId: "1",
        },
        body: {
          groupType: "anyOf",
          operator: "less",
          comparisonValue: 51,
          outputId: 2,
        },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "anyOf",
        outputId: 2,
        operator: "less",
        comparisonValue: 51,
        comparisonLookback: undefined,
      });
    });

    it("should return a 200 and the time condition updated for the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.time.getAsync.resolves([
        { id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition,
      ]);
      sprootDB.automations.conditions.time.updateAsync.resolves();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "time",
          conditionId: "1",
        },
        body: {
          groupType: "anyOf",
          startTime: "13:00",
          endTime: "14:00",
        },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "anyOf",
        startTime: "13:00",
        endTime: "14:00",
      });
    });

    it("should return a 200 and the weekday condition updated for the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 127 } as SDBWeekdayCondition,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 127 } as SDBWeekdayCondition,
      ]);
      sprootDB.automations.conditions.time.updateAsync.resolves();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "weekday",
          conditionId: "1",
        },
        body: {
          groupType: "anyOf",
          weekdays: 127,
        },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "anyOf",
        weekdays: 127,
      });
    });

    it("should return a 200 and the month condition updated for the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.month.getAsync.resolves([
        { id: 1, groupType: "allOf", months: 4095 } as SDBMonthCondition,
      ]);
      sprootDB.automations.conditions.time.updateAsync.resolves();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "month",
          conditionId: "1",
        },
        body: {
          groupType: "anyOf",
          month: 4095,
        },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "anyOf",
        months: 4095,
      });
    });

    it("should return a 200 and the date range condition updated for the automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          startMonth: 1,
          startDate: 31,
          endMonth: 12,
          endDate: 31,
        } as SDBDateRangeCondition,
      ]);
      sprootDB.automations.conditions.time.updateAsync.resolves();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "date-range",
          conditionId: "1",
        },
        body: {
          groupType: "anyOf",
          startMonth: 1,
          startDate: 31,
          endMonth: 12,
          endDate: 31,
        },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        groupType: "anyOf",
        startMonth: 1,
        startDate: 31,
        endMonth: 12,
        endDate: 31,
      });
    });

    it("should return a 400 and details for the invalid request (missing automation Id, type, or conditionId)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return createStubSprootDB();
              case "automationService":
                return sinon.createStubInstance(AutomationService);
            }
          },
        },
        params: {
          automationId: null,
          type: null,
          conditionId: null,
        },
        body: {
          groupType: null,
          operator: null,
          comparisonValue: null,
          sensorId: null,
          readingType: null,
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing automation Id.",
        "Invalid or missing condition type.",
        "Invalid or missing condition Id.",
      ]);
    });

    it("should return a 400 and details for the invalid request (sensor)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          sensorId: 1,
          readingType: "temperature",
          operator: "equal",
          comparisonValue: 50,
        } as SDBSensorCondition,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
        body: {
          groupType: "test",
          operator: "test",
          comparisonValue: "test",
          sensorId: "test",
          readingType: "test",
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, [
        "Invalid or missing condition groupType.",
        "Invalid operator.",
        "Invalid comparison value.",
        "Invalid sensor Id.",
        "Invalid reading type.",
      ]);
    });

    it("should return a 400 and details for the invalid request (output)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.output.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          outputId: 1,
          operator: "equal",
          comparisonValue: 50,
        } as SDBOutputCondition,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "output",
          conditionId: "1",
        },
        body: {
          groupType: null,
          operator: "test",
          comparisonValue: "test",
          outputId: "test",
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, [
        "Invalid operator.",
        "Invalid comparison value.",
        "Invalid output Id.",
      ]);
    });

    it("should return a 400 and details for the invalid request (time)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.time.getAsync.resolves([
        { id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "time",
          conditionId: "1",
        },
        body: {
          groupType: null,
          startTime: "test",
          endTime: "test",
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Invalid start time.", "Invalid end time."]);
    });

    it("should return a 400 and details for the invalid request (weekday)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 13 } as SDBWeekdayCondition,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 13 } as SDBWeekdayCondition,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "weekday",
          conditionId: "1",
        },
        body: {
          groupType: null,
          weekdays: -1,
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Invalid weekdays value."]);
    });

    it("should return a 400 and details for the invalid request (month)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.month.getAsync.resolves([
        { id: 1, groupType: "allOf", months: 13 } as SDBMonthCondition,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "month",
          conditionId: "1",
        },
        body: {
          groupType: null,
          months: -1,
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Invalid months value."]);
    });

    it("should return a 400 and details for the invalid request (date range)", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          startMonth: 1,
          startDate: 31,
          endMonth: 12,
          endDate: 31,
        } as SDBDateRangeCondition,
      ]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "date-range",
          conditionId: "1",
        },
        body: {
          groupType: null,
          startMonth: -1,
          startDate: -1,
          endMonth: -1,
          endDate: -1,
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, [
        "Invalid start month.",
        "Invalid start date.",
        "Invalid end month.",
        "Invalid end date.",
      ]);
    });

    it("should return a 404 if the automation does not exist", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
        body: {
          groupType: "anyOf",
          operator: "less",
          comparisonValue: 51,
          sensorId: 2,
          readingType: "humidity",
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it("should return a 404 if the condition does not exist", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
        body: {
          groupType: "anyOf",
          operator: "less",
          comparisonValue: 51,
          sensorId: 2,
          readingType: "humidity",
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Sensor condition with Id 1 not found."]);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.rejects(new Error("Database unreachable"));
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
        body: {
          groupType: "anyOf",
          operator: "less",
          comparisonValue: 51,
          sensorId: 2,
          readingType: "humidity",
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });

  describe("deleteAsync", () => {
    it("should return a 200 with a message (sensor)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          sensorId: 1,
          readingType: "temperature",
          operator: "equal",
          comparisonValue: 50,
        } as SDBSensorCondition,
      ]);
      sprootDB.automations.conditions.sensor.deleteAsync.resolves();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { message: "Condition deleted successfully." });
    });

    it("should return a 200 with a message (output)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.output.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          outputId: 1,
          operator: "equal",
          comparisonValue: 50,
        } as SDBOutputCondition,
      ]);
      sprootDB.automations.conditions.output.deleteAsync.resolves();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "output",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { message: "Condition deleted successfully." });
    });

    it("should return a 200 with a message (time)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.time.getAsync.resolves([
        { id: 1, groupType: "allOf", startTime: "12:00", endTime: "13:00" } as SDBTimeCondition,
      ]);
      sprootDB.automations.conditions.time.deleteAsync.resolves();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "time",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { message: "Condition deleted successfully." });
    });

    it("should return a 200 with a message (weekday)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 127 } as SDBWeekdayCondition,
      ]);
      sprootDB.automations.conditions.weekday.getAsync.resolves([
        { id: 1, groupType: "allOf", weekdays: 127 } as SDBWeekdayCondition,
      ]);
      sprootDB.automations.conditions.weekday.deleteAsync.resolves();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "weekday",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { message: "Condition deleted successfully." });
    });

    it("should return a 200 with a message (month)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.month.getAsync.resolves([
        { id: 1, groupType: "allOf", months: 4095 } as SDBMonthCondition,
      ]);
      sprootDB.automations.conditions.month.deleteAsync.resolves();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "month",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { message: "Condition deleted successfully." });
    });

    it("should return a 200 with a message (dateRange)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.dateRange.getAsync.resolves([
        {
          id: 1,
          groupType: "allOf",
          startMonth: 1,
          startDate: 31,
          endMonth: 12,
          endDate: 31,
        } as SDBDateRangeCondition,
      ]);
      sprootDB.automations.conditions.month.deleteAsync.resolves();
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          automationId: "1",
          type: "date-range",
          conditionId: "1",
        },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(success.content?.data, { message: "Condition deleted successfully." });
    });

    it("should return a 400 and details for the invalid request (missing automation Id, type, or conditionId)", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return createStubSprootDB();
              case "automationService":
                return sinon.createStubInstance(AutomationService);
            }
          },
        },
        params: {
          automationId: null,
          type: null,
          conditionId: null,
        },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing automation Id.",
        "Invalid or missing condition type.",
        "Invalid or missing condition Id.",
      ]);
    });

    it("should return a 404 if the automation does not exist", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return sinon.createStubInstance(AutomationService);
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Automation with Id 1 not found."]);
    });

    it("should return a 404 if the condition does not exist", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "Automation 1", operator: "and" } as SDBAutomation,
      ]);
      sprootDB.automations.conditions.sensor.getAsync.resolves([]);
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return sinon.createStubInstance(AutomationService);
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Sensor condition with Id 1 not found."]);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.rejects(new Error("Database unreachable"));
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return sinon.createStubInstance(AutomationService);
            }
          },
        },
        params: {
          automationId: "1",
          type: "sensor",
          conditionId: "1",
        },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error.details, ["Database unreachable"]);
    });
  });
});

const createMockSprootDB = (): any => {
  const stub = () => sinon.stub();
  return {
    sensors: {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      getDS18B20AddressesAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      updateSensorCalibrationAsync: stub(),
      deleteAsync: stub(),
      addSensorReadingAsync: stub(),
      getSensorReadingsAsync: stub(),
      getBucketedSensorReadingsAsync: stub(),
      getDataAsync: stub(),
    },
    outputs: {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
      updateLastOutputStateAsync: stub(),
      getLastOutputStateAsync: stub(),
      addOutputStateAsync: stub(),
      getOutputStatesAsync: stub(),
      getBucketedOutputStatesAsync: stub(),
      getDataAsync: stub(),
    },
    subcontrollers: {
      getAllAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
    },
    automations: {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
    },
    actions: {
      output: {
        getAllAsync: stub(),
        getAsync: stub(),
        addAsync: stub(),
        getOutputActionAsync: stub(),
        getActionsByOutputIdAsync: stub(),
        updateAsync: stub(),
      },
      notification: {
        getAllAsync: stub(),
        getAsync: stub(),
        addAsync: stub(),
        getNotificationActionByIdAsync: stub(),
        updateAsync: stub(),
      },
    },
    conditions: {
      sensor: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
      output: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
      time: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
      weekday: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
      month: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
      dateRange: {
        getAsync: stub(),
        addAsync: stub(),
        updateAsync: stub(),
        deleteAsync: stub(),
      },
    },
    camera: {
      getAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
    },
    users: {
      getByIdAsync: stub(),
      addAsync: stub(),
    },
    deviceZones: {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
    },
    system: {
      getAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
    },
    journals: {
      getAllAsync: stub(),
      getByIdAsync: stub(),
      addAsync: stub(),
      updateAsync: stub(),
      deleteAsync: stub(),
      getJournalTagsAsync: stub(),
      addJournalTagAsync: stub(),
      updateJournalTagAsync: stub(),
      deleteJournalTagAsync: stub(),
      getJournalTagLookupsAsync: stub(),
      addJournalTagLookupAsync: stub(),
      deleteJournalTagLookupAsync: stub(),
      getJournalEntriesAsync: stub(),
      getJournalEntryAsync: stub(),
      addJournalEntryAsync: stub(),
      updateJournalEntryAsync: stub(),
      deleteJournalEntryAsync: stub(),
      getJournalEntryTagsAsync: stub(),
      addJournalEntryTagAsync: stub(),
      updateJournalEntryTagAsync: stub(),
      deleteJournalEntryTagAsync: stub(),
      getJournalEntryTagLookupsAsync: stub(),
      addJournalEntryTagLookupAsync: stub(),
      deleteJournalEntryTagLookupAsync: stub(),
    },
  } as any;
};
