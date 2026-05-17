import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList";
import { outputChartDataHandler } from "../handlers/OutputChartDataHandlers";

import { assert } from "chai";
import sinon from "sinon";
import { SuccessResponse } from "@sproot/api/v2/Responses";
import { setValidatedContractRequestData } from "../../../validation/validateRequest";

describe("OutputChartDataHandlers.ts tests", () => {
  describe("outputChartDataHandler", () => {
    let outputList: sinon.SinonStubbedInstance<OutputList>;
    const chartData = {
      data: [
        { name: "1/24 12:00 pm", output1: 0, output2: 50 },
        { name: "1/24 12:05 pm", output1: 0, output2: 25 },
      ],
      series: [
        { name: "output1", color: "lime" },
        { name: "output2", color: "green" },
      ],
    };

    function createMockResponse(validatedQuery: Record<string, unknown> = {}): Response {
      const response = {
        locals: {
          defaultProperties: {
            timestamp: new Date().toISOString(),
            requestId: "1234",
          },
        },
      } as unknown as Response;

      setValidatedContractRequestData(response, { query: validatedQuery });

      return response;
    }

    beforeEach(() => {
      outputList = sinon.createStubInstance(OutputList);
      sinon.stub(outputList, "chartData").value({ get: () => chartData });
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 and chartData for all outputs", () => {
      const request = {
        app: {
          get: (_dependency: string) => outputList,
        },
        query: {},
      } as unknown as Request;
      const mockResponse = createMockResponse();

      const response = outputChartDataHandler(request, mockResponse) as SuccessResponse;
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.content?.data, chartData);
    });

    it("should return a 200 and the latest chartData for all outputs", () => {
      const request = {
        app: {
          get: (_dependency: string) => outputList,
        },
        query: { latest: "true" },
      } as unknown as Request;
      const mockResponse = createMockResponse({ latest: true });

      const response = outputChartDataHandler(request, mockResponse) as SuccessResponse;
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.content?.data, {
        data: chartData.data.slice(-1),
        series: chartData.series,
      });
      assert.lengthOf(chartData.data, 2);
    });

    it("should consume validated latest query instead of raw req.query", () => {
      const request = {
        app: {
          get: (_dependency: string) => outputList,
        },
        query: { latest: "true" },
      } as unknown as Request;
      const mockResponse = createMockResponse({ latest: "false" });

      const response = outputChartDataHandler(request, mockResponse) as SuccessResponse;
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.content?.data, chartData);
    });

    it("should not mutate cached chart data when latest is requested", () => {
      const request = {
        app: {
          get: (_dependency: string) => outputList,
        },
        query: { latest: "true" },
      } as unknown as Request;
      const mockResponse = createMockResponse({ latest: true });

      outputChartDataHandler(request, mockResponse);

      assert.lengthOf(chartData.data, 2);
      assert.deepEqual(chartData.series, [
        { name: "output1", color: "lime" },
        { name: "output2", color: "green" },
      ]);
    });
  });
});
