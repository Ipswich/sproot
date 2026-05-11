import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class OutputActionsModifiedEvent implements SprootEvent<typeof Events.OUTPUT_ACTION_MODIFIED_EVENT> {
  readonly type = Events.OUTPUT_ACTION_MODIFIED_EVENT;

  constructor(
    public readonly payload: OutputActionsModifiedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}


export type OutputActionsModifiedPayload = {}
