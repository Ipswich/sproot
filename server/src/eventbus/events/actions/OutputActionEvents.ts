import { SDBOutputAction } from "@sproot/common/database/SDBOutputAction";
import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class OutputActionAddedEvent implements SprootEvent<
  typeof Events.OUTPUT_ACTION_ADDED_EVENT
> {
  readonly type = Events.OUTPUT_ACTION_ADDED_EVENT;

  constructor(
    public readonly payload: OutputActionAddedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}

export class OutputActionDeletedEvent implements SprootEvent<
  typeof Events.OUTPUT_ACTION_DELETED_EVENT
> {
  readonly type = Events.OUTPUT_ACTION_DELETED_EVENT;

  constructor(
    public readonly payload: OutputActionDeletedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}

export type OutputActionAddedPayload = {
  action: SDBOutputAction;
  previousOutputId?: number;
};

export type OutputActionDeletedPayload = {
  actionId: number;
  automationId: number;
  outputId: number;
};
