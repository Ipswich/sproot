import { Request, Response } from "express";
import { assert } from "chai";
import { OutputList } from "../../../../outputs/list/OutputList";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { addAsync, deleteAsync, get, updateAsync } from "../handlers/OutputHandlers";

import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import sinon from "sinon";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { OutputBase } from "../../../../outputs/base/OutputBase";
import { Models } from "@sproot/sproot-common/dist/outputs/Models";
import { setValidatedContractRequestData } from "../../../validation/validateRequest";

describe("OutputHandlers.ts tests", () => {
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

  describe("get", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    const outputData = {
      1: {
        id: 1,
        model: Models.PCA9685,
        address: "0x40",
        name: "test output 1",
        pin: "0",
        isPwm: true,
        isInvertedPwm: true,
        state: {
          value: 100,
          controlMode: ControlMode.manual,
        } as OutputBase,
      },
      2: {
        id: 2,
        model: Models.PCA9685,
        address: "0x40",
        name: "test output 2",
        pin: "1",
        isPwm: false,
        isInvertedPwm: false,
        state: {
          value: 50,
          controlMode: ControlMode.manual,
        },
      } as OutputBase,
    };
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
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

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
      const mockResponse = createMockResponse();

      const success = get(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(
        (success.content?.data as Array<SDBOutput>).length,
        Object.keys(outputData).length
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
      const mockResponse = createMockResponse({ params: { outputId: "-1" } });

      const error = get(mockRequest, mockResponse) as ErrorResponse;

      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/outputs/-1");
      assert.equal(error.error["details"].at(0), "Output with ID -1 not found.");
    });

    it("should consume validated outputId instead of raw req.params", () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => outputList,
        },
        params: { outputId: 2 },
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

      const success = get(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, [outputData[1]]);
    });
  });

  describe("addAsync", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
      outputList.addOutputAsync.resolves(1);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return a 201 and add a new output", async () => {
      const newOutput = {
        id: 1,
        model: Models.PCA9685,
        address: "0x40",
        name: "test output",
        pin: "0",
        isPwm: true,
        isInvertedPwm: true,
        color: "#FF0000",
        automationTimeout: 60,
        subcontrollerId: null,
      } as SDBOutput;

      const mockRequest = {
        app: {
          get: (_dependency: string) => (_dependency === "outputList" ? outputList : undefined),
        },
        body: newOutput,
      } as unknown as Request;
      const mockResponse = createMockResponse({ body: newOutput });

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, newOutput);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(outputList.addOutputAsync.calledOnce);
      assert.deepInclude(outputList.addOutputAsync.firstCall.args[0], {
        model: Models.PCA9685,
        address: "0x40",
        name: "test output",
        pin: "0",
        isPwm: true,
        isInvertedPwm: true,
        color: "#FF0000",
        automationTimeout: 60,
        subcontrollerId: null,
      });
    });

    it("should return a 503 if the database is unreachable", async () => {
      const newOutput = {
        model: Models.PCA9685,
        address: "0x40",
        name: "test output",
        pin: "0",
        isPwm: true,
        isInvertedPwm: true,
        automationTimeout: 60,
        color: "#FF0000",
      } as SDBOutput;

      const mockRequest = {
        app: {
          get: (_dependency: string) => (_dependency === "outputList" ? outputList : undefined),
        },
        originalUrl: "/api/v2/outputs",
        params: { outputId: 1 },
        body: newOutput,
      } as unknown as Request;
      const mockResponse = createMockResponse({ body: newOutput });

      outputList.addOutputAsync.rejects(new Error("DB Error"));

      const error = (await addAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 503);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Service Unreachable");
      assert.equal(error.error.url, "/api/v2/outputs");
      assert.deepEqual(error.error["details"], ["Failed to add output to database.", "DB Error"]);
      assert.isTrue(outputList.addOutputAsync.calledOnce);
    });

    it("should consume validated output create body instead of raw req.body", async () => {
      const rawOutput = {
        model: Models.PCA9685,
        address: "ignored-address",
        name: "Ignored Output",
        pin: "9",
        isPwm: false,
        isInvertedPwm: false,
        color: "#000000",
        automationTimeout: 2,
      } as SDBOutput;

      const validatedOutput = {
        model: Models.PCA9685,
        address: "0x40",
        name: "Validated Output",
        pin: "0",
        isPwm: true,
        isInvertedPwm: true,
        color: "#FF0000",
        automationTimeout: 60,
        subcontrollerId: null,
      } as SDBOutput;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        body: rawOutput,
      } as unknown as Request;
      const mockResponse = createMockResponse({ body: validatedOutput });

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, { ...validatedOutput, id: 1 });
      assert.isTrue(outputList.addOutputAsync.calledOnce);
      assert.isTrue(outputList.addOutputAsync.calledWithMatch({ name: "Validated Output" }));
    });

    it("should consume validated output create body instead of raw req.body", async () => {
      const rawOutput = {
        model: Models.PCA9685,
        address: "ignored-address",
        name: "Ignored Output",
        pin: "9",
        isPwm: false,
        isInvertedPwm: false,
        color: "#000000",
        automationTimeout: 2,
      } as SDBOutput;

      const validatedOutput = {
        model: Models.PCA9685,
        address: "0x40",
        name: "Validated Output",
        pin: "0",
        isPwm: true,
        isInvertedPwm: true,
        color: "#FF0000",
        automationTimeout: 60,
        subcontrollerId: null,
      } as SDBOutput;

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        body: rawOutput,
      } as unknown as Request;
      const mockResponse = createMockResponse({ body: validatedOutput });

      const success = (await addAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 201);
      assert.deepEqual(success.content?.data, { ...validatedOutput, id: 1 });
      assert.isTrue(outputList.addOutputAsync.calledOnce);
      assert.isTrue(outputList.addOutputAsync.calledWithMatch({ name: "Validated Output" }));
    });
  });

  describe("updateAsync", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
      outputList.updateOutputAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 and update an existing output", async () => {
      const updatedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
          automationTimeout: 60,
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(updatedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => (_dependency === "outputList" ? outputList : undefined),
        },
        params: { outputId: 1 },
        body: updatedOutput,
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, updatedOutput[1]);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(outputList.updateOutputAsync.calledOnceWithExactly(updatedOutput[1]));
    });

    it("should allow nullable relationship fields to be cleared", async () => {
      const existingOutput = {
        id: 1,
        model: Models.PCA9685,
        address: "0x40",
        name: "test output",
        pin: "0",
        isPwm: true,
        isInvertedPwm: true,
        color: "#FF0000",
        automationTimeout: 60,
        deviceZoneId: 3,
        parentOutputId: 7,
      } as SDBOutput;
      sinon.stub(outputList, "outputData").value({ 1: existingOutput });
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

      const mockRequest = {
        app: {
          get: (_dependency: string) => (_dependency === "outputList" ? outputList : undefined),
        },
        params: { outputId: 1 },
        body: {
          deviceZoneId: null,
          parentOutputId: null,
        },
      } as unknown as Request;

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.isTrue(outputList.updateOutputAsync.calledOnce);
      assert.deepEqual(outputList.updateOutputAsync.firstCall.args[0], {
        ...existingOutput,
        deviceZoneId: null,
        parentOutputId: null,
      });
    });

    it("should return a 404 and a 'Not Found' error", async () => {
      const updatedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(updatedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => (_dependency === "outputList" ? outputList : undefined),
        },
        originalUrl: "/api/v2/outputs/-1",
        params: { outputId: -1 },
        body: updatedOutput,
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "-1" } });

      const error = (await updateAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/outputs/-1");
      assert.deepEqual(error.error["details"], ["Output with ID -1 not found."]);
      assert.isTrue(outputList.updateOutputAsync.notCalled);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const updatedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(updatedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => (_dependency === "outputList" ? outputList : undefined),
        },
        originalUrl: "/api/v2/outputs/1",
        params: { outputId: 1 },
        body: updatedOutput,
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

      outputList.updateOutputAsync.rejects(new Error("DB Error"));

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
      assert.isTrue(outputList.updateOutputAsync.calledOnceWithExactly(updatedOutput[1]));
    });

    it("should consume validated outputId instead of raw req.params", async () => {
      const updatedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
          automationTimeout: 60,
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(updatedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: { outputId: "not-a-number" },
        body: updatedOutput,
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.isTrue(outputList.updateOutputAsync.calledOnce);
    });

    it("should consume validated outputId instead of raw req.params", async () => {
      const updatedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
          automationTimeout: 60,
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(updatedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => {
            switch (_dependency) {
              case "outputList":
                return outputList;
            }
          },
        },
        params: { outputId: "not-a-number" },
        body: updatedOutput,
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

      const success = (await updateAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.isTrue(outputList.updateOutputAsync.calledOnce);
    });
  });

  describe("deleteAsync", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
      outputList.deleteOutputAsync.resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 and delete an existing output", async () => {
      const deletedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(deletedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => (_dependency === "outputList" ? outputList : undefined),
        },
        params: { outputId: 1 },
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.deepEqual(success.content?.data, "Output deleted successfully.");
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.isTrue(outputList.deleteOutputAsync.calledOnceWithExactly(1));
    });

    it("should return a 400 and details for the invalid request", async () => {
      const deletedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(deletedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => (_dependency === "outputList" ? outputList : undefined),
        },
        originalUrl: "/api/v2/outputs",
        params: {},
      } as unknown as Request;
      const mockResponse = createMockResponse();

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/api/v2/outputs");
      assert.deepEqual(error.error["details"], ["Invalid or missing output ID."]);
      assert.isTrue(outputList.deleteOutputAsync.notCalled);
    });

    it("should return a 404 and a 'Not Found' error", async () => {
      const deletedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(deletedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => (_dependency === "outputList" ? outputList : undefined),
        },
        originalUrl: "/api/v2/outputs/-1",
        params: { outputId: -1 },
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "-1" } });

      const error = (await deleteAsync(mockRequest, mockResponse)) as ErrorResponse;
      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/outputs/-1");
      assert.deepEqual(error.error["details"], ["Output with ID -1 not found."]);
      assert.isTrue(outputList.deleteOutputAsync.notCalled);
    });

    it("should return a 503 if the database is unreachable", async () => {
      const deletedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
          isPwm: true,
          isInvertedPwm: true,
          color: "#FF0000",
        } as SDBOutput,
      };
      sinon.stub(outputList, "outputData").value(deletedOutput);

      const mockRequest = {
        app: {
          get: (_dependency: string) => (_dependency === "outputList" ? outputList : undefined),
        },
        originalUrl: "/api/v2/outputs/1",
        params: { outputId: 1 },
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

      outputList.deleteOutputAsync.rejects(new Error("DB Error"));

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
      assert.isTrue(outputList.deleteOutputAsync.calledOnceWithExactly(1));
    });

    it("should consume validated outputId instead of raw req.params", async () => {
      const deletedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
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
              case "outputList":
                return outputList;
            }
          },
        },
        params: { outputId: "not-a-number" },
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.isTrue(outputList.deleteOutputAsync.calledOnceWith(1));
    });

    it("should consume validated outputId instead of raw req.params", async () => {
      const deletedOutput = {
        1: {
          id: 1,
          model: Models.PCA9685,
          address: "0x40",
          name: "test output",
          pin: "0",
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
              case "outputList":
                return outputList;
            }
          },
        },
        params: { outputId: "not-a-number" },
      } as unknown as Request;
      const mockResponse = createMockResponse({ params: { outputId: "1" } });

      const success = (await deleteAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.isTrue(outputList.deleteOutputAsync.calledOnceWith(1));
    });
  });
});
