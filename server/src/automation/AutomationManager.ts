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
import { ICondition } from "@sproot/automation/ICondition";

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

  async addAsync(outputId: number, automation: IAutomation): Promise<Automation> {
    const sdbAutomation = {
      name: automation.name,
      outputId: outputId,
      value: automation.value,
      operator: automation.rules.operator,
      startTime: automation.startTime || null,
      endTime: automation.endTime || null,
    } as SDBAutomation;
    // Add the automation to the database, and save the autoId it generates (needed for adding rules to the database).
    const automationId = await this.#sprootDB.addAutomationAsync(sdbAutomation);

    // And for associating the conditions with an automation. This helper function
    // abstracts the bulk of the work so that we only need to know the "type" of the condition
    const addConditionToDatabase = (
      condition: ICondition,
      type: "allOf" | "anyOf" | "oneOf",
      sprootDB: ISprootDB,
      rules: AutomationRules
    ): Promise<number> | undefined => {
      if ((condition as SensorCondition).sensorId && (condition as SensorCondition).readingType) {
        const sdbSensorCondition = {
          automationId,
          type,
          operator: condition.operator,
          comparisonValue: condition.rightHandSideComparison,
          sensorId: (condition as SensorCondition).sensorId,
          readingType: (condition as SensorCondition).readingType,
        } as SDBSensorAutomationCondition;
        return sprootDB.addSensorAutomationConditionAsync(sdbSensorCondition)
          .then((value) => rules[type].push(new SensorCondition(value, (condition as SensorCondition).sensorId, (condition as SensorCondition).readingType, condition.operator, condition.rightHandSideComparison)));
      }
      if ((condition as OutputCondition).outputId) {
        const sdbOutputCondition = {
          automationId,
          type,
          operator: condition.operator,
          comparisonValue: condition.rightHandSideComparison,
          outputId: (condition as OutputCondition).outputId,
        } as SDBOutputAutomationCondition;
        return sprootDB.addOutputAutomationConditionAsync(sdbOutputCondition)
          .then((value) => rules[type].push(new OutputCondition(value, (condition as OutputCondition).outputId, condition.operator, condition.rightHandSideComparison)));
      }
    }

    //Create an empty set of rules
    const rules = new AutomationRules(automation.rules.operator, [], [], []);
    // Lot of database queries could happen here, so batch them together rather than waiting for them
    // to complete serially.
    const promises: (Promise<number> | undefined)[] = [];
    for (const condition of Object.values(automation.rules.allOf)) {
      promises.push(addConditionToDatabase(condition, "allOf", this.#sprootDB, rules));
    }
    for (const condition of Object.values(automation.rules.anyOf)) {
      promises.push(addConditionToDatabase(condition, "anyOf", this.#sprootDB, rules));
    }
    for (const condition of Object.values(automation.rules.oneOf)) {
      promises.push(addConditionToDatabase(condition, "oneOf", this.#sprootDB, rules));
    }

    // Run the batch of queries.
    await Promise.allSettled(promises);

    // That autoId is used as the key for tracking these internally
    this.#automations[automationId] = new Automation(automationId, automation.name, automation.value, rules, automation.startTime, automation.endTime);
    return this.#automations[automationId];
  }

  async deleteAsync(id: number) {
    delete this.#automations[id];
    await this.#sprootDB.deleteAutomationAsync(id);
  }

  async updateAsync(outputId: number, automation: IAutomation) {
    // Update the database one
    const sdbAutomation = {
      id: automation.id,
      name: automation.name,
      outputId: outputId,
      value: automation.value,
      operator: automation.rules.operator,
      startTime: automation.startTime ?? null,
      endTime: automation.endTime ?? null,
    } as SDBAutomation;
    await this.#sprootDB.updateAutomationAsync(sdbAutomation);

    // And for associating the conditions with an automation. This helper function
    // abstracts the bulk of the work so that we only need to know the "type" of the condition
    function updateOrAddConditionInDatabase(
      condition: ICondition,
      type: "allOf" | "anyOf" | "oneOf",
      sprootDB: ISprootDB,
      rules: AutomationRules,
      outputIds: number[],
      sensorIds: number[]
    ): Promise<void | number> | undefined {
      if ((condition as SensorCondition).sensorId && (condition as SensorCondition).readingType) {
        const sdbSensorCondition = {
          automationId: automation.id,
          type,
          operator: condition.operator,
          comparisonValue: condition.rightHandSideComparison,
          sensorId: (condition as SensorCondition).sensorId,
          readingType: (condition as SensorCondition).readingType,
        } as SDBSensorAutomationCondition;
        //If it has an ID, update, otherwise, add.
        if ((condition as SensorCondition).id) {
          sdbSensorCondition.id = (condition as SensorCondition).id;
          return sprootDB.updateSensorAutomationConditionAsync(sdbSensorCondition)
            .then(() => {
              sensorIds.push((condition as SensorCondition).id)
              rules[type].push(new SensorCondition((condition as SensorCondition).id, (condition as SensorCondition).sensorId, (condition as SensorCondition).readingType, condition.operator, condition.rightHandSideComparison))
            });
        } else {
          return sprootDB.addSensorAutomationConditionAsync(sdbSensorCondition)
            .then((value) => {
              sensorIds.push(value)
              rules[type].push(new SensorCondition(value, (condition as SensorCondition).sensorId, (condition as SensorCondition).readingType, condition.operator, condition.rightHandSideComparison))
            });
        }
      }
      if ((condition as OutputCondition).outputId) {
        const sdbOutputCondition = {
          automationId: automation.id,
          type,
          operator: condition.operator,
          comparisonValue: condition.rightHandSideComparison,
          outputId: (condition as OutputCondition).outputId,
        } as SDBOutputAutomationCondition;
        //If it has an ID, update, otherwise, add.
        if ((condition as OutputCondition).id) {
          sdbOutputCondition.id = (condition as OutputCondition).id;
          return sprootDB.updateOutputAutomationConditionAsync(sdbOutputCondition)
            .then(() => {
              outputIds.push((condition as OutputCondition).id)
              rules[type].push(new OutputCondition((condition as OutputCondition).id, (condition as OutputCondition).outputId, condition.operator, condition.rightHandSideComparison))
            });
        } else {
          return sprootDB.addOutputAutomationConditionAsync(sdbOutputCondition)
            .then((value) => {
              outputIds.push(value)
              rules[type].push(new OutputCondition(value, (condition as OutputCondition).outputId, condition.operator, condition.rightHandSideComparison))
            });
        }
      }
    }

    // Lot of database queries could happen here, so batch them together rather than waiting for them
    // to complete serially.
    const rules = new AutomationRules(automation.rules.operator, [], [], []);
    const outputIds: number[] = [];
    const sensorIds: number[] = [];
    const promises: (Promise<void | number> | undefined)[] = [];
    for (const condition of Object.values(automation.rules.allOf)) {
      promises.push(updateOrAddConditionInDatabase(condition, "allOf", this.#sprootDB, rules, outputIds, sensorIds));
    }
    for (const condition of Object.values(automation.rules.anyOf)) {
      promises.push(updateOrAddConditionInDatabase(condition, "anyOf", this.#sprootDB, rules, outputIds, sensorIds));
    }
    for (const condition of Object.values(automation.rules.oneOf)) {
      promises.push(updateOrAddConditionInDatabase(condition, "oneOf", this.#sprootDB, rules, outputIds, sensorIds));
    }

    // Run the batch of add and update queries.
    await Promise.allSettled(promises);

    // Delete IDs no longer associated with this automation
    await Promise.allSettled([
      this.#sprootDB.deleteSensorAutomationConditionsExceptAsync(automation.id, sensorIds),
      this.#sprootDB.deleteOutputAutomationConditionsExceptAsync(automation.id, outputIds)
    ])

    // Update the local one
    this.#automations[automation.id] = new Automation(automation.id, automation.name, automation.value, rules, automation.startTime, automation.endTime);
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
        automation.operator,
        combinedAllOf.concat(outputAllOf, sensorAllOf),
        combinedAnyOf.concat(outputAnyOf, sensorAnyOf),
        combinedOneOf.concat(outputOneOf, sensorOneOf),
      );

      // Lastly, add it to the local object
      this.#automations[automation.id] = new Automation(
        automation.id,
        automation.name,
        automation.value,
        automationRules,
        automation.startTime ?? null,
        automation.endTime ?? null,
      );
    }
  }
}
