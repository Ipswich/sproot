import { Request, Response } from "express";
import { SensorList } from "../../../../sensors/list/SensorList";
import { sensorChartDataHandler } from "../handlers/SensorChartDataHandlers";

import { assert } from "chai";
import sinon from "sinon";
import { SuccessResponse } from "@sproot/api/v2/Responses";

describe("SensorChartDataHandlers.ts tests", () => {
  describe("sensorChartDataHandler", () => {
    let sensorList: sinon.SinonStubbedInstance<SensorList>;
    let chartData: any;
    const mockResponse = {
      locals: {
        defaultProperties: {
          timestamp: new Date().toISOString(),
          requestId: "1234",
        },
      },
    } as unknown as Response;

    beforeEach(() => {
      chartData = {
        data: {
          temperature: [
            { name: "1/24 12:00 pm", sensor1: 0, sensor2: 25, units: "°C" },
            { name: "1/24 12:05 pm", sensor1: 0, sensor2: 26, units: "°C" },
          ],
          humidity: [
            { name: "1/24 12:00 pm", sensor1: 0, sensor2: 26, units: "%rH" },
            { name: "1/24 12:05 pm", sensor1: 0, sensor2: 27, units: "%rH" },
          ],
        },
        series: [
          { name: "sensor1", color: "lime" },
          { name: "sensor2", color: "green" },
        ],
      };
      sensorList = sinon.createStubInstance(SensorList);
      sinon.stub(sensorList, "chartData").value({ get: () => chartData });
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return a 200 and chartData for all sensors", () => {
      const request = {
        app: {
          get: (_dependency: string) => sensorList,
        },
        query: {},
      } as unknown as Request;

      const response = sensorChartDataHandler(request, mockResponse) as SuccessResponse;
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.content?.data, chartData);
    });

    it("should return a 200 and chartData for one readingType", () => {
      const request = {
        app: {
          get: (_dependency: string) => sensorList,
        },
        query: { readingType: "temperature" },
      } as unknown as Request;

      const response = sensorChartDataHandler(request, mockResponse) as SuccessResponse;
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.content?.data, {
        data: {
          temperature: chartData.data.temperature,
        },
        series: chartData.series,
      });
    });

    it("should return a 200 and the latest chartData for all sensors", () => {
      const request = {
        app: {
          get: (_dependency: string) => sensorList,
        },
        query: { latest: "true" },
      } as unknown as Request;

      const response = sensorChartDataHandler(request, mockResponse) as SuccessResponse;
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.content?.data, {
        data: {
          temperature: chartData.data.temperature.slice(-1),
          humidity: chartData.data.humidity.slice(-1),
        },
        series: chartData.series,
      });
    });

    it("should return a 200 and the latestchartData for one readingType", () => {
      const request = {
        app: {
          get: (_dependency: string) => sensorList,
        },
        query: { latest: "true", readingType: "temperature" },
      } as unknown as Request;
      const response = sensorChartDataHandler(request, mockResponse) as SuccessResponse;
      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.content?.data, {
        data: {
          temperature: chartData.data.temperature.slice(-1),
        },
        series: chartData.series,
      });
    });
  });
});
