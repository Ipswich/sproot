import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/src/api/v2/Responses";
import { OutputList } from "../../../../outputs/list/OutputList";
import { AutomationDataManager } from "../../../../automation/AutomationDataManager";
import { get, addAsync, deleteAsync } from "../handlers/OutputAutomationHandlers";

import { SprootDB } from "../../../../database/SprootDB";
import { SDBAutomation } from "@sproot/database/SDBAutomation";

import { assert } from "chai";
import sinon from "sinon";

describe("OutputAutomationHandlers.ts tests", () => {
  describe("get", () => {
    it("should return a 200 with the output's automations", () => {
      const outputList = sinon.createStubInstance(OutputList);
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
          getAutomations: () => {
            return [];
          }
        }
      });

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "outputList") {
              return outputList;
            }
          }
        },
        params: {
          outputId: "1"
        }
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const success = get(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data[0], Object.values(outputList.outputs["1"]!.getAutomations()));
    });

    it('should return a 400 and details for the invalid request', () => {
      const outputList = sinon.createStubInstance(OutputList);
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
          getAutomations: () => {
            return [];
          }
        }
      });

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "outputList") {
              return outputList;
            }
          }
        },
        params: {
          outputId: "a"
        },
        originalUrl: "/api/v2/automations/a"
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = get(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing output Id"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it('should return a 404 with details for the missing data', () => {
      const outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputs").value({});

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "outputList") {
              return outputList;
            }
          }
        },
        params: {
          outputId: "1"
        },
        originalUrl: "/api/v2/automations/1"
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = get(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Output with id 1 not found"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });

  describe("addAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<SprootDB>;
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    beforeEach(() => {
      sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([]);
      sprootDB.addOutputToAutomationAsync.resolves();
      sprootDB.getAutomationAsync.withArgs(1).resolves([{
        automationId: 1,
        name: "test",
        operator: "or",
      } as SDBAutomation]);
      sprootDB.getAutomationAsync.withArgs(3).rejects(new Error("Database unreachable"));

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
          state: 0
        }
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return a 200 with a message', async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "automationDataManager") {
              return new AutomationDataManager(sprootDB, outputList);
            } else if (key === "outputList") {
              return outputList;
            } else if (key === "sprootDB") {
              return sprootDB;
            }
          }
          
        },
        params: {
          automationId: "1",
          outputId: "1"
        }
      } as unknown as Request;

      const success = await addAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.content?.data, "Output added to automation");
    });

    it("should return a 400 and details for the invalid request", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "automationDataManager") {
              return new AutomationDataManager(sprootDB, outputList);
            } else if (key === "outputList") {
              return outputList;
            } else if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        params: {
          automationId: "a",
          outputId: "b"
        },
        originalUrl: "/api/v2/automations/a/outputs/b"
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation Id", "Invalid or missing output Id"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 404 and details for the missing data", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "automationDataManager") {
              return new AutomationDataManager(sprootDB, outputList);
            } else if (key === "outputList") {
              return outputList;
            } else if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        params: {
          automationId: "2",
          outputId: "2"
        },
        originalUrl: "/api/v2/automations/2/outputs/2"
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with id 2 not found", "Output with id 2 not found"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "automationDataManager") {
              return new AutomationDataManager(sprootDB, outputList);
            } else if (key === "outputList") {
              return outputList;
            } else if (key === "sprootDB") {
              return sprootDB;
            }
          }
          
        },
        params: {
          automationId: "3",
          outputId: "1"
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });

  describe("deleteAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<SprootDB>;
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    beforeEach(() => {
      sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([]);
      sprootDB.getAutomationAsync.withArgs(1).resolves([{
        automationId: 1,
        name: "test",
        operator: "or",
      } as SDBAutomation]);
      sprootDB.getAutomationAsync.withArgs(3).rejects(new Error("Database unreachable"));
      sprootDB.deleteOutputFromAutomationAsync.resolves();

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
          state: 0
        }
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should return a 200 with a message', async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "automationDataManager") {
              return new AutomationDataManager(sprootDB, outputList);
            } else if (key === "outputList") {
              return outputList;
            } else if (key === "sprootDB") {
              return sprootDB;
            }
          }
          
        },
        params: {
          automationId: "1",
          outputId: "1"
        }
      } as unknown as Request;

      const success = await deleteAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.content?.data, "Output deleted from automation");
    });

    it("should return a 400 and details for the invalid request", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "automationDataManager") {
              return new AutomationDataManager(sprootDB, outputList);
            } else if (key === "outputList") {
              return outputList;
            } else if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        params: {
          automationId: "a",
          outputId: "b"
        },
        originalUrl: "/api/v2/automations/a/outputs/b"
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.deepEqual(error.error.details, ["Invalid or missing automation Id", "Invalid or missing output Id"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 404 and details for the missing data", async () => {
      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "automationDataManager") {
              return new AutomationDataManager(sprootDB, outputList);
            } else if (key === "outputList") {
              return outputList;
            } else if (key === "sprootDB") {
              return sprootDB;
            }
          }
        },
        params: {
          automationId: "2",
          outputId: "2"
        },
        originalUrl: "/api/v2/automations/2/outputs/2"
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.deepEqual(error.error.details, ["Automation with id 2 not found", "Output with id 2 not found"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });

    it("should return a 503 if the database is unreachable", async () => {
      sprootDB.getAutomationAsync.rejects(new Error("Database unreachable"));

      const mockRequest = {
        app: {
          get: (key: string) => {
            if (key === "automationDataManager") {
              return new AutomationDataManager(sprootDB, outputList);
            } else if (key === "outputList") {
              return outputList;
            } else if (key === "sprootDB") {
              return sprootDB;
            }
          }
          
        },
        params: {
          automationId: "3",
          outputId: "1"
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unavailable");
      assert.deepEqual(error.error.details, ["Database unreachable"]);
      assert.equal(error.error.url, mockRequest.originalUrl);
    });
  });
});