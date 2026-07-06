import {
  SensorDataQueryRequest,
  SensorDataQueryResponse,
} from "../../../../../../common/dist/api/v2/QueryTypes";
import { sensorDataQueryHandlerAsync } from "../handlers/SensorDataQueryHandler";
import { testDataQueryHandlerTests } from "../../shared/test/sharedDataQueryHandlerTests";

const validBody: Partial<SensorDataQueryRequest> = {
  timeRange: {
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-01T01:00:00.000Z",
  },
};

const responseData: SensorDataQueryResponse = {
  data: {
    1: {
      temperature: {
        units: "°C",
        values: [{ time: "2024-01-01T00:00:00.000Z", avg: 25, min: 20, max: 30, count: 60 }],
      },
    },
  },
};

testDataQueryHandlerTests<SensorDataQueryRequest, SensorDataQueryResponse>({
  handlerName: "SensorDataQueryHandler.ts",
  url: "/api/v2/sensors/data",
  handler: sensorDataQueryHandlerAsync,
  queryMethod: "querySensorDataAsync",
  validBody,
  responseData,
  extraValidationTests: [
    {
      name: "invalid readingTypes",
      body: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        readingTypes: [123] as any,
      },
    },
    {
      name: "invalid percentile",
      body: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        percentile: 1.5,
      },
    },
  ],
});
