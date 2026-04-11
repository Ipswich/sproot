import { AutomationEvent, AutomationEventPayload } from "../AutomationEvent";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { OutputAction } from "./OutputAction";
import winston from "winston";

export class OutputActionManager {
  #outputId: number;
  #sprootDB: ISprootDB;
  #logger: winston.Logger;
  #lastRunAt: number | null = null;
  #actionMap: Map<number, OutputAction> = new Map();
  #automationTimeout: number; // Per-output timeout

  static async createInstanceAsync(
    outputId: number,
    sprootDB: ISprootDB,
    logger: winston.Logger,
    automationTimeout: number,
  ): Promise<OutputActionManager> {
    const manager = new OutputActionManager(outputId, sprootDB, logger, automationTimeout);
    await manager.reloadActionsAsync();
    return manager;
  }

  private constructor(
    outputId: number,
    sprootDB: ISprootDB,
    logger: winston.Logger,
    automationTimeout: number,
  ) {
    this.#outputId = outputId;
    this.#sprootDB = sprootDB;
    this.#logger = logger;
    this.#automationTimeout = automationTimeout;
  }

  set automationTimeout(timeoutSeconds: number) {
    this.#automationTimeout = timeoutSeconds;
  }

  /**
   * Reload output actions from the database
   */
  async reloadActionsAsync(): Promise<void> {
    const outputActions = await this.#sprootDB.getOutputActionsByOutputIdAsync(this.#outputId);
    this.#actionMap.clear();
    this.#actionMap = new Map(outputActions.map((a) => [a.automationId, new OutputAction(a)]));
  }

  /**
   * Handle automation events - detects collisions and returns the action value.
   * @param event The automation event containing triggered automations
   * @returns The value to set, or undefined if no action should be taken (collision, no action, or timeout)
   */
  async handleAutomationEvent(
    event: AutomationEvent,
    now: Date = event.timestamp,
  ): Promise<number | undefined> {
    const nowTimestamp = now.getTime();

    // Check timeout - only process if enough time has passed since last run
    if (
      this.#lastRunAt !== null &&
      nowTimestamp < this.#lastRunAt + this.#automationTimeout * 1000
    ) {
      return undefined; // Too soon, skip
    }

    // Get all actions for this output
    await this.reloadActionsAsync();

    // Find which triggered automations have actions on this output
    const triggeredActions: {
      value: number;
      payload: AutomationEventPayload;
    }[] = [];

    // Loop through all actions and check if their automation was triggered
    for (const [_actionId, action] of this.#actionMap.entries()) {
      if (event.triggeredAutomations.has(action.automationId)) {
        const payload = event.triggeredAutomations.get(action.automationId);
        if (!payload) {
          continue;
        }

        triggeredActions.push({
          value: action.value,
          payload,
        });
      }
    }

    if (triggeredActions.length === 0) {
      return 0; // No automations triggered, default to off
    }

    // Detect collisions: multiple automations with different values
    const valueCounts = new Map<number, number>();
    for (const { value } of triggeredActions) {
      valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
    }

    // Collision detected, default to off
    if (valueCounts.size > 1) {
      this.#logger.verbose(
        `Collision detected on output ${this.#outputId}: ` +
          `${triggeredActions.map((t) => `${t.payload.automationName}=${t.value}`).join(", ")}`,
      );
      return 0;
    }

    // No collision - update last run time and return the single value
    this.#lastRunAt = nowTimestamp;
    return triggeredActions.length > 0 ? triggeredActions[0]!.value : 0;
  }
}
