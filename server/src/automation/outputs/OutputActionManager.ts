import type { IOutputActionsRepository } from "../../database/repositories/automations/actions/IOutputActionsRepository";
import { IAutomationEventPayload } from "@sproot/automation/IAutomationEventPayload";
import {
  OUTPUT_ACTION_PRECEDENCE_PRIORITY,
  OutputActionPrecedence,
} from "@sproot/common/automation/OutputActionPrecedence";
import { OutputAction } from "./OutputAction";
import winston from "winston";
import { IEventBus } from "../../eventbus/IEventBus";
import { Events } from "../../eventbus/events/Events";
import { AutomationsTriggeredEvent } from "../../eventbus/events/automations/AutomationsTriggeredEvent";
import {
  OutputActionDeletedEvent,
  OutputActionAddedEvent,
} from "../../eventbus/events/actions/OutputActionEvents";
import {
  OutputActionConflict,
  OutputActionParticipant,
  OutputActionWarning,
} from "@sproot/outputs/IOutputBase";

export class OutputActionManager implements Disposable {
  #outputId: number;
  #outputActionsRepository: IOutputActionsRepository;
  #eventBus: IEventBus;
  #logger: winston.Logger;
  #lastRunAt: number | null = null;
  #lastActionValue: number | undefined = undefined;
  #actionMap: Map<number, OutputAction> = new Map();
  #actionWarnings: OutputActionWarning[] = [];
  #activeConflict: OutputActionConflict | null = null;
  #triggeredBy: OutputActionParticipant[] = [];
  #automationTimeout: number; // Per-output timeout
  #triggeredActionFunction: (result: number | undefined) => Promise<void>;
  #listenerCleanupFunction: () => void;
  #pendingAction: Promise<void> = Promise.resolve();

  static async createInstanceAsync(
    outputId: number,
    actionFunction: (result: number | undefined) => Promise<void>,
    eventBus: IEventBus,
    outputActionsRepository: IOutputActionsRepository,
    logger: winston.Logger,
    automationTimeout: number,
  ): Promise<OutputActionManager> {
    const manager = new OutputActionManager(
      outputId,
      actionFunction,
      eventBus,
      outputActionsRepository,
      logger,
      automationTimeout,
    );
    await manager.#reloadActionsAsync();
    return manager;
  }

  private constructor(
    outputId: number,
    actionFunction: (result: number | undefined) => Promise<void>,
    eventBus: IEventBus,
    outputActionsRepository: IOutputActionsRepository,
    logger: winston.Logger,
    automationTimeout: number,
  ) {
    this.#outputId = outputId;
    this.#triggeredActionFunction = actionFunction;
    this.#eventBus = eventBus;
    this.#outputActionsRepository = outputActionsRepository;
    this.#logger = logger;
    this.#automationTimeout = automationTimeout;

    const actionAddedListener = async (event: OutputActionAddedEvent) => {
      if (
        event.payload.action.outputId !== this.#outputId &&
        event.payload.previousOutputId !== this.#outputId
      ) {
        return;
      }

      await this.#reloadActionsAsync();
    };

    const actionDeletedListener = async (event: OutputActionDeletedEvent) => {
      if (event.payload.outputId !== this.#outputId) {
        return;
      }

      await this.#reloadActionsAsync();
    };

    const automationListener = async (event: AutomationsTriggeredEvent) => {
      this.#pendingAction = this.#pendingAction
        .then(async () => {
          const result = await this.#handleAutomationEvent(event);
          this.#logger.debug(
            `Received Automation event ${event.eventId} for output ${this.#outputId} - result: ${result}`,
          );
          await this.#triggeredActionFunction(result);
        })
        .catch((error) => {
          this.#logger.error(
            `Error handling automation event for output ${this.#outputId} - ${error}`,
          );
        });
    };

    const outputActionAddedUnsubscribe = this.#eventBus.subscribe(
      Events.OUTPUT_ACTION_ADDED_EVENT,
      actionAddedListener,
    );
    const outputActionDeletedUnsubscribe = this.#eventBus.subscribe(
      Events.OUTPUT_ACTION_DELETED_EVENT,
      actionDeletedListener,
    );
    const automationUnsubscribe = this.#eventBus.subscribe(
      Events.AUTOMATIONS_TRIGGERED_EVENT,
      automationListener,
    );

    this.#listenerCleanupFunction = () => {
      outputActionAddedUnsubscribe();
      outputActionDeletedUnsubscribe();
      automationUnsubscribe();
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

  get actionWarnings(): OutputActionWarning[] {
    return this.#actionWarnings;
  }

  get activeConflict(): OutputActionConflict | null {
    return this.#activeConflict;
  }

  get triggeredBy(): OutputActionParticipant[] {
    return this.#triggeredBy;
  }

  /**
   * Reload output actions from the database
   */
  async #reloadActionsAsync(): Promise<void> {
    try {
      const outputActions = await this.#outputActionsRepository.getActionsByOutputIdAsync(
        this.#outputId,
      );
      this.#actionMap = new Map();

      for (const outputAction of outputActions) {
        const nextAction = new OutputAction(outputAction);
        const currentAction = this.#actionMap.get(nextAction.automationId);

        if (
          currentAction == null ||
          OUTPUT_ACTION_PRECEDENCE_PRIORITY[nextAction.precedence] >
            OUTPUT_ACTION_PRECEDENCE_PRIORITY[currentAction.precedence] ||
          (OUTPUT_ACTION_PRECEDENCE_PRIORITY[nextAction.precedence] ===
            OUTPUT_ACTION_PRECEDENCE_PRIORITY[currentAction.precedence] &&
            nextAction.id > currentAction.id)
        ) {
          this.#actionMap.set(nextAction.automationId, nextAction);
        }
      }

      this.#actionWarnings = this.#buildActionWarnings(Array.from(this.#actionMap.values()));
      this.#activeConflict = null;
    } catch (error) {
      this.#logger.error(`Error reloading actions for output ${this.#outputId} - ${error}`);
    }
  }

  #buildActionWarnings(outputActions: OutputAction[]): OutputActionWarning[] {
    const groupedActions = new Map<OutputActionPrecedence, OutputAction[]>();

    for (const action of outputActions) {
      const actions = groupedActions.get(action.precedence) ?? [];
      actions.push(action);
      groupedActions.set(action.precedence, actions);
    }

    return Array.from(groupedActions.entries())
      .filter(([, actions]) => actions.length > 1)
      .sort(
        ([left], [right]) =>
          OUTPUT_ACTION_PRECEDENCE_PRIORITY[right] - OUTPUT_ACTION_PRECEDENCE_PRIORITY[left],
      )
      .map(([precedence, actions]) => ({
        precedence,
        actions: actions.map((action) => ({
          automationId: action.automationId,
          automationName: action.automationName ?? `Automation ${action.automationId}`,
        })),
      }));
  }

  /**
   * Handle automation events - detects collisions and returns the action value.
   * @param event The automation event containing triggered automations
   * @returns The value to set, or undefined if no action should be taken (collision, no action, or timeout)
   */
  async #handleAutomationEvent(
    event: AutomationsTriggeredEvent,
    now: Date = event.occurredAt,
  ): Promise<number | undefined> {
    const nowTimestamp = now.getTime();

    // Check timeout - only process if enough time has passed since last run
    if (
      this.#lastRunAt !== null &&
      nowTimestamp < this.#lastRunAt + this.#automationTimeout * 1000
    ) {
      return undefined; // Too soon, skip — preserve lastActionValue
    }
    // Start the timeout clock if this is the first event (ensures collisions are rate-limited too)
    if (this.#lastRunAt === null) {
      this.#lastRunAt = nowTimestamp;
    }
    let resolvedValue: number | undefined;

    // Find which automations have actions on this output
    const triggeredActions: {
      value: number;
      precedence: OutputActionPrecedence;
      payload: IAutomationEventPayload;
    }[] = [];

    // Loop through all actions and check if their automation was triggered
    for (const action of this.#actionMap.values()) {
      if (event.payload.has(action.automationId)) {
        const payload = event.payload.get(action.automationId);
        if (!payload) {
          continue;
        }

        triggeredActions.push({
          value: action.value,
          precedence: action.precedence,
          payload,
        });
      }
    }

    if (triggeredActions.length === 0) {
      this.#triggeredBy = [];
      this.#activeConflict = null;
      resolvedValue = 0;
      if (resolvedValue !== this.#lastActionValue) {
        this.#lastRunAt = nowTimestamp;
      }
      this.#lastActionValue = resolvedValue;
      return this.#lastActionValue;
    }

    let highestPriority = -Infinity;
    for (const action of triggeredActions) {
      highestPriority = Math.max(
        highestPriority,
        OUTPUT_ACTION_PRECEDENCE_PRIORITY[action.precedence],
      );
    }

    const highestPriorityActions = triggeredActions.filter(
      (action) => OUTPUT_ACTION_PRECEDENCE_PRIORITY[action.precedence] === highestPriority,
    );

    this.#triggeredBy = triggeredActions.map((action) => ({
      automationId: action.payload.automationId,
      automationName: action.payload.automationName,
    }));

    const valueCounts = new Map<number, number>();
    for (const { value } of highestPriorityActions) {
      valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
    }

    // Collision detected among the highest-priority actions, so do nothing.
    if (valueCounts.size > 1) {
      this.#activeConflict = {
        precedence: highestPriorityActions[0]!.precedence,
        actions: highestPriorityActions.map((action) => ({
          automationId: action.payload.automationId,
          automationName: action.payload.automationName,
          value: action.value,
        })),
      };
      this.#logger.warn(
        `Collision detected on output ${this.#outputId}: ` +
          `${highestPriorityActions
            .map(
              (action) => `${action.payload.automationName}=${action.value} (${action.precedence})`,
            )
            .join(", ")}`,
      );
      resolvedValue = undefined;
      if (resolvedValue !== this.#lastActionValue) {
        this.#lastRunAt = nowTimestamp;
      }
      this.#lastActionValue = resolvedValue;
      return this.#lastActionValue;
    }

    this.#activeConflict = null;
    resolvedValue = highestPriorityActions[0]!.value;
    if (resolvedValue !== this.#lastActionValue) {
      this.#lastRunAt = nowTimestamp;
    }
    this.#lastActionValue = resolvedValue;
    return this.#lastActionValue;
  }

  [Symbol.dispose](): void {
    this.#listenerCleanupFunction();
  }
}
