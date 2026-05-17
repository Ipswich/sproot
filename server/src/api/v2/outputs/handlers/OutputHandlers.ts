import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { OutputList } from "../../../../outputs/list/OutputList";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { SDBOutput } from "@sproot/database/SDBOutput";
import { Request, Response } from "express";
import type { operations as OutputContractOperations } from "@sproot/sproot-common/dist/api/generated/outputs/types";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type GetOutputByIdPathParams = OutputContractOperations["getOutputById"]["parameters"]["path"];
type CreateOutputRequestBody =
  OutputContractOperations["createOutput"]["requestBody"]["content"]["application/json"];
type UpdateOutputPathParams = OutputContractOperations["updateOutput"]["parameters"]["path"];
type UpdateOutputRequestBody =
  OutputContractOperations["updateOutput"]["requestBody"]["content"]["application/json"];
type DeleteOutputPathParams = OutputContractOperations["deleteOutput"]["parameters"]["path"];

type UpdateOutputFallbackBody = {
  subcontrollerId?: number | null;
  automationTimeout?: number;
  deviceZoneId?: number | null;
  parentOutputId?: number | null;
};

/**
 * Possible statusCodes: 200, 404
 * @param request
 * @param response
 * @returns
 */
export function get(request: Request, response: Response): SuccessResponse | ErrorResponse {
  const outputList = request.app.get(DI_KEYS.OutputList) as OutputList;
  const pathParams = getValidatedContractRequestData<"getOutputById">(response).params as
    | GetOutputByIdPathParams
    | undefined;
  const outputId = pathParams?.outputId;
  let getOutputResponse: SuccessResponse | ErrorResponse;

  if (outputId !== undefined) {
    if (outputList.outputData[outputId]) {
      getOutputResponse = {
        statusCode: 200,
        content: {
          data: [outputList.outputData[outputId]],
        },
        ...response.locals["defaultProperties"],
      };
    } else {
      getOutputResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Output with ID ${outputId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    }
    return getOutputResponse;
  }

  getOutputResponse = {
    statusCode: 200,
    content: {
      data: Object.values(outputList.outputData),
    },
    ...response.locals["defaultProperties"],
  };
  return getOutputResponse;
}

/**
 * Possible statusCodes: 201, 400, 503
 * @param request
 * @param response
 * @returns
 */
export async function addAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get(DI_KEYS.OutputList) as OutputList;
  const requestBody = getValidatedContractRequestData<"createOutput">(response)
    .body as unknown as CreateOutputRequestBody;
  let addOutputResponse: SuccessResponse | ErrorResponse;

  const newOutput = {
    model: requestBody.model,
    subcontrollerId: requestBody.subcontrollerId,
    address: requestBody.address,
    name: requestBody.name,
    pin: requestBody.pin,
    isPwm: requestBody.isPwm,
    isInvertedPwm: requestBody.isInvertedPwm,
    color: requestBody.color,
    automationTimeout: requestBody.automationTimeout,
  } as SDBOutput;

  try {
    const newOutputId = await outputList.addOutputAsync(newOutput);
    addOutputResponse = {
      statusCode: 201,
      content: {
        data: { ...newOutput, id: newOutputId },
      },
      ...response.locals["defaultProperties"],
    };
    return addOutputResponse;
  } catch (error: any) {
    addOutputResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to add output to database.", error.message],
      },
      ...response.locals["defaultProperties"],
    };
    return addOutputResponse;
  }
}
/**
 * Possible statusCodes: 200, 400, 404, 503
 * @param request
 * @param response
 * @returns
 */
export async function updateAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get(DI_KEYS.OutputList) as OutputList;
  const validatedRequest = getValidatedContractRequestData<"updateOutput">(response);
  const pathParams = validatedRequest.params as
    | UpdateOutputPathParams
    | undefined;
  const requestBody = (validatedRequest.body ?? request.body) as UpdateOutputRequestBody;
  const fallbackBody = request.body as UpdateOutputFallbackBody;
  const outputId = Number.parseInt(String(pathParams?.outputId ?? ""), 10);
  let updateOutputResponse: SuccessResponse | ErrorResponse;

  if (isNaN(outputId)) {
    updateOutputResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing output ID."],
      },
      ...response.locals["defaultProperties"],
    };

    return updateOutputResponse;
  }

  const outputData = outputList.outputData[outputId] as SDBOutput;

  if (!outputData) {
    updateOutputResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with ID ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return updateOutputResponse;
  }

  outputData.model = (requestBody["model"] as SDBOutput["model"] | undefined) ?? outputData.model;
  outputData.subcontrollerId = fallbackBody["subcontrollerId"] ?? outputData.subcontrollerId;
  outputData.address = requestBody["address"] ?? outputData.address;
  outputData.name = requestBody["name"] ?? outputData.name;
  outputData.pin = requestBody["pin"] ?? outputData.pin;
  outputData.isPwm = requestBody["isPwm"] ?? outputData.isPwm;
  outputData.isInvertedPwm = requestBody["isInvertedPwm"] ?? outputData.isInvertedPwm;
  outputData.color = requestBody["color"] ?? outputData.color;
  outputData.automationTimeout = fallbackBody["automationTimeout"] ?? outputData.automationTimeout;
  outputData.deviceZoneId =
    fallbackBody["deviceZoneId"] === null
      ? null
      : (fallbackBody["deviceZoneId"] ?? outputData.deviceZoneId);
  outputData.parentOutputId =
    fallbackBody["parentOutputId"] === null
      ? null
      : (fallbackBody["parentOutputId"] ?? outputData.parentOutputId);

  try {
    await outputList.updateOutputAsync(outputData);
  } catch (error: any) {
    updateOutputResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to update output in database.", error.message],
      },
      ...response.locals["defaultProperties"],
    };
    return updateOutputResponse;
  }

  updateOutputResponse = {
    statusCode: 200,
    content: {
      data: outputData,
    },
    ...response.locals["defaultProperties"],
  };
  return updateOutputResponse;
}

export async function deleteAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get(DI_KEYS.OutputList) as OutputList;
  const pathParams = getValidatedContractRequestData<"deleteOutput">(response).params as
    | DeleteOutputPathParams
    | undefined;
  const outputId = Number.parseInt(String(pathParams?.outputId ?? ""), 10);
  let deleteOutputResponse: SuccessResponse | ErrorResponse;

  if (isNaN(outputId)) {
    deleteOutputResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing output ID."],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteOutputResponse;
  }

  const outputData = outputList.outputData[outputId] as SDBOutput;

  if (!outputData) {
    deleteOutputResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with ID ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteOutputResponse;
  }

  try {
    await outputList.deleteOutputAsync(outputId);

    deleteOutputResponse = {
      statusCode: 200,
      content: {
        data: "Output deleted successfully.",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    deleteOutputResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to delete output from database.", error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return deleteOutputResponse;
}
