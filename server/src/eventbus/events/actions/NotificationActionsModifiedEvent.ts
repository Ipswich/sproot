import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class NotificationActionsModifiedEvent implements SprootEvent<typeof Events.NOTIFICATION_ACTION_MODIFIED_EVENT> {
  readonly type = Events.NOTIFICATION_ACTION_MODIFIED_EVENT;

  constructor(
    public readonly payload: NotificationActionsModifiedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}


export type NotificationActionsModifiedPayload = {}
