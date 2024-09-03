import { OutputList } from "../../../../../outputs/list/OutputList";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";


/**
 * Possible statusCodes: 200, 401, 404
 * @param request 
 * @param response 
 */
export function get(request: Request, response: Response): SuccessResponse | ErrorResponse {
  const outputList = request.app.get("outputList") as OutputList;
  let getConditionsResponse: SuccessResponse | ErrorResponse;

  if (request.params["outputId"] != null) {
    const output = outputList.outputs[request.params["outputId"]];
    if (output) {
      if (request.params["automationId"] != null) {
        const automation = output.getAutomations()[request.params["automationId"]];
        if (automation) {
          getConditionsResponse = {
            statusCode: 200,
            content: {
              data: { [automation.id]: automation.conditions },
            },
            ...response.locals["defaultProperties"],
          };
        } else {
          getConditionsResponse = {
            statusCode: 404,
            error: {
              name: "Not Found",
              url: request.originalUrl,
              details: [`Automation with ID ${request.params["automationId"]} not found.`],
            },
            ...response.locals["defaultProperties"],
          };
        }
      } else {
        if (request.params["type"] != null) {
          const type = request.params["type"];
          if (type !== "sensor" && type !== "output" && type !== "time") {
            getConditionsResponse = {
              statusCode: 400,
              error: {
                name: "Bad Request",
                url: request.originalUrl,
                details: ["Invalid condition type."],
              },
              ...response.locals["defaultProperties"],
            };
            return getConditionsResponse;
          }
          if (request.params["conditionId"] != null) {
            const conditionId = parseInt(request.params["conditionId"]);
            if (isNaN(conditionId)) {
              getConditionsResponse = {
                statusCode: 400,
                error: {
                  name: "Bad Request",
                  url: request.originalUrl,
                  details: ["Invalid condition ID."],
                },
                ...response.locals["defaultProperties"],
              };
              return getConditionsResponse;
            }
            const condition = Object.values(output.getAutomations())
              .map((automation) => (
                Object.values(automation.conditions.groupedConditions[type]).find((condition) => condition.id == conditionId) ));
            if (!condition) {
              getConditionsResponse = {
                statusCode: 404,
                error: {
                  name: "Not Found",
                  url: request.originalUrl,
                  details: [`Condition with ID ${conditionId} not found.`],
                },
                ...response.locals["defaultProperties"],
              };
              return getConditionsResponse;
            }
            getConditionsResponse = {
              statusCode: 200,
              content: {
                data: condition,
              },
              ...response.locals["defaultProperties"],
            };
            return getConditionsResponse;
          }
          const outputAutomations = Object.values(output.getAutomations())
            .map((automation) => () => ({ [automation.id]: automation.conditions.groupedConditions[type] }));
          getConditionsResponse = {
            statusCode: 200,
            content: {
              data: outputAutomations,
            },
            ...response.locals["defaultProperties"],
          };
        } else {
          const outputAutomations = Object.values(output.getAutomations())
            .map((automation) => () => ({ [automation.id]: automation.conditions.groupedConditions }));
          getConditionsResponse = {
            statusCode: 200,
            content: {
              data: outputAutomations,
            },
            ...response.locals["defaultProperties"],
          };
        }
        return getConditionsResponse;
      }
    } else {
      getConditionsResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Output with ID ${request.params["outputId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return getConditionsResponse;
    }
  }
  getConditionsResponse = {
    statusCode: 400,
    error: {
      name: "Bad Request",
      url: request.originalUrl,
      details: ["Output ID not provided."],
    },
    ...response.locals["defaultProperties"],
  };
  return getConditionsResponse;
}

/**
 * PossibleStatusCodes 200, 400, 401, 404, 503
 * @param request 
 * @param response
 * @returns
 */
export async function deleteAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get("outputList") as OutputList;
  let deleteConditionResponse: SuccessResponse | ErrorResponse;

  const outputId = parseInt(request.params["outputId"] ?? "");
  const automationId = parseInt(request.params["automationId"] ?? "");
  const conditionId = parseInt(request.params["conditionId"] ?? "");
  const conditionType = request.params["type"] as "sensor" | "output" | "time";

  const invalidDetails = [];
  if (isNaN(outputId)) {
    invalidDetails.push("Invalid or missing output ID.");
  }
  if (isNaN(automationId)) {
    invalidDetails.push("Invalid or missing automation ID.");
  }
  if (isNaN(conditionId)) {
    invalidDetails.push("Invalid or missing condition ID.");
  }
  if (!["sensor", "output", "time"].includes(conditionType)) {
    invalidDetails.push("Invalid or missing condition type.");
  }

  if (invalidDetails.length > 0) {
    deleteConditionResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: invalidDetails,
      },
      ...response.locals["defaultProperties"],
    };

    return deleteConditionResponse;
  }

  const outputData = outputList.outputs[outputId];
  if (!outputData) {
    deleteConditionResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with ID ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteConditionResponse;
  }

  const automation = outputData.getAutomations()[automationId];
  if (!automation) {
    deleteConditionResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Automation with ID ${automationId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteConditionResponse;
  }

  const conditions = automation.conditions
  const condition = conditions.allOf.find((condition) => condition.id == conditionId)
    ?? automation.conditions.anyOf.find((condition) => condition.id == conditionId)
    ?? automation.conditions.oneOf.find((condition) => condition.id == conditionId);
  if (!condition) {
    deleteConditionResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Condition with ID ${conditionId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteConditionResponse;
  }

  try {
    deleteConditionResponse = {
      statusCode: 200,
      content: {
        data: {
          message: "Condition deleted successfully.",
        },
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    deleteConditionResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return deleteConditionResponse;
}