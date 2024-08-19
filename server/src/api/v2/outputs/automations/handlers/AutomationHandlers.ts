import { OutputList } from "../../../../../outputs/list/OutputList";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { Automation } from "../../../../../automation/Automation";
import { ValidOperators } from "@sproot/sproot-common/dist/automation/ICondition";

/**
 * Possible statusCodes: 200, 404
 * @param request
 * @param response
 * @returns
 */
export function get(request: Request, response: Response): SuccessResponse | ErrorResponse {
  const outputList = request.app.get("outputList") as OutputList;
  let getAutomationsResponse: SuccessResponse | ErrorResponse;

  if (request.params["outputId"] != null) {
    const output = outputList.outputs[request.params["outputId"]];
    if (output) {
      if (request.params["automationId"] != null) {
        const automation = output.getAutomations()[request.params["automationId"]];
        if (automation) {
          getAutomationsResponse = {
            statusCode: 200,
            content: {
              data: automation,
            },
            ...response.locals["defaultProperties"],
          };
        } else {
          getAutomationsResponse = {
            statusCode: 404,
            error: {
              name: "Not Found",
              url: request.originalUrl,
              details: [`Automation with ID ${request.params["automationId"]} not found.`],
            },
            ...response.locals["defaultProperties"],
          };
          return getAutomationsResponse;
        }
      } else {
        getAutomationsResponse = {
          statusCode: 200,
          content: {
            data: [output.getAutomations()],
          },
          ...response.locals["defaultProperties"],
        };
      }
    } else {
      getAutomationsResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Output with ID ${request.params["outputId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return getAutomationsResponse;
    }
  }
  getAutomationsResponse = {
    statusCode: 200,
    content: {
      data: Object.values(outputList.getAutomations()),
    },
    ...response.locals["defaultProperties"],
  };
  return getAutomationsResponse;
}

export async function addAsync(request: Request, response: Response){
  const outputList = request.app.get("outputList") as OutputList;
  let addAutomationResponse: SuccessResponse | ErrorResponse;

  if (request.params["outputId"] != null) {
    if (!outputList.outputs[request.params["outputId"]]) {
      addAutomationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Output with ID ${request.params["outputId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return addAutomationResponse;
    }

    // null checked above
    const output = outputList.outputs[request.params["outputId"]!]!;

    const newAutomation = {
      name: request.body["name"],
      value: request.body["value"],
      rules: request.body["rules"],
      startTime: request.body["startTime"],
      endTime: request.body["endTime"],
    } as Automation;

    const missingFields: Array<string> = [];
    if (newAutomation.name == null) {
      missingFields.push("Missing required field: name");
    }
    if (newAutomation.value == null) {
      missingFields.push("Missing required field: value");
    } else if (isNaN(newAutomation.value) || newAutomation.value < 0 || newAutomation.value > 100) {
      if (output.isPwm && newAutomation.value != 0 && newAutomation.value != 100) {
        missingFields.push("Invalid value (output is PWM): must be a number equal to 0 and 100");
      } else {
        missingFields.push("Invalid value: must be a number equal to or between 0 and 100");
      }
    }
    if (newAutomation.rules == null) {
      missingFields.push("Missing required field: rules");
    }
    if (newAutomation.rules.anyOf == null) {
      missingFields.push("Missing required field: rules.anyOf");
    }
    if (newAutomation.rules.allOf == null) {
      missingFields.push("Missing required field: rules.allOf");
    }
    if (newAutomation.rules.oneOf == null) {
      missingFields.push("Missing required field: rules.oneOf");
    }
    if (newAutomation.rules.operator == null) {
      missingFields.push("Missing required field: rules.operator");
    } else if (newAutomation.rules.operator != "and" && newAutomation.rules.operator != "or") {
      missingFields.push("invalid value for rules.operator: must be 'and' or 'or'");
    }
    for (const condition of newAutomation.rules.allOf) {
      if (!ValidOperators.includes(condition.operator)) {
        missingFields.push(
          `A condition in 'rules.allOf' contains an invalid operator: ${condition.operator}`,
        );
      }
    }
    for (const condition of newAutomation.rules.anyOf) {
      if (!ValidOperators.includes(condition.operator)) {
        missingFields.push(
          `A condition in 'rules.anyOf' contains an invalid operator: ${condition.operator}`,
        );
      }
    }
    for (const condition of newAutomation.rules.oneOf) {
      if (!ValidOperators.includes(condition.operator)) {
        missingFields.push(
          `A condition in 'rules.oneOf'contains an invalid operator: ${condition.operator}`,
        );
      }
    }

    if (missingFields.length > 0) {
      addAutomationResponse = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: request.originalUrl,
          details: [...missingFields],
        },
        ...response.locals["defaultProperties"],
      };
      return addAutomationResponse;
    }

    try {
      await output.addAutomationAsync(newAutomation);
      addAutomationResponse = {
        statusCode: 201,
        content: {
          data: newAutomation,
        },
        ...response.locals["defaultProperties"],
      };
      return addAutomationResponse;
    } catch (error: any) {
      addAutomationResponse = {
        statusCode: 503,
        error: {
          name: "Service Unreachable",
          url: request.originalUrl,
          details: ["Failed to add output to database.", error.message],
        },
        ...response.locals["defaultProperties"],
      };
      return addAutomationResponse;
    }
  }

  addAutomationResponse = {
    statusCode: 400,
    error: {
      name: "Bad Request",
      url: request.originalUrl,
      details: ["Invalid or missing output ID."],
    },
    ...response.locals["defaultProperties"],
  };

  return addAutomationResponse;
}

export async function updateAsync(request: Request, response: Response) {
  const outputList = request.app.get("outputList") as OutputList;
  let updateAutomationResponse: SuccessResponse | ErrorResponse;

  if (request.params["outputId"] != null) {
    if (!outputList.outputs[request.params["outputId"]]) {
      updateAutomationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Output with ID ${request.params["outputId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return updateAutomationResponse;
    }
  }
  if (request.params["automationId"] != null) {
    //OutputId is nullchecked above
    if (
      !outputList.outputs[request.params["outputId"]!]!.getAutomations()[
        request.params["automationId"]
      ]
    ) {
      updateAutomationResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with ID ${request.params["automationId"]} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return updateAutomationResponse;
    }
  }
  // null checked above
  const output = outputList.outputs[request.params["id"]!]!;
  const automation = output.getAutomations()[request.params["automationId"]!]!;

  automation.name = request.body["name"] ?? automation.name;
  automation.value = request.body["value"] ?? automation.value;
  automation.rules = request.body["rules"] ?? automation.rules;
  automation.startTime = request.body["startTime"] ?? automation.startTime;
  automation.endTime = request.body["endTime"] ?? automation.endTime;

  const invalidFields: Array<string> = [];
  if (isNaN(automation.value) || automation.value < 0 || automation.value > 100) {
    if (output.isPwm && automation.value != 0 && automation.value != 100) {
      invalidFields.push("Invalid value (output is PWM): must be a number equal to 0 and 100");
    } else {
      invalidFields.push("Invalid value: must be a number equal to or between 0 and 100");
    }
  }
  if (automation.rules.operator != "and" && automation.rules.operator != "or") {
    invalidFields.push("invalid value for rules.operator: must be 'and' or 'or'");
  }
  for (const condition of automation.rules.allOf) {
    if (!ValidOperators.includes(condition.operator)) {
      invalidFields.push(
        `A condition in 'rules.allOf' contains an invalid operator: ${condition.operator}`,
      );
    }
  }
  for (const condition of automation.rules.anyOf) {
    if (!ValidOperators.includes(condition.operator)) {
      invalidFields.push(
        `A condition in 'rules.anyOf' contains an invalid operator: ${condition.operator}`,
      );
    }
  }
  for (const condition of automation.rules.oneOf) {
    if (!ValidOperators.includes(condition.operator)) {
      invalidFields.push(
        `A condition in 'rules.oneOf'contains an invalid operator: ${condition.operator}`,
      );
    }
  }

  if (invalidFields.length > 0) {
    updateAutomationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: [...invalidFields],
      },
      ...response.locals["defaultProperties"],
    };
    return updateAutomationResponse;
  }

  try {
    await output.updateAutomationAsync(automation);
    updateAutomationResponse = {
      statusCode: 200,
      content: {
        data: automation,
      },
      ...response.locals["defaultProperties"],
    };
    return updateAutomationResponse;
  } catch (error: any) {
    updateAutomationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to update output in database.", error.message],
      },
      ...response.locals["defaultProperties"],
    };
    return updateAutomationResponse;
  }
}

export async function deleteAsync(request: Request, response: Response) {
  const outputList = request.app.get("outputList") as OutputList;
  let deleteAutomationResponse: SuccessResponse | ErrorResponse;

  const outputId = parseInt(request.params["outputId"] ?? "");
  if (isNaN(outputId)) {
    deleteAutomationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing output ID."],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteAutomationResponse;
  }
  const automationId = parseInt(request.params["automationId"] ?? "");
  if (isNaN(automationId)) {
    deleteAutomationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing automation ID."],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteAutomationResponse;
  }

  const outputData = outputList.outputs[outputId];
  if (!outputData) {
    deleteAutomationResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Output with ID ${outputId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteAutomationResponse;
  }

  const automationData = outputData.getAutomations()[automationId];
  if (!automationData) {
    deleteAutomationResponse = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: request.originalUrl,
        details: [`Automation with ID ${automationId} not found.`],
      },
      ...response.locals["defaultProperties"],
    };

    return deleteAutomationResponse;
  }
  try {
    await outputList.initializeOrRegenerateAsync();

    deleteAutomationResponse = {
      statusCode: 200,
      content: {
        data: "Automation deleted successfully.",
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    deleteAutomationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unreachable",
        url: request.originalUrl,
        details: ["Failed to delete automation from database.", error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return deleteAutomationResponse;
}
