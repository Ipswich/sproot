import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class SensorModifiedEvent implements SprootEvent<typeof Events.SENSOR_MODIFIED_EVENT> {
  readonly type = Events.SENSOR_MODIFIED_EVENT;

  constructor(
    public readonly payload: SensorModifiedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}


export type SensorModifiedPayload = {}
