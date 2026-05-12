import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
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
import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { MemoryEventBus } from "../../../../eventbus/MemoryEventBus";
import { setValidatedContractRequestData } from "../../../validation/validateRequest";

describe("AutomationHandlers", () => {
  let mockLogger: winston.Logger;

  const createAutomationServiceAsync = (sprootDB: MockSprootDB) =>
    AutomationService.createInstanceAsync(sprootDB, new MemoryEventBus(mockLogger), mockLogger);

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.rejects(new Error("Failed to get automations from database."));

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationAsync.resolves([
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationAsync.resolves([]);
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationAsync.resolves([]);
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationAsync.rejects(new Error("Failed to get automation from database."));
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
    it("should consume validated automation body instead of raw Express body", async () => {
      const mockResponse = createMockResponse({ body: { name: "validated", operator: "and" } });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([]);
      sprootDB.addAutomationAsync.resolves(7);
      const automationService = await AutomationService.createInstanceAsync(sprootDB, mockLogger);

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
          name: "ignored",
          operator: "or",
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, { id: 7, name: "validated", operator: "and" });
      assert.isTrue(sprootDB.addAutomationAsync.calledOnceWith("validated", "and"));
    });

    it("should return a 201 and the created automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.addAutomationAsync.resolves(1);

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

    it("should return a 503 and an error message", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.addAutomationAsync.rejects(new Error("Failed to add automation to database."));

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
    it("should consume validated automation params and body instead of raw Express data", async () => {
      const mockResponse = createMockResponse({
        params: { automationId: "2" },
        body: { name: "validated", operator: "and", enabled: false },
      });
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationAsync.callsFake(async (automationId: number) => {
        if (automationId === 2) {
          return [{ id: 2, name: "original", operator: "or", enabled: true } as SDBAutomation];
        }

        return [];
      });
      sprootDB.getAutomationsAsync.resolves([]);
      const automationService = await AutomationService.createInstanceAsync(sprootDB, mockLogger);

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
          name: "ignored",
          operator: "or",
          enabled: true,
        },
        originalUrl: "/api/v2/automations/2",
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.equal(success.content?.data.id, 2);
      assert.equal(success.content?.data.name, "validated");
      assert.equal(success.content?.data.operator, "and");
      assert.equal(success.content?.data.enabled, false);
      assert.isTrue(sprootDB.getAutomationAsync.calledWith(2));
      assert.isTrue(automationService.updateAutomationAsync != null);
    });

    it("should return a 200 and the updated automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationAsync.resolves([
        { id: 1, name: "automation1", operator: "or" } as SDBAutomation,
      ]);
      sprootDB.getAutomationsAsync.resolves([]);
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationAsync.resolves([]);
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationAsync.rejects(new Error("Failed to update automation in database."));

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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationsAsync.resolves([]);
      sprootDB.getAutomationAsync.resolves([
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationAsync.resolves([]);
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
      const sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.getAutomationAsync.rejects(new Error("Failed to delete automation from database."));

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
