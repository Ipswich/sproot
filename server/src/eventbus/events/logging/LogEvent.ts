import { randomUUID } from "node:crypto";

import { Events } from "../Events";

export class LogEvent {
  readonly type = Events.LOG_EVENT;

  constructor(
    public readonly payload: LogEventPayload,
    public readonly eventId: string = randomUUID(),
    public readonly occurredAt: Date = new Date(),
    public readonly correlationId?: string,
    public readonly causationId?: string,
  ) {}
}

export interface LogEventPayload {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}
