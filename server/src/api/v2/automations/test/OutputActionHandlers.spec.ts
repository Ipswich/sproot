import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { addAsync, deleteAsync, getAsync, getByIdAsync } from "../handlers/OutputActionHandlers";
import { SDBOutputAction } from "@sproot/common/database/SDBOutputAction";

import { assert } from "chai";
import sinon from "sinon";
import { AutomationService } from "../../../../automation/AutomationService";
import { OutputList } from "../../../../outputs/list/OutputList";
import { SensorList } from "../../../../sensors/list/SensorList";
import { TimeExpressionResolver } from "../../../../automation/conditions/TimeExpressionResolver";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import winston from "winston";
import { MemoryEventBus } from "../../../../eventbus/MemoryEventBus";

const createStubSprootDB = () => {
  const sprootDB = createMockSprootDB() as any;
  sprootDB.automations = {
    getAllAsync: sinon.stub(),
    getByIdAsync: sinon.stub(),
  } as any;
  sprootDB.automations = {
    getAllAsync: sinon.stub(),
    getByIdAsync: sinon.stub(),
    conditions: {
      sensor: {
        getAsync: sinon.stub().resolves([]),
        addAsync: sinon.stub(),
        updateAsync: sinon.stub(),
        deleteAsync: sinon.stub(),
      },
      output: {
        getAsync: sinon.stub().resolves([]),
        addAsync: sinon.stub(),
        updateAsync: sinon.stub(),
        deleteAsync: sinon.stub(),
      },
      time: {
        getAsync: sinon.stub().resolves([]),
        addAsync: sinon.stub(),
        updateAsync: sinon.stub(),
        deleteAsync: sinon.stub(),
      },
      weekday: {
        getAsync: sinon.stub().resolves([]),
        addAsync: sinon.stub(),
        updateAsync: sinon.stub(),
        deleteAsync: sinon.stub(),
      },
      month: {
        getAsync: sinon.stub().resolves([]),
        addAsync: sinon.stub(),
        updateAsync: sinon.stub(),
        deleteAsync: sinon.stub(),
      },
      dateRange: {
        getAsync: sinon.stub().resolves([]),
        addAsync: sinon.stub(),
        updateAsync: sinon.stub(),
        deleteAsync: sinon.stub(),
      },
    },
    actions: {
      output: {
        getAllAsync: sinon.stub(),
        getAsync: sinon.stub(),
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
    },
  };
  return sprootDB;
};

describe("OutputActionHandlers.ts tests", () => {
  let mockLogger: winston.Logger;

  const createAutomationServiceAsync = (sprootDB: any) =>
    AutomationService.createInstanceAsync(
      sprootDB.automations,
      new MemoryEventBus(mockLogger),
      sinon.createStubInstance(SensorList),
      sinon.createStubInstance(OutputList),
      TimeExpressionResolver.createNoop(),
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
      const sprootDB = createStubSprootDB();
      sprootDB.automations.actions.output.getAllAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 100,
          precedence: "Normal",
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
      assert.isTrue(sprootDB.automations.actions.output.getAsync.notCalled);
      assert.isTrue(sprootDB.automations.actions.output.getAllAsync.calledOnce);
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, [
        {
          id: 1,
          outputId: 1,
          automationId: 1,
          value: 100,
          precedence: "Normal",
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
      const sprootDB = createStubSprootDB();
      sprootDB.automations.actions.output.getAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 100,
          precedence: "Normal",
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
      assert.isTrue(sprootDB.automations.actions.output.getAsync.calledOnce);
      assert.isTrue(sprootDB.automations.actions.output.getAllAsync.notCalled);
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, [
        {
          id: 1,
          outputId: 1,
          automationId: 1,
          value: 100,
          precedence: "Normal",
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
      sprootDB.automations.actions.output.getAllAsync.rejects(new Error("Database unreachable"));

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
      const sprootDB = createStubSprootDB();
      sprootDB.automations.actions.output.getOutputActionAsync.resolves([
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 100,
          precedence: "Normal",
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
        precedence: "Normal",
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
      const sprootDB = createStubSprootDB();
      sprootDB.automations.actions.output.getOutputActionAsync.resolves([]);

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
      const sprootDB = createStubSprootDB();
      sprootDB.automations.actions.output.getOutputActionAsync.rejects(
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
      const sprootDB = createStubSprootDB();
      sprootDB.automations.getByIdAsync.resolves([
        { id: 1, name: "test", operator: "or" } as SDBAutomation,
      ]);
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({
        1: { id: 1, name: "test", type: "test", isPwm: true },
        2: { id: 2, name: "test2", type: "test", isPwm: false },
      });
      sprootDB.automations.getAllAsync.resolves([]);
      sprootDB.automations.actions.output.addAsync.resolves(1);
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
              case "automationService":
                return automationService;
            }
          },
        },
        body: {
          automationId: "1",
          outputId: 1,
          value: 100,
          precedence: "High",
        },
      } as unknown as Request;

      let success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        automationId: 1,
        outputId: 1,
        value: 100,
        precedence: "High",
      });

      // Not PWM, value should get adjusted to 100 since it's greater than 0
      mockRequest.body["outputId"] = 2;
      success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        automationId: 1,
        outputId: 2,
        value: 100,
        precedence: "High",
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
              case "automationService":
                return {};
            }
          },
        },
        body: {
          automationId: "a",
          outputId: "b",
          value: "c",
          precedence: "Unexpected",
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
        "Precedence must be one of: Normal, High, Emergency.",
      ]);
      assert.equal(error.error.url, mockRequest.originalUrl);

      mockRequest.body.value = -1;
      const error2 = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error2.statusCode, 400);
      assert.deepEqual(error2.error.details, [
        "Invalid or missing automation Id.",
        "Invalid or missing output Id.",
        "Value must be between 0 and 100.",
        "Precedence must be one of: Normal, High, Emergency.",
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
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({ 1: { id: 1, name: "test", type: "test" } });
      sprootDB.automations.actions.output.getOutputActionAsync.resolves([]);
      sprootDB.automations.getAllAsync.resolves([]);
      const automationService = await createAutomationServiceAsync(sprootDB);
      sprootDB.automations.getByIdAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
              case "automationService":
                return automationService;
            }
          },
        },
        body: {
          automationId: "1",
          outputId: 1,
          value: 100,
          precedence: "Normal",
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

      const sprootDB = createStubSprootDB();
      const outputList = sinon.createStubInstance(OutputList);
      sprootDB.automations.actions.output.getOutputActionAsync.resolves([
        { id: 1, automationId: 1, outputId: 1, value: 100 } as SDBOutputAction,
        {
          id: 1,
          automationId: 1,
          outputId: 1,
          value: 100,
          precedence: "Normal",
        } as SDBOutputAction,
      ]);
      sprootDB.automations.getAllAsync.resolves([]);
      sprootDB.automations.actions.output.deleteAsync.resolves();
      const automationService = await createAutomationServiceAsync(sprootDB);

      const mockRequest = {
        app: {
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
              case "automationService":
                return automationService;
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
              case "automationService":
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

      const sprootDB = createStubSprootDB();
      sprootDB.automations.actions.output.getOutputActionAsync.resolves([]);

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

      const sprootDB = createStubSprootDB();
      sprootDB.automations.actions.output.getOutputActionAsync.rejects(
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
