import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/common/api/v2/Responses";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import {
  getAsync,
  getByIdAsync,
  addAsync,
  updateAsync,
  deleteAsync,
} from "../handlers/AutomationHandlers";

import { assert } from "chai";
import sinon from "sinon";
import { AutomationService } from "../../../../automation/AutomationService";
import winston from "winston";
import { MemoryEventBus } from "../../../../eventbus/MemoryEventBus";
import type { IAutomationsRepository } from "../../../../database/repositories/automations/IAutomationsRepository";
import type { IOutputActionsRepository } from "../../../../database/repositories/automations/actions/IOutputActionsRepository";
import type { INotificationActionsRepository } from "../../../../database/repositories/automations/actions/INotificationActionsRepository";
import type { ISensorConditionsRepository } from "../../../../database/repositories/automations/conditions/ISensorConditionsRepository";
import type { IOutputConditionsRepository } from "../../../../database/repositories/automations/conditions/IOutputConditionsRepository";
import type { ITimeConditionsRepository } from "../../../../database/repositories/automations/conditions/ITimeConditionsRepository";
import type { IWeekdayConditionsRepository } from "../../../../database/repositories/automations/conditions/IWeekdayConditionsRepository";
import type { IMonthConditionsRepository } from "../../../../database/repositories/automations/conditions/IMonthConditionsRepository";
import type { IDateRangeConditionsRepository } from "../../../../database/repositories/automations/conditions/IDateRangeConditionsRepository";

const createMockAutomationsRepo = (): IAutomationsRepository => ({
  getAllAsync: async () => [],
  getByIdAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
  conditions: {
    sensor: createMockSensorConditionsRepo(),
    output: createMockOutputConditionsRepo(),
    time: createMockTimeConditionsRepo(),
    weekday: createMockWeekdayConditionsRepo(),
    month: createMockMonthConditionsRepo(),
    dateRange: createMockDateRangeConditionsRepo(),
  },
  actions: {
    output: createMockOutputActionsRepo(),
    notification: createMockNotificationActionsRepo(),
  },
});

const createMockSensorConditionsRepo = (): ISensorConditionsRepository => ({
  getAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
});

const createMockOutputConditionsRepo = (): IOutputConditionsRepository => ({
  getAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
});

const createMockTimeConditionsRepo = (): ITimeConditionsRepository => ({
  getAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
});

const createMockWeekdayConditionsRepo = (): IWeekdayConditionsRepository => ({
  getAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
});

const createMockMonthConditionsRepo = (): IMonthConditionsRepository => ({
  getAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
});

const createMockDateRangeConditionsRepo = (): IDateRangeConditionsRepository => ({
  getAsync: async () => [],
  addAsync: async () => 0,
  updateAsync: async () => {},
  deleteAsync: async () => {},
});

const createMockOutputActionsRepo = (): IOutputActionsRepository => ({
  getAllAsync: async () => [],
  getAsync: async () => [],
  addAsync: async () => 0,
  getOutputActionAsync: async () => [],
  getActionsByOutputIdAsync: async () => [],
  updateAsync: async () => {},
  deleteAsync: async () => {},
});

const createMockNotificationActionsRepo = (): INotificationActionsRepository => ({
  getAllAsync: async () => [],
  getAsync: async () => [],
  addAsync: async () => 0,
  getNotificationActionByIdAsync: async () => [],
  updateAsync: async () => {},
  deleteAsync: async () => {},
});

const createStubSprootDB = (): any => {
  const automations = createMockAutomationsRepo();
  const sensorConditions = createMockSensorConditionsRepo();
  const outputConditions = createMockOutputConditionsRepo();
  const timeConditions = createMockTimeConditionsRepo();
  const weekdayConditions = createMockWeekdayConditionsRepo();
  const monthConditions = createMockMonthConditionsRepo();
  const dateRangeConditions = createMockDateRangeConditionsRepo();
  const outputActions = createMockOutputActionsRepo();
  const notificationActions = createMockNotificationActionsRepo();

  sinon.stub(automations, "getAllAsync");
  sinon.stub(automations, "getByIdAsync");
  sinon.stub(automations, "addAsync");
  sinon.stub(automations, "updateAsync");
  sinon.stub(automations, "deleteAsync");

  sinon.stub(sensorConditions, "getAsync").resolves([]);
  sinon.stub(sensorConditions, "addAsync");
  sinon.stub(sensorConditions, "updateAsync");
  sinon.stub(sensorConditions, "deleteAsync");

  sinon.stub(outputConditions, "getAsync").resolves([]);
  sinon.stub(outputConditions, "addAsync");
  sinon.stub(outputConditions, "updateAsync");
  sinon.stub(outputConditions, "deleteAsync");

  sinon.stub(timeConditions, "getAsync").resolves([]);
  sinon.stub(timeConditions, "addAsync");
  sinon.stub(timeConditions, "updateAsync");
  sinon.stub(timeConditions, "deleteAsync");

  sinon.stub(weekdayConditions, "getAsync").resolves([]);
  sinon.stub(weekdayConditions, "addAsync");
  sinon.stub(weekdayConditions, "updateAsync");
  sinon.stub(weekdayConditions, "deleteAsync");

  sinon.stub(monthConditions, "getAsync").resolves([]);
  sinon.stub(monthConditions, "addAsync");
  sinon.stub(monthConditions, "updateAsync");
  sinon.stub(monthConditions, "deleteAsync");

  sinon.stub(dateRangeConditions, "getAsync").resolves([]);
  sinon.stub(dateRangeConditions, "addAsync");
  sinon.stub(dateRangeConditions, "updateAsync");
  sinon.stub(dateRangeConditions, "deleteAsync");

  sinon.stub(outputActions, "getAllAsync");
  sinon.stub(outputActions, "getAsync");
  sinon.stub(outputActions, "getOutputActionAsync");
  sinon.stub(outputActions, "addAsync");
  sinon.stub(outputActions, "deleteAsync");

  sinon.stub(notificationActions, "getAllAsync");
  sinon.stub(notificationActions, "getAsync");
  sinon.stub(notificationActions, "getNotificationActionByIdAsync");
  sinon.stub(notificationActions, "addAsync");
  sinon.stub(notificationActions, "deleteAsync");

  const sprootDB = {
    automations,
  };
  return sprootDB;
};

describe("AutomationHandlers", () => {
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

  describe("getAsync ", () => {
    afterEach(() => {
      sinon.restore();
    });
    it("should return a 200 and all automations", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.resolves([
        { id: 1, name: "automation1", operator: "or" } as SDBAutomation,
        { id: 2, name: "automation2", operator: "and" } as SDBAutomation,
      ]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              default:
                return null;
            }
          },
        },
      } as unknown as Request;

      const success = (await getAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.length, 2);
    });

    it("should return a 503 and an error message", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAllAsync.rejects(
        new Error("Failed to get automations from database."),
      );

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              default:
                return null;
            }
          },
        },
      } as unknown as Request;

      const error = (await getAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Failed to get automations from database."]);
    });
  });

  describe("getByIdAsync", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 and an automation", async () => {
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
        { id: 1, name: "automation1", operator: "or" } as SDBAutomation,
      ]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              default:
                return null;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const success = (await getByIdAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.id, 1);
    });

    it("should return a 400 and an error message", async () => {
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
                return null;
              default:
                return null;
            }
          },
        },
        params: {
          automationId: "test",
        },
      } as unknown as Request;

      const error = (await getByIdAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Invalid or missing automation Id."]);
    });

    it("should return a 404 and an error message", async () => {
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
              default:
                return null;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const error = (await getByIdAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Automation with Id 1 not found."]);
    });

    it("should return a 503 and an error message", async () => {
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.rejects(
        new Error("Failed to get automation from database."),
      );
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
              default:
                return null;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const error = (await getByIdAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Failed to get automation from database."]);
    });
  });

  describe("addAsync", () => {
    it("should return a 201 and the created automation", async () => {
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
      sprootDB.automations.addAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
              default:
                return null;
            }
          },
        },
        body: {
          name: "automation1",
          operator: "or",
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.id, 1);
    });

    it("should return a 400 and an error message", async () => {
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
                return null;
              default:
                return null;
            }
          },
        },
        body: {},
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, [
        "Missing required field: name",
        "Missing required field: operator",
      ]);

      mockRequest.body = {
        name: "automation1",
        operator: "invalid",
      };
      const error2 = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error2.statusCode, 400);
      assert.equal(error2.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error2.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error2.error?.details, [
        "Invalid value for operator: must be 'and' or 'or'",
      ]);
    });

    it("should return a 503 and an error message", async () => {
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
      sprootDB.automations.addAsync.rejects(new Error("Failed to add automation to database."));

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
              default:
                return null;
            }
          },
        },
        body: {
          name: "automation1",
          operator: "or",
        },
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Failed to add automation to database."]);
    });
  });

  describe("updateAsync", () => {
    it("should return a 200 and the updated automation", async () => {
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
        { id: 1, name: "automation1", operator: "or" } as SDBAutomation,
      ]);
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
              default:
                return null;
            }
          },
        },
        params: {
          automationId: "1",
        },
        body: {
          name: "automation2",
          operator: "and",
        },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.name, "automation2");
      assert.equal(success.content?.data.operator, "and");
    });

    it("should return a 400 and an error message", async () => {
      const sprootDB = createStubSprootDB();
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
              default:
                return null;
            }
          },
        },
        params: {
          automationId: null,
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Invalid or missing automation Id."]);
    });

    it("should return a 404 and an error message", async () => {
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
              default:
                return null;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Automation with Id 1 not found."]);
    });

    it("should return a 503 and an error message", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.rejects(
        new Error("Failed to update automation in database."),
      );

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              default:
                return null;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Failed to update automation in database."]);
    });
  });

  describe("deleteAsync", () => {
    it("should return a 200 and a success message", async () => {
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
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "automation1", operator: "or" } as SDBAutomation,
      ]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
              default:
                return null;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data, "Automation deleted successfully.");
    });

    it("should return a 400 and an error message", async () => {
      const sprootDB = createStubSprootDB();
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
              default:
                return null;
            }
          },
        },
        params: {
          automationId: null,
        },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Invalid or missing automation Id."]);
    });

    it("should return a 404 and an error message", async () => {
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
              default:
                return null;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Automation with Id 1 not found."]);
    });

    it("should return a 503 and an error message", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.rejects(
        new Error("Failed to delete automation from database."),
      );

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              default:
                return null;
            }
          },
        },
        params: {
          automationId: "1",
        },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Failed to delete automation from database."]);
    });
  });
});
