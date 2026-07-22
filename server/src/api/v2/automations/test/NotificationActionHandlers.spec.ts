import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import {
  addAsync,
  deleteAsync,
  getAsync,
  getByIdAsync,
  getActiveNotificationsAsync,
} from "../handlers/NotificationActionHandlers";
import { SDBNotificationAction } from "@sproot/sproot-common/dist/database/SDBNotificationAction";
import { SDBAutomation } from "@sproot/database/SDBAutomation";

import { assert } from "chai";
import sinon from "sinon";
import { AutomationService } from "../../../../automation/AutomationService";
import winston from "winston";
import { MemoryEventBus } from "../../../../eventbus/MemoryEventBus";
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

const createStubSprootDB = () => {
  const sprootDB = new MockSprootDB() as any;
  sprootDB.automations = {
    getAutomationsAsync: sinon.stub(),
    getAutomationAsync: sinon.stub(),
    getNotificationActionsAsync: sinon.stub(),
    getNotificationActionsByAutomationIdAsync: sinon.stub(),
    getNotificationActionAsync: sinon.stub(),
    getNotificationActionByIdAsync: sinon.stub(),
    addNotificationActionAsync: sinon.stub(),
    deleteNotificationActionAsync: sinon.stub(),
  } as any;
  return sprootDB;
};

describe("NotificationActionHandlers.ts tests", () => {
  let mockLogger: winston.Logger;

  const createAutomationServiceAsync = (sprootDB: MockSprootDB) =>
    AutomationService.createInstanceAsync(sprootDB, new MemoryEventBus(mockLogger), mockLogger);

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

  describe("getAsync", () => {
    it("should return a 200 and a list of all notification actions", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getNotificationActionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Test Subject",
          content: "Test Content",
        } as SDBNotificationAction,
      ]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        query: {},
      } as unknown as Request;

      const success = (await getAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.isTrue(sprootDB.automations.getNotificationActionsByAutomationIdAsync.notCalled);
      assert.isTrue(sprootDB.automations.getNotificationActionsAsync.calledOnce);
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, [
        {
          id: 1,
          automationId: 1,
          subject: "Test Subject",
          content: "Test Content",
        },
      ]);
    });

    it("should return a 200 and a notification action for a specific automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getNotificationActionsByAutomationIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Test Subject",
          content: "Test Content",
        } as SDBNotificationAction,
      ]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        query: {
          automationId: "1",
        },
      } as unknown as Request;

      const success = (await getAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.isTrue(sprootDB.automations.getNotificationActionsByAutomationIdAsync.calledOnce);
      assert.isTrue(sprootDB.automations.getNotificationActionsAsync.notCalled);
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, [
        {
          id: 1,
          automationId: 1,
          subject: "Test Subject",
          content: "Test Content",
        },
      ]);
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
      sprootDB.automations.getNotificationActionsAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        originalUrl: "/api/v2/notification-actions",
        query: {},
      } as unknown as Request;

      const error = (await getAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
      assert.equal(error.error?.name, "Service Unreachable");
      assert.deepEqual(error.error?.details, ["Database unreachable"]);
    });
  });

  describe("getByIdAsync", () => {
    it("should return a 200 and the requested notification action", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getNotificationActionByIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          subject: "Test Subject",
          content: "Test Content",
        } as SDBNotificationAction,
      ]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          notificationActionId: "1",
        },
      } as unknown as Request;

      const success = (await getByIdAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        automationId: 1,
        subject: "Test Subject",
        content: "Test Content",
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
      const sprootDB = createStubSprootDB();

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          notificationActionId: "a",
        },
        originalUrl: "/api/v2/notification-actions/a",
      } as unknown as Request;

      const error = (await getByIdAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing notification action Id."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 404 if the notification action does not exist", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getNotificationActionByIdAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          notificationActionId: "1",
        },
        originalUrl: "/api/v2/notification-actions/1",
      } as unknown as Request;

      const error = (await getByIdAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Notification action with Id 1 not found."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
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
      sprootDB.automations.getNotificationActionByIdAsync.rejects(
        new Error("Database unreachable"),
      );

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          notificationActionId: "1",
        },
        originalUrl: "/api/v2/notification-actions/1",
      } as unknown as Request;

      const error = (await getByIdAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });

  describe("addAsync", () => {
    it("should return a 201 and the created notification action", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getAutomationAsync.resolves([
        { id: 1, name: "test", operator: "or" } as SDBAutomation,
      ]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getAutomationsAsync.resolves([]);
      sprootDB.automations.addNotificationActionAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        body: {
          automationId: "1",
          subject: "Test Subject",
          content: "Test Content",
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        automationId: 1,
        subject: "Test Subject",
        content: "Test Content",
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
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return {};
              case "automationService":
                return {};
            }
          },
        },
        body: {
          automationId: "a",
          subject: "",
          content: "   ",
        },
        originalUrl: "/api/v2/notification-actions",
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing automation Id.",
        "Subject is required.",
        "Content is required.",
      ]);
      assert.equal(error.error.url, mockRequest.originalUrl);
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
      sprootDB.automations.getAutomationAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        body: {
          automationId: "1",
          subject: "Test Subject",
          content: "Test Content",
        },
        originalUrl: "/api/v2/notification-actions",
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation not found."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
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
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getAutomationAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        body: {
          automationId: "1",
          subject: "Test Subject",
          content: "Test Content",
        },
        originalUrl: "/api/v2/notification-actions",
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });

  describe("deleteAsync", () => {
    it("should return a 200 if the notification action was deleted successfully", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getNotificationActionByIdAsync.resolves([
        { id: 1, automationId: 1, subject: "Test", content: "Test" } as SDBNotificationAction,
      ]);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return sprootDB;
              case "automationService":
                return automationService;
            }
          },
        },
        params: {
          notificationActionId: "1",
        },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, "Notification action deleted successfully.");
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
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return {};
              case "automationService":
                return {};
            }
          },
        },
        params: {
          notificationActionId: "a",
        },
        originalUrl: "/api/v2/notification-actions/a",
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing notification action Id."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 404 if the notification action does not exist", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = createStubSprootDB();
      sprootDB.automations.getNotificationActionByIdAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          notificationActionId: "1",
        },
        originalUrl: "/api/v2/notification-actions/1",
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Notification action with Id 1 not found."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
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
      sprootDB.automations.getNotificationActionByIdAsync.rejects(
        new Error("Database unreachable"),
      );

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          notificationActionId: "1",
        },
        originalUrl: "/api/v2/notification-actions/1",
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });

  describe("getActiveNotificationsAsync", () => {
    it("should return a 200 and active notifications with payload", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockNotificationActionManager = {
        activeNotifications: {
          lastRunAt: 1713523200000,
          notifications: [
            {
              notificationId: 1,
              subject: "Temperature Alert",
              content: "Temperature exceeded threshold",
              payload: {
                automationId: 1,
                automationName: "Temperature Threshold",
                operator: "or" as const,
                conditions: {
                  allOf: [],
                  anyOf: [],
                  oneOf: [],
                },
              },
            },
          ],
        },
      };

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "notificationActionManager") {
              return mockNotificationActionManager;
            }
          },
        },
        originalUrl: "/api/v2/notification-actions/active",
      } as unknown as Request;

      const success = (await getActiveNotificationsAsync(
        mockRequest,
        mockResponse,
      )) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, {
        lastRunAt: 1713523200000,
        notifications: [
          {
            notificationId: 1,
            subject: "Temperature Alert",
            content: "Temperature exceeded threshold",
            payload: {
              automationId: 1,
              automationName: "Temperature Threshold",
              operator: "or",
              conditions: {
                allOf: [],
                anyOf: [],
                oneOf: [],
              },
            },
          },
        ],
      });
    });

    it("should return empty notifications when no automations are triggered", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockNotificationActionManager = {
        activeNotifications: {
          lastRunAt: 0,
          notifications: [],
        },
      };

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "notificationActionManager") {
              return mockNotificationActionManager;
            }
          },
        },
        originalUrl: "/api/v2/notification-actions/active",
      } as unknown as Request;

      const success = (await getActiveNotificationsAsync(
        mockRequest,
        mockResponse,
      )) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.equal(success.content?.data?.lastRunAt, 0);
      assert.lengthOf(success.content?.data?.notifications, 0);
    });

    it("should return a 503 if the notification action manager throws an error", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const mockNotificationActionManager = {
        get activeNotifications() {
          throw new Error("Manager error");
        },
      };

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "notificationActionManager") {
              return mockNotificationActionManager;
            }
          },
        },
        originalUrl: "/api/v2/notification-actions/active",
      } as unknown as Request;

      const error = (await getActiveNotificationsAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 503);
      assert.equal(error.error?.name, "Service Unreachable");
      assert.deepEqual(error.error?.details, ["Manager error"]);
      assert.equal(error.error?.url, mockRequest.originalUrl);
    });
  });
});
