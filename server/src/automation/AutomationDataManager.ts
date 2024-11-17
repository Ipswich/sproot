import { OutputList } from "../outputs/list/OutputList";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
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

  async addAutomationAsync(name: string, operator: AutomationOperator): Promise<number> {
    const resultId = await this.#sprootDB.addAutomationAsync(name, operator);
    return resultId;
  }

  async deleteAutomationAsync(id: number) {
    await this.#sprootDB.deleteAutomationAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async updateAutomationAsync(name: string, operator: AutomationOperator, id: number) {
    await this.#sprootDB.updateAutomationAsync(name, operator, id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async addSensorConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    sensorId: number,
    readingType: ReadingType,
  ) {
    const resultId = await this.#sprootDB.addSensorConditionAsync(
      automationId,
      type,
      operator,
      comparisonValue,
      sensorId,
      readingType,
    );
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addOutputConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    outputId: number,
  ) {
    const resultId = await this.#sprootDB.addOutputConditionAsync(
      automationId,
      type,
      operator,
      comparisonValue,
      outputId,
    );
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async addTimeConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | null | undefined,
    endTime: string | null | undefined,
  ) {
    const resultId = await this.#sprootDB.addTimeConditionAsync(
      automationId,
      type,
      startTime,
      endTime,
    );
    await this.#postAutomationChangeFunctionAsync();
    return resultId;
  }

  async updateConditionAsync(
    automationId: number,
    condition: OutputCondition | SensorCondition | TimeCondition,
  ) {
    if (condition instanceof SensorCondition) {
      await this.#sprootDB.updateSensorConditionAsync(automationId, condition);
    } else if (condition instanceof OutputCondition) {
      await this.#sprootDB.updateOutputConditionAsync(automationId, condition);
    } else if (condition instanceof TimeCondition) {
      await this.#sprootDB.updateTimeConditionAsync(automationId, condition);
    } else {
      return;
    }
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteSensorConditionAsync(id: number) {
    await this.#sprootDB.deleteSensorConditionAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteOutputConditionAsync(id: number) {
    await this.#sprootDB.deleteOutputConditionAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  async deleteTimeConditionAsync(id: number) {
    await this.#sprootDB.deleteTimeConditionAsync(id);
    await this.#postAutomationChangeFunctionAsync();
  }

  // Output actions
  async addOutputActionAsync(automationId: number, outputId: number, value: number) {
    const result = this.#sprootDB.addOutputActionAsync(automationId, outputId, value);
    await this.#outputList.initializeOrRegenerateAsync();
    return result;
  }

  async deleteOutputActionAsync(outputActionId: number) {
    await this.#sprootDB.deleteOutputActionAsync(outputActionId);
    await this.#outputList.initializeOrRegenerateAsync();
  }

  async #postAutomationChangeFunctionAsync() {
    await this.#outputList.initializeOrRegenerateAsync();
  }
}

export { AutomationDataManager };
