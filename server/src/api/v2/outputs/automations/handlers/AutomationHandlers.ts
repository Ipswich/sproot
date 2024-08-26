import { OutputList } from "../../../../../outputs/list/OutputList";
import { SuccessResponse, ErrorResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
// import { Automation } from "../../../../../automation/Automation";
import { ValidOperators } from "@sproot/sproot-common/dist/automation/ICondition";
import IAutomation from "@sproot/automation/IAutomation";

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
              data: [automation],
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
        }
      } else {
        getAutomationsResponse = {
          statusCode: 200,
          content: {
            data: Object.values(output.getAutomations()),
          },
          ...response.locals["defaultProperties"],
        };
      }
      return getAutomationsResponse;
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
  const allAutomations = outputList.getAutomations();
  const returnedAutomations = {} as Record<number, IAutomation[]>;
  for (const outputId in allAutomations) {
    returnedAutomations[outputId] = Object.values(allAutomations[outputId]!);
  }
  getAutomationsResponse = {
    statusCode: 200,
    content: {
      data: returnedAutomations,
    },
    ...response.locals["defaultProperties"],
  };
  return getAutomationsResponse;
}

/**
 * 
 * @param request Possible statusCodes: 201, 400, 503
 * @param response 
 * @returns 
 */
export async function addAsync(request: Request, response: Response) {
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
      startTime: request.body["startTime"] ?? null,
      endTime: request.body["endTime"] ?? null,
    } as IAutomation;
    const missingFields: Array<string> = [];
    if (newAutomation.name == null) {
      missingFields.push("Missing required field: name");
    }
    if (newAutomation.value == null) {
      missingFields.push("Missing required field: value");
    } else if (isNaN(newAutomation.value) || newAutomation.value < 0 || newAutomation.value > 100) {
      missingFields.push("Invalid value: must be a number between 0 and 100");
    } else if (!output.isPwm && newAutomation.value != 0 && newAutomation.value != 100){
      missingFields.push("Invalid value (output is not PWM): must be a number equal to 0 and 100");
    }
    if (newAutomation.rules == null) {
      missingFields.push("Missing required field: rules");
    } else {
      if (newAutomation.rules["allOf"] == null) {
        missingFields.push("Missing required field: rules.allOf");
      } else {
        for (const condition of newAutomation.rules.allOf) {
          if (!ValidOperators.includes(condition.operator)) {
            missingFields.push(
              `A condition in 'rules.allOf' contains an invalid operator: ${condition.operator}`,
            );
          }
        }
      }
      if (newAutomation.rules["anyOf"] == null) {
        missingFields.push("Missing required field: rules.anyOf");
      } else {
        for (const condition of newAutomation.rules.anyOf) {
          if (!ValidOperators.includes(condition.operator)) {
            missingFields.push(
              `A condition in 'rules.anyOf' contains an invalid operator: ${condition.operator}`,
            );
          }
        }
      }
      if (newAutomation.rules["oneOf"] == null) {
        missingFields.push("Missing required field: rules.oneOf");
      } else {
        for (const condition of newAutomation.rules.oneOf) {
          if (!ValidOperators.includes(condition.operator)) {
            missingFields.push(
              `A condition in 'rules.oneOf'contains an invalid operator: ${condition.operator}`,
            );
          }
        }
      }
      if (newAutomation.rules["operator"] == null) {
        missingFields.push("Missing required field: rules.operator");
      } else if (newAutomation.rules.operator != "and" && newAutomation.rules.operator != "or") {
        missingFields.push("Invalid value for rules.operator: must be 'and' or 'or'");
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
      const createdAutomation = await output.addAutomationAsync(newAutomation);
      console.log(createdAutomation)
      addAutomationResponse = {
        statusCode: 201,
        content: {
          data: createdAutomation,
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
          details: ["Failed to add automation to database.", error.message],
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

/**
 * 
 * @param request Possible statusCodes: 201, 400, 404, 503
 * @param response 
 * @returns 
 */
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
  } else {
    updateAutomationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing output ID."],
      },
      ...response.locals["defaultProperties"],
    };
    return updateAutomationResponse;
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
  } else {
    updateAutomationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: ["Invalid or missing automation ID."],
      },
      ...response.locals["defaultProperties"],
    };
    return updateAutomationResponse;
  }
  // null checked above
  const output = outputList.outputs[request.params["outputId"]!]!;
  const automation = output.getAutomations()[request.params["automationId"]!]!;

  automation.name = request.body["name"] ?? automation.name;
  automation.value = request.body["value"] ?? automation.value;
  automation.rules = request.body["rules"] ?? automation.rules;
  automation.startTime = request.body["startTime"] ?? automation.startTime ?? null;
  automation.endTime = request.body["endTime"] ?? automation.endTime ?? null;

  const invalidFields: Array<string> = [];
  
  if (isNaN(automation.value) || automation.value < 0 || automation.value > 100) {
    invalidFields.push("Invalid value: must be a number between 0 and 100");
  } else if (!output.isPwm && automation.value != 0 && automation.value != 100){
    invalidFields.push("Invalid value (output is not PWM): must be a number equal to 0 and 100");
  }
  if (automation.rules["allOf"] == null) {
    invalidFields.push("Missing required field: rules.allOf");
  } else {
    for (const condition of automation.rules.allOf) {
      if (!ValidOperators.includes(condition.operator)) {
        invalidFields.push(
          `A condition in 'rules.allOf' contains an invalid operator: ${condition.operator}`,
        );
      }
    }
  }
  if (automation.rules["anyOf"] == null) {
    invalidFields.push("Missing required field: rules.anyOf");
  } else {
    for (const condition of automation.rules.anyOf) {
      if (!ValidOperators.includes(condition.operator)) {
        invalidFields.push(
          `A condition in 'rules.anyOf' contains an invalid operator: ${condition.operator}`,
        );
      }
    }
  }
  if (automation.rules["oneOf"] == null) {
    invalidFields.push("Missing required field: rules.oneOf");
  } else {
    for (const condition of automation.rules.oneOf) {
      if (!ValidOperators.includes(condition.operator)) {
        invalidFields.push(
          `A condition in 'rules.oneOf'contains an invalid operator: ${condition.operator}`,
        );
      }
    }
  }
  if (automation.rules["operator"] == null) {
    invalidFields.push("Missing required field: rules.operator");
  } else if (automation.rules.operator != "and" && automation.rules.operator != "or") {
    invalidFields.push("Invalid value for rules.operator: must be 'and' or 'or'");
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
        data: JSON.parse(JSON.stringify(automation)),
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
        details: ["Failed to update automation in database.", error.message],
      },
      ...response.locals["defaultProperties"],
    };
    return updateAutomationResponse;
  }
}

/**
 * 
 * @param request Possible statusCodes: 200, 400, 404, 503
 * @param response 
 * @returns 
 */
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
    await outputData.deleteAutomationAsync(automationId);

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
