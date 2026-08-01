import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class OutputRetentionUpdatedEvent implements SprootEvent<
  typeof Events.OUTPUT_RETENTION_UPDATED
> {
  readonly type = Events.OUTPUT_RETENTION_UPDATED;

  constructor(
    public readonly payload: OutputRetentionUpdatedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}

export interface OutputRetentionUpdatedPayload {
  key: string;
  value: string;
}
