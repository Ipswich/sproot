import { IAutomationEventPayload } from "@sproot/automation/IAutomationEventPayload";
import { AutomationEvent } from "../AutomationEvent";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { AutomationService } from "../AutomationService";
import { OutputAction } from "./OutputAction";
import winston from "winston";
import {
  OUTPUT_ACTIONS_UPDATED_EVENT,
  AUTOMATIONS_TRIGGERED_EVENT,
} from "../../utils/EventConstants";

export class OutputActionManager implements Disposable {
  #outputId: number;
  #automationService: AutomationService;
  #sprootDB: ISprootDB;
  #logger: winston.Logger;
  #lastRunAt: number | null = null;
  #lastActionValue: number | undefined = undefined;
  #actionMap: Map<number, OutputAction> = new Map();
  #automationTimeout: number; // Per-output timeout
  #triggeredActionFunction: (result: number | undefined) => Promise<void>;
  #listenerCleanupFunction: () => void;
  #pendingAction: Promise<void> = Promise.resolve();

  static async createInstanceAsync(
    outputId: number,
    actionFunction: (result: number | undefined) => Promise<void>,
    automationService: AutomationService,
    sprootDB: ISprootDB,
    logger: winston.Logger,
    automationTimeout: number,
  ): Promise<OutputActionManager> {
    const manager = new OutputActionManager(
      outputId,
      actionFunction,
      automationService,
      sprootDB,
      logger,
      automationTimeout,
    );
    await manager.#reloadActionsAsync();
    return manager;
  }

  private constructor(
    outputId: number,
    actionFunction: (result: number | undefined) => Promise<void>,
    automationService: AutomationService,
    sprootDB: ISprootDB,
    logger: winston.Logger,
    automationTimeout: number,
  ) {
    this.#outputId = outputId;
    this.#triggeredActionFunction = actionFunction;
    this.#automationService = automationService;
    this.#sprootDB = sprootDB;
    this.#logger = logger;
    this.#automationTimeout = automationTimeout;

    const actionReloadListener = async () => {
      await this.#reloadActionsAsync();
    };

    const automationListener = async (event: AutomationEvent) => {
      this.#pendingAction = this.#pendingAction
        .then(async () => {
          const result = await this.#handleAutomationEvent(event);
          this.#logger.debug(
            `Received Automation event for output ${this.#outputId} - result: ${result}`,
          );
          await this.#triggeredActionFunction(result);
        })
        .catch((error) => {
          this.#logger.error(
            `Error handling automation event for output ${this.#outputId} - ${error}`,
          );
        });
    };

    this.#automationService.on(OUTPUT_ACTIONS_UPDATED_EVENT, actionReloadListener);
    this.#automationService.on(AUTOMATIONS_TRIGGERED_EVENT, automationListener);

    this.#listenerCleanupFunction = () => {
      this.#automationService.off(OUTPUT_ACTIONS_UPDATED_EVENT, actionReloadListener);
      this.#automationService.off(AUTOMATIONS_TRIGGERED_EVENT, automationListener);
    };
  }

  set automationTimeout(timeoutSeconds: number) {
    this.#automationTimeout = timeoutSeconds;
  }

  set outputId(outputId: number) {
    this.#outputId = outputId;
    void this.#reloadActionsAsync();
  }

  get lastResult(): number | undefined {
    return this.#lastActionValue;
  }
  /**
   * Reload output actions from the database
   */
  async #reloadActionsAsync(): Promise<void> {
    try {
      const outputActions = await this.#sprootDB.getOutputActionsByOutputIdAsync(this.#outputId);
      this.#actionMap = new Map(outputActions.map((a) => [a.automationId, new OutputAction(a)]));
    } catch (error) {
      this.#logger.error(`Error reloading actions for output ${this.#outputId} - ${error}`);
    }
  }

  /**
   * Handle automation events - detects collisions and returns the action value.
   * @param event The automation event containing triggered automations
   * @returns The value to set, or undefined if no action should be taken (collision, no action, or timeout)
   */
  async #handleAutomationEvent(
    event: AutomationEvent,
    now: Date = event.timestamp,
  ): Promise<number | undefined> {
    const nowTimestamp = now.getTime();

    // Check timeout - only process if enough time has passed since last run
    if (
      this.#lastRunAt !== null &&
      nowTimestamp < this.#lastRunAt + this.#automationTimeout * 1000
    ) {
      this.#lastActionValue = undefined;
      return this.#lastActionValue; // Too soon, skip
    }
    this.#lastRunAt = nowTimestamp;

    // Find which automations have actions on this output
    const triggeredActions: {
      value: number;
      payload: IAutomationEventPayload;
    }[] = [];

    // Loop through all actions and check if their automation was triggered
    for (const action of this.#actionMap.values()) {
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
      this.#lastActionValue = 0;
      return this.#lastActionValue; // No automations triggered, default to off
    }

    // Detect collisions: multiple automations with different values
    const valueCounts = new Map<number, number>();
    for (const { value } of triggeredActions) {
      valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
    }

    // Collision detected, default to off
    if (valueCounts.size > 1) {
      this.#logger.warn(
        `Collision detected on output ${this.#outputId}: ` +
          `${triggeredActions.map((t) => `${t.payload.automationName}=${t.value}`).join(", ")}`,
      );
      this.#lastActionValue = 0;
      return this.#lastActionValue;
    }

    // No collision - return the single value
    this.#lastActionValue = triggeredActions.length > 0 ? triggeredActions[0]!.value : 0;
    return this.#lastActionValue;
  }

  [Symbol.dispose](): void {
    this.#listenerCleanupFunction();
  }
}
