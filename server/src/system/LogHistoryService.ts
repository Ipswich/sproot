import { IEventBus } from "../eventbus/IEventBus";
import { Events } from "../eventbus/events/Events";
import { LogEvent } from "../eventbus/events/logging/LogEvent";

export const DEFAULT_HISTORY_SIZE = 200;

export class LogHistoryService {
  #buffer: LogEvent[] = [];
  #head = 0;
  #size = 0;
  #capacity: number;
  #unsubscribe?: () => void;

  constructor(historySize: number | undefined, eventBus: IEventBus) {
    this.#capacity = historySize ?? DEFAULT_HISTORY_SIZE;
    this.#unsubscribe = eventBus.subscribe(Events.LOG_EVENT, (event) => {
      this.#buffer[this.#head] = event as LogEvent;
      this.#head = (this.#head + 1) % this.#capacity;
      if (this.#size < this.#capacity) {
        this.#size++;
      }
    });
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

  [Symbol.dispose](): void {
    this.#unsubscribe?.();
  }
}
