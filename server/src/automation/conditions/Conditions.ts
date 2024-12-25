import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { AutomationOperator } from "@sproot/automation/IAutomation";
import { OutputList } from "../../outputs/list/OutputList";
import { SensorList } from "../../sensors/list/SensorList";

import { OutputCondition } from "./OutputCondition";
import { SensorCondition } from "./SensorCondition";
import { TimeCondition } from "./TimeCondition";
import { WeekdayCondition } from "./WeekdayCondition";

type EnabledConditionTypes = SensorCondition | OutputCondition | TimeCondition | WeekdayCondition;

export class Conditions {
  #automationId: number;
  #sensorConditions: Record<string, SensorCondition>;
  #outputConditions: Record<string, OutputCondition>;
  #timeConditions: Record<string, TimeCondition>;
  #weekdayConditions: Record<string, WeekdayCondition>;
  #sprootDB: ISprootDB;

  constructor(automationId: number, sprootDB: ISprootDB) {
    this.#automationId = automationId;
    this.#sensorConditions = {};
    this.#outputConditions = {};
    this.#timeConditions = {};
    this.#weekdayConditions = {};
    this.#sprootDB = sprootDB;
  }

  get groupedConditions(): {
    sensor: { allOf: SensorCondition[]; anyOf: SensorCondition[]; oneOf: SensorCondition[] };
    output: { allOf: OutputCondition[]; anyOf: OutputCondition[]; oneOf: OutputCondition[] };
    time: { allOf: TimeCondition[]; anyOf: TimeCondition[]; oneOf: TimeCondition[] };
    weekday: { allOf: WeekdayCondition[]; anyOf: WeekdayCondition[]; oneOf: WeekdayCondition[] };
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
    };
  }

  get allOf(): EnabledConditionTypes[] {
    return [
      ...Object.values(this.#sensorConditions),
      ...Object.values(this.#outputConditions),
      ...Object.values(this.#timeConditions),
      ...Object.values(this.#weekdayConditions),
    ].filter((c) => c.groupType == "allOf");
  }

  get anyOf(): EnabledConditionTypes[] {
    return [
      ...Object.values(this.#sensorConditions),
      ...Object.values(this.#outputConditions),
      ...Object.values(this.#timeConditions),
      ...Object.values(this.#weekdayConditions),
    ].filter((c) => c.groupType == "anyOf");
  }

  get oneOf(): EnabledConditionTypes[] {
    return [
      ...Object.values(this.#sensorConditions),
      ...Object.values(this.#outputConditions),
      ...Object.values(this.#timeConditions),
      ...Object.values(this.#weekdayConditions),
    ].filter((c) => c.groupType == "oneOf");
  }

  evaluate(
    operator: AutomationOperator,
    sensorList: SensorList,
    outputList: OutputList,
    now: Date,
  ): boolean {
    const evaluateByConditionFlavor = (condition: EnabledConditionTypes) => {
      if (condition instanceof SensorCondition) {
        return condition.evaluate(sensorList);
      }
      if (condition instanceof OutputCondition) {
        return condition.evaluate(outputList);
      }
      if (condition instanceof TimeCondition) {
        return condition.evaluate(now);
      }
      if (condition instanceof WeekdayCondition) {
        return condition.evaluate(now);
      }
    };

    // If no conditions, false.
    if (
      Object.keys(this.allOf).length == 0 &&
      Object.keys(this.anyOf).length == 0 &&
      Object.keys(this.oneOf).length == 0
    ) {
      return false;
    }

    // Things get weird if any of the lists are empty. If we default to returning true and
    // the conditionOperator is "or", it'll always result in true (even if one of the condition
    // types is false). Conversely, if we default to returning false and the conditionOperator
    // is "false", it'll always result in false (even if one of the condition types is true).
    // Basically, we need to "ignore" empty condition types.
    const defaultReturnValue = operator == "and";

    const allOfEvaluationMap = this.allOf.map((c) => evaluateByConditionFlavor(c));
    const allOfResult =
      allOfEvaluationMap.length == 0
        ? defaultReturnValue
        : allOfEvaluationMap.every((c) => c == true);

    const anyOfEvaluationMap = this.anyOf.map((c) => evaluateByConditionFlavor(c));
    const anyOfResult =
      anyOfEvaluationMap.length == 0
        ? defaultReturnValue
        : anyOfEvaluationMap.some((c) => c == true);

    const oneOfEvaluationMap = this.oneOf.map((c) => evaluateByConditionFlavor(c));
    const oneOfResult =
      oneOfEvaluationMap.length == 0
        ? defaultReturnValue
        : oneOfEvaluationMap.filter((c) => c == true).length == 1;

    switch (operator) {
      case "and":
        return allOfResult && anyOfResult && oneOfResult;
      case "or":
        return allOfResult || anyOfResult || oneOfResult;
    }
  }

  async loadAsync(): Promise<void> {
    //Clear any old ones out
    this.#sensorConditions = {};
    this.#outputConditions = {};
    this.#timeConditions = {};
    this.#weekdayConditions = {};

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

    await Promise.all(promises);
  }
}
