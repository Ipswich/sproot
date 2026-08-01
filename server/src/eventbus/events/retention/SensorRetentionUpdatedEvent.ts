import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class SensorRetentionUpdatedEvent implements SprootEvent<
  typeof Events.SENSOR_RETENTION_UPDATED
> {
  readonly type = Events.SENSOR_RETENTION_UPDATED;

  constructor(
    public readonly payload: SensorRetentionUpdatedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}

export interface SensorRetentionUpdatedPayload {
  key: string;
  value: string;
}
