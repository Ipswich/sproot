import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import { Request, Response } from "express";
import { OutputList } from "../../../../outputs/list/OutputList";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";

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
  const outputList = request.app.get("outputList") as OutputList;
  const outputId = String(request.params["outputId"]);
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

  switch (request.body["controlMode"]) {
    case ControlMode.manual:
      await outputList.updateControlModeAsync(outputId, ControlMode.manual);
      break;
    case ControlMode.automatic:
      await outputList.updateControlModeAsync(outputId, ControlMode.automatic);
      break;
    default:
      controlModeResponse = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: request.originalUrl,
          details: ["Invalid control mode."],
        },
        ...response.locals["defaultProperties"],
      };
      return controlModeResponse;
  }

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
  const outputList = request.app.get("outputList") as OutputList;
  const outputId = String(request.params["outputId"]);
  const value = parseInt(request.body["value"]);
  const output = outputList.outputData[outputId];
  let manualStateResponse: SuccessResponse | ErrorResponse;

  // Bad value (string, etc.)
  if (isNaN(value) || value < 0 || value > 100) {
    manualStateResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid value.", "Value must be a number between 0 and 100."],
      },
      ...response.locals["defaultProperties"],
    };
    return manualStateResponse;
  }

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
    logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
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
