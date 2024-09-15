import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/sproot-common/src/api/v2/Responses";
import { SprootDB } from "../../../../database/SprootDB";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { getAsync, getByIdAsync, addAsync, updateAsync, deleteAsync } from "../handlers/AutomationHandlers";

import { assert } from "chai";
import sinon from "sinon";
import { AutomationDataManager } from "../../../../automation/AutomationDataManager";
import { OutputList } from "../../../../outputs/list/OutputList";

describe("AutomationHandlers", () => {
  describe("getAsync ", () => {
    afterEach(() => {
      sinon.restore();
    });
    it('should return a 200 and all automations', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationsAsync.resolves([
        { automationId: 1, name: "automation1", operator: "or" } as SDBAutomation,
        { automationId: 2, name: "automation2", operator: "and" } as SDBAutomation
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
          }
        }
      } as unknown as Request;

      const success = await getAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.length, 2);
    });

    it('should return a 503 and an error message', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
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
          }
        }
      } as unknown as Request;

      const error = await getAsync(mockRequest, mockResponse) as ErrorResponse;
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

    it('should return a 200 and an automation', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "automation1", operator: "or" } as SDBAutomation]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              default:
                return null;
            }
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const success = await getByIdAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.automationId, 1);
    });

    it('should return a 400 and an error message', async () => {
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
                return null;
              default:
                return null;
            }
          }
        },
        params: {
          automationId: "test"
        }
      } as unknown as Request;

      const error = await getByIdAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Invalid or missing automation Id."]);
    });

    it('should return a 404 and an error message', async () => {
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
              default:
                return null;
            }
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const error = await getByIdAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Automation with Id 1 not found."]);
    });

    it('should return a 503 and an error message', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
      sprootDB.getAutomationAsync.rejects(new Error("Failed to get automation from database."));
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
              default:
                return null;
            }
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const error = await getByIdAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Failed to get automation from database."]);
    });
  });

  describe("addAsync", () => {
    it('should return a 201 and the created automation', async () => {
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
      sprootDB.addAutomationAsync.resolves(1);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
              default:
                return null;
            }
          }
        },
        body: {
          name: "automation1",
          operator: "or"
        }
      } as unknown as Request;

      const success = await addAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.automationId, 1);
    });

    it('should return a 400 and an error message', async () => {
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
                return null;
              default:
                return null;
            }
          }
        },
        body: {
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Missing required field: name", "Missing required field: operator"]);

      mockRequest.body = {
        name: "automation1",
        operator: "invalid"
      };
      const error2 = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error2.statusCode, 400);
      assert.equal(error2.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error2.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error2.error?.details, ["Invalid value for operator: must be 'and' or 'or'"]);
    });

    it('should return a 503 and an error message', async () => {
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
      sprootDB.addAutomationAsync.rejects(new Error("Failed to add automation to database."));

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
              default:
                return null;
            }
          }
        },
        body: {
          name: "automation1",
          operator: "or"
        }
      } as unknown as Request;

      const error = await addAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Failed to add automation to database."]);
    });
  });

  describe("updateAsync", () => {
    it('should return a 200 and the updated automation', async () => {
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
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "automation1", operator: "or" } as SDBAutomation]);
      sprootDB.updateAutomationAsync.resolves();

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
              default:
                return null;
            }
          }
        },
        params: {
          automationId: "1"
        },
        body: {
          name: "automation2",
          operator: "and"
        }
      } as unknown as Request;

      const success = await updateAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data.name, "automation2");
      assert.equal(success.content?.data.operator, "and");
    });

    it('should return a 400 and an error message', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
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
              default:
                return null;
            }
          }
        },
        params: {
          automationId: null
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Invalid or missing automation Id."]);
    });

    it('should return a 404 and an error message', async () => {
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
              default:
                return null;
            }
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Automation with Id 1 not found."]);
    });

    it('should return a 503 and an error message', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
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
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const error = await updateAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Failed to update automation in database."]);
    });
  });

  describe('deleteAsync', () => {
    it('should return a 200 and a success message', async () => {
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
      sprootDB.getAutomationAsync.resolves([{ automationId: 1, name: "automation1", operator: "or" } as SDBAutomation]);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "automationDataManager":
                return automationDataManager;
              default:
                return null;
            }
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const success = await deleteAsync(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.content?.data, "Automation deleted successfully.");
    });

    it('should return a 400 and an error message', async () => {
      const sprootDB = sinon.createStubInstance(SprootDB);
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
              default:
                return null;
            }
          }
        },
        params: {
          automationId: null
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Invalid or missing automation Id."]);
    });

    it('should return a 404 and an error message', async () => {
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
              default:
                return null;
            }
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Automation with Id 1 not found."]);
    });

    it('should return a 503 and an error message', async () => {
      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          }
        }
      } as unknown as Response;
      const sprootDB = sinon.createStubInstance(SprootDB);
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
          }
        },
        params: {
          automationId: "1"
        }
      } as unknown as Request;

      const error = await deleteAsync(mockRequest, mockResponse) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.deepEqual(error.error?.details, ["Failed to delete automation from database."]);
    });
  });
});