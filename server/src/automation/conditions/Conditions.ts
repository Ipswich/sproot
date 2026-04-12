import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { AutomationOperator } from "@sproot/automation/IAutomation";
import { ConditionOperator } from "@sproot/automation/ConditionTypes";
import { OutputList } from "../../outputs/list/OutputList";
import { SensorList } from "../../sensors/list/SensorList";
import { ReadingType } from "@sproot/sensors/ReadingType";

import { OutputCondition } from "./OutputCondition";
import { SensorCondition } from "./SensorCondition";
import { TimeCondition } from "./TimeCondition";
import { WeekdayCondition } from "./WeekdayCondition";
import { DateRangeCondition } from "./DateRangeCondition";
import { MonthCondition } from "./MonthCondition";

type EnabledConditionTypes =
  | SensorCondition
  | OutputCondition
  | TimeCondition
  | WeekdayCondition
  | MonthCondition
  | DateRangeCondition;

export type IConditionProperties =
  | {
      kind: "sensor";
      id: number;
      sensorId: number;
      readingType: ReadingType;
      operator: ConditionOperator;
      comparisonValue: number;
      comparisonLookback: number | null;
    }
  | {
      kind: "output";
      id: number;
      outputId: number;
      operator: ConditionOperator;
      comparisonValue: number;
      comparisonLookback: number | null;
    }
  | {
      kind: "time";
      id: number;
      startTime?: string | null | undefined;
      endTime?: string | null | undefined;
    }
  | {
      kind: "weekday";
      id: number;
      weekdays: number;
    }
  | {
      kind: "month";
      id: number;
      months: number;
    }
  | {
      kind: "dateRange";
      id: number;
      startMonth: number;
      startDate: number;
      endMonth: number;
      endDate: number;
    };

export class Conditions {
  #automationId: number;
  #sensorConditions: Record<string, SensorCondition>;
  #outputConditions: Record<string, OutputCondition>;
  #timeConditions: Record<string, TimeCondition>;
  #weekdayConditions: Record<string, WeekdayCondition>;
  #monthConditions: Record<string, MonthCondition>;
  #dateRangeConditions: Record<string, DateRangeCondition>;
  #sprootDB: ISprootDB;

  constructor(automationId: number, sprootDB: ISprootDB) {
    this.#automationId = automationId;
    this.#sensorConditions = {};
    this.#outputConditions = {};
    this.#timeConditions = {};
    this.#weekdayConditions = {};
    this.#monthConditions = {};
    this.#dateRangeConditions = {};
    this.#sprootDB = sprootDB;
  }

  get groupedConditions(): {
    sensor: { allOf: SensorCondition[]; anyOf: SensorCondition[]; oneOf: SensorCondition[] };
    output: { allOf: OutputCondition[]; anyOf: OutputCondition[]; oneOf: OutputCondition[] };
    time: { allOf: TimeCondition[]; anyOf: TimeCondition[]; oneOf: TimeCondition[] };
    weekday: { allOf: WeekdayCondition[]; anyOf: WeekdayCondition[]; oneOf: WeekdayCondition[] };
    month: { allOf: MonthCondition[]; anyOf: MonthCondition[]; oneOf: MonthCondition[] };
    dateRange: {
      allOf: DateRangeCondition[];
      anyOf: DateRangeCondition[];
      oneOf: DateRangeCondition[];
    };
  } {
    return {
      sensor: {
        allOf: [...Object.values(this.#sensorConditions)].filter((c) => c.groupType == "allOf"),
        anyOf: [...Object.values(this.#sensorConditions)].filter((c) => c.groupType == "anyOf"),
        oneOf: [...Object.values(this.#sensorConditions)].filter((c) => c.groupType == "oneOf"),
      },
      output: {
        allOf: [...Object.values(this.#outputConditions)].filter((c) => c.groupType == "allOf"),
        anyOf: [...Object.values(this.#outputConditions)].filter((c) => c.groupType == "anyOf"),
        oneOf: [...Object.values(this.#outputConditions)].filter((c) => c.groupType == "oneOf"),
      },
      time: {
        allOf: [...Object.values(this.#timeConditions)].filter((c) => c.groupType == "allOf"),
        anyOf: [...Object.values(this.#timeConditions)].filter((c) => c.groupType == "anyOf"),
        oneOf: [...Object.values(this.#timeConditions)].filter((c) => c.groupType == "oneOf"),
      },
      weekday: {
        allOf: [...Object.values(this.#weekdayConditions)].filter((c) => c.groupType == "allOf"),
        anyOf: [...Object.values(this.#weekdayConditions)].filter((c) => c.groupType == "anyOf"),
        oneOf: [...Object.values(this.#weekdayConditions)].filter((c) => c.groupType == "oneOf"),
      },
      month: {
        allOf: [...Object.values(this.#monthConditions)].filter((c) => c.groupType == "allOf"),
        anyOf: [...Object.values(this.#monthConditions)].filter((c) => c.groupType == "anyOf"),
        oneOf: [...Object.values(this.#monthConditions)].filter((c) => c.groupType == "oneOf"),
      },
      dateRange: {
        allOf: [...Object.values(this.#dateRangeConditions)].filter((c) => c.groupType == "allOf"),
        anyOf: [...Object.values(this.#dateRangeConditions)].filter((c) => c.groupType == "anyOf"),
        oneOf: [...Object.values(this.#dateRangeConditions)].filter((c) => c.groupType == "oneOf"),
      },
    };
  }

  get allOf(): EnabledConditionTypes[] {
    return [
      ...Object.values(this.#sensorConditions),
      ...Object.values(this.#outputConditions),
      ...Object.values(this.#timeConditions),
      ...Object.values(this.#weekdayConditions),
      ...Object.values(this.#monthConditions),
      ...Object.values(this.#dateRangeConditions),
    ].filter((c) => c.groupType == "allOf");
  }

  get anyOf(): EnabledConditionTypes[] {
    return [
      ...Object.values(this.#sensorConditions),
      ...Object.values(this.#outputConditions),
      ...Object.values(this.#timeConditions),
      ...Object.values(this.#weekdayConditions),
      ...Object.values(this.#monthConditions),
      ...Object.values(this.#dateRangeConditions),
    ].filter((c) => c.groupType == "anyOf");
  }

  get oneOf(): EnabledConditionTypes[] {
    return [
      ...Object.values(this.#sensorConditions),
      ...Object.values(this.#outputConditions),
      ...Object.values(this.#timeConditions),
      ...Object.values(this.#weekdayConditions),
      ...Object.values(this.#monthConditions),
      ...Object.values(this.#dateRangeConditions),
    ].filter((c) => c.groupType == "oneOf");
  }

  evaluate(
    operator: AutomationOperator,
    sensorList: SensorList,
    outputList: OutputList,
    now: Date,
  ): {
    result: boolean;
    conditions: {
      allOf: { condition: IConditionProperties; result: boolean }[];
      anyOf: { condition: IConditionProperties; result: boolean }[];
      oneOf: { condition: IConditionProperties; result: boolean }[];
    };
  } {
    const evaluateByConditionFlavor = (condition: EnabledConditionTypes): boolean => {
      if (condition instanceof SensorCondition) {
        return condition.evaluate(sensorList, now);
      }
      if (condition instanceof OutputCondition) {
        return condition.evaluate(outputList, now);
      }
      if (condition instanceof TimeCondition) {
        return condition.evaluate(now);
      }
      if (condition instanceof WeekdayCondition) {
        return condition.evaluate(now);
      }
      if (condition instanceof MonthCondition) {
        return condition.evaluate(now);
      }
      if (condition instanceof DateRangeCondition) {
        return condition.evaluate(now);
      }
      return false;
    };

    // If no conditions, false.
    if (this.allOf.length == 0 && this.anyOf.length == 0 && this.oneOf.length == 0) {
      return {
        result: false,
        conditions: { allOf: [], anyOf: [], oneOf: [] },
      };
    }

    // Things get weird if any of the lists are empty. If we default to returning true and
    // the conditionOperator is "or", it'll always result in true (even if one of the condition
    // types is false). Conversely, if we default to returning false and the conditionOperator
    // is "false", it'll always result in false (even if one of the condition types is true).
    // Basically, we need to "ignore" empty condition types.
    const defaultReturnValue = operator == "and";

    const allOfEvaluationMap = this.allOf
      .map((c) => ({
        condition: this.conditionToProperties(c),
        result: evaluateByConditionFlavor(c),
      }))
      .filter((r) => r.condition != null) as { condition: IConditionProperties; result: boolean }[];
    const allOfResult =
      allOfEvaluationMap.length == 0
        ? defaultReturnValue
        : allOfEvaluationMap.every((e) => e.result);

    const anyOfEvaluationMap = this.anyOf
      .map((c) => ({
        condition: this.conditionToProperties(c),
        result: evaluateByConditionFlavor(c),
      }))
      .filter((r) => r.condition != null) as { condition: IConditionProperties; result: boolean }[];
    const anyOfResult =
      anyOfEvaluationMap.length == 0
        ? defaultReturnValue
        : anyOfEvaluationMap.some((e) => e.result);

    const oneOfEvaluationMap = this.oneOf
      .map((c) => ({
        condition: this.conditionToProperties(c),
        result: evaluateByConditionFlavor(c),
      }))
      .filter((r) => r.condition != null) as { condition: IConditionProperties; result: boolean }[];
    const oneOfResult =
      oneOfEvaluationMap.length == 0
        ? defaultReturnValue
        : oneOfEvaluationMap.filter((e) => e.result).length == 1;

    const result =
      operator == "and"
        ? allOfResult && anyOfResult && oneOfResult
        : allOfResult || anyOfResult || oneOfResult;

    return {
      result,
      conditions: {
        allOf: allOfEvaluationMap,
        anyOf: anyOfEvaluationMap,
        oneOf: oneOfEvaluationMap,
      },
    };
  }

  conditionToProperties(condition: EnabledConditionTypes): IConditionProperties | null {
    if (condition instanceof SensorCondition) {
      return {
        kind: "sensor",
        id: condition.id,
        sensorId: condition.sensorId,
        readingType: condition.readingType,
        operator: condition.operator,
        comparisonValue: condition.comparisonValue,
        comparisonLookback: condition.comparisonLookback,
      };
    }
    if (condition instanceof OutputCondition) {
      return {
        kind: "output",
        id: condition.id,
        outputId: condition.outputId,
        operator: condition.operator,
        comparisonValue: condition.comparisonValue,
        comparisonLookback: condition.comparisonLookback,
      };
    }
    if (condition instanceof TimeCondition) {
      return {
        kind: "time",
        id: condition.id,
        startTime: condition.startTime ?? undefined,
        endTime: condition.endTime ?? undefined,
      };
    }
    if (condition instanceof WeekdayCondition) {
      return {
        kind: "weekday",
        id: condition.id,
        weekdays: condition.weekdays,
      };
    }
    if (condition instanceof MonthCondition) {
      return {
        kind: "month",
        id: condition.id,
        months: condition.months,
      };
    }
    if (condition instanceof DateRangeCondition) {
      return {
        kind: "dateRange",
        id: condition.id,
        startMonth: condition.startMonth,
        startDate: condition.startDate,
        endMonth: condition.endMonth,
        endDate: condition.endDate,
      };
    }
    // This should never happen
    return null;
  }

  async loadAsync(): Promise<void> {
    //Clear any old ones out
    this.#sensorConditions = {};
    this.#outputConditions = {};
    this.#timeConditions = {};
    this.#weekdayConditions = {};
    this.#monthConditions = {};
    this.#dateRangeConditions = {};

    const promises = [];
    promises.push(
      this.#sprootDB.getSensorConditionsAsync(this.#automationId).then((sensorConditions) => {
        sensorConditions.map((sensorCondition) => {
          this.#sensorConditions[sensorCondition.id] = new SensorCondition(
            sensorCondition.id,
            sensorCondition.groupType,
            sensorCondition.sensorId,
            sensorCondition.readingType,
            sensorCondition.operator,
            sensorCondition.comparisonValue,
            sensorCondition.comparisonLookback,
          );
        });
      }),
    );
    promises.push(
      this.#sprootDB.getOutputConditionsAsync(this.#automationId).then((outputConditions) => {
        outputConditions.map((outputCondition) => {
          this.#outputConditions[outputCondition.id] = new OutputCondition(
            outputCondition.id,
            outputCondition.groupType,
            outputCondition.outputId,
            outputCondition.operator,
            outputCondition.comparisonValue,
            outputCondition.comparisonLookback,
          );
        });
      }),
    );
    promises.push(
      this.#sprootDB.getTimeConditionsAsync(this.#automationId).then((timeConditions) => {
        timeConditions.map((timeCondition) => {
          this.#timeConditions[timeCondition.id] = new TimeCondition(
            timeCondition.id,
            timeCondition.groupType,
            timeCondition.startTime,
            timeCondition.endTime,
          );
        });
      }),
    );
    promises.push(
      this.#sprootDB.getWeekdayConditionsAsync(this.#automationId).then((weekdayConditions) => {
        weekdayConditions.map((weekdayCondition) => {
          this.#weekdayConditions[weekdayCondition.id] = new WeekdayCondition(
            weekdayCondition.id,
            weekdayCondition.groupType,
            weekdayCondition.weekdays,
          );
        });
      }),
    );
    promises.push(
      this.#sprootDB.getMonthConditionsAsync(this.#automationId).then((monthConditions) => {
        monthConditions.map((monthCondition) => {
          this.#monthConditions[monthCondition.id] = new MonthCondition(
            monthCondition.id,
            monthCondition.groupType,
            monthCondition.months,
          );
        });
      }),
    );
    promises.push(
      this.#sprootDB.getDateRangeConditionsAsync(this.#automationId).then((dateRangeConditions) => {
        dateRangeConditions.map((dateRangeCondition) => {
          this.#dateRangeConditions[dateRangeCondition.id] = new DateRangeCondition(
            dateRangeCondition.id,
            dateRangeCondition.groupType,
            dateRangeCondition.startMonth,
            dateRangeCondition.startDate,
            dateRangeCondition.endMonth,
            dateRangeCondition.endDate,
          );
        });
      }),
    );

    await Promise.all(promises);
  }
}
