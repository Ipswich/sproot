import { NotificationAction } from "./NotificationAction";
import winston from "winston";
import { IActiveNotificationsResponse } from "@sproot/automation/IActiveNotificationResponse";
import { IActiveNotification } from "@sproot/automation/IActiveNotification";
import { IEventBus } from "../../eventbus/IEventBus";
import { Events } from "../../eventbus/events/Events";
import { AutomationsTriggeredEvent } from "../../eventbus/events/automations/AutomationsTriggeredEvent";
import type { INotificationActionsRepository } from "../../database/repositories/automations/actions/INotificationActionsRepository";

export class NotificationActionManager implements Disposable {
  #notificationActionsRepository: INotificationActionsRepository;
  #eventBus: IEventBus;
  #logger: winston.Logger;
  #lastRunAt: number | null = null;
  #actions: NotificationAction[] = [];
  #activeNotifications: Map<number, IActiveNotification> = new Map();
  #listenerCleanupFunction: () => void;

  static async createInstanceAsync(
    notificationActionsRepository: INotificationActionsRepository,
    eventBus: IEventBus,
    logger: winston.Logger,
  ): Promise<NotificationActionManager> {
    const manager = new NotificationActionManager(notificationActionsRepository, eventBus, logger);
    await manager.#reloadActionsAsync();
    return manager;
  }

  private constructor(
    notificationActionsRepository: INotificationActionsRepository,
    eventBus: IEventBus,
    logger: winston.Logger,
  ) {
    this.#notificationActionsRepository = notificationActionsRepository;
    this.#eventBus = eventBus;
    this.#logger = logger;

    const actionReloadListener = async () => {
      await this.#reloadActionsAsync();
    };

    const automationListener = (event: AutomationsTriggeredEvent) => {
      try {
        this.#handleAutomationEvent(event);
      } catch (error) {
        this.#logger.error(`Error handling automation event for notifications - ${error}`);
      }
    };

    const actionReloadUnsubscribe = this.#eventBus.subscribe(
      Events.NOTIFICATION_ACTION_MODIFIED_EVENT,
      actionReloadListener,
    );
    const automationUnsubscribe = this.#eventBus.subscribe(
      Events.AUTOMATIONS_TRIGGERED_EVENT,
      automationListener,
    );

    this.#listenerCleanupFunction = () => {
      actionReloadUnsubscribe();
      automationUnsubscribe();
    };
  }

  get activeNotifications(): IActiveNotificationsResponse {
    return {
      lastRunAt: this.#lastRunAt ?? 0,
      notifications: Array.from(this.#activeNotifications.values()),
    };
  }

  /**
   * Reload notification actions from the database
   */
  async #reloadActionsAsync(): Promise<void> {
    try {
      const notificationActions = await this.#notificationActionsRepository.getAllAsync();
      this.#actions = notificationActions.map((action) => new NotificationAction(action));
    } catch (error) {
      this.#logger.error(`Error reloading actions for notifications - ${error}`);
    }
  }

  /**
   * Handle automation events.
   * @param event The automation event containing triggered automations
   */
  #handleAutomationEvent(event: AutomationsTriggeredEvent, now: Date = event.occurredAt): void {
    this.#lastRunAt = now.getTime();

    // Find which automations have actions on this output
    const triggeredActions: IActiveNotification[] = [];

    // Loop through all actions and check if their automation was triggered
    for (const action of this.#actions) {
      if (event.payload.has(action.automationId)) {
        const payload = event.payload.get(action.automationId);
        if (!payload) {
          continue;
        }

        triggeredActions.push({
          notificationId: action.id,
          subject: action.subject,
          content: action.content,
          payload,
        });
      }
    }

    // Store active notifications for retrieval by API or other consumers
    this.#activeNotifications = triggeredActions.reduce((map, action) => {
      map.set(action.notificationId, action);
      return map;
    }, new Map<number, IActiveNotification>());
  }

  [Symbol.dispose](): void {
    this.#listenerCleanupFunction();
  }
}
