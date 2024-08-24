import { Request, Response } from "express";
import { assert } from "chai";
import { OutputList } from "../../../../outputs/list/OutputList";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { addAsync, deleteAsync, get, updateAsync } from "../handlers/OutputHandlers";

import { MockSprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import sinon from "sinon";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { OutputBase } from "../../../../outputs/base/OutputBase";

describe("OutputHandlers.ts tests", () => {
  describe("get", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    const outputData = {
      1: {
        id: 1,
        model: "pca9685",
        address: "0x40",
        name: "test output 1",
        pin: 0,
        isPwm: true,
        isInvertedPwm: true,
        state: {
          value: 100,
          controlMode: ControlMode.manual,
        } as OutputBase,
      },
      2: {
        id: 2,
        model: "pca9685",
        address: "0x40",
        name: "test output 2",
        pin: 1,
        isPwm: false,
        isInvertedPwm: false,
        state: {
          value: 50,
          controlMode: ControlMode.manual,
        },
      } as OutputBase,
    };
    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputData").value(outputData);
    });
    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 and one output", () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => outputList,
        },
        params: { outputId: 1 },
      } as unknown as Request;

      const success = get(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal((success.content?.data as Array<SDBOutput>).length, 1);
      assert.deepEqual(success.content?.data, [outputData[1]]);
    });

    it("should return a 200 and all outputs", () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => outputList,
        },
        params: {},
      } as unknown as Request;

      const success = get(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(
        (success.content?.data as Array<SDBOutput>).length,
        Object.keys(outputData).length,
      );
      assert.deepEqual(success.content?.data, Object.values(outputData));
    });

    it("should return a 404 and a 'Not Found' error", () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => outputList,
        },
        originalUrl: "/api/v2/outputs/-1",
        params: { outputId: -1 },
      } as unknown as Request;

      const error = get(mockRequest, mockResponse) as ErrorResponse;

      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/outputs/-1");
      assert.equal(error.error["details"].at(0), "Output with ID -1 not found.");
    });
  });

  describe("addAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<MockSprootDB>;
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    beforeEach(() => {
      sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addOutputAsync.resolves();
      outputList = sinon.createStubInstance(OutputList);
      outputList.initializeOrRegenerateAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    it("should return a 201 and add a new output", async () => {
      const newOutput = {
        model: "pca9685",
        address: "0x40",
        name: "test output",
        pin: 0,
        isPwm: true,
        isInvertedPwm: true,
        color: "#FF0000",
      } as SDBOutput;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        body: newOutput,
      } as unknown as Request;

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, newOutput);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDB.addOutputAsync.calledOnce);
      assert.isTrue(outputList.initializeOrRegenerateAsync.calledOnce);
    });

    it("should return a 400 and details for each missing required field", async () => {
      const newOutput = {} as SDBOutput;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        originalUrl: "/api/v2/outputs",
        params: { outputId: "string" },
        body: newOutput,
      } as unknown as Request;

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/outputs");
      assert.deepEqual(error.error["details"], [
        "Missing required field: model",
        "Missing required field: address",
        "Missing required field: name",
        "Missing required field: pin",
        "Missing required field: isPwm",
        "Missing required field: isInvertedPwm",
      ]);
      assert.isTrue(sprootDB.addOutputAsync.notCalled);
      assert.isTrue(outputList.initializeOrRegenerateAsync.notCalled);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const newOutput = {
        model: "pca9685",
        address: "0x40",
        name: "test output",
        pin: 0,
        isPwm: true,
        isInvertedPwm: true,
        color: "#FF0000",
      } as SDBOutput;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        originalUrl: "/api/v2/outputs",
        params: { outputId: 1 },
        body: newOutput,
      } as unknown as Request;

      sprootDB.addOutputAsync.rejects(new Error("DB Error"));

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.equal(error.error.url, "/api/v2/outputs");
      assert.deepEqual(error.error["details"], ["Failed to add output to database.", "DB Error"]);
      assert.isTrue(sprootDB.addOutputAsync.calledOnce);
      assert.isTrue(outputList.initializeOrRegenerateAsync.notCalled);
    });
  });

  describe("updateAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<MockSprootDB>;
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    beforeEach(() => {
      sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addSensorAsync.resolves();
      outputList = sinon.createStubInstance(OutputList);
      outputList.initializeOrRegenerateAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    it("should return a 200 and update an existing output", async () => {
      const updatedOutput = {
        1: {
          id: 1,
          model: "pca9685",
          address: "0x40",
          name: "test output",
          pin: 0,
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(updatedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        params: { outputId: 1 },
        body: updatedOutput,
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, updatedOutput[1]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDB.updateOutputAsync.calledOnce);
      assert.isTrue(outputList.initializeOrRegenerateAsync.calledOnce);
    });

    it("should return a 400 and details for the invalid request", async () => {
      const updatedOutput = {
        1: {
          id: 1,
          model: "pca9685",
          address: "0x40",
          name: "test output",
          pin: 0,
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(updatedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        originalUrl: "/api/v2/outputs",
        params: {},
        body: updatedOutput,
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/outputs");
      assert.deepEqual(error.error["details"], ["Invalid or missing output ID."]);
      assert.isTrue(sprootDB.updateOutputAsync.notCalled);
      assert.isTrue(outputList.initializeOrRegenerateAsync.notCalled);
    });

    it("should return a 404 and a 'Not Found' error", async () => {
      const updatedOutput = {
        1: {
          id: 1,
          model: "pca9685",
          address: "0x40",
          name: "test output",
          pin: 0,
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(updatedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        originalUrl: "/api/v2/outputs/-1",
        params: { outputId: -1 },
        body: updatedOutput,
      } as unknown as Request;

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/outputs/-1");
      assert.deepEqual(error.error["details"], ["Output with ID -1 not found."]);
      assert.isTrue(sprootDB.updateOutputAsync.notCalled);
      assert.isTrue(outputList.initializeOrRegenerateAsync.notCalled);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const updatedOutput = {
        1: {
          id: 1,
          model: "pca9685",
          address: "0x40",
          name: "test output",
          pin: 0,
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(updatedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        originalUrl: "/api/v2/outputs/1",
        params: { outputId: 1 },
        body: updatedOutput,
      } as unknown as Request;

      sprootDB.updateOutputAsync.rejects(new Error("DB Error"));

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.equal(error.error.url, "/api/v2/outputs/1");
      assert.deepEqual(error.error["details"], [
        "Failed to update output in database.",
        "DB Error",
      ]);
      assert.isTrue(sprootDB.updateOutputAsync.calledOnce);
      assert.isTrue(outputList.initializeOrRegenerateAsync.notCalled);
    });
  });

  describe("deleteAsync", () => {
    let sprootDB: sinon.SinonStubbedInstance<MockSprootDB>;
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    beforeEach(() => {
      sprootDB = sinon.createStubInstance(MockSprootDB);
      sprootDB.addSensorAsync.resolves();
      outputList = sinon.createStubInstance(OutputList);
      outputList.initializeOrRegenerateAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    it("should return a 200 and delete an existing output", async () => {
      const deletedOutput = {
        1: {
          id: 1,
          model: "pca9685",
          address: "0x40",
          name: "test output",
          pin: 0,
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(deletedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        params: { outputId: 1 },
      } as unknown as Request;

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, "Output deleted successfully.");
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(sprootDB.deleteOutputAsync.calledOnce);
      assert.isTrue(outputList.initializeOrRegenerateAsync.calledOnce);
    });

    it("should return a 400 and details for the invalid request", async () => {
      const deletedOutput = {
        1: {
          id: 1,
          model: "pca9685",
          address: "0x40",
          name: "test output",
          pin: 0,
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(deletedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        originalUrl: "/api/v2/outputs",
        params: {},
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/outputs");
      assert.deepEqual(error.error["details"], ["Invalid or missing output ID."]);
      assert.isTrue(sprootDB.deleteOutputAsync.notCalled);
      assert.isTrue(outputList.initializeOrRegenerateAsync.notCalled);
    });

    it("should return a 404 and a 'Not Found' error", async () => {
      const deletedOutput = {
        1: {
          id: 1,
          model: "pca9685",
          address: "0x40",
          name: "test output",
          pin: 0,
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(deletedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        originalUrl: "/api/v2/outputs/-1",
        params: { outputId: -1 },
      } as unknown as Request;

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/outputs/-1");
      assert.deepEqual(error.error["details"], ["Output with ID -1 not found."]);
      assert.isTrue(sprootDB.deleteOutputAsync.notCalled);
      assert.isTrue(outputList.initializeOrRegenerateAsync.notCalled);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const deletedOutput = {
        1: {
          id: 1,
          model: "pca9685",
          address: "0x40",
          name: "test output",
          pin: 0,
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(deletedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "sprootDB":
                return sprootDB;
              case "outputList":
                return outputList;
            }
          },
        },
        originalUrl: "/api/v2/outputs/1",
        params: { outputId: 1 },
      } as unknown as Request;

      sprootDB.deleteOutputAsync.rejects(new Error("DB Error"));

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.equal(error.error.url, "/api/v2/outputs/1");
      assert.deepEqual(error.error["details"], [
        "Failed to delete output from database.",
        "DB Error",
      ]);
      assert.isTrue(sprootDB.deleteOutputAsync.calledOnce);
      assert.isTrue(outputList.initializeOrRegenerateAsync.notCalled);
    });
  });
});
