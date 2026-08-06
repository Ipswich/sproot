import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { Request, Response } from "express";
import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { OutputCondition } from "../../../../automation/conditions/OutputCondition";
import { SensorCondition } from "../../../../automation/conditions/SensorCondition";
import { TimeCondition } from "../../../../automation/conditions/TimeCondition";
import { WeekdayCondition } from "../../../../automation/conditions/WeekdayCondition";
import { AutomationService } from "../../../../automation/AutomationService";
import { ISprootDB } from "../../../../database/ISprootDB";
import { SDBOutputCondition } from "@sproot/database/SDBOutputCondition";
import { SDBSensorCondition } from "@sproot/database/SDBSensorCondition";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";
import { SDBWeekdayCondition } from "@sproot/database/SDBWeekdayCondition";
import { SensorList } from "../../../../sensors/list/SensorList";
import { MonthCondition } from "../../../../automation/conditions/MonthCondition";
import { SDBMonthCondition } from "@sproot/database/SDBMonthCondition";
import { DateRangeCondition } from "../../../../automation/conditions/DateRangeCondition";
import { SDBDateRangeCondition } from "@sproot/database/SDBDateRangeCondition";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { TimeConditionPhaseAnchorType } from "@sproot/automation/ITimeCondition";

const TIME_REGEX = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
const TIME_CONDITION_PHASE_ANCHOR_TYPES: TimeConditionPhaseAnchorType[] = [
  "default",
  "epoch",
  "window",
  "clock",
  "fixed",
];

type TimeConditionConfig = {
  startTime: string | null;
  endTime: string | null;
  repeatInterval: number | null;
  repeatDuration: number | null;
  phaseAnchorType: TimeConditionPhaseAnchorType | null;
  phaseAnchorValue: string | null;
};

function validateTimeConditionConfig(config: TimeConditionConfig, invalidFields: string[]): void {
  if (config.startTime != null && !TIME_REGEX.test(config.startTime)) {
    invalidFields.push("Invalid or missing start time.");
  }
  if (config.endTime != null && !TIME_REGEX.test(config.endTime)) {
    invalidFields.push("Invalid or missing end time.");
  }
  if (config.startTime == null && config.endTime != null) {
    invalidFields.push("End time requires a start time.");
  }

  const hasRepeatInterval = config.repeatInterval != null;
  const hasRepeatDuration = config.repeatDuration != null;
  if (hasRepeatInterval !== hasRepeatDuration) {
    invalidFields.push(
      "Repeat interval and repeat duration must either both be set or both be null.",
    );
  }

  if (!hasRepeatInterval) {
    if (config.phaseAnchorType != null || config.phaseAnchorValue != null) {
      invalidFields.push("Phase anchor requires a repeat pattern.");
    }
    return;
  }

  if (!Number.isInteger(config.repeatInterval) || config.repeatInterval! <= 0) {
    invalidFields.push("Repeat interval must be a positive integer number of minutes.");
  }
  if (!Number.isInteger(config.repeatDuration) || config.repeatDuration! <= 0) {
    invalidFields.push("Repeat duration must be a positive integer number of minutes.");
  }
  if (
    config.repeatInterval != null &&
    config.repeatDuration != null &&
    config.repeatDuration >= config.repeatInterval
  ) {
    invalidFields.push("Repeat duration must be less than repeat interval.");
  }
  if (config.startTime != null && config.endTime == null) {
    invalidFields.push("Once schedules do not support repeat patterns.");
  }

  if (
    config.phaseAnchorType != null &&
    !TIME_CONDITION_PHASE_ANCHOR_TYPES.includes(config.phaseAnchorType)
  ) {
    invalidFields.push("Invalid phase anchor type.");
    return;
  }

  switch (config.phaseAnchorType) {
    case "clock":
      if (config.phaseAnchorValue == null || !TIME_REGEX.test(config.phaseAnchorValue)) {
        invalidFields.push("Clock phase anchors require an HH:MM phase anchor value.");
      }
      return;
    case "fixed":
      if (
        config.phaseAnchorValue == null ||
        Number.isNaN(new Date(config.phaseAnchorValue).getTime())
      ) {
        invalidFields.push("Fixed phase anchors require a valid absolute timestamp.");
      }
      return;
    case "window":
      if (config.startTime == null || config.endTime == null) {
        invalidFields.push("Window phase anchors require a between window.");
      }
      if (config.phaseAnchorValue != null) {
        invalidFields.push("Window phase anchors do not accept a phase anchor value.");
      }
      return;
    case "epoch":
    case "default":
    case null:
      if (config.phaseAnchorValue != null) {
        invalidFields.push("This phase anchor type does not accept a phase anchor value.");
      }
      return;
  }
}

function normalizeTimeConditionConfig(partial: Partial<TimeConditionConfig>): TimeConditionConfig {
  return {
    startTime: partial.startTime ?? null,
    endTime: partial.endTime ?? null,
    repeatInterval: partial.repeatInterval ?? null,
    repeatDuration: partial.repeatDuration ?? null,
    phaseAnchorType: partial.phaseAnchorType ?? null,
    phaseAnchorValue: partial.phaseAnchorValue ?? null,
  };
}

function getDefinedOrFallback<T>(value: T | undefined, fallback: T): T {
  return value === undefined ? fallback : value;
}

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request
 * @param response
 */
export async function getAllAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  let getAllConditionsResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");

  const invalidFields = [];
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id.");
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
    };
    return getAllConditionsResponse;
  }

  try {
    const automation = await sprootDB.automations.getByIdAsync(automationId);
    if (automation.length == 0) {
      getAllConditionsResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${automationId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return getAllConditionsResponse;
    }

    const sensorConditions = await sprootDB.automations.conditions.sensor.getAsync(automationId);
    const outputConditions = await sprootDB.automations.conditions.output.getAsync(automationId);
    const timeConditions = await sprootDB.automations.conditions.time.getAsync(automationId);
    const weekdayConditions = await sprootDB.automations.conditions.weekday.getAsync(automationId);
    const monthConditions = await sprootDB.automations.conditions.month.getAsync(automationId);
    const dateRangeConditions =
      await sprootDB.automations.conditions.dateRange.getAsync(automationId);
    getAllConditionsResponse = {
      statusCode: 200,
      content: {
        data: {
          sensor: {
            allOf: sensorConditions.filter((c) => c.groupType == "allOf"),
            anyOf: sensorConditions.filter((c) => c.groupType == "anyOf"),
            oneOf: sensorConditions.filter((c) => c.groupType == "oneOf"),
          },
          output: {
            allOf: outputConditions.filter((c) => c.groupType == "allOf"),
            anyOf: outputConditions.filter((c) => c.groupType == "anyOf"),
            oneOf: outputConditions.filter((c) => c.groupType == "oneOf"),
          },
          time: {
            allOf: timeConditions.filter((c) => c.groupType == "allOf"),
            anyOf: timeConditions.filter((c) => c.groupType == "anyOf"),
            oneOf: timeConditions.filter((c) => c.groupType == "oneOf"),
          },
          weekday: {
            allOf: weekdayConditions.filter((c) => c.groupType == "allOf"),
            anyOf: weekdayConditions.filter((c) => c.groupType == "anyOf"),
            oneOf: weekdayConditions.filter((c) => c.groupType == "oneOf"),
          },
          month: {
            allOf: monthConditions.filter((c) => c.groupType == "allOf"),
            anyOf: monthConditions.filter((c) => c.groupType == "anyOf"),
            oneOf: monthConditions.filter((c) => c.groupType == "oneOf"),
          },
          dateRange: {
            allOf: dateRangeConditions.filter((c) => c.groupType == "allOf"),
            anyOf: dateRangeConditions.filter((c) => c.groupType == "anyOf"),
            oneOf: dateRangeConditions.filter((c) => c.groupType == "oneOf"),
          },
        },
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    getAllConditionsResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [(error as Error).message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return getAllConditionsResponse;
}

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request
 * @param response
 * @returns
 */
export async function getByTypeAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  let getConditionResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const type = request.params["type"] ?? "";

  const invalidFields = [];
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id.");
  }
  if (!["sensor", "output", "time", "weekday", "month", "date-range"].includes(type)) {
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
    };
    return getConditionResponse;
  }

  try {
    const automation = await sprootDB.automations.getByIdAsync(automationId);
    if (automation.length == 0) {
      getConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${automationId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return getConditionResponse;
    }

    let conditions:
      | SDBSensorCondition[]
      | SDBOutputCondition[]
      | SDBTimeCondition[]
      | SDBWeekdayCondition[]
      | SDBMonthCondition[]
      | SDBDateRangeCondition[] = [];
    switch (type) {
      case "sensor":
        conditions = await sprootDB.automations.conditions.sensor.getAsync(automationId);
        break;
      case "output":
        conditions = await sprootDB.automations.conditions.output.getAsync(automationId);
        break;
      case "time":
        conditions = await sprootDB.automations.conditions.time.getAsync(automationId);
        break;
      case "weekday":
        conditions = await sprootDB.automations.conditions.weekday.getAsync(automationId);
        break;
      case "month":
        conditions = await sprootDB.automations.conditions.month.getAsync(automationId);
        break;
      case "date-range":
        conditions = await sprootDB.automations.conditions.dateRange.getAsync(automationId);
        break;
    }

    getConditionResponse = {
      statusCode: 200,
      content: {
        data: {
          allOf: conditions.filter((c) => c.groupType == "allOf"),
          anyOf: conditions.filter((c) => c.groupType == "anyOf"),
          oneOf: conditions.filter((c) => c.groupType == "oneOf"),
        },
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    getConditionResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [(error as Error).message],
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
export async function getOneOfByTypeAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  let getConditionResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const type = request.params["type"] ?? "";
  const conditionId = parseInt(request.params["conditionId"] ?? "");

  const invalidFields = [];
  if (isNaN(automationId)) {
    invalidFields.push("Invalid or missing automation Id.");
  }
  if (!["sensor", "output", "time", "weekday", "month", "date-range"].includes(type)) {
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
    };
    return getConditionResponse;
  }

  try {
    const automation = await sprootDB.automations.getByIdAsync(automationId);
    if (automation.length == 0) {
      getConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${automationId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
      return getConditionResponse;
    }

    let condition:
      | SDBSensorCondition[]
      | SDBOutputCondition[]
      | SDBTimeCondition[]
      | SDBWeekdayCondition[]
      | SDBMonthCondition[]
      | SDBDateRangeCondition[] = [];
    switch (type) {
      case "sensor":
        condition = (await sprootDB.automations.conditions.sensor.getAsync(automationId)).filter(
          (c) => c.id == conditionId,
        );
        break;
      case "output":
        condition = (await sprootDB.automations.conditions.output.getAsync(automationId)).filter(
          (conditions) => conditions.id == conditionId,
        );
        break;
      case "time":
        condition = (await sprootDB.automations.conditions.time.getAsync(automationId)).filter(
          (conditions) => conditions.id == conditionId,
        );
        break;
      case "weekday":
        condition = (await sprootDB.automations.conditions.weekday.getAsync(automationId)).filter(
          (conditions) => conditions.id == conditionId,
        );
        break;
      case "month":
        condition = (await sprootDB.automations.conditions.month.getAsync(automationId)).filter(
          (conditions) => conditions.id == conditionId,
        );
        break;
      case "date-range":
        condition = (await sprootDB.automations.conditions.dateRange.getAsync(automationId)).filter(
          (conditions) => conditions.id == conditionId,
        );
    }

    if (condition.length == 0) {
      getConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Condition with Id ${conditionId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };
    } else {
      getConditionResponse = {
        statusCode: 200,
        content: {
          data: condition[0],
        },
        ...response.locals["defaultProperties"],
      };
    }
  } catch (error) {
    getConditionResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [(error as Error).message],
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
export async function addAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const automationService = request.app.get(DI_KEYS.AutomationService) as AutomationService;
  let addConditionResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const conditionType = request.params["type"] as
    | "sensor"
    | "output"
    | "time"
    | "weekday"
    | "month"
    | "date-range";

  const invalidDetails = [];
  if (isNaN(automationId)) {
    invalidDetails.push("Invalid or missing automation Id.");
  }
  if (!["sensor", "output", "time", "weekday", "month", "date-range"].includes(conditionType)) {
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
    const automation = await sprootDB.automations.getByIdAsync(automationId);
    if (automation.length == 0) {
      addConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${automationId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };

      return addConditionResponse;
    }

    const invalidFields = [];
    let resultId: number | undefined = undefined;
    let creationResult:
      | SensorCondition
      | OutputCondition
      | TimeCondition
      | WeekdayCondition
      | MonthCondition
      | DateRangeCondition
      | undefined = undefined;

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
        if (request.body.comparisonLookback != null && isNaN(request.body.comparisonLookback)) {
          invalidFields.push("Invalid comparison lookback value.");
        }
        if (request.body.sensorId == null || isNaN(request.body.sensorId)) {
          invalidFields.push("Invalid or missing sensor Id.");
        } else if (
          (request.app.get(DI_KEYS.SensorList) as SensorList).sensors[request.body.sensorId] == null
        ) {
          invalidFields.push("Sensor does not exist.");
        }
        if (request.body.readingType == null) {
          invalidFields.push("Invalid or missing reading type.");
        }
        if (invalidFields.length > 0) {
          break;
        }
        resultId = await automationService.addSensorConditionAsync(
          automationId,
          request.body.groupType,
          request.body.operator,
          request.body.comparisonValue,
          request.body.comparisonLookback ?? null,
          request.body.sensorId,
          request.body.readingType,
        );
        creationResult = new SensorCondition(
          resultId,
          request.body.groupType,
          request.body.sensorId,
          request.body.readingType,
          request.body.operator,
          request.body.comparisonValue,
          request.body.comparisonLookback ?? null,
        );
        break;
      case "output":
        if (request.body.operator == null) {
          invalidFields.push("Invalid or missing operator.");
        }
        if (request.body.comparisonValue == null) {
          invalidFields.push("Invalid or missing comparison value.");
        }
        if (request.body.comparisonLookback != null && isNaN(request.body.comparisonLookback)) {
          invalidFields.push("Invalid comparison lookback value.");
        }
        if (request.body.outputId == null || isNaN(request.body.outputId)) {
          invalidFields.push("Invalid or missing output Id.");
        } else if (request.app.get(DI_KEYS.OutputList).outputs[request.body.outputId] == null) {
          invalidFields.push("Output does not exist.");
        }
        if (invalidFields.length > 0) {
          break;
        }
        resultId = await automationService.addOutputConditionAsync(
          automationId,
          request.body.groupType,
          request.body.operator,
          request.body.comparisonValue,
          request.body.comparisonLookback ?? null,
          request.body.outputId,
        );
        creationResult = new OutputCondition(
          resultId,
          request.body.groupType,
          request.body.outputId,
          request.body.operator,
          request.body.comparisonValue,
          request.body.comparisonLookback ?? null,
        );
        break;
      case "time": {
        const config = normalizeTimeConditionConfig({
          startTime: request.body.startTime,
          endTime: request.body.endTime,
          repeatInterval: request.body.repeatInterval,
          repeatDuration: request.body.repeatDuration,
          phaseAnchorType: request.body.phaseAnchorType,
          phaseAnchorValue: request.body.phaseAnchorValue,
        });
        validateTimeConditionConfig(config, invalidFields);
        if (invalidFields.length > 0) {
          break;
        }
        resultId = await automationService.addTimeConditionAsync(
          automationId,
          request.body.groupType,
          config.startTime,
          config.endTime,
          config.repeatInterval,
          config.repeatDuration,
          config.phaseAnchorType,
          config.phaseAnchorValue,
        );
        creationResult = new TimeCondition(
          resultId,
          request.body.groupType,
          config.startTime,
          config.endTime,
          config.repeatInterval,
          config.repeatDuration,
          config.phaseAnchorType,
          config.phaseAnchorValue,
        );
        break;
      }
      case "weekday":
        if (
          request.body.weekdays == null ||
          request.body.weekdays < 0 ||
          request.body.weekdays > 127
        ) {
          invalidFields.push(
            "Invalid or missing weekdays. Weekdays should be a number between 0 and 127.",
          );
        }
        if (invalidFields.length > 0) {
          break;
        }
        resultId = await automationService.addWeekdayConditionAsync(
          automationId,
          request.body.groupType,
          request.body.weekdays,
        );
        creationResult = new WeekdayCondition(
          resultId,
          request.body.groupType,
          request.body.weekdays,
        );
        break;
      case "month":
        if (request.body.months == null || request.body.months < 0 || request.body.months > 4095) {
          invalidFields.push(
            "Invalid or missing months. Months should be a number between 0 and 4095.",
          );
        }
        if (invalidFields.length > 0) {
          break;
        }
        resultId = await automationService.addMonthConditionAsync(
          automationId,
          request.body.groupType,
          request.body.months,
        );
        creationResult = new MonthCondition(resultId, request.body.groupType, request.body.months);
        break;
      case "date-range":
        if (
          request.body.startMonth == null ||
          request.body.startMonth < 1 ||
          request.body.startMonth > 12
        ) {
          invalidFields.push("Invalid or missing start month.");
        }
        if (
          request.body.startDate == null ||
          request.body.startDate < 1 ||
          ([1, 3, 5, 7, 8, 10, 12].includes(request.body.startMonth) &&
            request.body.startDate > 31) ||
          ([4, 6, 9, 11].includes(request.body.startMonth) && request.body.startDate > 30) ||
          (request.body.startMonth == 2 && request.body.startDate > 29)
        ) {
          invalidFields.push("Invalid or missing start date.");
        }
        if (
          request.body.endMonth == null ||
          request.body.endMonth < 1 ||
          request.body.endMonth > 12
        ) {
          invalidFields.push("Invalid or missing end month.");
        }
        if (
          request.body.endDate == null ||
          request.body.endDate < 1 ||
          ([1, 3, 5, 7, 8, 10, 12].includes(request.body.endMonth) && request.body.endDate > 31) ||
          ([4, 6, 9, 11].includes(request.body.endMonth) && request.body.endDate > 30) ||
          (request.body.endMonth == 2 && request.body.endDate > 29)
        ) {
          invalidFields.push("Invalid or missing end date.");
        }
        if (invalidFields.length > 0) {
          break;
        }
        resultId = await automationService.addDateRangeConditionAsync(
          automationId,
          request.body.groupType,
          request.body.startMonth,
          request.body.startDate,
          request.body.endMonth,
          request.body.endDate,
        );
        creationResult = new DateRangeCondition(
          resultId,
          request.body.groupType,
          request.body.startMonth,
          request.body.startDate,
          request.body.endMonth,
          request.body.endDate,
        );
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
        data: creationResult,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    addConditionResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [(error as Error).message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return addConditionResponse;
}

/**
 * Possible statusCodes: 200, 400, 401, 404, 503
 * @param request
 * @param response
 * @returns
 */
export async function updateAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const automationService = request.app.get(DI_KEYS.AutomationService) as AutomationService;
  let updateConditionResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const conditionId = parseInt(request.params["conditionId"] ?? "");
  const conditionType = request.params["type"] ?? "";

  const invalidDetails = [];
  if (isNaN(automationId)) {
    invalidDetails.push("Invalid or missing automation Id.");
  }
  if (!["sensor", "output", "time", "weekday", "month", "date-range"].includes(conditionType)) {
    invalidDetails.push("Invalid or missing condition type.");
  }
  if (isNaN(conditionId)) {
    invalidDetails.push("Invalid or missing condition Id.");
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
    const automation = await sprootDB.automations.getByIdAsync(automationId);
    if (automation.length == 0) {
      updateConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${automationId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };

      return updateConditionResponse;
    }

    let conditions:
      | SDBSensorCondition[]
      | SDBOutputCondition[]
      | SDBTimeCondition[]
      | SDBWeekdayCondition[]
      | SDBMonthCondition[]
      | SDBDateRangeCondition[] = [];
    switch (conditionType) {
      case "sensor":
        conditions = await sprootDB.automations.conditions.sensor.getAsync(automationId);
        break;
      case "output":
        conditions = await sprootDB.automations.conditions.output.getAsync(automationId);
        break;
      case "time":
        conditions = await sprootDB.automations.conditions.time.getAsync(automationId);
        break;
      case "weekday":
        conditions = await sprootDB.automations.conditions.weekday.getAsync(automationId);
        break;
      case "month":
        conditions = await sprootDB.automations.conditions.month.getAsync(automationId);
        break;
      case "date-range":
        conditions = await sprootDB.automations.conditions.dateRange.getAsync(automationId);
        break;
    }

    const sdbcondition = conditions.find((c) => c.id == conditionId);
    if (!sdbcondition) {
      updateConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [
            `${conditionType.charAt(0).toUpperCase() + conditionType.slice(1)} condition with Id ${conditionId} not found.`,
          ],
        },
        ...response.locals["defaultProperties"],
      };

      return updateConditionResponse;
    }

    let condition:
      | SensorCondition
      | OutputCondition
      | TimeCondition
      | WeekdayCondition
      | MonthCondition
      | DateRangeCondition
      | undefined = undefined;
    let updateResult:
      | SensorCondition
      | OutputCondition
      | TimeCondition
      | WeekdayCondition
      | MonthCondition
      | DateRangeCondition
      | undefined = undefined;
    sdbcondition.groupType = request.body.groupType ?? sdbcondition.groupType;
    if (!["allOf", "anyOf", "oneOf"].includes(sdbcondition.groupType)) {
      invalidDetails.push("Invalid or missing condition groupType.");
    }
    switch (conditionType) {
      case "sensor": {
        const sdbSensorCondition = sdbcondition as SDBSensorCondition;
        condition = new SensorCondition(
          sdbSensorCondition.id,
          sdbSensorCondition.groupType,
          request.body.sensorId ?? sdbSensorCondition.sensorId,
          request.body.readingType ?? sdbSensorCondition.readingType,
          request.body.operator ?? sdbSensorCondition.operator,
          request.body.comparisonValue ?? sdbSensorCondition.comparisonValue,
          request.body.comparisonLookback ?? sdbSensorCondition.comparisonLookback,
        );
        if (
          !["equal", "notEqual", "greater", "less", "greaterOrEqual", "lessOrEqual"].includes(
            condition.operator,
          )
        ) {
          invalidDetails.push("Invalid operator.");
        }
        if (isNaN(condition.comparisonValue)) {
          invalidDetails.push("Invalid comparison value.");
        }
        if (condition.comparisonLookback != null && isNaN(condition.comparisonLookback)) {
          invalidDetails.push("Invalid comparison lookback value.");
        }
        if (isNaN(condition.sensorId)) {
          invalidDetails.push("Invalid sensor Id.");
        } else if (
          (request.app.get(DI_KEYS.SensorList) as SensorList).sensors[condition.sensorId] == null
        ) {
          invalidDetails.push("Sensor does not exist.");
        }
        if (!Object.keys(ReadingType).includes(condition.readingType)) {
          invalidDetails.push("Invalid reading type.");
        }
        if (invalidDetails.length > 0) {
          break;
        }
        await automationService.updateConditionAsync(automationId, condition);
        updateResult = condition;
        break;
      }
      case "output": {
        const sdbOutputCondition = sdbcondition as SDBOutputCondition;
        condition = new OutputCondition(
          sdbOutputCondition.id,
          sdbOutputCondition.groupType,
          request.body.outputId ?? sdbOutputCondition.outputId,
          request.body.operator ?? sdbOutputCondition.operator,
          request.body.comparisonValue ?? sdbOutputCondition.comparisonValue,
          request.body.comparisonLookback ?? sdbOutputCondition.comparisonLookback,
        );
        if (
          !["equal", "notEqual", "greater", "less", "greaterOrEqual", "lessOrEqual"].includes(
            condition.operator,
          )
        ) {
          invalidDetails.push("Invalid operator.");
        }
        if (isNaN(condition.comparisonValue)) {
          invalidDetails.push("Invalid comparison value.");
        }
        if (condition.comparisonLookback != null && isNaN(condition.comparisonLookback)) {
          invalidDetails.push("Invalid comparison lookback value.");
        }
        if (isNaN(condition.outputId)) {
          invalidDetails.push("Invalid output Id.");
        } else if (request.app.get(DI_KEYS.OutputList).outputs[condition.outputId] == null) {
          invalidDetails.push("Output does not exist.");
        }
        if (invalidDetails.length > 0) {
          break;
        }

        await automationService.updateConditionAsync(automationId, condition);
        updateResult = condition;
        break;
      }
      case "time": {
        const sdbTimeCondition = sdbcondition as SDBTimeCondition;
        const config = normalizeTimeConditionConfig({
          startTime: getDefinedOrFallback(request.body.startTime, sdbTimeCondition.startTime),
          endTime: getDefinedOrFallback(request.body.endTime, sdbTimeCondition.endTime),
          repeatInterval: getDefinedOrFallback(
            request.body.repeatInterval,
            sdbTimeCondition.repeatInterval,
          ),
          repeatDuration: getDefinedOrFallback(
            request.body.repeatDuration,
            sdbTimeCondition.repeatDuration,
          ),
          phaseAnchorType: getDefinedOrFallback(
            request.body.phaseAnchorType,
            sdbTimeCondition.phaseAnchorType,
          ),
          phaseAnchorValue: getDefinedOrFallback(
            request.body.phaseAnchorValue,
            sdbTimeCondition.phaseAnchorValue,
          ),
        });

        condition = new TimeCondition(
          sdbTimeCondition.id,
          sdbTimeCondition.groupType,
          config.startTime,
          config.endTime,
          config.repeatInterval,
          config.repeatDuration,
          config.phaseAnchorType,
          config.phaseAnchorValue,
        );
        validateTimeConditionConfig(config, invalidDetails);
        if (invalidDetails.length > 0) {
          break;
        }
        await automationService.updateConditionAsync(automationId, condition);
        updateResult = condition;
        break;
      }
      case "weekday": {
        const sdbWeekdayCondition = sdbcondition as SDBWeekdayCondition;

        condition = new WeekdayCondition(
          sdbWeekdayCondition.id,
          sdbWeekdayCondition.groupType,
          request.body.weekdays ?? sdbWeekdayCondition.weekdays,
        );
        if (
          request.body.weekdays === null ||
          request.body.weekdays < 0 ||
          request.body.weekdays > 127
        ) {
          invalidDetails.push("Invalid weekdays value.");
        }
        if (invalidDetails.length > 0) {
          break;
        }
        await automationService.updateConditionAsync(automationId, condition);
        updateResult = condition;
        break;
      }
      case "month": {
        const sdbMonthCondition = sdbcondition as SDBMonthCondition;

        condition = new MonthCondition(
          sdbMonthCondition.id,
          sdbMonthCondition.groupType,
          request.body.months ?? sdbMonthCondition.months,
        );
        if (request.body.months === null || request.body.months < 0 || request.body.months > 4095) {
          invalidDetails.push("Invalid months value.");
        }
        if (invalidDetails.length > 0) {
          break;
        }
        await automationService.updateConditionAsync(automationId, condition);
        updateResult = condition;
        break;
      }
      case "date-range": {
        const sdbDateRangeCondition = sdbcondition as SDBDateRangeCondition;

        condition = new DateRangeCondition(
          sdbDateRangeCondition.id,
          sdbDateRangeCondition.groupType,
          request.body.startMonth ?? sdbDateRangeCondition.startMonth,
          request.body.startDate ?? sdbDateRangeCondition.startDate,
          request.body.endMonth ?? sdbDateRangeCondition.endMonth,
          request.body.endDate ?? sdbDateRangeCondition.endDate,
        );
        if (
          request.body.startMonth === null ||
          request.body.startMonth < 1 ||
          request.body.startMonth > 12
        ) {
          invalidDetails.push("Invalid start month.");
        }
        if (
          request.body.startDate === null ||
          request.body.startDate < 1 ||
          ([1, 3, 5, 7, 8, 10, 12].includes(request.body.startMonth) &&
            request.body.startDate > 31) ||
          ([4, 6, 9, 11].includes(request.body.startMonth) && request.body.startDate > 30) ||
          (request.body.startMonth == 2 && request.body.startDate > 29)
        ) {
          invalidDetails.push("Invalid start date.");
        }
        if (
          request.body.endMonth === null ||
          request.body.endMonth < 1 ||
          request.body.endMonth > 12
        ) {
          invalidDetails.push("Invalid end month.");
        }
        if (
          request.body.endDate === null ||
          request.body.endDate < 1 ||
          ([1, 3, 5, 7, 8, 10, 12].includes(request.body.endMonth) && request.body.endDate > 31) ||
          ([4, 6, 9, 11].includes(request.body.endMonth) && request.body.endDate > 30) ||
          (request.body.endMonth == 2 && request.body.endDate > 29)
        ) {
          invalidDetails.push("Invalid end date.");
        }
        if (invalidDetails.length > 0) {
          break;
        }
        await automationService.updateConditionAsync(automationId, condition);
        updateResult = condition;
        break;
      }
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
        data: updateResult,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    updateConditionResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [(error as Error).message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return updateConditionResponse;
}

/**
 * PossibleStatusCodes 200, 400, 401, 404, 503
 * @param request
 * @param response
 * @returns
 */
export async function deleteAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  const automationService = request.app.get(DI_KEYS.AutomationService) as AutomationService;
  let deleteConditionResponse: SuccessResponse | ErrorResponse;

  const automationId = parseInt(request.params["automationId"] ?? "");
  const conditionId = parseInt(request.params["conditionId"] ?? "");
  const conditionType = request.params["type"] as
    | "sensor"
    | "output"
    | "time"
    | "weekday"
    | "month"
    | "date-range";

  const invalidDetails = [];
  if (isNaN(automationId)) {
    invalidDetails.push("Invalid or missing automation Id.");
  }
  if (!["sensor", "output", "time", "weekday", "month", "date-range"].includes(conditionType)) {
    invalidDetails.push("Invalid or missing condition type.");
  }
  if (isNaN(conditionId)) {
    invalidDetails.push("Invalid or missing condition Id.");
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

  try {
    const automation = await sprootDB.automations.getByIdAsync(automationId);
    if (automation.length == 0) {
      deleteConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [`Automation with Id ${automationId} not found.`],
        },
        ...response.locals["defaultProperties"],
      };

      return deleteConditionResponse;
    }

    let conditions:
      | SDBSensorCondition[]
      | SDBOutputCondition[]
      | SDBTimeCondition[]
      | SDBWeekdayCondition[]
      | SDBMonthCondition[]
      | SDBDateRangeCondition[] = [];
    switch (conditionType) {
      case "sensor":
        conditions = await sprootDB.automations.conditions.sensor.getAsync(automationId);
        break;
      case "output":
        conditions = await sprootDB.automations.conditions.output.getAsync(automationId);
        break;
      case "time":
        conditions = await sprootDB.automations.conditions.time.getAsync(automationId);
        break;
      case "weekday":
        conditions = await sprootDB.automations.conditions.weekday.getAsync(automationId);
        break;
      case "month":
        conditions = await sprootDB.automations.conditions.month.getAsync(automationId);
        break;
      case "date-range":
        conditions = await sprootDB.automations.conditions.dateRange.getAsync(automationId);
        break;
    }

    const sdbcondition = conditions.find((c) => c.id == conditionId);
    if (!sdbcondition) {
      deleteConditionResponse = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: request.originalUrl,
          details: [
            `${conditionType.charAt(0).toUpperCase() + conditionType.slice(1)} condition with Id ${conditionId} not found.`,
          ],
        },
        ...response.locals["defaultProperties"],
      };

      return deleteConditionResponse;
    }

    if (conditionType === "sensor") {
      await automationService.deleteSensorConditionAsync(conditionId);
    }
    if (conditionType === "output") {
      await automationService.deleteOutputConditionAsync(conditionId);
    }
    if (conditionType === "time") {
      await automationService.deleteTimeConditionAsync(conditionId);
    }
    if (conditionType === "weekday") {
      await automationService.deleteWeekdayConditionAsync(conditionId);
    }
    if (conditionType === "month") {
      await automationService.deleteMonthConditionAsync(conditionId);
    }
    if (conditionType === "date-range") {
      await automationService.deleteDateRangeConditionAsync(conditionId);
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
  } catch (error) {
    deleteConditionResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: [(error as Error).message],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return deleteConditionResponse;
}
