import {
  OutputDataQueryRequest,
  OutputDataQueryResponse,
} from "../../../../../../common/dist/api/v2/QueryTypes";
import { outputDataQueryHandlerAsync } from "../handlers/OutputDataQueryHandler";
import { testDataQueryHandlerTests } from "../../shared/test/sharedDataQueryHandlerTests";

const validBody: Partial<OutputDataQueryRequest> = {
  timeRange: {
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-01T01:00:00.000Z",
  },
};

const responseData: OutputDataQueryResponse = {
  data: {
    1: {
      values: [{ time: "2024-01-01T00:00:00.000Z", avg: 100, min: 50, max: 150, count: 60 }],
    },
  },
};

testDataQueryHandlerTests<OutputDataQueryRequest, OutputDataQueryResponse>({
  handlerName: "OutputDataQueryHandler.ts",
  url: "/api/v2/outputs/data",
  handler: outputDataQueryHandlerAsync,
  queryMethod: "queryOutputDataAsync",
  validBody,
  responseData,
  extraValidationTests: [
    {
      name: "invalid downsample",
      body: {
        timeRange: { start: "2024-01-01T00:00:00.000Z", end: "2024-01-01T01:00:00.000Z" },
        downsample: "30m" as any,
      },
    },
  ],
});
