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

  evaluate(sensorList: SensorList, outputList: OutputList, now: Date): number | null {
    const values = Object.values(this.#automations)
      .map((a) => a.evaluate(now, sensorList, outputList))
      .filter((r) => r != null);
    return values.length == 1 && values[0] != null ? values[0] : null;
  }

  checkForCollisions(): Record<number, Automation> {
    return {};
  }

  async addAsync(outputId: number, automation: Automation) {
    const sdbAutomation = {
      name: automation.name,
      outputId: outputId,
      value: automation.value,
      operator: automation.rules.operator,
      startTime: automation.startTime,
      endTime: automation.endTime,
    } as SDBAutomation;
    // Add the automation to the database, and save the autoId it generates.
    const automationId = await this.#sprootDB.addAutomationAsync(sdbAutomation);

    // That autoId is used as the key for tracking these internally
    this.#automations[automationId] = automation;

    // And for associating the conditions with an automation. This helper function
    // abstracts the bulk of the work so that we only need to know the "type" of the condition
    function addConditionToDatabase(
      condition: ConditionBase,
      type: string,
      sprootDB: ISprootDB,
      promises: Promise<void>[],
    ): void {
      if (condition instanceof SensorCondition) {
        const sdbSensorCondition = {
          automationId,
          type,
          operator: condition.operator,
          comparisonValue: condition.rightHandSideComparison,
          sensorId: condition.sensorId,
          readingType: condition.readingType,
        } as SDBSensorAutomationCondition;
        promises.push(sprootDB.addSensorAutomationConditionAsync(sdbSensorCondition));
      }
      if (condition instanceof OutputCondition) {
        const sdbOutputCondition = {
          automationId,
          type,
          operator: condition.operator,
          comparisonValue: condition.rightHandSideComparison,
          outputId: condition.outputId,
        } as SDBOutputAutomationCondition;
        promises.push(sprootDB.addOutputAutomationConditionAsync(sdbOutputCondition));
      }
    }

    // Lot of database queries could happen here, so batch them together rather than waiting for them
    // to complete serially.
    const promises: Promise<void>[] = [];
    for (const condition of Object.values(automation.rules.allOf)) {
      addConditionToDatabase(condition, "allOf", this.#sprootDB, promises);
    }
    for (const condition of Object.values(automation.rules.anyOf)) {
      addConditionToDatabase(condition, "anyOf", this.#sprootDB, promises);
    }
    for (const condition of Object.values(automation.rules.oneOf)) {
      addConditionToDatabase(condition, "oneOf", this.#sprootDB, promises);
    }

    // Run the batch of queries.
    await Promise.allSettled(promises);
  }

  async removeAsync(id: number) {
    delete this.#automations[id];
    await this.#sprootDB.deleteAutomationAsync(id);
  }

  async updateAsync(outputId: number, automation: Automation) {
    // Update the local one
    this.#automations[automation.id] = automation;

    // Update the database one
    const sdbAutomation = {
      id: automation.id,
      name: automation.name,
      outputId: outputId,
      value: automation.value,
      operator: automation.rules.operator,
      startTime: automation.startTime,
      endTime: automation.endTime,
    } as SDBAutomation;
    await this.#sprootDB.updateAutomationAsync(sdbAutomation);

    // And for associating the conditions with an automation. This helper function
    // abstracts the bulk of the work so that we only need to know the "type" of the condition
    function updateConditionInDatabase(
      condition: ConditionBase,
      type: string,
      sprootDB: ISprootDB,
      promises: Promise<void>[],
    ): void {
      if (condition instanceof SensorCondition) {
        const sdbSensorCondition = {
          id: condition.id,
          automationId: automation.id,
          type,
          operator: condition.operator,
          comparisonValue: condition.rightHandSideComparison,
          sensorId: condition.sensorId,
          readingType: condition.readingType,
        } as SDBSensorAutomationCondition;
        promises.push(sprootDB.updateSensorAutomationConditionAsync(sdbSensorCondition));
      }
      if (condition instanceof OutputCondition) {
        const sdbOutputCondition = {
          id: condition.id,
          automationId: automation.id,
          type,
          operator: condition.operator,
          comparisonValue: condition.rightHandSideComparison,
          outputId: condition.outputId,
        } as SDBOutputAutomationCondition;
        promises.push(sprootDB.updateOutputAutomationConditionAsync(sdbOutputCondition));
      }
    }

    // Lot of database queries could happen here, so batch them together rather than waiting for them
    // to complete serially.
    const promises: Promise<void>[] = [];
    for (const condition of Object.values(automation.rules.allOf)) {
      updateConditionInDatabase(condition, "allOf", this.#sprootDB, promises);
    }
    for (const condition of Object.values(automation.rules.anyOf)) {
      updateConditionInDatabase(condition, "anyOf", this.#sprootDB, promises);
    }
    for (const condition of Object.values(automation.rules.oneOf)) {
      updateConditionInDatabase(condition, "oneOf", this.#sprootDB, promises);
    }

    // Run the batch of queries.
    await Promise.allSettled(promises);
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
      const outputAnyOf = createOutputsConditionsByType(allOutputConditions, "anyOf");
      const outputAllOf = createOutputsConditionsByType(allOutputConditions, "allOf");
      const outputOneOf = createOutputsConditionsByType(allOutputConditions, "oneOf");

      const sensorAnyOf = createSensorConditionsByType(allSensorConditions, "anyOf");
      const sensorAllOf = createSensorConditionsByType(allSensorConditions, "allOf");
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
        automation.startTime ?? undefined,
        automation.endTime ?? undefined,
      );
    }
  }
}
