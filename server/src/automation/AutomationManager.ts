import { SensorList } from "../sensors/list/SensorList";
import { OutputList } from "../outputs/list/OutputList";
import { Automation } from "./Automation";
import { ISprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import { AutomationOperator, IAutomation } from "@sproot/automation/IAutomation";
import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ICondition";
import { TimeCondition } from "./conditions/time/TimeCondition";
import { SensorCondition } from "./conditions/sensors/SensorCondition";
import { OutputCondition } from "./conditions/outputs/OutputCondition";
import { ReadingType } from "@sproot/sensors/ReadingType";

export default class AutomationManager {
  #automations: Record<number, Automation>;
  #sprootDB: ISprootDB;

  constructor(sprootDB: ISprootDB) {
    this.#automations = {};
    this.#sprootDB = sprootDB;
  }

  get automations() {
    return this.#automations;
  }
  /**
   * If more than one automation evaluates to true, does nothing.
   * @param sensorList 
   * @param outputList 
   * @param now 
   * @returns 
   */
  evaluate(sensorList: SensorList, outputList: OutputList, now: Date): number | null {
    const values = Object.values(this.#automations)
      .map((automation) => automation.evaluate(sensorList, outputList, now))
      .filter((r) => r != null);
    return values.length == 1 && values[0] != null ? values[0] : null;
  }

  // TODO: Implement this
  checkForCollisions(): Record<number, Automation> {
    return {};
  }

  async addAutomationAsync(name: string, outputId: number, value: number, operator: AutomationOperator): Promise<Automation> {
    // Add the automation to the database, and save the autoId it generates.
    const automationId = await this.#sprootDB.addAutomationAsync(name, outputId, value, operator);
    this.#automations[automationId] = new Automation(automationId, name, value, operator, this.#sprootDB);
    await this.#automations[automationId].conditions.loadAsync();
    return this.#automations[automationId];
  }

  async deleteAutomationAsync(id: number) {
    delete this.#automations[id];
    await this.#sprootDB.deleteAutomationAsync(id);
  }

  async updateAutomationAsync(automation: IAutomation) {
    if (this.#automations[automation.id] == null) {
      return;
    }
    // Update the database one
    await this.#sprootDB.updateAutomationAsync(automation);
    
    // Update the local one
    //Nullchecked above
    this.#automations[automation.id]!.name = automation.name
    this.#automations[automation.id]!.value = automation.value
    this.#automations[automation.id]!.operator = automation.operator
  }
  
  async addSensorConditionAsync(automationId: number, type: ConditionGroupType, operator: ConditionOperator, comparisonValue: number, sensorId: number, readingType: ReadingType) {
    if (this.#automations[automationId] == null) {
      return;
    }
    await this.#automations[automationId].conditions.addSensorConditionAsync(type, operator, comparisonValue, sensorId, readingType);
  }

  async addOutputConditionAsync(automationId: number, type: ConditionGroupType, operator: ConditionOperator, comparisonValue: number, outputId: number) {
    if (this.#automations[automationId] == null) {
      return;
    }
    await this.#automations[automationId].conditions.addOutputConditionAsync(type, operator, comparisonValue, outputId);
  }

  async addTimeConditionAsync(automationId: number, type: ConditionGroupType, startTime: string, endTime: string) {
    if (this.#automations[automationId] == null) {
      return;
    }
    await this.#automations[automationId].conditions.addTimeConditionAsync(type, startTime, endTime);
  }

  async updateConditionAsync(automationId: number, condition: OutputCondition | SensorCondition | TimeCondition) {
    if (this.#automations[automationId] == null) {
      return;
    }
    await this.#automations[automationId].conditions.updateConditionAsync(condition);
  }

  async deleteSensorConditionAsync(automationId: number, id: number) {
    if (this.#automations[automationId] == null) {
      return;
    }
    await this.#automations[automationId].conditions.deleteSensorConditionAsync(id);
  }

  async deleteOutputConditionAsync(automationId: number, id: number) {
    if (this.#automations[automationId] == null) {
      return;
    }
    await this.#automations[automationId].conditions.deleteOutputConditionAsync(id);
  }

  async deleteTimeConditionAsync(automationId: number, id: number) {
    if (this.#automations[automationId] == null) {
      return;
    }
    await this.#automations[automationId].conditions.deleteTimeConditionAsync(id);
  }

  async loadAsync(outputId: number) {
    // clear out the old ones
    this.#automations = {};

    // Get all of the automations for this ID.
    const rawAutomations = await this.#sprootDB.getAutomationsAsync(outputId);
    
    const loadPromises = [];
    for (const automation of rawAutomations) {
      //create a new local automation object
      this.#automations[automation.id] = new Automation(
        automation.id,
        automation.name,
        automation.value,
        automation.operator,
        this.#sprootDB
      );

      // And load its conditions 
      loadPromises.push(this.#automations[automation.id]!.conditions.loadAsync());
    }

    await Promise.all(loadPromises);
  }
}
