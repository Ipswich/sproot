import { SensorList } from "../../sensors/list/SensorList";
import { OutputList } from "../../outputs/list/OutputList";
import { OutputAutomation } from "./OutputAutomation";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import winston from "winston";
import { Conditions } from "../conditions/Conditions";

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
    const evaluatedAutomations = Object.values(this.#automations).map((automation) => {
      return {
        id: automation.id,
        name: automation.name,
        value: automation.evaluate(sensorList, outputList, now),
        // Maybe add more info here for debugging.
        conditions: automation.conditions,
      };
    });

    const filteredEvaluatedAutomations = evaluatedAutomations.filter((r) => r.value != null) as {
      id: number;
      name: string;
      value: number;
      conditions: Conditions;
    }[];

    if (filteredEvaluatedAutomations.length > 1) {
      //More than one automation evaluated to true
      const firstValue = filteredEvaluatedAutomations[0]!.value;
      if (filteredEvaluatedAutomations.every((automation) => automation.value == firstValue)) {
        //No collisions between these
        this.#lastEvaluation = {
          names: filteredEvaluatedAutomations.map((automation) => automation.name),
          value: firstValue,
        };
      } else {
        //Collisions between these
        this.#lastEvaluation = {
          names: filteredEvaluatedAutomations.map((automation) => automation.name),
          value: null,
        };
      }
    } else if (filteredEvaluatedAutomations.length == 1) {
      //Only one automation evaluated to true
      this.#lastEvaluation = {
        names: [filteredEvaluatedAutomations[0]!.name],
        value: filteredEvaluatedAutomations[0]!.value,
      };
    } else {
      //No automations evaluated to true
      if (this.#lastEvaluation.names.length != 0) {
        this.#logger.debug(
          `No automations evaluated to true, but the last one probably did {lastRunAt: ${new Date(this.#lastRunAt!).toISOString()}, "now": ${now.toISOString()}, name: ${this.#lastEvaluation.names}, value: ${this.#lastEvaluation.value}}.`,
        );
        this.#logger.debug(
          `Automations: ${Object.values(evaluatedAutomations)
            .map(
              (a) =>
                `${a.name} (name: ${a.name}, value: ${a.value}, conditions: ${JSON.stringify(a.conditions)})`,
            )
            .join(",\n")}`,
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
    // Get all of the automations for this ID.
    const rawAutomations = await this.#sprootDB.getAutomationsForOutputAsync(outputId);

    const newAutomations: Record<number, OutputAutomation> = {};
    const loadPromises = [];
    for (const automation of rawAutomations) {
      // Create a new local automation object
      newAutomations[automation.automationId] = new OutputAutomation(
        automation.automationId,
        automation.name,
        automation.value,
        automation.operator,
        automation.enabled,
        this.#sprootDB,
      );

      // And load its conditions
      loadPromises.push(newAutomations[automation.automationId]!.conditions.loadAsync());
    }

    await Promise.all(loadPromises);
    this.#automations = newAutomations;
  }

  #isRunnable(now: Date, automationTimeout: number): boolean {
    const runnable =
      this.#lastRunAt == null ||
      // this.#lastRunAt + automationTimeout * 1000 < now.getTime()
      // Round "now" up to the nearest tenth second. Very high granularity can cause weirdness with non real-time ticks.
      this.#lastRunAt + automationTimeout * 1000 <= Math.ceil(now.getTime() / 100) * 100;

    return runnable;
  }
}
