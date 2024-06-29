import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList";
import { outputChartDataHandler } from "../handlers/OutputChartDataHandlers";

import { assert } from "chai";
import sinon from "sinon";
import { SuccessResponse } from "@sproot/api/v2/Responses";

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

      const response = outputChartDataHandler(request, mockResponse) as SuccessResponse;
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.content?.data, {
        data: chartData.data.slice(-1),
        series: chartData.series,
      });
    });
  });
});
