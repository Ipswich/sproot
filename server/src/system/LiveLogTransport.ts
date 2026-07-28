import TransportStream from "winston-transport";
import winston from "winston";
import { LogStreamService } from "./LogStreamService";
import { LogEvent } from "../eventbus/events/logging/LogEvent";

const RESERVED_KEYS = new Set([
  "level",
  "message",
  "timestamp",
  "label",
  "splat",
  "stack",
  "levelLabel",
  "colorize",
  "context",
]);

export class LiveLogTransport extends TransportStream {
  #streamService: LogStreamService;
  #logger: winston.Logger;

  constructor(streamService: LogStreamService, logger: winston.Logger) {
    super();
    this.#streamService = streamService;
    this.#logger = logger;
  }

  override log(info: Record<string, unknown>, callback: () => void): void {
    try {
      const infoCopy = { ...info };

      const timestamp = infoCopy["timestamp"] as string | undefined;
      const level = infoCopy["level"] as string | undefined;
      const message = infoCopy["message"] as string | undefined;

      const metadata: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(infoCopy)) {
        if (RESERVED_KEYS.has(key)) {
          continue;
        }
        metadata[key] = value;
      }

      const payload = {
        timestamp: timestamp ?? new Date().toISOString(),
        level: level ?? "info",
        message: message ?? "",
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      };

      const event = new LogEvent(payload);
      this.#streamService.publish(event as Parameters<LogStreamService["publish"]>[0]);
    } catch (err) {
      this.#logger.error(`LiveLogTransport error: ${err}`);
    } finally {
      callback();
    }
  }

  isReady(): boolean {
    return true;
  }
}
