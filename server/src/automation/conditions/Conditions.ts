import { ISprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import { AutomationOperator } from "@sproot/automation/IAutomation";
import { OutputList } from "../../outputs/list/OutputList";
import { SensorList } from "../../sensors/list/SensorList";

import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ICondition";
import { OutputCondition } from "./OutputCondition";
import { SensorCondition } from "./SensorCondition";
import { TimeCondition } from "./TimeCondition";
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
        allOf: [...Object.values(this.#sensorConditions)].filter((c) => c.group == "allOf"),
        anyOf: [...Object.values(this.#sensorConditions)].filter((c) => c.group == "anyOf"),
        oneOf: [...Object.values(this.#sensorConditions)].filter((c) => c.group == "oneOf")
      },
      output: {
        allOf: [...Object.values(this.#outputConditions)].filter((c) => c.group == "allOf"),
        anyOf: [...Object.values(this.#outputConditions)].filter((c) => c.group == "anyOf"),
        oneOf: [...Object.values(this.#outputConditions)].filter((c) => c.group == "oneOf")
      },
      time: {
        allOf: [...Object.values(this.#timeConditions)].filter((c) => c.group == "allOf"),
        anyOf: [...Object.values(this.#timeConditions)].filter((c) => c.group == "anyOf"),
        oneOf: [...Object.values(this.#timeConditions)].filter((c) => c.group == "oneOf")
      }
    };
  }

  get allOf(): (SensorCondition | OutputCondition | TimeCondition)[] {
    return [...Object.values(this.#sensorConditions), ...Object.values(this.#outputConditions), ...Object.values(this.#timeConditions)].filter((c) => c.group == "allOf");
  }

  get anyOf(): (SensorCondition | OutputCondition | TimeCondition)[] {
    return [...Object.values(this.#sensorConditions), ...Object.values(this.#outputConditions), ...Object.values(this.#timeConditions)].filter((c) => c.group == "anyOf");
  }

  get oneOf(): (SensorCondition | OutputCondition | TimeCondition)[] {
    return [...Object.values(this.#sensorConditions), ...Object.values(this.#outputConditions), ...Object.values(this.#timeConditions)].filter((c) => c.group == "oneOf");
  }

  evaluate(operator: AutomationOperator, sensorList: SensorList, outputList: OutputList, now: Date): boolean {
    const evaluateByConditionFlavor = (condition: SensorCondition | OutputCondition | TimeCondition) => {
      if (condition instanceof SensorCondition) {
        return condition.evaluate(sensorList);
      }
      if (condition instanceof OutputCondition) {
        return condition.evaluate(outputList);
      }
      if (condition instanceof TimeCondition) {
        return condition.evaluate(now);
      }
    }
    
    // If no conditions, false.
    if (Object.keys(this.allOf).length == 0 && Object.keys(this.anyOf).length == 0 && Object.keys(this.oneOf).length == 0) {
      return false;
    }

    // Things get weird if any of the lists are empty. If we default to returning true and
    // the conditionOperator is "or", it'll always result in true (even if one of the condition
    // types is false). Conversely, if we default to returning false and the conditionOperator
    // is "false", it'll always result in false (even if one of the condition types is true).
    // Basically, we need to "ignore" empty condition types.
    let defaultReturnValue = operator == "and";

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

  async addSensorConditionAsync(group: ConditionGroupType, operator: ConditionOperator, comparisonValue: number, sensorId: number, readingType: ReadingType): Promise<SensorCondition> {
    const newSensorConditionId = await this.#sprootDB.addSensorAutomationConditionAsync(this.#automationId, group, operator, comparisonValue, sensorId, readingType);
    const newSensorCondition = new SensorCondition(newSensorConditionId, group, sensorId, readingType, operator, comparisonValue);
    this.#sensorConditions[newSensorConditionId] = newSensorCondition;
    return newSensorCondition;
  }

  async addOutputConditionAsync(group: ConditionGroupType, operator: ConditionOperator, comparisonValue: number, outputId: number): Promise<OutputCondition> {
    const newOutputConditionId = await this.#sprootDB.addOutputAutomationConditionAsync(this.#automationId, group, operator, comparisonValue, outputId);
    const newOutputCondition = new OutputCondition(newOutputConditionId, group, outputId, operator, comparisonValue);
    this.#outputConditions[newOutputConditionId] = newOutputCondition;
    return newOutputCondition;
  }

  async addTimeConditionAsync(group: ConditionGroupType, startTime: string | undefined | null, endTime: string | undefined | null): Promise<TimeCondition> {
    const newTimeConditionId = await this.#sprootDB.addTimeAutomationConditionAsync(this.#automationId, group, startTime, endTime);
    const newTimeCondition = new TimeCondition(newTimeConditionId, group, startTime, endTime);
    this.#timeConditions[newTimeConditionId] = newTimeCondition;
    return this.#timeConditions[newTimeConditionId];
  }

  async updateConditionAsync(condition: OutputCondition | SensorCondition | TimeCondition): Promise<void> {
    if (condition instanceof SensorCondition) {
      await this.#sprootDB.updateSensorAutomationConditionAsync(this.#automationId, condition);
      this.#sensorConditions[condition.id] = condition;
    }
    if (condition instanceof OutputCondition) {
      await this.#sprootDB.updateOutputAutomationConditionAsync(this.#automationId, condition);
      this.#outputConditions[condition.id] = condition;
    }
    if (condition instanceof TimeCondition) {
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
