import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { addAsync, addOutputToOutputAutomationAsync, deleteAsync, deleteOutputFromOutputAutomationAsync, getAsync, getByIdAsync, updateAsync } from "../handlers/OutputAutomationHandlers";
import { SprootDB } from "../../../../database/SprootDB";
import { SDBOutputAutomation } from "@sproot/database/SDBOutputAutomation";

import { assert } from "chai";
import sinon from "sinon";
import { AutomationDataManager } from "../../../../automation/AutomationDataManager";
import { OutputList } from "../../../../outputs/list/OutputList";
import { SDBAutomation } from "@sproot/database/SDBAutomation";

describe("outputAutomationHandlers.ts tests", () => {
  describe("getAsync", () => {
    it("should return a 200 and a list of all OutputAutomations", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputAutomationsAsync.resolves([{
        id: 1,
        automationId: 1,
        value: 100,
      } as SDBOutputAutomation]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          }
        }
      } as unknown as Request;

      const error = await getAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(error.statusCode, 200);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(error.content?.data, [{
        id: 1,
        automationId: 1,
        value: 100,
      }]);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputAutomationsAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        originalUrl: "/api/v2/output-automations"
      } as unknown as Request;

      const error = await getAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
      assert.equal(error.error?.name, "Service Unreachable");
      assert.deepEqual(error.error?.details, ["Database unreachable"]);
    });
  });

  describe("getByIdAsync", () => {
    it('should return a 200 and the requested OutputAutomation', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputAutomationAsync.resolves([{
        id: 1,
        automationId: 1,
        value: 100,
      } as SDBOutputAutomation]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        params: {
          outputAutomationId: "1"
        }
      } as unknown as Request;

      const success = await getByIdAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        automationId: 1,
        value: 100,
      });
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
      const sprootDB = sinon.createStubInstance(SprootDB);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        params: {
          outputAutomationId: "a"
        },
        originalUrl: "/api/v2/output-automations/a"
      } as unknown as Request;

      const error = await getByIdAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing outputAutomation Id."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
    
    it('should return a 404 if the outputAutomation does not exist', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputAutomationAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        params: {
          outputAutomationId: "1"
        },
        originalUrl: "/api/v2/output-automations/1"
      } as unknown as Request;

      const error = await getByIdAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["OutputAutomation with Id 1 not found."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
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
      sprootDB.getOutputAutomationAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        params: {
          outputAutomationId: "1"
        },
        originalUrl: "/api/v2/output-automations/1"
      } as unknown as Request;

      const error = await getByIdAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });

  describe("addAsync", () => {
    it("should return a 201 and the created outputAutomation", async () => {
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
      sprootDB.addOutputAutomationAsync.resolves(1);

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
          }
        },
        body: {
          automationId: "1",
          value: 100
        }
      } as unknown as Request;

      const success = await addAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        automationId: 1,
        value: 100,
      });
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
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return {};
              case "outputList":
                return {};
              case "automationDataManager":
                return {};
            }
          }
        },
        body: {
          automationId: "a",
          value: "b"
        },
        originalUrl: "/api/v2/output-automations"
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation Id.", "Invalid or missing value."]);
      assert.equal(error.error.url, mockRequest.originalUrl);

      mockRequest.body.value = -1;
      const error2 = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error2.statusCode, 400);
      assert.deepEqual(error2.error.details, ["Invalid or missing automation Id.", "Value must be between 0 and 100."]);
    });

    it("should return a 503 if the database is unreachable", async () => {
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
      sprootDB.addOutputAutomationAsync.rejects(new Error("Database unreachable"));

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
          }
        },
        body: {
          automationId: "1",
          value: 100
        },
        originalUrl: "/api/v2/output-automations"
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });

  describe("updateAsync", () => {
    it("should return a 200 and the updated outputAutomation", async () => {
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
      sprootDB.getAutomationAsync.resolves([{automationId: 1, operator: "or", name: "Test"} as SDBAutomation]);
      sprootDB.getOutputAutomationAsync.resolves([{id: 1, automationId: 1, value: 100} as SDBOutputAutomation]);
      sprootDB.updateOutputAutomationAsync.resolves();

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
          }
        },
        params: {
          outputAutomationId: "1"
        },
        body: {
          automationId: "2",
          value: 99
        }
      } as unknown as Request;

      const success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, {
        id: 1,
        automationId: 2,
        value: 99,
      });
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
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return {};
              case "outputList":
                return {};
              case "automationDataManager":
                return {};
            }
          }
        },
        params: {
          outputAutomationId: "a"
        },
        body: {
          automationId: "a",
          value: "b"
        },
        originalUrl: "/api/v2/output-automations/a"
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing output automation Id.", "Invalid or missing automation Id.", "Invalid or missing value."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
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
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getAutomationAsync.resolves([]);
      sprootDB.getOutputAutomationAsync.resolves([{id: 1, automationId: 1, value: 100} as SDBOutputAutomation]);

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
          }
        },
        params: {
          outputAutomationId: "1"
        },
        body: {
          automationId: "2",
          value: 99
        },
        originalUrl: "/api/v2/output-automations/1"
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with Id 2 not found."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 404 if the outputAutomation does not exist", async () => {
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
      sprootDB.getAutomationAsync.resolves([{automationId: 1, operator: "or", name: "Test"} as SDBAutomation]);
      sprootDB.getOutputAutomationAsync.resolves([]);
      sprootDB.updateOutputAutomationAsync.resolves();

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
          }
        },
        params: {
          outputAutomationId: "1"
        },
        body: {
          automationId: "2",
          value: 99
        },
        originalUrl: "/api/v2/output-automations/1"
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["OutputAutomation with Id 1 not found."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 503 if the database is unreachable", async () => {
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
          }
        },
        params: {
          outputAutomationId: "1"
        },
        body: {
          automationId: "2",
          value: 99
        },
        originalUrl: "/api/v2/output-automations/1"
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });

  describe("deleteAsync", () => {
    it ("should return a 200 if the outputAutomation was deleted successfully", async () => {
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
      sprootDB.getOutputAutomationAsync.resolves([{id: 1, automationId: 1, value: 100} as SDBOutputAutomation]);
      sprootDB.deleteOutputAutomationAsync.resolves();

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
          }
        },
        params: {
          outputAutomationId: "1"
        }
      } as unknown as Request;

      const success = await deleteAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, "Output automation deleted successfully.");
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
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return {};
              case "outputList":
                return {};
              case "automationDataManager":
                return {};
            }
          }
        },
        params: {
          outputAutomationId: "a"
        },
        originalUrl: "/api/v2/output-automations/a"
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing output automation Id."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 404 if the outputAutomation does not exist", async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;

      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getOutputAutomationAsync.resolves([]);

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        params: {
          outputAutomationId: "1"
        },
        originalUrl: "/api/v2/output-automations/1"
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["OutputAutomation with Id 1 not found."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
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
      sprootDB.getOutputAutomationAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        params: {
          outputAutomationId: "1"
        },
        originalUrl: "/api/v2/output-automations/1"
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });

  describe("addOutputToOutputAutomationAsync", () => {
    it('should return a 200 and a message if the output was added successfully', async () => {
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
      sinon.stub(outputList, "outputs").value({1: {id: 1, name: "Test"}});
      sprootDB.getOutputAutomationAsync.resolves([{id: 1, automationId: 1, value: 100} as SDBOutputAutomation]);
      sprootDB.addOutputToOutputAutomationAsync.resolves();

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
          }
        },
        params: {
          outputAutomationId: "1",
          outputId: "1"
        }
      } as unknown as Request;

      const success = await addOutputToOutputAutomationAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, "Output added to OutputAutomation successfully.");
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
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return {};
              case "outputList":
                return {};
              case "automationDataManager":
                return {};
            }
          }
        },
        params: {
          outputAutomationId: "a",
          outputId: "b"
        },
        originalUrl: "/api/v2/output-automations/a/outputs/b"
      } as unknown as Request;

      const error = await addOutputToOutputAutomationAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing output automation Id.", "Invalid or missing output Id."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it('should return a 404 if the outputAutomation or output do not exist', async () => {
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
      sprootDB.getOutputAutomationAsync.resolves([]);
      sinon.stub(outputList, "outputs").value({});
      sprootDB.addOutputToOutputAutomationAsync.resolves();

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
          }
        },
        params: {
          outputAutomationId: "1",
          outputId: "1"
        },
        originalUrl: "/api/v2/output-automations/1/outputs/1"
      } as unknown as Request;

      const error = await addOutputToOutputAutomationAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["OutputAutomation with Id 1 not found.", "Output with Id 1 not found."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
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
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getOutputAutomationAsync.rejects(new Error("Database unreachable"));

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
          }
        },
        params: {
          outputAutomationId: "1",
          outputId: "1"
        },
        originalUrl: "/api/v2/output-automations/1/outputs/1"
      } as unknown as Request;

      const error = await addOutputToOutputAutomationAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });

  describe("deleteOutputFromOutputAutomationAsync", () => {
    it('should return a 200 and a message if the output was deleted successfully', async () => {
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
      sinon.stub(outputList, "outputs").value({1: {id: 1, name: "Test"}});
      sprootDB.getOutputAutomationAsync.resolves([{id: 1, automationId: 1, value: 100} as SDBOutputAutomation]);
      sprootDB.deleteOutputFromOutputAutomationAsync.resolves();

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
          }
        },
        params: {
          outputAutomationId: "1",
          outputId: "1"
        }
      } as unknown as Request;

      const success = await deleteOutputFromOutputAutomationAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, "Output deleted from Output Automation successfully.");
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
          get: (key: string) => {
            switch (key) {
              case "sprootDB":
                return {};
              case "outputList":
                return {};
              case "automationDataManager":
                return {};
            }
          }
        },
        params: {
          outputAutomationId: "a",
          outputId: "b"
        },
        originalUrl: "/api/v2/output-automations/a/outputs/b"
      } as unknown as Request;

      const error = await deleteOutputFromOutputAutomationAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing output automation Id.", "Invalid or missing output Id."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it('should return a 404 if the outputAutomation or output do not exist', async () => {
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
      sprootDB.getOutputAutomationAsync.resolves([]);
      sinon.stub(outputList, "outputs").value({});
      sprootDB.deleteOutputFromOutputAutomationAsync.resolves();

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
          }
        },
        params: {
          outputAutomationId: "1",
          outputId: "1"
        },
        originalUrl: "/api/v2/output-automations/1/outputs/1"
      } as unknown as Request;

      const error = await deleteOutputFromOutputAutomationAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["OutputAutomation with Id 1 not found.", "Output with Id 1 not found."]);
      assert.equal(error.error.url, mockRequest.originalUrl);
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
      const outputList = sinon.createStubInstance(OutputList);
      const automationDataManager = new AutomationDataManager(sprootDB, outputList);
      sprootDB.getOutputAutomationAsync.rejects(new Error("Database unreachable"));

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
          }
        },
        params: {
          outputAutomationId: "1",
          outputId: "1"
        },
        originalUrl: "/api/v2/output-automations/1/outputs/1"
      } as unknown as Request;

      const error = await deleteOutputFromOutputAutomationAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });
});