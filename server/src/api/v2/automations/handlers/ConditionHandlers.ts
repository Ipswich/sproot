import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { OutputCondition } from "../../../../automation/conditions/OutputCondition";
import { SensorCondition } from "../../../../automation/conditions/SensorCondition";
import { TimeCondition } from "../../../../automation/conditions/TimeCondition";
import { AutomationDataManager } from "../../../../automation/AutomationDataManager";
import { ISprootDB } from "@sproot/database/ISprootDB";
import { SDBOutputCondition } from "@sproot/database/SDBOutputCondition";
import { SDBSensorCondition } from "@sproot/database/SDBSensorCondition";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request 
 * @param response 
 */
export async function getAllAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  let getAllConditionsResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const type = request.params["type"] ?? "";

  const invalidFields = [];
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id.");
  }
  if (!["sensor", "output", "time"].includes(type)) {
    invalidFields.push("Invalid or missing condition type.");
  }

  if (invalidFields.length > 0) {
    getAllConditionsResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: invalidFields,
      },
      ...response.locals["defaultProperties"],
    }
    return getAllConditionsResponse;
  }

  try {
    const automation = await sprootDB.getAutomationAsync(automationId);
    if (automation.length == 0) {
      getAllConditionsResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with id ${automationId} not found`],
        },
        ...response.locals["defaultProperties"],
      };
      return getAllConditionsResponse;
    }

    const sensorConditions = await sprootDB.getSensorConditionsAsync(automationId);
    const outputConditions = await sprootDB.getOutputConditionsAsync(automationId);
    const timeConditions = await sprootDB.getTimeConditionsAsync(automationId);
    getAllConditionsResponse = {
      statusCode: 200,
      content: {
        data: { sensorConditions, outputConditions, timeConditions },
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    getAllConditionsResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return getAllConditionsResponse;
};

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function getTypeAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  let getConditionResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const type = request.params["type"] ?? "";

  const invalidFields = [];
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id.");
  }
  if (!["sensor", "output", "time"].includes(type)) {
    invalidFields.push("Invalid or missing condition type.");
  }

  if (invalidFields.length > 0) {
    getConditionResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: invalidFields,
      },
      ...response.locals["defaultProperties"],
    }
    return getConditionResponse;
  }

  try {
    const automation = await sprootDB.getAutomationAsync(automationId);
    if (automation.length == 0) {
      getConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with id ${automationId} not found`],
        },
        ...response.locals["defaultProperties"],
      };
      return getConditionResponse;
    }

    let conditions;
    switch (type) {
      case "sensor":
        conditions = await sprootDB.getSensorConditionsAsync(automationId);
        break;
      case "output":
        conditions = await sprootDB.getOutputConditionsAsync(automationId);
        break;
      case "time":
        conditions = await sprootDB.getTimeConditionsAsync(automationId);
        break;
    }

    getConditionResponse = {
      statusCode: 200,
      content: {
        data: conditions,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error: any) {
    getConditionResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return getConditionResponse;
}

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function getOneOfTypeAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  let getConditionResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const type = request.params["type"] ?? "";
  const conditionId = parseInt(request.params["conditionId"] ?? "");

  const invalidFields = [];
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id.");
  }
  if (!["sensor", "output", "time"].includes(type)) {
    invalidFields.push("Invalid or missing condition type.");
  }
  if (isNaN(conditionId)) {
    invalidFields.push("Invalid or missing condition Id.");
  }

  if (invalidFields.length > 0) {
    getConditionResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: invalidFields,
      },
      ...response.locals["defaultProperties"],
    }
    return getConditionResponse;
  }

  try {
    const automation = await sprootDB.getAutomationAsync(automationId);
    if (automation.length == 0) {
      getConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with id ${automationId} not found`],
        },
        ...response.locals["defaultProperties"],
      };
      return getConditionResponse;
    }

    let condition;
    switch (type) {
      case "sensor":
        condition = (await sprootDB.getSensorConditionsAsync(automationId)).filter((conditions) => conditions.id == conditionId);
        break;
      case "output":
        condition = (await sprootDB.getOutputConditionsAsync(automationId)).filter((conditions) => conditions.id == conditionId);
        break;
      case "time":
        condition = (await sprootDB.getTimeConditionsAsync(automationId)).filter((conditions) => conditions.id == conditionId);
        break;
    }

    if (condition && condition.length == 0) {
      getConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Condition with id ${conditionId} not found`],
        },
        ...response.locals["defaultProperties"],
      };
    } else {

      getConditionResponse = {
        statusCode: 200,
        content: {
          data: condition,
        },
        ...response.locals["defaultProperties"],
      };
    }
  } catch (error: any) {
    getConditionResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [error.message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return getConditionResponse;
}


/**
 * Possible statusCodes: 201, 400, 401, 404, 503
 * @param request 
 * @param response 
 * @returns 
 */
export async function addAsync(request: Request, response: Response): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  let addConditionResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const conditionType = request.params["type"] as "sensor" | "output" | "time";

  const invalidDetails = [];
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

  try {
    const automation = await sprootDB.getAutomationAsync(automationId);
    if (automation.length == 0) {
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

    const invalidFields = []
    let resultId: number | undefined = undefined;
    let creationResult: SensorCondition | OutputCondition | TimeCondition | undefined = undefined;

    if (!["allOf", "anyOf", "oneOf"].includes(request.body.groupType)) {
      invalidFields.push("Invalid or missing condition groupType.");
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
        resultId = await automationDataManager.addSensorConditionAsync(
          automationId,
          request.body.groupType,
          request.body.operator,
          request.body.comparisonValue,
          request.body.sensorId,
          request.body.readingType
        );
        creationResult = new SensorCondition(resultId, request.body.groupType, request.body.operator, request.body.comparisonValue, request.body.sensorId, request.body.readingType);
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
        resultId = await automationDataManager.addOutputConditionAsync(
          automationId,
          request.body.groupType,
          request.body.operator,
          request.body.comparisonValue,
          request.body.outputId,
        );
        creationResult = new OutputCondition(resultId, request.body.groupType, request.body.operator, request.body.comparisonValue, request.body.outputId);
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
        resultId = await automationDataManager.addTimeConditionAsync(
          automationId,
          request.body.groupType,
          request.body.startTime ?? null,
          request.body.endTime ?? null
        );
        creationResult = new TimeCondition(resultId, request.body.groupType, request.body.startTime ?? null, request.body.endTime ?? null);
        break;
    }

    if (!resultId) {
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
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  let updateConditionResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const conditionId = parseInt(request.params["conditionId"] ?? "");
  const conditionType = request.params["type"] as "sensor" | "output" | "time";

  const invalidDetails = [];
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

  try {

    const automation = await sprootDB.getAutomationAsync(automationId);
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

    let conditions: SDBSensorCondition[] | SDBOutputCondition[] | SDBTimeCondition[] = [];
    switch (conditionType) {
      case "sensor":
        conditions = await sprootDB.getSensorConditionsAsync(automationId);
        break;
      case "output":
        conditions = await sprootDB.getOutputConditionsAsync(automationId);
        break;
      case "time":
        conditions = await sprootDB.getTimeConditionsAsync(automationId);
        break;
    }

    const sdbcondition = conditions.find((condition) => condition.id == conditionId);
    if (!sdbcondition) {
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

    let condition: SensorCondition | OutputCondition | TimeCondition | undefined = undefined;
    let updateResult: SensorCondition | OutputCondition | TimeCondition | undefined = undefined;
    sdbcondition.groupType = request.body.groupType ?? sdbcondition.groupType;
    if (!["allOf", "anyOf", "oneOf"].includes(sdbcondition.groupType)) {
      invalidDetails.push("Invalid or missing condition groupType.");
    }
    switch (conditionType) {
      case "sensor":
        condition = new SensorCondition(sdbcondition.id, sdbcondition.groupType, sdbcondition.operator, sdbcondition.comparisonValue, sdbcondition.sensorId, sdbcondition.readingType);
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
        await automationDataManager.updateConditionAsync(automationId, condition);
        updateResult = condition;
        break;
      case "output":
        condition = new OutputCondition(sdbcondition.id, sdbcondition.groupType, sdbcondition.operator, sdbcondition.comparisonValue, sdbcondition.outputId);
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

        await automationDataManager.updateConditionAsync(automationId, condition);
        updateResult = condition;
        break;
      case "time":
        condition = new TimeCondition(sdbcondition.id, sdbcondition.groupType, sdbcondition.startTime, sdbcondition.endTime);
        if (request.body.startTime !== undefined) {
          condition.startTime = request.body.startTime;
        }
        if (request.body.endTime !== undefined) {
          condition.endTime = request.body.endTime;
        }
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
        await automationDataManager.updateConditionAsync(automationId, condition);
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
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  const automationDataManager = request.app.get("automationDataManager") as AutomationDataManager;
  let deleteConditionResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const conditionId = parseInt(request.params["conditionId"] ?? "");
  const conditionType = request.params["type"] as "sensor" | "output" | "time";

  const invalidDetails = [];
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

  const automation = await sprootDB.getAutomationAsync(automationId);
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

  let conditions: SDBSensorCondition[] | SDBOutputCondition[] | SDBTimeCondition[] = [];
  switch (conditionType) {
    case "sensor":
      conditions = await sprootDB.getSensorConditionsAsync(automationId);
      break;
    case "output":
      conditions = await sprootDB.getOutputConditionsAsync(automationId);
      break;
    case "time":
      conditions = await sprootDB.getTimeConditionsAsync(automationId);
      break;
  }

  const sdbcondition = conditions.find((condition) => condition.id == conditionId);
  if (!sdbcondition) {
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
      await automationDataManager.deleteSensorConditionAsync(conditionId);
    }
    if (conditionType === "output") {
      await automationDataManager.deleteOutputConditionAsync(conditionId);
    }
    if (conditionType === "time") {
      await automationDataManager.deleteTimeConditionAsync(conditionId);
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