import { Request, Response } from "express";
import { assert } from "chai";
import { OutputList } from "../../../../outputs/list/OutputList";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { getOutputHandler } from "../handlers/OutputHandlers";

import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import sinon from "sinon";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { OutputBase } from "../../../../outputs/base/OutputBase";

const sandbox = sinon.createSandbox();

describe("OutputHandlers.ts tests", () => {
  afterEach(() => {
    sandbox.restore();
  });

  describe("getOutputHandler", () => {
    const outputList = sinon.createStubInstance(OutputList);
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
    sinon.stub(outputList, "outputData").value(outputData);

    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    it("should return a 200 and one output", () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => outputList,
        },
        params: { id: 1 },
      } as unknown as Request;

      const success = getOutputHandler(mockRequest, mockResponse) as SuccessResponse;
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

      const success = getOutputHandler(mockRequest, mockResponse) as SuccessResponse;
      assert.equal(success.statusCode, 200);
      assert.equal(success.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(success.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(
        (success.content?.data as Array<SDBOutput>).length,
        Object.keys(outputData).length,
      );
      assert.deepEqual(success.content?.data, Object.values(outputData));
    });

    it("should return a 404 and an error", () => {
      const mockRequest = {
        app: {
          get: (_dependency: string) => outputList,
        },
        originalUrl: "/api/v2/outputs/-1",
        params: { id: -1 },
      } as unknown as Request;

      const error = getOutputHandler(mockRequest, mockResponse) as ErrorResponse;

      assert.equal(error.statusCode, 404);
      assert.equal(error.timestamp, mockResponse.locals["defaultProperties"]["timestamp"]);
      assert.equal(error.requestId, mockResponse.locals["defaultProperties"]["requestId"]);
      assert.equal(error.error.name, "Not Found");
      assert.equal(error.error.url, "/api/v2/outputs/-1");
      assert.equal(error.error["details"].at(0), "Output with Id -1 not found.");
    });
  });
});
