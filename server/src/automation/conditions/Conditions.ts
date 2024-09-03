import { ISprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import { AutomationOperator } from "@sproot/automation/IAutomation";
import { OutputList } from "../../outputs/list/OutputList";
import { SensorList } from "../../sensors/list/SensorList";

import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ICondition";
import { OutputCondition } from "./outputs/OutputCondition";
import { SensorCondition } from "./sensors/SensorCondition";
import { TimeCondition } from "./time/TimeCondition";
import { ReadingType } from "@sproot/sensors/ReadingType";

export class Conditions {
  #automationId: number;
  #sensorConditions: Record<string, SensorCondition>;
  #outputConditions: Record<string, OutputCondition>;
  #timeConditions: Record<string, TimeCondition>;
  #sprootDB: ISprootDB;

  constructor(
    automationId: number,
    sprootDB: ISprootDB,
  ) {
    this.#automationId = automationId;
    this.#sensorConditions = {};
    this.#outputConditions = {};
    this.#timeConditions = {};
    this.#sprootDB = sprootDB;
  }

  get groupedConditions(): {
    sensor: { allOf: SensorCondition[], anyOf: SensorCondition[], oneOf: SensorCondition[] },
    output: { allOf: OutputCondition[], anyOf: OutputCondition[], oneOf: OutputCondition[] },
    time: { allOf: TimeCondition[], anyOf: TimeCondition[], oneOf: TimeCondition[] }
  } {
    return {
      sensor: {
        allOf: [...Object.values(this.#sensorConditions)].filter((c) => c.type == "allOf"),
        anyOf: [...Object.values(this.#sensorConditions)].filter((c) => c.type == "anyOf"),
        oneOf: [...Object.values(this.#sensorConditions)].filter((c) => c.type == "oneOf")
      },
      output: {
        allOf: [...Object.values(this.#outputConditions)].filter((c) => c.type == "allOf"),
        anyOf: [...Object.values(this.#outputConditions)].filter((c) => c.type == "anyOf"),
        oneOf: [...Object.values(this.#outputConditions)].filter((c) => c.type == "oneOf")
      },
      time: {
        allOf: [...Object.values(this.#timeConditions)].filter((c) => c.type == "allOf"),
        anyOf: [...Object.values(this.#timeConditions)].filter((c) => c.type == "anyOf"),
        oneOf: [...Object.values(this.#timeConditions)].filter((c) => c.type == "oneOf")
      }
    };
  }

  get allOf(): (SensorCondition | OutputCondition | TimeCondition)[] {
    return [...Object.values(this.#sensorConditions), ...Object.values(this.#outputConditions), ...Object.values(this.#timeConditions)].filter((c) => c.type == "allOf");
  }

  get anyOf(): (SensorCondition | OutputCondition | TimeCondition)[] {
    return [...Object.values(this.#sensorConditions), ...Object.values(this.#outputConditions), ...Object.values(this.#timeConditions)].filter((c) => c.type == "anyOf");
  }

  get oneOf(): (SensorCondition | OutputCondition | TimeCondition)[] {
    return [...Object.values(this.#sensorConditions), ...Object.values(this.#outputConditions), ...Object.values(this.#timeConditions)].filter((c) => c.type == "oneOf");
  }

  evaluate(operator: AutomationOperator, sensorList: SensorList, outputList: OutputList, now: Date = new Date()): boolean {
    const evaluateByConditionFlavor = (condition: SensorCondition | OutputCondition | TimeCondition) => {
      if (condition instanceof OutputCondition) {
        return condition.evaluate(outputList);
      }
      if (condition instanceof SensorCondition) {
        return condition.evaluate(sensorList);
      }
      if (condition instanceof TimeCondition) {
        return condition.evaluate(now);
      }
    }
    const groupedConditions = [...Object.values(this.#sensorConditions), ...Object.values(this.#outputConditions), ...Object.values(this.#timeConditions)];
    const allOfConditions = groupedConditions.filter((c) => c.type == "allOf");
    const anyOfConditions = groupedConditions.filter((c) => c.type == "anyOf");
    const oneOfConditions = groupedConditions.filter((c) => c.type == "oneOf");

    // If no conditions, false.
    if (Object.keys(allOfConditions).length == 0 && Object.keys(anyOfConditions).length == 0 && Object.keys(oneOfConditions).length == 0) {
      return false;
    }

    // Things get weird if any of the lists are empty. If we default to returning true and
    // the conditionOperator is "or", it'll always result in true (even if one of the condition
    // types is false). Conversely, if we default to returning false and the conditionOperator
    // is "false", it'll always result in false (even if one of the condition types is true).
    // Basically, we need to "ignore" empty condition types.
    let defaultReturnValue = operator == "and";

    const allOfEvaluationMap = allOfConditions.map((c) => evaluateByConditionFlavor(c));
    const allOfResult =
      allOfEvaluationMap.length == 0
        ? defaultReturnValue
        : allOfEvaluationMap.every((c) => c == true);

    const anyOfEvaluationMap = anyOfConditions.map((c) => evaluateByConditionFlavor(c));
    const anyOfResult =
      anyOfEvaluationMap.length == 0
        ? defaultReturnValue
        : anyOfEvaluationMap.some((c) => c == true);

    const oneOfEvaluationMap = oneOfConditions.map((c) => evaluateByConditionFlavor(c));
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
  async addSensorConditionAsync(type: ConditionGroupType, operator: ConditionOperator, comparisonValue: number, sensorId: number, readingType: ReadingType): Promise<void> {
    await this.#sprootDB.addSensorAutomationConditionAsync(this.#automationId, type, operator, comparisonValue, sensorId, readingType);
  }

  async addOutputConditionAsync(type: ConditionGroupType, operator: ConditionOperator, comparisonValue: number, outputId: number): Promise<void> {
    await this.#sprootDB.addOutputAutomationConditionAsync(this.#automationId, type, operator, comparisonValue, outputId);
  }

  async addTimeConditionAsync(type: ConditionGroupType, startTime: string, endTime: string): Promise<void> {
    await this.#sprootDB.addTimeAutomationConditionAsync(this.#automationId, type, startTime, endTime);
  }

  async updateConditionAsync(condition: OutputCondition | SensorCondition | TimeCondition): Promise<void> {
    if (condition instanceof SensorCondition) {
      await this.#sprootDB.updateSensorAutomationConditionAsync(this.#automationId, condition);
      this.#sensorConditions[condition.id] = condition;
    } else if (condition instanceof OutputCondition) {
      await this.#sprootDB.updateOutputAutomationConditionAsync(this.#automationId, condition);
      this.#outputConditions[condition.id] = condition;
    } else if (condition instanceof TimeCondition) {
      await this.#sprootDB.updateTimeAutomationConditionAsync(this.#automationId, condition);
      this.#timeConditions[condition.id] = condition;
    }
  }

  async deleteSensorConditionAsync(id: number): Promise<void> {
    if (this.#sensorConditions[id]) {
      delete this.#sensorConditions[id];
      await this.#sprootDB.deleteSensorAutomationConditionAsync(id);
    }
  }

  async deleteOutputConditionAsync(id: number): Promise<void> {
    if (this.#outputConditions[id]) {
      delete this.#outputConditions[id];
      await this.#sprootDB.deleteOutputAutomationConditionAsync(id);
    }
  }

  async deleteTimeConditionAsync(id: number): Promise<void> {
    if (this.#timeConditions[id]) {
      delete this.#timeConditions[id];
      await this.#sprootDB.deleteTimeAutomationConditionAsync(id);
    }
  }

  async loadAsync(): Promise<void> {
    const promises = [];
    promises.push(this.#sprootDB.getSensorAutomationConditionsAsync(this.#automationId)
      .then((sensorConditions) => {
        sensorConditions.map((sensorCondition) => { this.#sensorConditions[sensorCondition.id] = new SensorCondition(sensorCondition.id, sensorCondition.type, sensorCondition.sensorId, sensorCondition.readingType, sensorCondition.operator, sensorCondition.comparisonValue) });
      }));
    promises.push(this.#sprootDB.getOutputAutomationConditionsAsync(this.#automationId)
      .then((outputConditions) => {
        outputConditions.map((outputCondition) => { this.#outputConditions[outputCondition.id] = new OutputCondition(outputCondition.id, outputCondition.type, outputCondition.outputId, outputCondition.operator, outputCondition.comparisonValue) });
      }));
    promises.push(this.#sprootDB.getTimeAutomationConditionsAsync(this.#automationId)
      .then((timeConditions) => {
        timeConditions.map((timeCondition) => { this.#timeConditions[timeCondition.id] = new TimeCondition(timeCondition.id, timeCondition.type, timeCondition.startTime, timeCondition.endTime) });
      }));

    await Promise.all(promises);
  }
}
