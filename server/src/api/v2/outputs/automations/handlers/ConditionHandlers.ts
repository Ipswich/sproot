import { OutputList } from "../../../../../outputs/list/OutputList";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { SensorCondition } from "../../../../../automation/conditions/SensorCondition";
import { OutputCondition } from "../../../../../automation/conditions/OutputCondition";
import { TimeCondition } from "../../../../../automation/conditions/TimeCondition";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";

/**
 * Possible statusCodes: 200, 401, 404
 * @param request 
 * @param response 
 */
export function get(request: Request, response: Response): SuccessResponse | ErrorResponse {
  const outputList = request.app.get("outputList") as OutputList;
  let getConditionsResponse: SuccessResponse | ErrorResponse;

  if (request.params["outputId"] != null || !isNaN(parseInt(request.params["outputId"]!))) {
    const output = outputList.outputs[request.params["outputId"]!];
    if (output) {
      if (request.params["automationId"] != null || !isNaN(parseInt(request.params["automationId"]!))) {
        const automation = output.getAutomations()[request.params["automationId"]!];
        if (automation) {
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
                .filter((automation) => automation.id == parseInt(request.params["automationId"]!))
                .map((automation) => (Object.values(automation.conditions.groupedConditions[type]).flat(1)))[0]!
                .filter((condition) => condition.id == conditionId);
              if (condition.length == 0) {
                getConditionsResponse = {
                  statusCode: 404,
                  error: {
                    name: "Not Found",
                    url: request.originalUrl,
                    details: [`${type.charAt(0).toUpperCase() + type.slice(1)} condition with ID ${conditionId} not found.`],
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
              .filter((automation) => automation.id == parseInt(request.params["automationId"]!))
              .map((automation) => ({ [automation.id]: automation.conditions.groupedConditions[type] }));
            getConditionsResponse = {
              statusCode: 200,
              content: {
                data: outputAutomations,
              },
              ...response.locals["defaultProperties"],
            };
            return getConditionsResponse;
          }
          const outputAutomations = Object.values(output.getAutomations())
            .filter((automation) => automation.id == parseInt(request.params["automationId"]!))
            .map((automation) => ({ [automation.id]: automation.conditions.groupedConditions }));
          getConditionsResponse = {
            statusCode: 200,
            content: {
              data: outputAutomations,
            },
            ...response.locals["defaultProperties"],
          };
          return getConditionsResponse;
        }
        getConditionsResponse = {
          statusCode: 404,
          error: {
            name: "Not Found",
            url: request.originalUrl,
            details: [`Automation with ID ${request.params["automationId"]} not found.`],
          },
          ...response.locals["defaultProperties"],
        };
        return getConditionsResponse;
      }
      getConditionsResponse = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: request.originalUrl,
          details: ["Automation ID not provided."],
        },
        ...response.locals["defaultProperties"],
      };
      return getConditionsResponse;
    }
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
};

/**
 * Possible statusCodes: 201, 400, 401, 404, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function addAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get("outputList") as OutputList;
  let addConditionResponse: SuccessResponse | ErrorResponse;

  const outputId = parseInt(request.params["outputId"] ?? "");
  const automationId = parseInt(request.params["automationId"] ?? "");
  const conditionType = request.params["type"] as "sensor" | "output" | "time";

  const invalidDetails = [];
  if (isNaN(outputId)) {
    invalidDetails.push("Invalid or missing output ID.");
  }
  if (isNaN(automationId)) {
    invalidDetails.push("Invalid or missing automation ID.");
  }
  if (!["sensor", "output", "time"].includes(conditionType)) {
    invalidDetails.push("Invalid or missing condition type.");
  }

  if (invalidDetails.length > 0) {
    addConditionResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: invalidDetails,
      },
      ...response.locals["defaultProperties"],
    };

    return addConditionResponse;
  }

  const outputData = outputList.outputs[outputId];
  if (!outputData) {
    addConditionResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with ID ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return addConditionResponse;
  }

  const automation = outputData.getAutomations()[automationId];
  if (!automation) {
    addConditionResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Automation with ID ${automationId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return addConditionResponse;
  }

  try {
    const invalidFields = []
    let creationResult: SensorCondition | OutputCondition | TimeCondition | undefined = undefined;
    
    if (!["allOf", "anyOf", "oneOf"].includes(request.body.group)) {
      invalidFields.push("Invalid or missing condition group.");
    }
    switch (conditionType) {
      case "sensor":
        if (request.body.operator == null) {
          invalidFields.push("Invalid or missing operator.");
        }
        if (request.body.comparisonValue == null) {
          invalidFields.push("Invalid or missing comparison value.");
        }
        if (isNaN(request.body.sensorId)) {
          invalidFields.push("Invalid or missing sensor ID.");
        }
        if (request.body.readingType == null) {
          invalidFields.push("Invalid or missing reading type.");
        }
        if (invalidFields.length > 0) {
          break;
        }
        creationResult = await automation.conditions.addSensorConditionAsync(
          request.body.group,
          request.body.operator,
          request.body.comparisonValue,
          request.body.sensorId,
          request.body.readingType
        );
        break;
      case "output":
        if (request.body.operator == null) {
          invalidFields.push("Invalid or missing operator.");
        }
        if (request.body.comparisonValue == null) {
          invalidFields.push("Invalid or missing comparison value.");
        }
        if (isNaN(request.body.outputId)) {
          invalidFields.push("Invalid or missing output ID.");
        }
        if (invalidFields.length > 0) {
          break;
        }
        creationResult = await automation.conditions.addOutputConditionAsync(
          request.body.group,
          request.body.operator,
          request.body.comparisonValue,
          request.body.outputId,
        );
        break;
      case "time":
        const regex = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
        if (request.body.startTime != null && !regex.test(request.body.startTime)) {
          invalidFields.push("Invalid start time.");
        }
        if (request.body.endTime != null && !regex.test(request.body.endTime)) {
          invalidFields.push("Invalid end time.");
        }
        if (invalidFields.length > 0) {
          break;
        }
        creationResult = await automation.conditions.addTimeConditionAsync(
          request.body.group,
          request.body.startTime,
          request.body.endTime
        );
        break;
    }

    if (!creationResult) {
      addConditionResponse = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: request.originalUrl,
          details: invalidFields,
        },
        ...response.locals["defaultProperties"],
      };
      return addConditionResponse;
    }
    addConditionResponse = {
      statusCode: 201,
      content: {
        data: creationResult
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    addConditionResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return addConditionResponse;
};

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function updateAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const outputList = request.app.get("outputList") as OutputList;
  let updateConditionResponse: SuccessResponse | ErrorResponse;

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
  if (!["sensor", "output", "time"].includes(conditionType)) {
    invalidDetails.push("Invalid or missing condition type.");
  }
  if (isNaN(conditionId)) {
    invalidDetails.push("Invalid or missing condition ID.");
  }

  if (invalidDetails.length > 0) {
    updateConditionResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: invalidDetails,
      },
      ...response.locals["defaultProperties"],
    };

    return updateConditionResponse;
  }

  const outputData = outputList.outputs[outputId];
  if (!outputData) {
    updateConditionResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with ID ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return updateConditionResponse;
  }

  const automation = outputData.getAutomations()[automationId];
  if (!automation) {
    updateConditionResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Automation with ID ${automationId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return updateConditionResponse;
  }

  const conditions = automation.conditions.groupedConditions[conditionType];
  let condition = conditions.allOf.find((condition) => condition.id == conditionId)
    ?? conditions.anyOf.find((condition) => condition.id == conditionId)
    ?? conditions.oneOf.find((condition) => condition.id == conditionId);
  if (!condition) {
    updateConditionResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`${conditionType.charAt(0).toUpperCase() + conditionType.slice(1)} condition with ID ${conditionId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return updateConditionResponse;
  }

  try {
    let updateResult: SensorCondition | OutputCondition | TimeCondition | undefined = undefined;
    condition.group = request.body.group ?? condition.group;
    if (!["allOf", "anyOf", "oneOf"].includes(condition.group)) {
      invalidDetails.push("Invalid or missing condition group.");
    }
    switch (conditionType) {
      case "sensor":
        condition = condition as SensorCondition;
        condition.operator = request.body.operator ?? condition.operator;
        condition.comparisonValue = request.body.comparisonValue ?? condition.comparisonValue;
        condition.sensorId = request.body.sensorId ?? condition.sensorId;
        condition.readingType = request.body.readingType ?? condition.readingType;
        if (!["equal", "notEqual", "greater", "less", "greaterOrEqual", "lessOrEqual"].includes(condition.operator)) {
          invalidDetails.push("Invalid or missing operator.");
        }
        if (isNaN(condition.comparisonValue)) {
          invalidDetails.push("Invalid or missing comparison value.");
        }
        if (isNaN(condition.sensorId)) {
          invalidDetails.push("Invalid or missing sensor ID.");
        }
        if (!Object.keys(ReadingType).includes(condition.readingType)) {
          invalidDetails.push("Invalid or missing reading type.");
        }
        if (invalidDetails.length > 0) {
          break;
        }
        await automation.conditions.updateConditionAsync(condition);
        updateResult = condition;
        break;
      case "output":
        condition = condition as OutputCondition;
        condition.operator = request.body.operator ?? condition.operator;
        condition.comparisonValue = request.body.comparisonValue ?? condition.comparisonValue;
        condition.outputId = request.body.outputId ?? condition.outputId;
        if (!condition.operator) {
          invalidDetails.push("Invalid or missing operator.");
        }
        if (isNaN(condition.comparisonValue)) {
          invalidDetails.push("Invalid or missing comparison value.");
        }
        if (isNaN(condition.outputId)) {
          invalidDetails.push("Invalid or missing output ID.");
        }
        if (invalidDetails.length > 0) {
          break;
        }

        await automation.conditions.updateConditionAsync(condition);
        updateResult = condition;
        break;
      case "time":
        condition = condition as TimeCondition;
        condition.startTime = request.body.startTime ?? condition.startTime;
        condition.endTime = request.body.endTime ?? condition.endTime;
        const regex = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
        if (condition.startTime != null && !regex.test(condition.startTime)) {
          invalidDetails.push("Invalid start time.");
        }
        if (condition.endTime != null && !regex.test(condition.endTime)) {
          invalidDetails.push("Invalid end time.");
        }
        if (invalidDetails.length > 0) {
          break;
        }
        await automation.conditions.updateConditionAsync(condition);
        updateResult = condition;
        break;
    }

    if (!updateResult) {
      updateConditionResponse = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: request.originalUrl,
          details: invalidDetails,
        },
        ...response.locals["defaultProperties"],
      };
      return updateConditionResponse;
    }
    updateConditionResponse = {
      statusCode: 200,
      content: {
        data: updateResult
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    updateConditionResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return updateConditionResponse;
};

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
  if (!["sensor", "output", "time"].includes(conditionType)) {
    invalidDetails.push("Invalid or missing condition type.");
  }
  if (isNaN(conditionId)) {
    invalidDetails.push("Invalid or missing condition ID.");
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

  const conditions = automation.conditions.groupedConditions[conditionType];
  const condition = conditions.allOf.find((condition) => condition.id == conditionId)
    ?? conditions.anyOf.find((condition) => condition.id == conditionId)
    ?? conditions.oneOf.find((condition) => condition.id == conditionId);
  if (!condition) {
    deleteConditionResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`${conditionType.charAt(0).toUpperCase() + conditionType.slice(1)} condition with ID ${conditionId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteConditionResponse;
  }

  try {
    if (conditionType === "sensor") {
      await automation.conditions.deleteSensorConditionAsync(conditionId);
    }
    if (conditionType === "output") {
      await automation.conditions.deleteOutputConditionAsync(conditionId);
    }
    if (conditionType === "time") {
      await automation.conditions.deleteTimeConditionAsync(conditionId);
    }
    
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