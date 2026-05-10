import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { OutputList } from "../../../../outputs/list/OutputList";
import type { operations as OutputContractOperations } from "@sproot/sproot-common/dist/api/generated/outputs/types";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type GetOutputChartDataQuery = NonNullable<
  OutputContractOperations["getOutputChartData"]["parameters"]["query"]
>;

export function outputChartDataHandler(
  request: Request,
  response: Response
): SuccessResponse | ErrorResponse {
  const outputList = request.app.get(DI_KEYS.OutputList) as OutputList;
  const query = (getValidatedContractRequestData<"getOutputChartData">(response).query ?? {}) as Partial<GetOutputChartDataQuery>;
  const chartData = outputList.chartData.get();
  if (String(query.latest).toLowerCase() == "true") {
    chartData.data = chartData.data.slice(-1);
  }

  return {
    statusCode: 200,
    content: {
      data: chartData,
    },
    ...response.locals["defaultProperties"],
  };
}
