import { IAutomationEventPayload } from "@sproot/automation/IAutomationEventPayload";
import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class AutomationsTriggeredEvent implements SprootEvent<
  typeof Events.AUTOMATIONS_TRIGGERED_EVENT
> {
  readonly type = Events.AUTOMATIONS_TRIGGERED_EVENT;

  constructor(
    public readonly payload: AutomationsTriggeredPayload,
    public readonly occurredAt = new Date(),
    public readonly eventId = crypto.randomUUID() as string,
  ) {}
}

export type AutomationsTriggeredPayload = Map<number, IAutomationEventPayload>;
