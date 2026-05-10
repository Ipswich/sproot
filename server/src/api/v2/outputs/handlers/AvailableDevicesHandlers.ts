import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { OutputList } from "../../../../outputs/list/OutputList";
import type {
  ContractOperationPathParams,
  ContractOperationQueryParams,
} from "@sproot/sproot-common/dist/api/contracts/operation-types";
import { Models } from "@sproot/sproot-common/dist/outputs/Models";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type ListAvailableOutputDevicesPathParams = ContractOperationPathParams<"listAvailableOutputDevices">;
type ListAvailableOutputDevicesQuery = ContractOperationQueryParams<"listAvailableOutputDevices">;

export async function getAvailableDevices(
  request: Request,
  response: Response
): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get(DI_KEYS.OutputList) as OutputList;
  const validatedRequest = getValidatedContractRequestData<"listAvailableOutputDevices">(response);
  const pathParams = (validatedRequest.params ?? request.params) as ListAvailableOutputDevicesPathParams;
  const query = (validatedRequest.query ?? request.query) as ListAvailableOutputDevicesQuery;
  const model = pathParams["model"];
  const address = query["address"];
  const filterUsed = query["filterUsed"];
  let getAvailableIdentifiersResponse: SuccessResponse | ErrorResponse;

  const errorDetails: string[] = [];
  if (model == undefined) {
    errorDetails.push("Model cannot be undefined.");
  }
  if (errorDetails.length > 0) {
    getAvailableIdentifiersResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: errorDetails,
      },
      ...response.locals["defaultProperties"],
    };
    return getAvailableIdentifiersResponse;
  }

  try {
    if (model != null && (Object.values(Models) as string[]).includes(model)) {
      const pins = outputList.getAvailableDevices(model, address, filterUsed);
      getAvailableIdentifiersResponse = {
        statusCode: 200,
        content: {
          data: pins,
        },
        ...response.locals["defaultProperties"],
      };
    } else {
      getAvailableIdentifiersResponse = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: request.originalUrl,
          details: [
            `Model '${model}' not recognized, supported models are: ${Object.values(Models).join(
              ", "
            )}`,
          ],
        },
        ...response.locals["defaultProperties"],
      };
    }
  } catch (e) {
    getAvailableIdentifiersResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [`${e}`],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return getAvailableIdentifiersResponse;
}
