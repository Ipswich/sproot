import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../../outputs/list/OutputList";
import { OutputAutomation } from "./OutputAutomation";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";

export default class OutputAutomationManager {
  #automations: Record<number, OutputAutomation>;
  #sprootDB: ISprootDB;
  #logger: winston.Logger;
  #lastRunAt: number | null = null;
  #lastEvaluation: { names: string[]; value: number | null } = { names: [], value: null };

  constructor(sprootDB: ISprootDB, logger: winston.Logger) {
    this.#automations = {};
    this.#sprootDB = sprootDB;
    this.#logger = logger;
  }

  get automations() {
    return this.#automations;
  }
  /**
   * Checks all automations to see if any of them evaluate to true.
   * If more than one does, and their values are different, return null.
   * Otherwise return the value of the automation(s) that evaluate to true.
   * @param sensorList
   * @param outputList
   * @param now
   * @returns
   */
  evaluate(
    sensorList: SensorList,
    outputList: OutputList,
    automationTimeout: number,
    now: Date = new Date(),
  ): { names: string[]; value: number | null } {
    //If not runnable, return the last result
    if (!this.#isRunnable(now, automationTimeout)) {
      return this.#lastEvaluation;
    } else {
      // this.#lastRunAt = now.getTime();
      // Round down to the nearest tenth of a second, give an extra 100ms of slop because eventloop
      this.#lastRunAt = Math.floor(now.getTime() / 100) * 100 - 100;
    }
    const evaluatedAutomations = Object.values(this.#automations)
      .map((automation) => {
        return {
          id: automation.id,
          name: automation.name,
          value: automation.evaluate(sensorList, outputList, now),
        };
      })
      .filter((r) => r.value != null) as { id: number; name: string; value: number }[];

    if (evaluatedAutomations.length > 1) {
      //More than one automation evaluated to true
      const firstValue = evaluatedAutomations[0]!.value;
      if (evaluatedAutomations.every((automation) => automation.value == firstValue)) {
        //No collisions between these
        this.#lastEvaluation = {
          names: evaluatedAutomations.map((automation) => automation.name),
          value: firstValue,
        };
      } else {
        //Collisions between these
        this.#lastEvaluation = {
          names: evaluatedAutomations.map((automation) => automation.name),
          value: null,
        };
      }
    } else if (evaluatedAutomations.length == 1) {
      //Only one automation evaluated to true
      this.#lastEvaluation = {
        names: [evaluatedAutomations[0]!.name],
        value: evaluatedAutomations[0]!.value,
      };
    } else {
      //No automations evaluated to true
      if (this.#lastEvaluation.names.length != 0) {
        this.#logger.debug(
          `No automations evaluated to true, but the last one probably did {name: ${this.#lastEvaluation.names}, value: ${this.#lastEvaluation.value}}. `,
        );
      }

      this.#lastEvaluation = { names: [], value: null };
    }
    return this.#lastEvaluation;
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
        this.#sprootDB,
      );

      // And load its conditions
      loadPromises.push(this.#automations[automation.automationId]!.conditions.loadAsync());
    }

    await Promise.all(loadPromises);
  }

  #isRunnable(now: Date, automationTimeout: number): boolean {
    const runnable =
      this.#lastRunAt == null ||
      // this.#lastRunAt + automationTimeout * 1000 < now.getTime()
      // Round "now" up to the nearest tenth second. Very high granularity can cause weirdness with non real-time ticks.
      this.#lastRunAt + automationTimeout * 1000 <= Math.ceil(now.getTime() / 100) * 100;

    if (!runnable && this.#lastEvaluation.names.length != 0) {
      this.#logger.debug(
        `Output Automations are not runnable for this output. Last run at ${new Date(this.#lastRunAt!).toISOString()}. Now is ${new Date(Math.ceil(now.getTime() / 100) * 100).toISOString()}. Timeout is ${automationTimeout} seconds.`,
      );
    }

    return runnable;
  }
}
