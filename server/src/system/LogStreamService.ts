import winston from "winston";
import { IEventBus, SprootEvent } from "../eventbus/IEventBus";
import { Events } from "../eventbus/events/Events";
import { LogEvent } from "../eventbus/events/logging/LogEvent";

export const DEFAULT_HISTORY_SIZE = 200;

export class LogStreamService {
  #buffer: LogEvent[] = [];
  #head = 0;
  #size = 0;
  #capacity: number;
  #eventBus: IEventBus;
  #logger: winston.Logger;

  constructor(historySize: number | undefined, eventBus: IEventBus, logger: winston.Logger) {
    this.#capacity = historySize ?? DEFAULT_HISTORY_SIZE;
    this.#eventBus = eventBus;
    this.#logger = logger;
  }

  publish(event: SprootEvent<typeof Events.LOG_EVENT>): void {
    this.#buffer[this.#head] = event as LogEvent;
    this.#head = (this.#head + 1) % this.#capacity;
    if (this.#size < this.#capacity) {
      this.#size++;
    }

    try {
      void this.#eventBus.publishAsync(event);
    } catch (err) {
      this.#logger.error(`LogStreamService publish failed: ${err}`);
    }
  }

  getHistory(): LogEvent[] {
    if (this.#size === 0) {
      return [];
    }

    const result: LogEvent[] = new Array(this.#size);

    if (this.#size < this.#capacity) {
      for (let i = 0; i < this.#size; i++) {
        result[i] = this.#buffer[i] as LogEvent;
      }
    } else {
      for (let i = 0; i < this.#size; i++) {
        const index = (this.#head + i) % this.#capacity;
        result[i] = this.#buffer[index] as LogEvent;
      }
    }

    return result;
  }
}
