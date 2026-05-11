import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class OutputModifiedEvent implements SprootEvent<typeof Events.OUTPUT_MODIFIED_EVENT> {
  readonly type = Events.OUTPUT_MODIFIED_EVENT;

  constructor(
    public readonly payload: OutputModifiedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}


export type OutputModifiedPayload = {}
