import { Request, Response } from "express";
import { assert } from "chai";

import sinon from "sinon";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";

import { OutputList } from "../../../../outputs/list/OutputList";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { SensorBase } from "../../../../sensors/base/SensorBase";
import { setControlMode, setManualStateAsync } from "../handlers/OutputStateHandlers";

describe("OutputStateHandlers.ts tests", () => {
  describe("setControlMode", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    const outputData = {
      1: {
        outputId: 1,
      },
      2: {
        outputId: 2,
      },
    } as unknown as { [key: string]: SensorBase };

    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "outputData").value(outputData);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 and update state", () => {
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

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      let success = setControlMode(mockRequest, mockResponse) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, ["Control mode successfully updated."]);

      mockRequest.body["controlMode"] = ControlMode.automatic;
      success = setControlMode(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, ["Control mode successfully updated."]);

      assert.equal(outputList.updateControlMode.calledTwice, true);
      assert.equal(outputList.executeOutputState.calledTwice, true);
    });

    it("should return a 400 and details for the invalid request", () => {
      const mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: "1",
        },
        originalUrl: "/outputs/1/controlMode",
        body: {
          controlMode: "invalid",
        },
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = setControlMode(mockRequest, mockResponse) as ErrorResponse;

      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/outputs/1/controlMode");
      assert.deepEqual(error.error.details, ["Invalid control mode."]);
      assert.isTrue(outputList.updateControlMode.notCalled);
      assert.isTrue(outputList.executeOutputState.notCalled);
    });

    it("should return a 404 and a 'Not Found' error", () => {
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

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      const error = setControlMode(mockRequest, mockResponse) as ErrorResponse;

      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/outputs/-1/controlMode");
      assert.deepEqual(error.error.details, ["Output with ID -1 not found."]);
      assert.isTrue(outputList.updateControlMode.notCalled);
      assert.isTrue(outputList.executeOutputState.notCalled);
    });
  });

  describe("setManualState", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    const outputData = {
      1: {
        outputId: 1,
        isPwm: true,
      },
      2: {
        outputId: 2,
        ispwm: false,
      },
    } as unknown as { [key: string]: SensorBase };

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

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      let success = (await setManualStateAsync(mockRequest, mockResponse)) as SuccessResponse;

      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, ["Manual state successfully updated."]);

      mockRequest.params["id"] = "2";
      mockRequest.body["value"] = 100;
      success = await setManualStateAsync(mockRequest, mockResponse);
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.deepEqual(success.content?.data, ["Manual state successfully updated."]);

      assert.equal(outputList.setNewOutputStateAsync.calledTwice, true);
      assert.equal(outputList.executeOutputState.calledTwice, true);
    });

    it("should return a 400 and details for the invalid request", async () => {
      let mockRequest = {
        app: {
          get: () => outputList,
        },
        params: {
          outputId: "1",
        },
        originalUrl: "/outputs/1/manual-state",
        body: {
          value: "string",
        },
      } as unknown as Request;

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      let error = (await setManualStateAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/outputs/1/manual-state");
      assert.deepEqual(error.error.details, [
        "Invalid value.",
        "Value must be a number between 0 and 100.",
      ]);

      mockRequest.body["value"] = -1;
      error = (await setManualStateAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/outputs/1/manual-state");
      assert.deepEqual(error.error.details, [
        "Invalid value.",
        "Value must be a number between 0 and 100.",
      ]);

      mockRequest.params["outputId"] = "2";
      mockRequest.originalUrl = "/outputs/2/manual-state";
      mockRequest.body["value"] = 50;
      error = (await setManualStateAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 400);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Bad Request");
      assert.equal(error.error.url, "/outputs/2/manual-state");
      assert.deepEqual(error.error.details, [
        "Output is not a PWM output.",
        "Value must be 0 or 100.",
      ]);

      assert.isTrue(outputList.setNewOutputStateAsync.notCalled);
      assert.isTrue(outputList.executeOutputState.notCalled);
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

      const mockResponse = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      let error = (await setManualStateAsync(mockRequest, mockResponse)) as ErrorResponse;

      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/outputs/-1/manual-state");
      assert.deepEqual(error.error.details, ["Output with ID -1 not found."]);

      assert.isTrue(outputList.setNewOutputStateAsync.notCalled);
      assert.isTrue(outputList.executeOutputState.notCalled);
    });
  });
});
