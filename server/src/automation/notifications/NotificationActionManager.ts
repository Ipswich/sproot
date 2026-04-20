import { AutomationEvent, AutomationEventPayload } from "../AutomationEvent";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { AutomationService } from "../AutomationService";
import { NotificationAction } from "./NotificationAction";
import winston from "winston";
import {
  NOTIFICATION_ACTIONS_UPDATED_EVENT,
  AUTOMATIONS_TRIGGERED_EVENT,
} from "../../utils/EventConstants";

export class NotificationActionManager implements Disposable {
  #automationService: AutomationService;
  #sprootDB: ISprootDB;
  #logger: winston.Logger;
  #lastRunAt: number | null = null;
  #actionMap: Map<number, NotificationAction> = new Map();
  #activeNotifications: Map<
    number,
    {
      notificationId: number;
      subject: string;
      content: string;
      payload: AutomationEventPayload;
    }
  > = new Map();
  #listenerCleanupFunction: () => void;

  static async createInstanceAsync(
    automationService: AutomationService,
    sprootDB: ISprootDB,
    logger: winston.Logger,
  ): Promise<NotificationActionManager> {
    const manager = new NotificationActionManager(automationService, sprootDB, logger);
    await manager.#reloadActionsAsync();
    return manager;
  }

  private constructor(
    automationService: AutomationService,
    sprootDB: ISprootDB,
    logger: winston.Logger,
  ) {
    this.#automationService = automationService;
    this.#sprootDB = sprootDB;
    this.#logger = logger;

    const actionReloadListener = async () => {
      await this.#reloadActionsAsync();
    };

    const automationListener = async (event: AutomationEvent) => {
      try {
        await this.#handleAutomationEvent(event);
      } catch (error) {
        this.#logger.error(`Error handling automation event for notifications - ${error}`);
      }
    };

    this.#automationService.on(NOTIFICATION_ACTIONS_UPDATED_EVENT, actionReloadListener);
    this.#automationService.on(AUTOMATIONS_TRIGGERED_EVENT, automationListener);

    this.#listenerCleanupFunction = () => {
      this.#automationService.off(NOTIFICATION_ACTIONS_UPDATED_EVENT, actionReloadListener);
      this.#automationService.off(AUTOMATIONS_TRIGGERED_EVENT, automationListener);
    };
  }

  get activeNotifications(): {
    lastRunAt: number;
    notifications: {
      notificationId: number;
      subject: string;
      content: string;
      payload: AutomationEventPayload;
    }[];
  } {
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
      const notificationActions = await this.#sprootDB.getNotificationActionsAsync();
      this.#actionMap = new Map(
        notificationActions.map((a) => [a.automationId, new NotificationAction(a)]),
      );
    } catch (error) {
      this.#logger.error(`Error reloading actions for notifications - ${error}`);
    }
  }

  /**
   * Handle automation events.
   * @param event The automation event containing triggered automations
   */
  async #handleAutomationEvent(event: AutomationEvent, now: Date = event.timestamp): Promise<void> {
    this.#lastRunAt = now.getTime();

    // Find which automations have actions on this output
    const triggeredActions: {
      notificationId: number;
      subject: string;
      content: string;
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
          notificationId: action.id,
          subject: action.subject,
          content: action.content,
          payload,
        });
      }
    }

    // Store active notifications for retrieval by API or other consumers
    this.#activeNotifications = triggeredActions.reduce(
      (map, action) => {
        map.set(action.notificationId, {
          notificationId: action.notificationId,
          subject: action.subject,
          content: action.content,
          payload: action.payload,
        });
        return map;
      },
      new Map<
        number,
        {
          notificationId: number;
          subject: string;
          content: string;
          payload: AutomationEventPayload;
        }
      >(),
    );
  }

  [Symbol.dispose](): void {
    this.#listenerCleanupFunction();
  }
}
