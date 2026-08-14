import { SDBNotificationAction } from "@sproot/common/database/SDBNotificationAction";
import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class NotificationActionUpdatedEvent
  implements SprootEvent<typeof Events.NOTIFICATION_ACTION_UPDATED_EVENT>
{
  readonly type = Events.NOTIFICATION_ACTION_UPDATED_EVENT;

  constructor(
    public readonly payload: NotificationActionUpdatedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}

export class NotificationActionDeletedEvent
  implements SprootEvent<typeof Events.NOTIFICATION_ACTION_DELETED_EVENT>
{
  readonly type = Events.NOTIFICATION_ACTION_DELETED_EVENT;

  constructor(
    public readonly payload: NotificationActionDeletedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}

export type NotificationActionUpdatedPayload = {
  action: SDBNotificationAction;
};

export type NotificationActionDeletedPayload = {
  actionId: number;
  automationId: number;
};