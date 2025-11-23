import { Request, Response } from "express";
import { SensorList } from "../../../../sensors/list/SensorList.js";
import { readingTypesHandler } from "../handlers/ReadingTypesHandler.js";

import { assert } from "chai";
import sinon from "sinon";
import { SuccessResponse } from "@sproot/api/v2/Responses.js";

describe("ReadingTypesHandler.ts tests", () => {
  const mockResponse = {
    locals: {
      defaultProperties: {
        timestamp: new Date().toISOString(),
        requestId: "1234",
      },
    },
  } as unknown as Response;

  describe("readingTypesHandler", () => {
    it("should return a SuccessResponse with status code 200", () => {
      const sensorList = sinon.createStubInstance(SensorList);
      sinon.stub(sensorList, "sensors").value({
        "1": {
          units: {
            temperature: "°C",
          },
        },
        "2": {
          units: {
            pressure: "hPa",
          },
        },
        "3": {
          units: {
            temperature: "°C",
            humidity: "%rH",
          },
        },
      });
      const request = {
        app: {
          get: sinon.stub().returns(sensorList),
        },
      } as unknown as Request;

      const result = readingTypesHandler(request, mockResponse) as SuccessResponse;

      assert.equal(result.statusCode, 200);
      assert.deepEqual(result.content?.data, {
        temperature: "°C",
        humidity: "%rH",
        pressure: "hPa",
      });
    });
  });
});
