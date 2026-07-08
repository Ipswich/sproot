import { OutputDataQueryRequest } from "../../../../../../common/dist/api/v2/QueryTypes";
import { outputDataQueryHandlerAsync } from "../handlers/OutputDataQueryHandler";
import { testDataQueryHandlerTests } from "../../shared/test/sharedDataQueryHandlerTests";

const validBody: Partial<OutputDataQueryRequest> = {
  timeRange: {
    start: "2024-01-01T00:00:00.000Z",
    end: "2024-01-01T01:00:00.000Z",
  },
};

const responseData = {
  data: [
    {
      id: 1,
      name: "output_1",
      units: "V",
      statistics: {
        avg: [100],
        min: [50],
        max: [150],
        count: [60],
      },
    },
  ],
  xAxis: { field: "time", values: ["2024-01-01T00:00:00.000Z"] },
};

testDataQueryHandlerTests<OutputDataQueryRequest, typeof responseData>({
  handlerName: "OutputDataQueryHandler.ts",
  url: "/api/v2/outputs/data",
  handler: outputDataQueryHandlerAsync,
  queryMethod: "queryOutputDataAsync",
  validBody,
  responseData,
  extraValidationTests: [],
});
