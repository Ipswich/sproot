import { SprootEvent } from "../../IEventBus";
import { Events } from "../Events";

export class BackupRetentionUpdatedEvent implements SprootEvent<
  typeof Events.BACKUP_RETENTION_UPDATED
> {
  readonly type = Events.BACKUP_RETENTION_UPDATED;

  constructor(
    public readonly payload: BackupRetentionUpdatedPayload,
    public readonly eventId = crypto.randomUUID() as string,
    public readonly occurredAt = new Date(),
  ) {}
}

export interface BackupRetentionUpdatedPayload {
  key: string;
  value: string;
}
