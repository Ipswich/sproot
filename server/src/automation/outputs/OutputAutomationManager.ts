import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../../outputs/list/OutputList";
import { OutputAutomation } from "./OutputAutomation";
import { ISprootDB } from "@sproot/sproot-common/src/database/ISprootDB";

export default class OutputAutomationManager {
  #automations: Record<number, OutputAutomation>;
  #sprootDB: ISprootDB;

  constructor(sprootDB: ISprootDB) {
    this.#automations = {};
    this.#sprootDB = sprootDB;
  }

  get automations() {
    return this.#automations
  }
  /**
   * If more than one automation evaluates to true, does nothing.
   * @param sensorList 
   * @param outputList 
   * @param now 
   * @returns 
   */
  evaluate(sensorList: SensorList, outputList: OutputList, now: Date = new Date()): number | null {
    const values = Object.values(this.#automations)
      .map((automation) => automation.evaluate(sensorList, outputList, now))
      .filter((r) => r != null);
    return values.length == 1 && values[0] != null ? values[0] : null;
  }

  // TODO: Implement this
  // It'd be good to have something that can check if there's a collision between different automations.
  // At this point, we just return null if there's more than one automation that evaluates to true to keep
  // things predictable, but that doesn't feel like the best solution.
  // checkForCollisions(): Record<number, Automation> {
  //   return {};
  // }

  async loadAsync(outputId: number) {
    // clear out the old ones
    this.#automations = {};

    // Get all of the automations for this ID.
    const rawAutomations = await this.#sprootDB.getAutomationsForOutputAsync(outputId);
    const loadPromises = [];
    for (const automation of rawAutomations) {
      //create a new local automation object
      this.#automations[automation.automationId] = new OutputAutomation(
        automation.automationId,
        automation.name,
        automation.value,
        automation.operator,
        this.#sprootDB
      );

      // And load its conditions 
      loadPromises.push(this.#automations[automation.automationId]!.conditions.loadAsync());
    }

    await Promise.all(loadPromises);
  }
}
