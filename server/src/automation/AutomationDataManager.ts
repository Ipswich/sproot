import { OutputList } from "../outputs/list/OutputList";
import { ISprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import { AutomationOperator } from "@sproot/automation/IAutomation";
import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes";
import { TimeCondition } from "./conditions/TimeCondition";
import { SensorCondition } from "./conditions/SensorCondition";
import { OutputCondition } from "./conditions/OutputCondition";
import { ReadingType } from "@sproot/sensors/ReadingType";

/**
 * This class serves as an interface between changes in automation data and the things
 * that depend on that data. Effectively, it serves as a way to ensure that when a change
 * in an automation or condition is made, its dependents reflect those changes.
 */
class AutomationDataManager {
  #sprootDB: ISprootDB;
  #outputList: OutputList;

  constructor(sprootDB: ISprootDB, outputList: OutputList) {
    this.#sprootDB = sprootDB;
    this.#outputList = outputList;
  }

  // TODO: Implement this
  // It'd be good to have something that can check if there's a collision between different automations.
  // At this point, we just return null if there's more than one automation that evaluates to true to keep
  // things predictable, but that doesn't feel like the best solution.
  // checkForCollisions(): Record<number, Automation> {
  //   return {};
  // }

  async addAutomationAsync(name: string, operator: AutomationOperator): Promise<number> {
    const resultId = await this.#sprootDB.addAutomationAsync(name, operator);
    return resultId
  }

  async deleteAutomationAsync(id: number) {
    await this.#sprootDB.deleteAutomationAsync(id);
    await this.#outputList.initializeOrRegenerateAsync();
  }

  async updateAutomationAsync(name:string, operator: AutomationOperator, id: number) {
    await this.#sprootDB.updateAutomationAsync(name, operator, id);
    await this.#outputList.initializeOrRegenerateAsync();
  }

  async addOutputAutomationAsync(automationId: number, value: number) {
    const result = this.#sprootDB.addOutputAutomationAsync(automationId, value);
    await this.#outputList.initializeOrRegenerateAsync();
    return result;
  }

  async updateOutputAutomationAsync(outputAutomationId: number, automationId: number, value: number) {
    await this.#sprootDB.updateOutputAutomationAsync(outputAutomationId, automationId, value);
    await this.#outputList.initializeOrRegenerateAsync();
  }

  async deleteOutputAutomationAsync(outputAutomationId: number) {
    await this.#sprootDB.deleteOutputAutomationAsync(outputAutomationId);
    await this.#outputList.initializeOrRegenerateAsync();
  }

  async addOutputToOutputAutomationAsync(automationId: number, outputId: number) {
    await this.#sprootDB.addOutputToOutputAutomationAsync(outputId, automationId);
    await this.#outputList.initializeOrRegenerateAsync();
  }

  async deleteOutputFromOutputAutomationAsync(outputId: number, automationId: number) {
    await this.#sprootDB.deleteOutputFromOutputAutomationAsync(outputId, automationId);
    await this.#outputList.initializeOrRegenerateAsync();
  }

  async addSensorConditionAsync(automationId: number, type: ConditionGroupType, operator: ConditionOperator, comparisonValue: number, sensorId: number, readingType: ReadingType) {
    const resultId = await this.#sprootDB.addSensorConditionAsync(automationId, type, operator, comparisonValue, sensorId, readingType);
    await this.#outputList.initializeOrRegenerateAsync();
    return resultId
  }

  async addOutputConditionAsync(automationId: number, type: ConditionGroupType, operator: ConditionOperator, comparisonValue: number, outputId: number) {
    const resultId = await this.#sprootDB.addOutputConditionAsync(automationId, type, operator, comparisonValue, outputId);
    await this.#outputList.initializeOrRegenerateAsync();
    return resultId
  }

  async addTimeConditionAsync(automationId: number, type: ConditionGroupType, startTime: string | null | undefined, endTime: string | null | undefined) {
    const resultId = await this.#sprootDB.addTimeConditionAsync(automationId, type, startTime, endTime);
    await this.#outputList.initializeOrRegenerateAsync();
    return resultId
  }

  async updateConditionAsync(automationId: number, condition: OutputCondition | SensorCondition | TimeCondition) {
    if (condition instanceof SensorCondition) {
      await this.#sprootDB.updateSensorConditionAsync(automationId, condition);
    }
    else if (condition instanceof OutputCondition) {
      await this.#sprootDB.updateOutputConditionAsync(automationId, condition);
    }
    else if (condition instanceof TimeCondition) {
      await this.#sprootDB.updateTimeConditionAsync(automationId, condition);
    } else {
      return;
    }
    await this.#outputList.initializeOrRegenerateAsync();
  }

  async deleteSensorConditionAsync(id: number) {
    await this.#sprootDB.deleteSensorConditionAsync(id);
    await this.#outputList.initializeOrRegenerateAsync();
  }

  async deleteOutputConditionAsync(id: number) {
    await this.#sprootDB.deleteOutputConditionAsync(id);
    await this.#outputList.initializeOrRegenerateAsync();
  }

  async deleteTimeConditionAsync(id: number) {
    await this.#sprootDB.deleteTimeConditionAsync(id);
    await this.#outputList.initializeOrRegenerateAsync();
  }

}



export { AutomationDataManager };