import { Request, Response } from "express";
import { assert } from "chai";

import sinon from "sinon";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";

import { OutputList } from "../../../../outputs/list/OutputList";
import { ControlMode, IOutputBase } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { setControlModeAsync, setManualStateAsync } from "../handlers/OutputStateHandlers";
import { setValidatedContractRequestData } from "../../../validation/validateRequest";

function makeResponse(validatedRequestData?: Record<string, unknown>): Response {
  const response = {
    locals: {
      defaultProperties: {
        timestamp: new Date().toISOString(),
        requestId: "1234",
      },
    },
  } as unknown as Response;

  if (validatedRequestData) {
    setValidatedContractRequestData(response, validatedRequestData);
  }

  return response;
}

describe("OutputStateHandlers.ts tests", () => {
  describe("setControlModeAsync", async () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    const outputData = {
      1: {
        outputId: 1,
      },
      2: {
        outputId: 2,
      },
      3: {
        outputId: 3,
        parentOutputId: 1,
      },
    } as unknown as { [key: string]: IOutputBase };

    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputData").value(outputData);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 and update state", async () => {
      let mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: "1",
        },
        body: {
          controlMode: ControlMode.manual,
        },
      } as unknown as Request;

      const mockResponse = makeResponse({ body: { controlMode: ControlMode.manual } });

      let success = (await setControlModeAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, ["Control mode successfully updated."]);

      mockRequest.body["controlMode"] = ControlMode.automatic;
      setValidatedContractRequestData(mockResponse, {
        body: { controlMode: ControlMode.automatic },
      });
      success = (await setControlModeAsync(mockRequest, mockResponse)) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, ["Control mode successfully updated."]);

      assert.equal(outputList.updateControlModeAsync.callCount, 2);
    });

    it("should consume validated control mode instead of raw req.body", async () => {
      const mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: "1",
        },
        body: {
          controlMode: "invalid",
        },
      } as unknown as Request;

      const mockResponse = makeResponse({ body: { controlMode: ControlMode.automatic } });

      const success = (await setControlModeAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.isTrue(
        outputList.updateControlModeAsync.calledOnceWithExactly("1", ControlMode.automatic),
      );
    });

    it("should consume validated outputId instead of raw req.params", async () => {
      const mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: "1",
        },
        body: {
          controlMode: ControlMode.manual,
        },
      } as unknown as Request;

      const mockResponse = makeResponse({
        params: { outputId: "2" },
        body: { controlMode: ControlMode.automatic },
      });

      const success = (await setControlModeAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.isTrue(
        outputList.updateControlModeAsync.calledOnceWithExactly("2", ControlMode.automatic),
      );
    });

    it("should return a 404 and a 'Not Found' error", async () => {
      const mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: -1,
        },
        originalUrl: "/outputs/-1/controlMode",
        body: {
          controlMode: ControlMode.manual,
        },
      } as unknown as Request;

      const mockResponse = makeResponse({ body: { controlMode: ControlMode.manual } });

      const error = (await setControlModeAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/outputs/-1/controlMode");
      assert.deepEqual(error.error.details, ["Output with ID -1 not found."]);
      assert.isTrue(outputList.updateControlModeAsync.notCalled);
    });

    it("should return a 409 if output is not top-level", async () => {
      const mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: "3",
        },
        originalUrl: "/outputs/3/controlMode",
        body: {
          controlMode: ControlMode.manual,
        },
      } as unknown as Request;

      const mockResponse = makeResponse({ body: { controlMode: ControlMode.manual } });

      const error = (await setControlModeAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 409);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Conflict");
      assert.equal(error.error.url, "/outputs/3/controlMode");
      assert.deepEqual(error.error.details, [
        "Output is not a top-level output. Control mode can only be set on top-level outputs.",
      ]);
      assert.isTrue(outputList.updateControlModeAsync.notCalled);
    });
  });

  describe("setManualState", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    const outputData = {
      1: {
        outputId: 1,
        isPwm: true,
        state: {
          controlMode: ControlMode.manual,
        },
      },
      2: {
        outputId: 2,
        ispwm: false,
        state: {
          controlMode: ControlMode.manual,
        },
      },
      3: {
        outputId: 3,
        parentOutputId: 1,
        isPwm: true,
        state: {
          controlMode: ControlMode.manual,
        },
      },
    } as unknown as { [key: string]: IOutputBase };

    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputData").value(outputData);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 and update the output's manual state", async () => {
      let mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: "1",
        },
        body: {
          value: 50,
        },
      } as unknown as Request;

      const mockResponse = makeResponse({ body: { value: 50 } });

      let success = (await setManualStateAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, ["Manual state successfully updated."]);

      mockRequest.params["id"] = "2";
      mockRequest.body["value"] = 100;
      setValidatedContractRequestData(mockResponse, { body: { value: 100 } });
      success = await setManualStateAsync(mockRequest, mockResponse);
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, ["Manual state successfully updated."]);

      mockRequest.params["id"] = "2";
      mockRequest.body["value"] = 50;
      setValidatedContractRequestData(mockResponse, { body: { value: 50 } });
      success = await setManualStateAsync(mockRequest, mockResponse);
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, ["Manual state successfully updated."]);

      assert.isTrue(outputList.executeOutputStateAsync.calledThrice);
    });

    it("should consume validated manual value instead of raw req.body", async () => {
      const mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: "1",
        },
        body: {
          value: 5,
        },
      } as unknown as Request;

      const mockResponse = makeResponse({ body: { value: 75 } });

      const success = (await setManualStateAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.isTrue(outputList.setStateAsync.calledOnce);
      assert.equal(outputList.setStateAsync.firstCall.args[1]?.value, 75);
    });

    it("should consume validated outputId instead of raw req.params", async () => {
      const mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: "1",
        },
        body: {
          value: 5,
        },
      } as unknown as Request;

      const mockResponse = makeResponse({ params: { outputId: "2" }, body: { value: 75 } });

      const success = (await setManualStateAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.isTrue(outputList.setStateAsync.calledOnce);
      assert.equal(outputList.setStateAsync.firstCall.args[0], "2");
      assert.equal(outputList.setStateAsync.firstCall.args[1]?.value, 75);
    });

    it("should return a 404 and a 'Not Found' error", async () => {
      let mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: -1,
        },
        originalUrl: "/outputs/-1/manual-state",
        body: {
          value: 50,
        },
      } as unknown as Request;

      const mockResponse = makeResponse({ body: { value: 50 } });

      let error = (await setManualStateAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/outputs/-1/manual-state");
      assert.deepEqual(error.error.details, ["Output with ID -1 not found."]);

      assert.isTrue(outputList.executeOutputStateAsync.notCalled);
    });

    it("should return a 409 if output is not top-level", async () => {
      let mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: "3",
        },
        originalUrl: "/outputs/3/manual-state",
        body: {
          value: 50,
        },
      } as unknown as Request;

      const mockResponse = makeResponse({ body: { value: 50 } });

      let error = (await setManualStateAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 409);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Conflict");
      assert.equal(error.error.url, "/outputs/3/manual-state");
      assert.deepEqual(error.error.details, [
        "Output is not a top-level output. Manual state can only be set on top-level outputs.",
      ]);

      assert.isTrue(outputList.executeOutputStateAsync.notCalled);
    });
  });
});
