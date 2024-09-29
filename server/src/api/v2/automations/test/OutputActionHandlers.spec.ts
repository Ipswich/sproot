import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { addAsync, deleteAsync, getAsync, getByIdAsync } from "../handlers/OutputActionHandlers";
import { SprootDB } from "../../../../database/SprootDB";
import { SDBOutputAction } from "@sproot/sproot-common/dist/database/SDBOutputAction";

import { assert } from "chai";
import sinon from "sinon";
import { AutomationDataManager } from "../../../../automation/AutomationDataManager";
import { OutputList } from "../../../../outputs/list/OutputList";
import { SDBAutomation } from "@sproot/database/SDBAutomation";

describe("OutputActionHandlers.ts tests", () => {
  describe("getAsync", () => {
    it("should return a 200 and a list of all OutputActions", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputActionsAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 100,
        } as SDBOutputAction,
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
      assert.isTrue(sprootDB.getOutputActionsByAutomationIdAsync.notCalled);
      assert.isTrue(sprootDB.getOutputActionsAsync.calledOnce);
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, [
        {
          id: 1,
          outputId: 1,
          automationId: 1,
          value: 100,
        },
      ]);
    });

    it("should return a 200 and a list of OutputActions for a specific automation", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputActionsByAutomationIdAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 100,
        } as SDBOutputAction,
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
      assert.isTrue(sprootDB.getOutputActionsByAutomationIdAsync.calledOnce);
      assert.isTrue(sprootDB.getOutputActionsAsync.notCalled);
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, [
        {
          id: 1,
          outputId: 1,
          automationId: 1,
          value: 100,
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
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputActionsAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        originalUrl: "/api/v2/output-action",
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
    it("should return a 200 and the requested OutputAction", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputActionAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 100,
        } as SDBOutputAction,
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
          outputActionId: "1",
        },
      } as unknown as Request;

      const success = (await getByIdAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        automationId: 1,
        outputId: 1,
        value: 100,
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
      const sprootDB = sinon.createStubInstance(SprootDB);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          outputActionId: "a",
        },
        originalUrl: "/api/v2/output-action/a",
      } as unknown as Request;

      const error = (await getByIdAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing outputAction Id."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 404 if the outputAction does not exist", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputActionAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          outputActionId: "1",
        },
        originalUrl: "/api/v2/output-action/1",
      } as unknown as Request;

      const error = (await getByIdAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["OutputAction with Id 1 not found."]);
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
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputActionAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          outputActionId: "1",
        },
        originalUrl: "/api/v2/output-action/1",
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
    it("should return a 201 and the created outputAction", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([
        { automationId: 1, name: "test", operator: "or" } as SDBAutomation,
      ]);
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({ 1: { id: 1, name: "test", type: "test" } });
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.addOutputActionAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
              case "automationDataManager":
                return automationDataManager;
            }
          },
        },
        body: {
          automationId: "1",
          outputId: 1,
          value: 100,
        },
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        automationId: 1,
        outputId: 1,
        value: 100,
      });
    });

    it("should return a 400 and details for the invalid request", async () => {
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({ 1: { id: 1, name: "test", type: "test" } });
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
              case "outputList":
                return outputList;
              case "automationDataManager":
                return {};
            }
          },
        },
        body: {
          automationId: "a",
          outputId: "b",
          value: "c",
        },
        originalUrl: "/api/v2/output-action",
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, [
        "Invalid or missing automation Id.",
        "Invalid or missing output Id.",
        "Invalid or missing value.",
      ]);
      assert.equal(error.error.url, mockRequest.originalUrl);

      mockRequest.body.value = -1;
      const error2 = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error2.statusCode, 400);
      assert.deepEqual(error2.error.details, [
        "Invalid or missing automation Id.",
        "Invalid or missing output Id.",
        "Value must be between 0 and 100.",
        "Value must be 0 or 100 for PWM outputs.",
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
      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({ 1: { id: 1, name: "test", type: "test" } });
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
              case "automationDataManager":
                return automationDataManager;
            }
          },
        },
        body: {
          automationId: "1",
          outputId: 1,
          value: 100,
        },
        originalUrl: "/api/v2/output-action",
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
    it("should return a 200 if the outputAction was deleted successfully", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getOutputActionAsync.resolves([
        { id: 1, automationId: 1, outputId: 1, value: 100 } as SDBOutputAction,
      ]);
      sprootDB.deleteOutputActionAsync.resolves();

      const mockRequest = {
        app: {
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
              case "automationDataManager":
                return automationDataManager;
            }
          },
        },
        params: {
          outputActionId: "1",
        },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, "Output action deleted successfully.");
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
              case "outputList":
                return {};
              case "automationDataManager":
                return {};
            }
          },
        },
        params: {
          outputActionId: "a",
        },
        originalUrl: "/api/v2/output-action/a",
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing output action Id."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 404 if the outputAction does not exist", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputActionAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          outputActionId: "1",
        },
        originalUrl: "/api/v2/output-action/1",
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["OutputAction with Id 1 not found."]);
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

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputActionAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          },
        },
        params: {
          outputActionId: "1",
        },
        originalUrl: "/api/v2/output-action/1",
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
});
