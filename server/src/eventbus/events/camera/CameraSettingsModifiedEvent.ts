import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class CameraSettingsModifiedEvent implements SprootEvent<
  typeof Events.CAMERA_SETTINGS_MODIFIED_EVENT
> {
  readonly type = Events.CAMERA_SETTINGS_MODIFIED_EVENT;

  constructor(
    public readonly payload: CameraSettingsModifiedPayload,
    public readonly occurredAt = new Date(),
    public readonly eventId = crypto.randomUUID() as string,
  ) {}
}

export type CameraSettingsModifiedPayload = {};
