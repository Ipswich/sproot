import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { Request, Response } from "express";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { OutputList } from "../../../../outputs/list/OutputList";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { toDbDate } from "../../../../utils/dateUtils";
import type { operations as OutputContractOperations } from "@sproot/sproot-common/dist/api/generated/outputs/types";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type SetOutputControlModeRequestBody =
  OutputContractOperations["setOutputControlMode"]["requestBody"]["content"]["application/json"];
type SetOutputManualStateRequestBody =
  OutputContractOperations["setOutputManualState"]["requestBody"]["content"]["application/json"];
type SetOutputControlModePathParams =
  OutputContractOperations["setOutputControlMode"]["parameters"]["path"];
type SetOutputManualStatePathParams =
  OutputContractOperations["setOutputManualState"]["parameters"]["path"];

/**
 * Possible statusCodes: 200, 400, 404, 409
 * @param request
 * @param response
 * @returns
 */
export async function setControlModeAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get(DI_KEYS.OutputList) as OutputList;
  const pathParams = (getValidatedContractRequestData<"setOutputControlMode">(response).params ??
    request.params) as SetOutputControlModePathParams;
  const outputId = String(pathParams["outputId"]);
  const requestBody = getValidatedContractRequestData<"setOutputControlMode">(response)
    .body as unknown as SetOutputControlModeRequestBody;
  const controlMode = requestBody["controlMode"] as ControlMode;
  const output = outputList.outputData[outputId];
  let controlModeResponse: SuccessResponse | ErrorResponse;

  if (!output) {
    controlModeResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with ID ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };
    return controlModeResponse;
  }

  if (output.parentOutputId != null) {
    controlModeResponse = {
      statusCode: 409,
      error: {
        name: "Conflict",
        url: request.originalUrl,
        details: [
          "Output is not a top-level output. Control mode can only be set on top-level outputs.",
        ],
      },
      ...response.locals["defaultProperties"],
    };
    return controlModeResponse;
  }

  await outputList.updateControlModeAsync(outputId, controlMode);

  controlModeResponse = {
    statusCode: 200,
    content: {
      data: ["Control mode successfully updated."],
    },
    ...response.locals["defaultProperties"],
  };
  return controlModeResponse;
}

/**
 * Possible statusCodes: 200, 400, 404, 409
 * @param request
 * @param response
 * @returns
 */
export async function setManualStateAsync(request: Request, response: Response) {
  const outputList = request.app.get(DI_KEYS.OutputList) as OutputList;
  const pathParams = (getValidatedContractRequestData<"setOutputManualState">(response).params ??
    request.params) as SetOutputManualStatePathParams;
  const outputId = String(pathParams["outputId"]);
  const requestBody = (getValidatedContractRequestData<"setOutputManualState">(response).body ??
    {}) as SetOutputManualStateRequestBody;
  const value = requestBody.value as number;
  const output = outputList.outputData[outputId];
  let manualStateResponse: SuccessResponse | ErrorResponse;

  // Output not found
  if (!output) {
    manualStateResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with ID ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };
    return manualStateResponse;
  }

  // Output is found, but has a parent (not a top-level output)
  if (output.parentOutputId) {
    manualStateResponse = {
      statusCode: 409,
      error: {
        name: "Conflict",
        url: request.originalUrl,
        details: [
          "Output is not a top-level output. Manual state can only be set on top-level outputs.",
        ],
      },
      ...response.locals["defaultProperties"],
    };
    return manualStateResponse;
  }

  await outputList.setStateAsync(outputId, {
    value: value,
    controlMode: ControlMode.manual,
    logTime: toDbDate(),
  } as SDBOutputState);

  if (output.state.controlMode == ControlMode.manual) {
    await outputList.executeOutputStateAsync(outputId);
  }

  manualStateResponse = {
    statusCode: 200,
    content: {
      data: ["Manual state successfully updated."],
    },
    ...response.locals["defaultProperties"],
  };

  return manualStateResponse;
}
