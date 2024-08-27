import { SensorList } from "../sensors/list/SensorList";
import { OutputList } from "../outputs/list/OutputList";
import { Automation, AutomationRules } from "./Automation";
import { ISprootDB } from "@sproot/database/ISprootDB";
import { OutputCondition } from "./conditions/OutputCondition";
import { SensorCondition } from "./conditions/SensorCondition";
import { SDBOutputAutomationCondition } from "@sproot/database/SDBOutputAutomationCondition";
import { SDBSensorAutomationCondition } from "@sproot/database/SDBSensorAutomationCondition";
import { ConditionBase } from "./conditions/ConditionBase";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { ReadingType } from "@sproot/sensors/ReadingType";
import IAutomation from "@sproot/automation/IAutomation";

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
      .map((a) => a.evaluate(now, sensorList, outputList))
      .filter((r) => r != null);
    return values.length == 1 && values[0] != null ? values[0] : null;
  }

  checkForCollisions(): Record<number, Automation> {
    return {};
  }

  async addAutomationAsync(outputId: number, automation: SDBAutomation): Promise<Automation> {
    const sdbAutomation = {
      name: automation.name,
      outputId: outputId,
      value: automation.value,
      operator: automation.operator,
      startTime: automation.startTime || null,
      endTime: automation.endTime || null,
    } as SDBAutomation;
    // Add the automation to the database, and save the autoId it generates.
    const automationId = await this.#sprootDB.addAutomationAsync(sdbAutomation);
    this.#automations[automationId] = new Automation(automationId, automation.name, automation.value, automation.operator, automation.startTime, automation.endTime);

    return this.#automations[automationId];
  }

  async deleteAutomationAsync(id: number) {
    delete this.#automations[id];
    await this.#sprootDB.deleteAutomationAsync(id);
  }

  async updateAutomationAsync(outputId: number, automation: IAutomation) {
    if (this.#automations[automation.id] == null) {
      return;
    }
    // Update the database one
    const sdbAutomation = {
      id: automation.id,
      name: automation.name,
      outputId: outputId,
      value: automation.value,
      operator: automation.operator,
      startTime: automation.startTime ?? null,
      endTime: automation.endTime ?? null,
    } as SDBAutomation;

    await this.#sprootDB.updateAutomationAsync(sdbAutomation);
    // Update the local one
    //Nullchecked above
    this.#automations[automation.id]!.name = automation.name
    this.#automations[automation.id]!.value = automation.value
    this.#automations[automation.id]!.operator = automation.operator
    this.#automations[automation.id]!.startTime = automation.startTime
    this.#automations[automation.id]!.endTime = automation.endTime
  }

  async addAutomationRuleAsync(automationId: number, condition: ConditionBase, type: "allOf" | "anyOf" | "oneOf") {
    if (this.#automations[automationId] == null) {
      return;
    }
    if ((condition as SensorCondition).sensorId && (condition as SensorCondition).readingType) {
      const sdbSensorCondition = {
        automationId,
        type,
        operator: condition.operator,
        comparisonValue: condition.rightHandSideComparison,
        sensorId: (condition as SensorCondition).sensorId,
        readingType: (condition as SensorCondition).readingType,
      } as SDBSensorAutomationCondition;
      const id = await this.#sprootDB.addSensorAutomationConditionAsync(sdbSensorCondition);
      this.#automations[automationId].rules[type].push(new SensorCondition(id, sdbSensorCondition.sensorId, sdbSensorCondition.readingType as ReadingType, condition.operator, condition.rightHandSideComparison));
    }
    if ((condition as OutputCondition).outputId) {
      const sdbOutputCondition = {
        automationId,
        type,
        operator: condition.operator,
        comparisonValue: condition.rightHandSideComparison,
        outputId: (condition as OutputCondition).outputId,
      } as SDBOutputAutomationCondition;
      const id = await this.#sprootDB.addOutputAutomationConditionAsync(sdbOutputCondition);
      this.#automations[automationId].rules[type].push(new OutputCondition(id, sdbOutputCondition.outputId, condition.operator, condition.rightHandSideComparison));
    }
  }

  async updateAutomationRuleAsync(automationId: number, condition: ConditionBase, type: "allOf" | "anyOf" | "oneOf") {
    if (this.#automations[automationId] == null) {
      return;
    }
    if ((condition as SensorCondition).sensorId && (condition as SensorCondition).readingType) {
      const sdbSensorCondition = {
        id: (condition as SensorCondition).id,
        automationId,
        type,
        operator: condition.operator,
        comparisonValue: condition.rightHandSideComparison,
        sensorId: (condition as SensorCondition).sensorId,
        readingType: (condition as SensorCondition).readingType,
      } as SDBSensorAutomationCondition;
      await this.#sprootDB.updateSensorAutomationConditionAsync(sdbSensorCondition);
      this.#automations[automationId].rules[type][condition.id] = new SensorCondition(
        sdbSensorCondition.id,
        sdbSensorCondition.sensorId,
        sdbSensorCondition.readingType as ReadingType,
        sdbSensorCondition.operator,
        sdbSensorCondition.comparisonValue,
      );
    }
    if ((condition as OutputCondition).outputId) {
      const sdbOutputCondition = {
        id: (condition as OutputCondition).id,
        automationId,
        type,
        operator: condition.operator,
        comparisonValue: condition.rightHandSideComparison,
        outputId: (condition as OutputCondition).outputId,
      } as SDBOutputAutomationCondition;
      await this.#sprootDB.updateOutputAutomationConditionAsync(sdbOutputCondition);
      this.#automations[automationId].rules[type][condition.id] = new OutputCondition(
        sdbOutputCondition.id,
        sdbOutputCondition.outputId,
        sdbOutputCondition.operator,
        sdbOutputCondition.comparisonValue,
      );
    }
  }

  async deleteAutomationRuleAsync(automationId: number, conditionId: number) {
    if (this.#automations[automationId] == null) {
      return;
    }
    const condition = this.#automations[automationId].rules.allOf[conditionId] || this.#automations[automationId].rules.anyOf[conditionId] || this.#automations[automationId].rules.oneOf[conditionId];
    if (condition == null) {
      return;
    }
    if ((condition as SensorCondition).sensorId && (condition as SensorCondition).readingType) {
      await this.#sprootDB.deleteSensorAutomationConditionAsync(conditionId);
    }
    if ((condition as OutputCondition).outputId) {
      await this.#sprootDB.deleteOutputAutomationConditionAsync(conditionId);
    }
    delete this.#automations[automationId].rules.allOf[conditionId];
  }

  async loadAsync(outputId: number) {
    // clear out the old ones
    this.#automations = {};

    function createOutputsConditionsByType(
      outputConditions: SDBOutputAutomationCondition[],
      type: string,
    ) {
      return outputConditions
        .filter((c) => c.type == type)
        .map(
          (condition) =>
            new OutputCondition(
              condition.id,
              condition.outputId,
              condition.operator,
              condition.comparisonValue,
            ),
        );
    }
    function createSensorConditionsByType(
      sensorCondition: SDBSensorAutomationCondition[],
      type: string,
    ) {
      return sensorCondition
        .filter((c) => c.type == type)
        .map(
          (condition) =>
            new SensorCondition(
              condition.id,
              condition.sensorId,
              condition.readingType as ReadingType,
              condition.operator,
              condition.comparisonValue,
            ),
        );
    }

    // Get all of the automations for this ID.
    const rawAutomations = await this.#sprootDB.getAutomationsAsync(outputId);
    // For each automation
    for (const automation of rawAutomations) {
      // Get both output and sensor conditions
      const allOutputConditions = await this.#sprootDB.getOutputAutomationConditionsAsync(
        automation.id,
      );
      const allSensorConditions = await this.#sprootDB.getSensorAutomationConditionsAsync(
        automation.id,
      );

      // Then map them by their types "types"
      const outputAllOf = createOutputsConditionsByType(allOutputConditions, "allOf");
      const outputAnyOf = createOutputsConditionsByType(allOutputConditions, "anyOf");
      const outputOneOf = createOutputsConditionsByType(allOutputConditions, "oneOf");

      const sensorAllOf = createSensorConditionsByType(allSensorConditions, "allOf");
      const sensorAnyOf = createSensorConditionsByType(allSensorConditions, "anyOf");
      const sensorOneOf = createSensorConditionsByType(allSensorConditions, "oneOf");

      // Then combine and create the rule set
      const combinedAllOf = [] as ConditionBase[];
      const combinedAnyOf = [] as ConditionBase[];
      const combinedOneOf = [] as ConditionBase[];

      const automationRules = new AutomationRules(
        combinedAllOf.concat(outputAllOf, sensorAllOf),
        combinedAnyOf.concat(outputAnyOf, sensorAnyOf),
        combinedOneOf.concat(outputOneOf, sensorOneOf),
      );

      // Lastly, create a new local automation object
      this.#automations[automation.id] = new Automation(
        automation.id,
        automation.name,
        automation.value,
        automation.operator,
        automation.startTime ?? null,
        automation.endTime ?? null,
      );

      // And set the rules
      this.#automations[automation.id]!.rules = automationRules;
    }
  }
}
